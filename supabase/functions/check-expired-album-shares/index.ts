import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find album shares that just expired (within the last 5 minutes to avoid duplicates)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const { data: expiredShares, error: sharesError } = await supabase
      .from("album_shares")
      .select(`
        id,
        album_id,
        shared_with_user_id,
        shared_by_user_id,
        expires_at,
        user_albums!inner(name)
      `)
      .eq("is_active", true)
      .not("expires_at", "is", null)
      .lte("expires_at", now)
      .gte("expires_at", fiveMinutesAgo);

    if (sharesError) {
      console.error("Error fetching expired shares:", sharesError);
      throw sharesError;
    }

    console.log(`Found ${expiredShares?.length || 0} expired shares to process`);

    const notifications: {
      user_id: string;
      type: string;
      title: string;
      message: string;
      action_url: string;
    }[] = [];

    const shareIdsToDeactivate: string[] = [];

    for (const share of expiredShares || []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const albumData = share.user_albums as any;
      const albumName = albumData?.name || "Album privé";

      // Get owner username
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", share.shared_by_user_id)
        .single();

      const ownerName = ownerProfile?.username || "Un utilisateur";

      // Notify recipient that access has expired
      notifications.push({
        user_id: share.shared_with_user_id,
        type: "album_share_expired",
        title: "⏰ Accès album expiré",
        message: `L'accès à l'album "${albumName}" partagé par ${ownerName} a expiré.`,
        action_url: "/",
      });

      shareIdsToDeactivate.push(share.id);
    }

    // Insert all notifications
    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (notifError) {
        console.error("Error inserting notifications:", notifError);
      }
    }

    // Deactivate expired shares
    if (shareIdsToDeactivate.length > 0) {
      const { error: updateError } = await supabase
        .from("album_shares")
        .update({ is_active: false })
        .in("id", shareIdsToDeactivate);

      if (updateError) {
        console.error("Error deactivating shares:", updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: expiredShares?.length || 0,
        notifications_sent: notifications.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in check-expired-album-shares:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
