import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { ZipWriter, BlobWriter, BlobReader, TextReader } from "https://deno.land/x/zipjs@v2.7.32/index.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EXPORT-USER-DATA] ${step}${detailsStr}`);
};

// Helper to extract file path from Supabase storage URL
const extractStoragePath = (url: string): { bucket: string; path: string } | null => {
  try {
    // Pattern: /storage/v1/object/public/bucket-name/path or signed URLs
    const publicMatch = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^\/]+)\/(.+?)(?:\?|$)/);
    if (publicMatch) {
      return { bucket: publicMatch[1], path: decodeURIComponent(publicMatch[2]) };
    }
    return null;
  } catch {
    return null;
  }
};

// Helper to get file extension from URL or content type
const getFileExtension = (url: string, contentType?: string): string => {
  // Try to get from URL
  const urlMatch = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  if (urlMatch) return urlMatch[1].toLowerCase();
  
  // Fallback based on content type
  if (contentType) {
    if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
    if (contentType.includes('png')) return 'png';
    if (contentType.includes('gif')) return 'gif';
    if (contentType.includes('webp')) return 'webp';
    if (contentType.includes('mp4')) return 'mp4';
    if (contentType.includes('webm')) return 'webm';
  }
  
  return 'bin';
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
      privateMessagesResult,
      favoritesResult,
      photosResult,
      albumsResult,
      savedMessagesResult,
      notificationPrefsResult,
      reactionsGivenResult,
      reactionsReceivedResult,
      ephemeralMediaResult,
    ] = await Promise.all([
      supabaseClient.from("profiles").select("*").eq("user_id", userId).single(),
      supabaseClient.from("user_credits").select("*").eq("user_id", userId).single(),
      supabaseClient.from("credit_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabaseClient.from("messages").select("id, content, message_type, created_at, chat_room_id").eq("sender_id", userId).eq("is_private", false).order("created_at", { ascending: false }),
      supabaseClient.from("messages").select("id, content, message_type, created_at, recipient_id").eq("sender_id", userId).eq("is_private", true).order("created_at", { ascending: false }),
      supabaseClient.from("user_favorites").select("favorite_user_id, created_at").eq("user_id", userId),
      supabaseClient.from("profile_photos").select("photo_url, is_primary, display_order, created_at").eq("user_id", userId),
      supabaseClient.from("user_albums").select("id, name, description, is_private, created_at").eq("user_id", userId),
      supabaseClient.from("saved_messages").select("content, created_at, updated_at").eq("user_id", userId),
      supabaseClient.from("notification_preferences").select("*").eq("user_id", userId).single(),
      supabaseClient.from("profile_reactions").select("emoji, profile_user_id, created_at").eq("reactor_user_id", userId),
      supabaseClient.from("profile_reactions").select("emoji, reactor_user_id, created_at").eq("profile_user_id", userId),
      supabaseClient.from("ephemeral_media").select("id, media_url, media_type, created_at, message_id").eq("message_id", supabaseClient.from("messages").select("id").eq("sender_id", userId)),
    ]);

    // Get album media for user's albums
    const albumIds = albumsResult.data?.map(a => a.id) || [];
    let albumMediaData: Array<{ album_id: string; media_url: string; media_type: string; created_at: string }> = [];
    if (albumIds.length > 0) {
      const albumMediaResult = await supabaseClient
        .from("album_media")
        .select("album_id, media_url, media_type, created_at")
        .in("album_id", albumIds);
      albumMediaData = albumMediaResult.data || [];
    }

    // Get ephemeral media sent by user
    const userMessageIds = [...(messagesResult.data || []), ...(privateMessagesResult.data || [])].map(m => m.id);
    let userEphemeralMedia: Array<{ id: string; media_url: string; media_type: string; created_at: string }> = [];
    if (userMessageIds.length > 0) {
      const ephemeralResult = await supabaseClient
        .from("ephemeral_media")
        .select("id, media_url, media_type, created_at")
        .in("message_id", userMessageIds.slice(0, 100)); // Limit to avoid query timeout
      userEphemeralMedia = ephemeralResult.data || [];
    }

    logStep("Data collected, creating ZIP archive");

    // Create ZIP archive
    const blobWriter = new BlobWriter("application/zip");
    const zipWriter = new ZipWriter(blobWriter);

    // Build export data JSON
    const exportData = {
      export_info: {
        exported_at: new Date().toISOString(),
        user_id: userId,
        email: userEmail,
        platform: "Gay Connect",
        rgpd_article: "Article 20 - Droit à la portabilité des données",
        description: "Ce fichier contient l'ensemble de vos données personnelles conformément au RGPD. Les médias sont organisés dans des dossiers séparés.",
      },
      profile: profileResult.data || null,
      credits: {
        balance: creditsResult.data || null,
        transactions: transactionsResult.data || [],
      },
      messages: {
        group_messages: {
          count: messagesResult.data?.length || 0,
          messages: messagesResult.data || [],
        },
        private_messages: {
          count: privateMessagesResult.data?.length || 0,
          messages: privateMessagesResult.data || [],
        },
      },
      favorites: favoritesResult.data || [],
      photos: (photosResult.data || []).map((p, i) => ({
        ...p,
        local_file: `photos/profile_photo_${i + 1}.${getFileExtension(p.photo_url)}`,
      })),
      albums: {
        albums: albumsResult.data || [],
        media: albumMediaData.map((m, i) => ({
          ...m,
          local_file: `albums/${m.album_id}/${i + 1}.${getFileExtension(m.media_url)}`,
        })),
      },
      ephemeral_media_sent: userEphemeralMedia.map((m, i) => ({
        ...m,
        local_file: `ephemeral/${i + 1}.${getFileExtension(m.media_url)}`,
      })),
      saved_messages: savedMessagesResult.data || [],
      notification_preferences: notificationPrefsResult.data || null,
      reactions: {
        given: reactionsGivenResult.data || [],
        received: reactionsReceivedResult.data || [],
      },
    };

    // Add main data JSON file
    await zipWriter.add(
      "mes_donnees.json",
      new TextReader(JSON.stringify(exportData, null, 2))
    );

    // Add README file
    const readmeContent = `
╔══════════════════════════════════════════════════════════════════╗
║                    EXPORT DE VOS DONNÉES                         ║
║                        Gay Connect                               ║
╚══════════════════════════════════════════════════════════════════╝

Date d'export: ${new Date().toLocaleString('fr-FR')}
Email: ${userEmail}

CONTENU DE L'ARCHIVE:
─────────────────────
📄 mes_donnees.json    - Toutes vos données au format JSON
📁 photos/             - Vos photos de profil
📁 albums/             - Vos albums privés et leurs médias
📁 ephemeral/          - Médias éphémères que vous avez envoyés

DONNÉES INCLUSES:
─────────────────
• Informations de profil
• Historique des crédits et transactions
• Messages de groupe envoyés
• Messages privés envoyés
• Liste de favoris
• Réactions données et reçues
• Messages sauvegardés
• Préférences de notification

RGPD - ARTICLE 20:
──────────────────
Conformément au droit à la portabilité des données (RGPD Art. 20),
vous pouvez télécharger vos données dans un format structuré,
couramment utilisé et lisible par machine.

Pour toute question, contactez notre support.

────────────────────────────────────────────────────────────────────
                     © ${new Date().getFullYear()} Gay Connect
`;
    await zipWriter.add("LISEZ_MOI.txt", new TextReader(readmeContent));

    // Download and add profile photos
    let photoCount = 0;
    const photos = photosResult.data || [];
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      try {
        const storagePath = extractStoragePath(photo.photo_url);
        if (storagePath) {
          const { data: fileData, error: fileError } = await supabaseClient.storage
            .from(storagePath.bucket)
            .download(storagePath.path);
          
          if (!fileError && fileData) {
            const ext = getFileExtension(photo.photo_url);
            await zipWriter.add(
              `photos/profile_photo_${i + 1}.${ext}`,
              new BlobReader(fileData)
            );
            photoCount++;
            logStep(`Added photo ${i + 1}/${photos.length}`);
          }
        }
      } catch (err) {
        logStep(`Failed to download photo ${i}`, { error: err });
      }
    }

    // Download and add album media
    let albumMediaCount = 0;
    for (const media of albumMediaData) {
      try {
        const storagePath = extractStoragePath(media.media_url);
        if (storagePath) {
          const { data: fileData, error: fileError } = await supabaseClient.storage
            .from(storagePath.bucket)
            .download(storagePath.path);
          
          if (!fileError && fileData) {
            const ext = getFileExtension(media.media_url);
            const albumIndex = albumMediaData.filter(m => m.album_id === media.album_id).indexOf(media) + 1;
            await zipWriter.add(
              `albums/${media.album_id}/${albumIndex}.${ext}`,
              new BlobReader(fileData)
            );
            albumMediaCount++;
          }
        }
      } catch (err) {
        logStep(`Failed to download album media`, { error: err });
      }
    }

    // Download ephemeral media (if still available)
    let ephemeralCount = 0;
    for (let i = 0; i < userEphemeralMedia.length; i++) {
      const media = userEphemeralMedia[i];
      try {
        const storagePath = extractStoragePath(media.media_url);
        if (storagePath) {
          const { data: fileData, error: fileError } = await supabaseClient.storage
            .from(storagePath.bucket)
            .download(storagePath.path);
          
          if (!fileError && fileData) {
            const ext = getFileExtension(media.media_url);
            await zipWriter.add(
              `ephemeral/${i + 1}.${ext}`,
              new BlobReader(fileData)
            );
            ephemeralCount++;
          }
        }
      } catch (err) {
        logStep(`Failed to download ephemeral media`, { error: err });
      }
    }

    // Close ZIP and get blob
    const zipBlob = await zipWriter.close();
    const zipArrayBuffer = await zipBlob.arrayBuffer();
    
    // Convert to base64 in chunks to avoid stack overflow
    const bytes = new Uint8Array(zipArrayBuffer);
    const chunkSize = 8192;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      for (let j = 0; j < chunk.length; j++) {
        binary += String.fromCharCode(chunk[j]);
      }
    }
    const zipBase64 = btoa(binary);

    logStep("ZIP archive created", { 
      photos: photoCount,
      albumMedia: albumMediaCount,
      ephemeral: ephemeralCount,
      totalSize: zipArrayBuffer.byteLength,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        zip_base64: zipBase64,
        filename: `gayconnect-export-${new Date().toISOString().split('T')[0]}.zip`,
        stats: {
          photos: photoCount,
          album_media: albumMediaCount,
          ephemeral_media: ephemeralCount,
          group_messages: messagesResult.data?.length || 0,
          private_messages: privateMessagesResult.data?.length || 0,
        }
      }),
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
