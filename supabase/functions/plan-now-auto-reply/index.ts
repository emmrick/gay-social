// Plan Now — auto-reply edge function.
// Triggered by a Postgres AFTER INSERT trigger on `messages` for private text DMs
// where the recipient has an active Plan Now session.
//
// Pipeline:
//  1. Load recipient's auto-reply templates.
//  2. Classify the incoming message into one of: looking_for | available_now | photo_exchange | other
//     via Lovable AI Gateway (google/gemini-2.5-flash-lite).
//  3. If category != 'other' and the corresponding template is non-empty, insert
//     a new `messages` row as the recipient with `is_auto_reply = true` and
//     `message_type = 'auto_reply'`.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Category = 'looking_for' | 'available_now' | 'photo_exchange' | 'other';

interface Payload {
  message_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as Payload;
    if (!body?.message_id || !body?.sender_id || !body?.recipient_id || !body?.content) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1) Load templates
    const { data: tpl } = await supabase
      .from('plan_now_auto_replies')
      .select('looking_for, available_now, photo_exchange, enabled')
      .eq('user_id', body.recipient_id)
      .maybeSingle();

    if (!tpl || tpl.enabled === false) {
      return json({ skipped: 'no_templates_or_disabled' });
    }

    // 2) Classify
    const category = await classify(body.content);
    if (category === 'other') return json({ skipped: 'other_category' });

    const reply = (tpl as any)[category] as string | null;
    if (!reply || !reply.trim()) return json({ skipped: 'empty_template', category });

    // 3) Insert auto-reply message
    const { error: insertErr } = await supabase.from('messages').insert({
      sender_id: body.recipient_id,
      recipient_id: body.sender_id,
      content: reply.trim(),
      message_type: 'auto_reply',
      is_private: true,
      is_auto_reply: true,
      reply_to_id: body.message_id,
    } as any);

    if (insertErr) {
      console.error('insert auto-reply failed', insertErr);
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return json({ ok: true, category });
  } catch (err) {
    console.error('plan-now-auto-reply error', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function json(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function classify(text: string): Promise<Category> {
  // Cheap heuristic first to avoid AI calls on obvious cases.
  const t = text.toLowerCase();
  if (/photo|pic|nude|nu|snap|selfie|image/.test(t)) return 'photo_exchange';
  if (/quand|dispo|ce soir|maintenant|now|tonight|libre|aujourd'?hui|demain/.test(t)) return 'available_now';
  if (/cherche|recherche|envie|plan|tu veux|tu fais quoi|t'?aimes|kiff/.test(t)) return 'looking_for';

  if (!LOVABLE_API_KEY) return 'other';

  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content:
              "Tu classifies un message reçu en français dans un chat de rencontre gay. " +
              "Réponds STRICTEMENT par un seul mot parmi: looking_for, available_now, photo_exchange, other. " +
              "- looking_for = la personne demande ce que l'autre cherche/recherche/aime. " +
              "- available_now = demande de disponibilité (quand, ce soir, maintenant...). " +
              "- photo_exchange = demande de photos / snap / image. " +
              "- other = aucune des trois.",
          },
          { role: 'user', content: text.slice(0, 500) },
        ],
        temperature: 0,
        max_tokens: 8,
      }),
    });
    if (!res.ok) return 'other';
    const data = await res.json();
    const out = String(data?.choices?.[0]?.message?.content ?? '').trim().toLowerCase();
    if (out.includes('looking_for')) return 'looking_for';
    if (out.includes('available_now')) return 'available_now';
    if (out.includes('photo_exchange')) return 'photo_exchange';
    return 'other';
  } catch (err) {
    console.error('classify failed', err);
    return 'other';
  }
}
