import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // === Auth check ===
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

    const { message, detected_word, recent_messages } = await req.json();

    if (!message || !detected_word) {
      return new Response(JSON.stringify({ error: "Missing message or detected_word" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Fallback: if no API key, assume hostile (safer)
      return new Response(JSON.stringify({
        is_hostile: true,
        confidence: 0.5,
        reason: "Analyse indisponible, détection par mot-clé appliquée.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contextMessages = (recent_messages || [])
      .slice(-10)
      .map((m: any) => `[${m.sender}]: ${m.content}`)
      .join("\n");

    const systemPrompt = `Tu es un modérateur expert pour une application de rencontres gay francophone (Gay Social).
Tu dois analyser un message qui contient le mot/expression détecté(e) : "${detected_word}".

Ton rôle est de déterminer si le message est RÉELLEMENT hostile, offensant ou enfreint les règles, OU s'il s'agit de :
- Ironie / humour entre amis
- Façon de parler familière sans intention de blesser
- Autodérision
- Citation ou discussion sur le sujet (ex: parler de discrimination sans en faire)
- Contexte amical évident dans la conversation

RÈGLES D'ANALYSE :
1. Si c'est clairement une insulte directe visant quelqu'un → hostile
2. Si c'est de l'ironie amicale ou du langage familier sans méchanceté → pas hostile
3. Si le mot est utilisé dans un contexte éducatif ou de discussion → pas hostile
4. Si c'est une menace même déguisée en humour → hostile
5. Si c'est de la discrimination même "douce" → hostile
6. En cas de doute raisonnable, penche vers "pas hostile" pour ne pas sanctionner injustement
7. Si il y a un conflit visible dans les messages récents avec des propos de plus en plus osés → hostile

Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans backticks) :
{
  "is_hostile": true/false,
  "confidence": 0.0 à 1.0,
  "reason": "explication courte en français"
}`;

    const userPrompt = contextMessages
      ? `Contexte des messages récents :\n${contextMessages}\n\nMessage à analyser :\n"${message}"`
      : `Message à analyser :\n"${message}"`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", response.status, await response.text());
      // Fallback on error: assume hostile for safety
      return new Response(JSON.stringify({
        is_hostile: true,
        confidence: 0.5,
        reason: "Erreur d'analyse IA, détection par mot-clé appliquée par précaution.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response (handle potential markdown wrapping)
    let analysis;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      // Fallback
      analysis = {
        is_hostile: true,
        confidence: 0.5,
        reason: "Réponse IA non parsable, détection par mot-clé appliquée.",
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-message error:", e);
    return new Response(JSON.stringify({
      is_hostile: true,
      confidence: 0.5,
      reason: "Erreur serveur, détection par mot-clé appliquée.",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
