import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const PAYPAL_API = 'https://api-m.paypal.com'

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID')!
  const secret = Deno.env.get('PAYPAL_SECRET')!
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${clientId}:${secret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`PayPal auth failed: ${JSON.stringify(data)}`)
  return data.access_token
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { deposit_id, order_id } = await req.json()
    if (!deposit_id || !order_id) {
      return new Response(JSON.stringify({ error: 'Missing deposit_id or order_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify deposit exists and is pending
    const { data: deposit } = await serviceClient.from('advertiser_deposits')
      .select('*, advertiser_wallets(id, advertiser_email, balance_cents, total_deposited_cents)')
      .eq('id', deposit_id)
      .eq('payment_reference', order_id)
      .single()

    if (!deposit) {
      return new Response(JSON.stringify({ error: 'Deposit not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (deposit.status === 'completed') {
      return new Response(JSON.stringify({ error: 'Already captured', already_captured: true }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Capture PayPal order
    const accessToken = await getPayPalAccessToken()
    const captureRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${order_id}/capture`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    })

    const captureData = await captureRes.json()
    if (!captureRes.ok || captureData.status !== 'COMPLETED') {
      await serviceClient.from('advertiser_deposits')
        .update({ status: 'failed' }).eq('id', deposit_id)
      return new Response(JSON.stringify({ error: 'Payment not completed' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update deposit
    await serviceClient.from('advertiser_deposits')
      .update({ status: 'completed', processed_at: new Date().toISOString() })
      .eq('id', deposit_id)

    // Credit advertiser wallet
    const wallet = deposit.advertiser_wallets as any
    await serviceClient.from('advertiser_wallets')
      .update({
        balance_cents: (wallet.balance_cents || 0) + deposit.amount_cents,
        total_deposited_cents: (wallet.total_deposited_cents || 0) + deposit.amount_cents,
      })
      .eq('id', wallet.id)

    return new Response(JSON.stringify({
      success: true,
      amount_cents: deposit.amount_cents,
      new_balance_cents: (wallet.balance_cents || 0) + deposit.amount_cents,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error capturing ad PayPal order:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})