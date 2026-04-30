// Webhook public reçu de Resend pour mettre à jour email_send_log avec
// les événements de livraison, ouverture, clic, bounce et plainte.
//
// Sécurité : Resend signe chaque webhook avec Svix (standardwebhooks).
// On vérifie la signature avec RESEND_WEBHOOK_SECRET.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { Webhook } from 'npm:standardwebhooks@1.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature, webhook-id, webhook-timestamp, webhook-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ResendEvent {
  type: string;
  created_at: string;
  data: {
    email_id?: string;
    to?: string[];
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET');

  const rawBody = await req.text();
  let payload: ResendEvent;

  if (webhookSecret) {
    try {
      // Resend utilise des headers svix-*. Le SDK standardwebhooks accepte
      // aussi bien `webhook-*` que `svix-*` selon le header présent.
      const headers = Object.fromEntries(req.headers);
      const wh = new Webhook(webhookSecret.replace(/^v1,whsec_/, ''));
      payload = wh.verify(rawBody, headers) as ResendEvent;
    } catch (err) {
      console.error('[resend-webhook] Signature verification failed', err);
      return new Response(JSON.stringify({ error: 'invalid_signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } else {
    console.warn('[resend-webhook] RESEND_WEBHOOK_SECRET non défini — vérification désactivée');
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response('invalid json', { status: 400, headers: corsHeaders });
    }
  }

  const eventType = payload?.type ?? '';
  const resendId = payload?.data?.email_id;
  const eventAt = payload?.created_at ? new Date(payload.created_at).toISOString() : new Date().toISOString();

  if (!resendId) {
    console.warn('[resend-webhook] event sans email_id', eventType);
    return new Response(JSON.stringify({ ok: true, ignored: 'no_email_id' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  // Cherche la ligne "sent" correspondant à ce resend_id.
  const { data: rows, error: selectErr } = await supabase
    .from('email_send_log')
    .select('id, opened_count, clicked_count, status')
    .eq('metadata->>resend_id', resendId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (selectErr) {
    console.error('[resend-webhook] select error', selectErr);
    return new Response(JSON.stringify({ error: 'db_select_failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const row = rows?.[0];
  if (!row) {
    console.warn('[resend-webhook] aucune ligne pour resend_id', resendId, 'event', eventType);
    return new Response(JSON.stringify({ ok: true, ignored: 'no_matching_row' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const update: Record<string, unknown> = { last_event_at: eventAt };
  let nextStatus: string | null = null;

  switch (eventType) {
    case 'email.delivered':
      update.delivered_at = eventAt;
      break;
    case 'email.opened':
      update.opened_count = (row.opened_count ?? 0) + 1;
      // On ne touche opened_at qu'à la première ouverture
      update.opened_at = eventAt; // upsert : si déjà rempli on l'écrase, c'est OK pour "dernière ouverture"
      break;
    case 'email.clicked':
      update.clicked_count = (row.clicked_count ?? 0) + 1;
      update.clicked_at = eventAt;
      break;
    case 'email.bounced':
      update.bounced_at = eventAt;
      nextStatus = 'bounced';
      break;
    case 'email.complained':
      update.complained_at = eventAt;
      nextStatus = 'complained';
      break;
    case 'email.delivery_delayed':
      // pas de colonne dédiée, on stocke juste last_event_at
      break;
    case 'email.failed':
      nextStatus = 'failed';
      break;
    default:
      console.log('[resend-webhook] event ignoré', eventType);
      return new Response(JSON.stringify({ ok: true, ignored: eventType }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
  }

  if (nextStatus) {
    update.status = nextStatus;
  }

  const { error: updErr } = await supabase
    .from('email_send_log')
    .update(update)
    .eq('id', row.id);

  if (updErr) {
    console.error('[resend-webhook] update error', updErr);
    return new Response(JSON.stringify({ error: 'db_update_failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, type: eventType }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
