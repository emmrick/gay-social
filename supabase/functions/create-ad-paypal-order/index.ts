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
    const { advertiser_email, amount_euros, return_url } = await req.json()

    if (!advertiser_email || !amount_euros || amount_euros < 5) {
      return new Response(JSON.stringify({ error: 'Email et montant minimum 5€ requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Ensure wallet exists
    await serviceClient.from('advertiser_wallets')
      .upsert({ advertiser_email, advertiser_name: '' }, { onConflict: 'advertiser_email' })

    const { data: wallet } = await serviceClient.from('advertiser_wallets')
      .select('id').eq('advertiser_email', advertiser_email).single()

    if (!wallet) throw new Error('Wallet not found')

    const amountCents = Math.round(amount_euros * 100)

    // Create deposit record
    const { data: deposit, error: depError } = await serviceClient.from('advertiser_deposits').insert({
      wallet_id: wallet.id,
      amount_cents: amountCents,
      payment_method: 'paypal',
      status: 'pending',
    }).select('id').single()

    if (depError) throw depError

    // Create PayPal order
    const accessToken = await getPayPalAccessToken()
    const returnUrlFinal = return_url || 'https://gay-connect.lovable.app/advertise'

    const orderRes = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'EUR', value: amount_euros.toFixed(2) },
          description: `Recharge portefeuille publicitaire GayConnect (${amount_euros}€)`,
          custom_id: deposit.id,
        }],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: 'GayConnect Ads',
              landing_page: 'NO_PREFERENCE',
              user_action: 'PAY_NOW',
              payment_method_preference: 'UNRESTRICTED',
              return_url: returnUrlFinal + `?ad_deposit=${deposit.id}`,
              cancel_url: returnUrlFinal,
            },
          },
        },
      }),
    })

    const orderData = await orderRes.json()
    if (!orderRes.ok) throw new Error(`PayPal error: ${JSON.stringify(orderData)}`)

    // Save PayPal order ID on deposit
    await serviceClient.from('advertiser_deposits')
      .update({ payment_reference: orderData.id })
      .eq('id', deposit.id)

    const redirectLink = orderData.links?.find((l: any) => l.rel === 'payer-action')?.href
      || orderData.links?.find((l: any) => l.rel === 'approve')?.href

    return new Response(JSON.stringify({
      deposit_id: deposit.id,
      order_id: orderData.id,
      approve_url: redirectLink,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error creating ad PayPal order:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})