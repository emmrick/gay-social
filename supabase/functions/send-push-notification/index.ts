import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Convert VAPID key to proper format for Web Push
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { userId, title, body, url, tag, notificationType } = await req.json();

    console.log("Received push request for userId:", userId, "type:", notificationType);

    if (!userId || !title) {
      return new Response(
        JSON.stringify({ error: "userId and title are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user's notification preferences
    if (notificationType) {
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
        const audience = new URL(subscription.endpoint).origin;
        const now = Math.floor(Date.now() / 1000);
        
        // Create simple VAPID JWT header
        const jwtHeader = { typ: "JWT", alg: "ES256" };
        const jwtClaims = {
          aud: audience,
          exp: now + 12 * 60 * 60,
          sub: "mailto:support@gayconnect.app",
        };

        const headerB64 = btoa(JSON.stringify(jwtHeader))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=/g, "");
        const claimsB64 = btoa(JSON.stringify(jwtClaims))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=/g, "");

        // For Web Push, we need to send to the endpoint
        // The browser handles decryption on its end
        // We'll send a simple push without encryption (notification-only)
        const response = await fetch(subscription.endpoint, {
          method: "POST",
          headers: {
            "TTL": "86400",
            "Urgency": "high",
            "Authorization": `vapid t=${headerB64}.${claimsB64}, k=${VAPID_PUBLIC_KEY}`,
          },
        });

        console.log(`Push response for ${subscription.endpoint}: ${response.status}`);

        if (response.status === 201 || response.status === 200) {
          results.push({ endpoint: subscription.endpoint, success: true });
        } else if (response.status === 410 || response.status === 404) {
          // Subscription expired or invalid, remove it
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", subscription.id);
          results.push({ endpoint: subscription.endpoint, success: false, reason: "expired" });
        } else {
          const errorText = await response.text();
          console.log(`Push failed for ${subscription.endpoint}: ${response.status} - ${errorText}`);
          results.push({ endpoint: subscription.endpoint, success: false, reason: `${response.status}: ${errorText}` });
        }
      } catch (pushError: unknown) {
        const errorMessage = pushError instanceof Error ? pushError.message : String(pushError);
        console.error("Push error:", errorMessage);
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
