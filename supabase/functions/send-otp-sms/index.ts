import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { action, target_user_id, ticket_id, phone_number, otp_id, code: submitted_code, interrupt_token } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let authenticatedUserId: string | null = null;

    // Interrupt action is public (called from SMS link by the user)
    if (action !== 'interrupt') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Non autorisé' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
      const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Non autorisé' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      authenticatedUserId = user.id;

      const { data: hasAdminRole } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      const { data: hasModRole } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'moderator' });
      if (!hasAdminRole && !hasModRole) {
        return new Response(JSON.stringify({ error: 'Permissions insuffisantes' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (action === 'send') {
      // Generate 6-digit OTP
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min
      const interruptToken = crypto.randomUUID();

      // Store OTP in database
      const { data: otpData, error: otpError } = await supabase
        .from('support_otp_codes')
        .insert({
          user_id: target_user_id,
          ticket_id,
          code,
          expires_at: expiresAt,
          interrupt_token: interruptToken,
          created_by: authenticatedUserId,
        })
        .select()
        .single();

      if (otpError) {
        console.error('OTP insert error:', otpError);
        return new Response(JSON.stringify({ error: 'Erreur lors de la création du code' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Send SMS via Twilio
      const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const twilioAuth = Deno.env.get('TWILIO_AUTH_TOKEN');
      const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

      if (!twilioSid || !twilioAuth || !twilioPhone) {
        return new Response(JSON.stringify({ error: 'Twilio non configuré' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const siteUrl = Deno.env.get('SITE_URL') || 'https://gaysocial.fr';
      const interruptLink = `${siteUrl}/?interrupt=${interruptToken}`;

      const smsBody = `Gay Social - Code de vérification : ${code}\n\n` +
        `Ce code est utilisable uniquement avec un conseiller Gay Social et est valable 5 minutes.\n\n` +
        `Si vous n'avez pas contacté le service client, cliquez ici pour interrompre l'accès à votre dossier : ${interruptLink}`;

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const twilioBody = new URLSearchParams({
        To: phone_number,
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
        console.error('Twilio error:', twilioResult);
        return new Response(JSON.stringify({ error: 'Erreur envoi SMS', details: twilioResult.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        otp_id: otpData.id,
        expires_at: expiresAt,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'verify') {
      const { data: otpRecord, error: fetchErr } = await supabase
        .from('support_otp_codes')
        .select('*')
        .eq('id', otp_id)
        .single();

      if (fetchErr || !otpRecord) {
        return new Response(JSON.stringify({ error: 'Code introuvable' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (otpRecord.interrupted_at) {
        return new Response(JSON.stringify({ error: 'Accès interrompu par le client' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (new Date(otpRecord.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'Code expiré' }), {
          status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (otpRecord.code !== submitted_code) {
        return new Response(JSON.stringify({ error: 'Code incorrect' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabase
        .from('support_otp_codes')
        .update({ verified_at: new Date().toISOString() })
        .eq('id', otp_id);

      return new Response(JSON.stringify({ success: true, verified: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'interrupt') {
      const { error: updateErr } = await supabase
        .from('support_otp_codes')
        .update({ interrupted_at: new Date().toISOString() })
        .eq('interrupt_token', interrupt_token)
        .is('interrupted_at', null);

      if (updateErr) {
        return new Response(JSON.stringify({ error: 'Erreur interruption' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, interrupted: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Action inconnue' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
