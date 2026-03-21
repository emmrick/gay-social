import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { task_type, description, reward_cents } = body;

    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuth = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioSid || !twilioAuth || !twilioPhone) {
      console.warn('Twilio not configured, skipping SMS notification');
      return new Response(JSON.stringify({ skipped: true, reason: 'Twilio non configuré' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetPhone = '+33767601147';

    const taskTypeLabels: Record<string, string> = {
      support_chat: '💬 Support client',
      identity_verification: '🪪 Vérification d\'identité',
      report_review: '⚠️ Signalement',
      credit_management: '💳 Gestion crédits',
    };

    const label = taskTypeLabels[task_type] || task_type;
    const reward = reward_cents ? `${(reward_cents / 100).toFixed(2)}€` : '';

    const smsBody = `🔔 Gay Social — Nouvelle mission\n\n` +
      `Type : ${label}\n` +
      `${description ? `Détail : ${description}\n` : ''}` +
      `${reward ? `Rémunération : ${reward}\n` : ''}` +
      `\nConnectez-vous à l'espace modération pour traiter cette mission.`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
    const twilioBody = new URLSearchParams({
      To: targetPhone,
      From: twilioPhone,
      Body: smsBody,
    });

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioAuth}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: twilioBody.toString(),
    });

    const twilioResult = await twilioResponse.json();
    if (!twilioResponse.ok) {
      console.error('Twilio SMS error:', twilioResult);
      return new Response(JSON.stringify({ success: false, error: twilioResult.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, sid: twilioResult.sid }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
