import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify admin role from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Accès refusé - Admin uniquement" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { title, body, url, targetType, region } = await req.json();

    if (!title) {
      return new Response(
        JSON.stringify({ error: "Le titre est requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Broadcasting notification: ${title} to ${targetType}${region ? ` (${region})` : ''}`);

    // Build query to get target users
    let query = supabase
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh_key, auth_key');

    // Filter by target type
    if (targetType === 'premium') {
      // Get premium users
      const { data: premiumUsers } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('is_premium', true);
      
      const premiumUserIds = premiumUsers?.map(p => p.user_id) || [];
      
      if (premiumUserIds.length === 0) {
        return new Response(
          JSON.stringify({ success: true, successCount: 0, failedCount: 0, message: "Aucun utilisateur premium trouvé" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      query = query.in('user_id', premiumUserIds);
    } else if (targetType === 'region' && region) {
      // Get users in specific region
      const { data: regionUsers } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('region', region);
      
      const regionUserIds = regionUsers?.map(p => p.user_id) || [];
      
      if (regionUserIds.length === 0) {
        return new Response(
          JSON.stringify({ success: true, successCount: 0, failedCount: 0, message: "Aucun utilisateur dans cette région" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      query = query.in('user_id', regionUserIds);
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw new Error(`Error fetching subscriptions: ${subError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, successCount: 0, failedCount: 0, message: "Aucune souscription push trouvée" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions to notify`);

    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    
    if (!VAPID_PUBLIC_KEY) {
      throw new Error("VAPID keys not configured");
    }

    let successCount = 0;
    let failedCount = 0;

    // Send notifications in batches to avoid overwhelming the server
    const batchSize = 50;
    for (let i = 0; i < subscriptions.length; i += batchSize) {
      const batch = subscriptions.slice(i, i + batchSize);
      
      const promises = batch.map(async (subscription) => {
        try {
          const audience = new URL(subscription.endpoint).origin;
          const now = Math.floor(Date.now() / 1000);
          
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

          const response = await fetch(subscription.endpoint, {
            method: "POST",
            headers: {
              "TTL": "86400",
              "Urgency": "normal",
              "Authorization": `vapid t=${headerB64}.${claimsB64}, k=${VAPID_PUBLIC_KEY}`,
            },
          });

          if (response.status === 201 || response.status === 200) {
            successCount++;
          } else if (response.status === 410 || response.status === 404) {
            // Subscription expired, remove it
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", subscription.id);
            failedCount++;
          } else {
            failedCount++;
          }
        } catch (err) {
          console.error("Push error:", err);
          failedCount++;
        }
      });

      await Promise.all(promises);
    }

    // Also create in-app notifications for all targeted users
    const uniqueUserIds = [...new Set(subscriptions.map(s => s.user_id))];
    
    const notifications = uniqueUserIds.map(userId => ({
      user_id: userId,
      type: 'broadcast',
      title,
      message: body || null,
      action_url: url || '/',
      is_read: false,
    }));

    // Insert notifications in batches
    for (let i = 0; i < notifications.length; i += 100) {
      const batch = notifications.slice(i, i + 100);
      await supabase.from('notifications').insert(batch);
    }

    console.log(`Broadcast complete: ${successCount} success, ${failedCount} failed`);

    // Save broadcast to history
    await supabase.from('broadcast_notifications').insert({
      title,
      body: body || null,
      action_url: url || '/',
      target_type: targetType || 'all',
      target_region: targetType === 'region' ? region : null,
      sent_by: user.id,
      success_count: successCount,
      failed_count: failedCount,
      total_subscriptions: subscriptions.length,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        successCount, 
        failedCount,
        totalSubscriptions: subscriptions.length 
      }),
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
