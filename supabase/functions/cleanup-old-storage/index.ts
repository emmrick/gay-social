import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logCronRun } from "../_shared/cron-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const __cronStart = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const results: Record<string, { deleted: number; errors: number }> = {};

    // 1. Clean ephemeral media files older than 90 days that have been viewed
    const { data: oldEphemeral } = await supabase
      .from("ephemeral_media")
      .select("id, media_url, message_id")
      .eq("is_viewed", true)
      .lt("created_at", ninetyDaysAgo);

    let ephemeralDeleted = 0;
    let ephemeralErrors = 0;

    for (const media of oldEphemeral || []) {
      // Extract path from URL
      const path = extractStoragePath(media.media_url, "ephemeral-media");
      if (path) {
        const { error } = await supabase.storage
          .from("ephemeral-media")
          .remove([path]);
        if (error) {
          console.error(`Error deleting ephemeral file ${path}:`, error);
          ephemeralErrors++;
        } else {
          ephemeralDeleted++;
        }
      }
    }

    // Delete ephemeral_media DB records for viewed items older than 90 days
    if (oldEphemeral && oldEphemeral.length > 0) {
      const ids = oldEphemeral.map((m) => m.id);
      await supabase.from("ephemeral_media").delete().in("id", ids);
    }

    results["ephemeral-media"] = { deleted: ephemeralDeleted, errors: ephemeralErrors };

    // 2. Clean orphaned media files (files in storage not referenced by any message or profile)
    // Check media bucket for old files
    const { data: mediaFiles } = await supabase.storage
      .from("media")
      .list("", { limit: 500, sortBy: { column: "created_at", order: "asc" } });

    let mediaDeleted = 0;
    let mediaErrors = 0;

    for (const folder of mediaFiles || []) {
      // List files in user folders
      const { data: userFiles } = await supabase.storage
        .from("media")
        .list(folder.name, { limit: 500 });

      for (const file of userFiles || []) {
        if (!file.created_at) continue;
        const fileDate = new Date(file.created_at);
        const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

        if (fileDate < cutoff) {
          const fullPath = `${folder.name}/${file.name}`;

          // Check if this file is still referenced in messages
          const { count } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .ilike("content", `%${file.name}%`);

          if (!count || count === 0) {
            const { error } = await supabase.storage
              .from("media")
              .remove([fullPath]);
            if (error) {
              mediaErrors++;
            } else {
              mediaDeleted++;
            }
          }
        }
      }
    }

    results["media"] = { deleted: mediaDeleted, errors: mediaErrors };

    // 3. Clean old notifications (> 6 months, already read)
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
    const { count: notifCount } = await supabase
      .from("notifications")
      .delete({ count: "exact" })
      .eq("is_read", true)
      .lt("created_at", sixMonthsAgo);

    results["notifications"] = { deleted: notifCount || 0, errors: 0 };

    // 4. Clean old credit transactions (> 1 year)
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const { count: txCount } = await supabase
      .from("credit_transactions")
      .delete({ count: "exact" })
      .lt("created_at", oneYearAgo);

    results["credit_transactions"] = { deleted: txCount || 0, errors: 0 };

    // 5. Clean old typing indicators
    const { count: typingCount } = await supabase
      .from("typing_indicators")
      .delete({ count: "exact" })
      .lt("started_at", new Date(Date.now() - 60 * 1000).toISOString());

    results["typing_indicators"] = { deleted: typingCount || 0, errors: 0 };

    console.log("Cleanup results:", JSON.stringify(results));

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    await logCronRun("cleanup-old-storage", "success", { durationMs: Date.now() - __cronStart });
    await logCronRun("cleanup-old-storage", "success", { durationMs: Date.now() - __cronStart });

  } catch (error: unknown) {
    const __errMsg = (error instanceof Error) ? error.message : String(error);
    await logCronRun("cleanup-old-storage", "error", { durationMs: Date.now() - __cronStart, errorMessage: __errMsg });
    await logCronRun("cleanup-old-storage", "error", { durationMs: Date.now() - __cronStart, errorMessage: __errMsg });
    console.error("Cleanup error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function extractStoragePath(url: string, bucket: string): string | null {
  try {
    const idx = url.indexOf(`/${bucket}/`);
    if (idx === -1) return null;
    return url.substring(idx + bucket.length + 2);
  } catch {
    return null;
  }
}
