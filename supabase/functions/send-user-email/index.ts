import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Verify caller is authenticated
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
  
  // Verify caller is admin/moderator
  const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '')
  const token = authHeader.replace('Bearer ', '')
  const { data: { user: caller }, error: authError } = await anonClient.auth.getUser(token)
  
  if (authError || !caller) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Check if caller has admin role
  const { data: role } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', caller.id)
    .in('role', ['admin', 'moderator'])
    .maybeSingle()

  if (!role) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: { userId: string; templateName: string; templateData?: Record<string, any> }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!body.userId || !body.templateName) {
    return new Response(JSON.stringify({ error: 'userId and templateName required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Get user email from auth.users using admin client
  const { data: { user: targetUser }, error: userError } = await supabaseAdmin.auth.admin.getUserById(body.userId)

  if (userError || !targetUser?.email) {
    return new Response(JSON.stringify({ error: 'User not found or no email' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Get username
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('username')
    .eq('user_id', body.userId)
    .maybeSingle()

  const templateData = {
    pseudo: profile?.username,
    ...body.templateData,
  }

  // Send the email via send-transactional-email
  const idempotencyKey = `${body.templateName}-${body.userId}-${Date.now()}`

  const { error: invokeError } = await supabaseAdmin.functions.invoke('send-transactional-email', {
    body: {
      templateName: body.templateName,
      recipientEmail: targetUser.email,
      idempotencyKey,
      templateData,
    },
  })

  if (invokeError) {
    console.error('Failed to send email', { error: invokeError })
    return new Response(JSON.stringify({ error: 'Failed to send email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
