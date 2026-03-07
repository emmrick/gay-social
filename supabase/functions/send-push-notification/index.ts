import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Convert base64url to standard base64
function base64UrlToBase64(base64url: string): string {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (base64.length % 4)) % 4;
  base64 += '='.repeat(padding);
  return base64;
}

// Decode base64url string to Uint8Array
function base64UrlDecode(str: string): Uint8Array {
  const base64 = base64UrlToBase64(str);
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Convert raw bytes to base64
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert raw EC private key (32 bytes) to JWK format
function rawPrivateKeyToJWK(privateKeyBytes: Uint8Array, publicKeyBytes: Uint8Array): JsonWebKey {
  // The public key is 65 bytes (uncompressed): 0x04 + 32 bytes X + 32 bytes Y
  const x = publicKeyBytes.slice(1, 33);
  const y = publicKeyBytes.slice(33, 65);
  
  return {
    kty: "EC",
    crv: "P-256",
    x: bytesToBase64(x).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    y: bytesToBase64(y).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    d: bytesToBase64(privateKeyBytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  };
}

// Convert raw EC public key (65 bytes) to JWK format
function rawPublicKeyToJWK(publicKeyBytes: Uint8Array): JsonWebKey {
  // The public key is 65 bytes (uncompressed): 0x04 + 32 bytes X + 32 bytes Y
  const x = publicKeyBytes.slice(1, 33);
  const y = publicKeyBytes.slice(33, 65);
  
  return {
    kty: "EC",
    crv: "P-256",
    x: bytesToBase64(x).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    y: bytesToBase64(y).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.error("VAPID keys not configured");
      throw new Error("VAPID keys not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authClient = createClient(SUPABASE_URL, anonKey || SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user: caller }, error: authError } = await authClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode the base64url encoded keys
    const privateKeyBytes = base64UrlDecode(VAPID_PRIVATE_KEY);
    const publicKeyBytes = base64UrlDecode(VAPID_PUBLIC_KEY);

    // Convert to JWK format for the library
    const privateJWK = rawPrivateKeyToJWK(privateKeyBytes, publicKeyBytes);
    const publicJWK = rawPublicKeyToJWK(publicKeyBytes);

    // Import VAPID keys
    const vapidKeys = await webpush.importVapidKeys({
      publicKey: publicJWK,
      privateKey: privateJWK,
    });

    // Create application server
    const appServer = await webpush.ApplicationServer.new({
      contactInformation: "mailto:support@gayconnect.app",
      vapidKeys,
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { userId, title, body, url, tag, notificationType, regionCode } = await req.json();

    console.log("Received push request for userId:", userId, "type:", notificationType, "region:", regionCode);

    if (!userId || !title) {
      return new Response(
        JSON.stringify({ error: "userId and title are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user's notification preferences (skip for system notifications)
    if (notificationType && notificationType !== 'system') {
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (prefs) {
        const prefMap: Record<string, boolean> = {
          'private_message': prefs.push_private_messages,
          'group_message': prefs.push_group_messages,
          'favorite': prefs.push_favorites,
          'reaction': prefs.push_reactions,
          'album_share': prefs.push_album_shares,
          'match': prefs.push_matches ?? true,
          'mention': prefs.push_mentions ?? true,
          'credit': prefs.push_credits ?? true,
          'verification': prefs.push_verification ?? true,
        };

        if (prefMap[notificationType] === false) {
          console.log(`Notification type ${notificationType} is disabled for user ${userId}`);
          return new Response(
            JSON.stringify({ success: false, message: "Notification type disabled by user" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Check if group is muted (for group messages)
    if (notificationType === 'group_message' && regionCode) {
      const { data: mutePrefs } = await supabase
        .from("group_mute_preferences")
        .select("is_muted")
        .eq("user_id", userId)
        .eq("region_code", regionCode)
        .maybeSingle();

      if (mutePrefs?.is_muted) {
        console.log(`Group ${regionCode} is muted for user ${userId}`);
        return new Response(
          JSON.stringify({ success: false, message: "Group is muted by user" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check per-conversation mute (for any tagged notification)
    if (tag) {
      const conversationId = tag === 'announcement' ? 'announcement' : null;
      if (conversationId) {
        const { data: convMute } = await supabase
          .from("conversation_mute_preferences")
          .select("is_muted")
          .eq("user_id", userId)
          .eq("conversation_id", conversationId)
          .maybeSingle();

        if (convMute?.is_muted) {
          console.log(`Conversation ${conversationId} is muted for user ${userId}`);
          return new Response(
            JSON.stringify({ success: false, message: "Conversation is muted by user" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw new Error(`Error fetching subscriptions: ${subError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found for user:", userId);
      return new Response(
        JSON.stringify({ success: false, message: "No push subscriptions found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions for user ${userId}`);

    // Prepare the notification payload
    const payload = JSON.stringify({
      title,
      body: body || "",
      url: url || "/",
      tag: tag || Date.now().toString(),
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
    });

    const results: Array<{ endpoint: string; success: boolean; reason?: string }> = [];

    for (const subscription of subscriptions) {
      try {
        // Build the PushSubscription object for the library
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key,
          }
        };

        console.log("Sending push to:", subscription.endpoint.substring(0, 50) + "...");

        // Create subscriber
        const subscriber = appServer.subscribe(pushSubscription);

        // Send the notification (cast urgency to the expected type)
        await subscriber.pushTextMessage(payload, {
          ttl: 86400,
          urgency: "high" as webpush.Urgency,
        });

        console.log("Push sent successfully");
        results.push({ endpoint: subscription.endpoint, success: true });

      } catch (pushError: unknown) {
        const errorMessage = pushError instanceof Error ? pushError.message : String(pushError);
        console.error("Push error:", errorMessage);

        // Check if subscription is expired/invalid (410 Gone or 404 Not Found)
        if (errorMessage.includes("410") || errorMessage.includes("404") || errorMessage.includes("expired")) {
          // Remove expired subscription
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", subscription.id);
          results.push({ endpoint: subscription.endpoint, success: false, reason: "expired" });
          continue;
        }

        results.push({ endpoint: subscription.endpoint, success: false, reason: errorMessage });
      }
    }

    console.log("Push results:", JSON.stringify(results));

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
