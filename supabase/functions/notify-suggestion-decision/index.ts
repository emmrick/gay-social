import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

interface Payload {
  suggestion_id: string;
  user_id: string;
  status: "approved" | "rejected";
  title: string | null;
  credits_awarded: number | null;
  admin_notes: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const payload = (await req.json()) as Payload;

    if (
      !payload?.suggestion_id ||
      !payload?.user_id ||
      (payload.status !== "approved" && payload.status !== "rejected")
    ) {
      return new Response(JSON.stringify({ error: "invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    // Load notification preferences (defaults to true)
    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("suggestion_decisions_push, suggestion_decisions_email")
      .eq("user_id", payload.user_id)
      .maybeSingle();
    const pushEnabled = prefs?.suggestion_decisions_push ?? true;
    const emailEnabled = prefs?.suggestion_decisions_email ?? true;

    // Resolve recipient: email + pseudo
    const { data: authUserRes } = await admin.auth.admin.getUserById(
      payload.user_id,
    );
    const email = authUserRes?.user?.email ?? null;

    const { data: profile } = await admin
      .from("profiles")
      .select("username")
      .eq("id", payload.user_id)
      .maybeSingle();
    const pseudo = profile?.username ?? null;

    const isApproved = payload.status === "approved";
    const titleShort = (payload.title ?? "Votre proposition").slice(0, 80);

    // Dedup / rate-limit window: 1h between notifications for the same suggestion+channel,
    // and never twice for the same (suggestion, status, channel) — enforced by unique index.
    const RATE_LIMIT_MS = 60 * 60 * 1000;
    const sinceIso = new Date(Date.now() - RATE_LIMIT_MS).toISOString();

    const { data: recentLogs } = await admin
      .from("suggestion_notification_log")
      .select("channel, status, sent_at")
      .eq("suggestion_id", payload.suggestion_id)
      .gte("sent_at", sinceIso);

    const alreadySent = (channel: "email" | "push") =>
      (recentLogs ?? []).some(
        (l: any) =>
          l.channel === channel &&
          (l.status === payload.status || // exact same decision: skip forever (unique idx)
            true), // any decision in last 1h: skip (rate limit)
      );

    const logSent = async (channel: "email" | "push") => {
      const { error } = await admin
        .from("suggestion_notification_log")
        .insert({
          suggestion_id: payload.suggestion_id,
          user_id: payload.user_id,
          status: payload.status,
          channel,
        });
      if (error) console.warn("[notify-suggestion-decision] log insert:", error.message);
    };

    let pushSent = false;
    let emailSent = false;

    // 1. Push notification (best-effort, respects preference + dedup)
    if (pushEnabled && !alreadySent("push")) {
      try {
        const pushBody = {
          userId: payload.user_id,
          title: isApproved
            ? "🎉 Votre idée a été approuvée !"
            : "Mise à jour sur votre proposition",
          body: isApproved
            ? payload.credits_awarded && payload.credits_awarded > 0
              ? `« ${titleShort} » — +${payload.credits_awarded} crédits crédités !`
              : `« ${titleShort} » a été approuvée. Merci !`
            : `« ${titleShort} » n'a pas été retenue cette fois-ci.`,
          url: "/profile",
          tag: `suggestion-${payload.suggestion_id}`,
          notificationType: "system",
        };

        await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify(pushBody),
        });
        await logSent("push");
        pushSent = true;
      } catch (e) {
        console.error("[notify-suggestion-decision] push error:", e);
      }
    }

    // 2. Transactional email (best-effort, respects preference + dedup)
    if (email && emailEnabled && !alreadySent("email")) {
      try {
        const templateName = isApproved
          ? "suggestion-approved"
          : "suggestion-rejected";

        const templateData: Record<string, unknown> = {
          pseudo,
          suggestionTitle: payload.title ?? undefined,
          adminNotes: payload.admin_notes ?? undefined,
        };
        if (isApproved && payload.credits_awarded && payload.credits_awarded > 0) {
          templateData.creditsAwarded = payload.credits_awarded;
        }

        await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({
            templateName,
            recipientEmail: email,
            idempotencyKey: `suggestion-${payload.status}-${payload.suggestion_id}`,
            templateData,
          }),
        });
        await logSent("email");
        emailSent = true;
      } catch (e) {
        console.error("[notify-suggestion-decision] email error:", e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        push_sent: pushSent,
        email_sent: emailSent,
        deduped: {
          push: pushEnabled && !pushSent,
          email: !!email && emailEnabled && !emailSent,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[notify-suggestion-decision] fatal:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
