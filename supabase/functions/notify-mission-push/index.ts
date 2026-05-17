import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

function base64UrlDecode(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function rawPrivateKeyToJWK(privateKeyBytes: Uint8Array, publicKeyBytes: Uint8Array) {
  const uncompressed = publicKeyBytes[0] === 0x04 ? publicKeyBytes.slice(1) : publicKeyBytes;
  const x = uncompressed.slice(0, 32);
  const y = uncompressed.slice(32, 64);
  return {
    kty: "EC", crv: "P-256",
    d: bytesToBase64(privateKeyBytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    x: bytesToBase64(x).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    y: bytesToBase64(y).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  };
}

function rawPublicKeyToJWK(publicKeyBytes: Uint8Array) {
  const uncompressed = publicKeyBytes[0] === 0x04 ? publicKeyBytes.slice(1) : publicKeyBytes;
  const x = uncompressed.slice(0, 32);
  const y = uncompressed.slice(32, 64);
  return {
    kty: "EC", crv: "P-256",
    x: bytesToBase64(x).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    y: bytesToBase64(y).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");

    // Auth: accept service_role_key or anon_key (for internal pg_net calls from DB triggers)
    const authHeader = req.headers.get("Authorization");
    const apikeyHeader = req.headers.get("apikey");
    const token = authHeader?.replace("Bearer ", "") || "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
    
    const isInternalCall = token === SUPABASE_SERVICE_ROLE_KEY || 
                           token === SUPABASE_ANON_KEY ||
                           apikeyHeader === SUPABASE_ANON_KEY;
    
    if (!isInternalCall) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.log("[notify-mission-push] VAPID keys not configured, skipping push");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { task_id, task_type, description, reward_cents } = await req.json();
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all moderator/admin user IDs
    const { data: staffUsers } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'moderator']);

    if (!staffUsers || staffUsers.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = staffUsers.map(u => u.user_id);

    // Get push subscriptions for all staff
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, reason: "no_subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Setup VAPID
    const privateKeyBytes = base64UrlDecode(VAPID_PRIVATE_KEY);
    const publicKeyBytes = base64UrlDecode(VAPID_PUBLIC_KEY);
    const vapidKeys = await webpush.importVapidKeys({
      publicKey: rawPublicKeyToJWK(publicKeyBytes),
      privateKey: rawPrivateKeyToJWK(privateKeyBytes, publicKeyBytes),
    });

    const appServer = await webpush.ApplicationServer.new({
      contactInformation: "mailto:support@gaysocial.app",
      vapidKeys,
    });

    const TASK_LABELS: Record<string, string> = {
      identity_verification: '🪪 Vérification d\'identité',
      report_review: '🚨 Signalement à traiter',
      support_chat: '🆘 Demande de support',
      credit_management: '💰 Demande de crédits',
      withdrawal_management: '🏦 Demande de retrait',
      content_moderation: '📸 Modération contenu',
      photo_exchange_review: '🖼️ Échange de photos à vérifier',
      tween_review: '🐦 Tween signalé',
      screenshot_investigation: '🛡️ Capture d\'écran à examiner',
      ad_review: '📢 Annonce publicitaire à vérifier',
      promo_validation: '🎟️ Code promo à valider',
      user_suspension: '🔒 Suspension à traiter',
    };

    const title = '🔔 Nouvelle mission';
    const body = description || TASK_LABELS[task_type] || 'Une mission de modération est en attente.';
    const rewardText = reward_cents > 0 ? ` (+${(reward_cents / 100).toFixed(2).replace('.', ',')} €)` : '';

    const payload = JSON.stringify({
      title,
      body: body + rewardText,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: `mission-${task_id}`,
      url: `/admin/missions?task=${task_id}`,
    });

    let successCount = 0;
    let failCount = 0;

    for (const sub of subscriptions) {
      try {
        const pushSub = (sub as any).subscription_data || sub;
        const subscriber = await appServer.subscribe({
          endpoint: pushSub.endpoint,
          keys: { p256dh: pushSub.keys?.p256dh || pushSub.p256dh, auth: pushSub.keys?.auth || pushSub.auth },
        });
        await subscriber.pushTextMessage(payload, {});
        successCount++;
      } catch (err) {
        console.error(`[notify-mission-push] Failed for sub ${sub.id}:`, err);
        failCount++;
        // Remove invalid subscriptions
        if (String(err).includes('410') || String(err).includes('404')) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    }

    console.log(`[notify-mission-push] Sent ${successCount}, failed ${failCount}`);

    return new Response(JSON.stringify({ success: true, sent: successCount, failed: failCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[notify-mission-push] Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
