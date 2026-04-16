import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // === Auth check (admin/moderator only - this is a promo image generator) ===
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // Restrict to admins/moderators only - prevents AI cost abuse
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (roleRows ?? []).map((r: any) => r.role);
    if (!roles.includes("admin") && !roles.includes("moderator")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { prompt, template_id } = await req.json();

    // Build the image generation prompt based on template or custom prompt
    let finalPrompt = "";

    const templates: Record<string, string> = {
      welcome: "Create a vibrant, modern promotional image for a gay social networking app called 'Gay Social'. Show a welcoming rainbow-themed design with silhouettes of diverse men connecting, chatting icons, and the text 'Rejoins la communauté !' in bold white letters. Use warm purple and rainbow gradient colors. Mobile app style, 9:16 aspect ratio, clean and professional.",
      swipe: "Create an exciting promotional image for 'Gay Social' dating app feature. Show a stylized swipe card interface with attractive profile cards, hearts floating, and the text 'Swipe & Match !' in bold. Use vibrant purple, pink and blue gradient colors with a modern UI aesthetic. 9:16 mobile story format.",
      chat: "Create a promotional image for 'Gay Social' group chat feature. Show colorful chat bubbles, a map of France with regional pins, and the text 'Discute avec ta région !' in bold. Use rainbow accents on a dark modern background. 9:16 mobile story format, clean design.",
      stories: "Create a promotional image for 'Gay Social' Stories feature. Show a phone screen with story circles, camera icon, and sparkle effects. Text: 'Partage ta Story !' in bold white. Purple to pink gradient background with modern glassmorphism effects. 9:16 format.",
      security: "Create a promotional image for 'Gay Social' emphasizing safety and verification. Show a shield icon with a checkmark, lock symbols, and the text 'Profils vérifiés, communauté safe !' in bold. Use deep blue and purple tones with gold accents. 9:16 mobile story format.",
      premium: "Create a luxurious promotional image for 'Gay Social Premium'. Show a golden crown, sparkles, exclusive badge, and the text 'Passe Premium 👑' in elegant gold letters on a dark purple background. 9:16 format, premium and sophisticated look.",
    };

    if (template_id && templates[template_id]) {
      finalPrompt = templates[template_id];
    } else if (prompt) {
      finalPrompt = `Create a promotional image for a gay social networking app called 'Gay Social'. The image should be in 9:16 mobile story format with modern, vibrant design. ${prompt}`;
    } else {
      throw new Error("Either prompt or template_id is required");
    }

    console.log("[generate-story-image] Generating with prompt:", finalPrompt.substring(0, 100));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: finalPrompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessaie dans quelques instants." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits AI insuffisants." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error("No image generated");
    }

    return new Response(JSON.stringify({ image_url: imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-story-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
