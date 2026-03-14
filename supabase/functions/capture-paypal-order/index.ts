import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const { order_id } = await req.json()

    if (!order_id) {
      return new Response(JSON.stringify({ error: 'Missing order_id' }), { status: 400, headers: corsHeaders })
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify order belongs to user and is not already captured
    const { data: order, error: orderError } = await serviceClient
      .from('paypal_orders')
      .select('*')
      .eq('paypal_order_id', order_id)
      .eq('user_id', userId)
      .single()

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers: corsHeaders })
    }

    if (order.status === 'captured') {
      return new Response(JSON.stringify({ error: 'Order already captured', already_captured: true }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Capture PayPal order
    const accessToken = await getPayPalAccessToken()

    const captureRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${order_id}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    const captureData = await captureRes.json()
    if (!captureRes.ok) {
      throw new Error(`PayPal capture failed: ${JSON.stringify(captureData)}`)
    }

    if (captureData.status !== 'COMPLETED') {
      await serviceClient.from('paypal_orders')
        .update({ status: captureData.status, updated_at: new Date().toISOString() })
        .eq('id', order.id)

      return new Response(JSON.stringify({ error: 'Payment not completed', paypal_status: captureData.status }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update order status
    await serviceClient.from('paypal_orders')
      .update({ status: 'captured', captured_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', order.id)

    // Credit user automatically
    const { error: creditError } = await serviceClient.rpc('add_credits', {
      _user_id: userId,
      _amount: order.credits_amount,
      _credit_type: 'purchased',
      _transaction_type: 'paypal_purchase',
      _description: `Achat PayPal de ${order.credits_amount} crédits (${order.price_euros}€)`,
    })

    if (creditError) {
      console.error('Error crediting user:', creditError)
      // Still return success since payment was captured — admin can manually credit
      return new Response(JSON.stringify({
        success: true,
        credits: order.credits_amount,
        warning: 'Payment captured but credit failed — contact support',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Send notification
    await serviceClient.from('notifications').insert({
      user_id: userId,
      type: 'credit_purchase',
      title: '💰 Crédits ajoutés !',
      message: `${order.credits_amount} crédits ont été ajoutés à ton compte suite à ton paiement PayPal de ${order.price_euros}€.`,
      is_read: false,
    })

    return new Response(JSON.stringify({
      success: true,
      credits: order.credits_amount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error capturing PayPal order:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
