import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EXPORT-USER-DATA] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");

    const userId = userData.user.id;
    const userEmail = userData.user.email;
    logStep("User authenticated", { userId });

    // Parse request body for password verification
    const { password } = await req.json();
    if (!password) throw new Error("Password required for data export");

    // Verify password by attempting to sign in
    const { error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: userEmail!,
      password: password,
    });

    if (signInError) {
      logStep("Password verification failed");
      return new Response(
        JSON.stringify({ error: "Mot de passe incorrect" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    logStep("Password verified, collecting user data");

    // Collect all user data from various tables
    const [
      profileResult,
      creditsResult,
      transactionsResult,
      messagesResult,
      favoritesResult,
      photosResult,
      albumsResult,
      savedMessagesResult,
      notificationPrefsResult,
      reactionsGivenResult,
      reactionsReceivedResult,
    ] = await Promise.all([
      supabaseClient.from("profiles").select("*").eq("user_id", userId).single(),
      supabaseClient.from("user_credits").select("*").eq("user_id", userId).single(),
      supabaseClient.from("credit_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabaseClient.from("messages").select("id, content, message_type, created_at, chat_room_id, is_private").eq("sender_id", userId).order("created_at", { ascending: false }),
      supabaseClient.from("user_favorites").select("favorite_user_id, created_at").eq("user_id", userId),
      supabaseClient.from("profile_photos").select("photo_url, is_primary, display_order, created_at").eq("user_id", userId),
      supabaseClient.from("user_albums").select("id, name, description, is_private, created_at").eq("user_id", userId),
      supabaseClient.from("saved_messages").select("content, created_at, updated_at").eq("user_id", userId),
      supabaseClient.from("notification_preferences").select("*").eq("user_id", userId).single(),
      supabaseClient.from("profile_reactions").select("emoji, profile_user_id, created_at").eq("reactor_user_id", userId),
      supabaseClient.from("profile_reactions").select("emoji, reactor_user_id, created_at").eq("profile_user_id", userId),
    ]);

    // Get album media for user's albums
    const albumIds = albumsResult.data?.map(a => a.id) || [];
    let albumMediaData: unknown[] = [];
    if (albumIds.length > 0) {
      const albumMediaResult = await supabaseClient
        .from("album_media")
        .select("album_id, media_url, media_type, created_at")
        .in("album_id", albumIds);
      albumMediaData = albumMediaResult.data || [];
    }

    // Build export data
    const exportData = {
      export_info: {
        exported_at: new Date().toISOString(),
        user_id: userId,
        email: userEmail,
        platform: "Gay Connect",
        rgpd_article: "Article 20 - Droit à la portabilité des données",
      },
      profile: profileResult.data || null,
      credits: {
        balance: creditsResult.data || null,
        transactions: transactionsResult.data || [],
      },
      messages: {
        total_count: messagesResult.data?.length || 0,
        messages: messagesResult.data || [],
      },
      favorites: favoritesResult.data || [],
      photos: photosResult.data || [],
      albums: {
        albums: albumsResult.data || [],
        media: albumMediaData,
      },
      saved_messages: savedMessagesResult.data || [],
      notification_preferences: notificationPrefsResult.data || null,
      reactions: {
        given: reactionsGivenResult.data || [],
        received: reactionsReceivedResult.data || [],
      },
    };

    logStep("Data export completed", { 
      messagesCount: exportData.messages.total_count,
      photosCount: exportData.photos.length,
      albumsCount: exportData.albums.albums.length,
    });

    return new Response(
      JSON.stringify({ success: true, data: exportData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
