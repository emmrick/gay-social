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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: claims, error: authError } = await supabase.auth.getUser()
    if (authError || !claims?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const userId = claims.user.id
    const { credits, price, return_url } = await req.json()

    if (!credits || !price || credits <= 0 || price <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid credits or price' }), { status: 400, headers: corsHeaders })
    }

    // Create PayPal order
    const accessToken = await getPayPalAccessToken()

    const returnUrlFinal = return_url || 'https://gay-connect.lovable.app/paypal-return'
    const cancelUrl = return_url ? return_url.replace('paypal-return', '') : 'https://gay-connect.lovable.app/'

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
          amount: {
            currency_code: 'EUR',
            value: price.toFixed(2),
          },
          description: `${credits} crédits GayConnect`,
        }],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: 'GayConnect',
              landing_page: 'NO_PREFERENCE',
              user_action: 'PAY_NOW',
              payment_method_preference: 'UNRESTRICTED',
              return_url: returnUrlFinal,
              cancel_url: cancelUrl,
            },
          },
        },
      }),
    })

    const orderData = await orderRes.json()
    console.log('PayPal order response status:', orderRes.status)
    console.log('PayPal order response:', JSON.stringify(orderData))

    if (!orderRes.ok) {
      throw new Error(`PayPal create order failed: ${JSON.stringify(orderData)}`)
    }

    // Save order in DB
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    await serviceClient.from('paypal_orders').insert({
      user_id: userId,
      paypal_order_id: orderData.id,
      credits_amount: credits,
      price_euros: price,
      status: 'created',
    })

    // PayPal returns 'payer-action' link when payment_source is specified
    const redirectLink = orderData.links?.find((l: any) => l.rel === 'payer-action')?.href
      || orderData.links?.find((l: any) => l.rel === 'approve')?.href

    return new Response(JSON.stringify({
      order_id: orderData.id,
      approve_url: redirectLink,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error creating PayPal order:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
