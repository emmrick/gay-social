/**
 * ChatBot Personnel — flow décisionnel.
 * Aucune IA. Renvoie les blocs enfants d'un nœud demandé (ou la racine).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface Node {
  id: string
  label: string
  response_text: string | null
  parent_id: string | null
  display_order: number
  is_root: boolean
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { profile_user_id, node_id } = await req.json()

    if (!profile_user_id) {
      return new Response(JSON.stringify({ error: 'Missing profile_user_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check chatbot is active
    const { data: config } = await supabase
      .from('user_chatbot_config')
      .select('is_active, greeting_message')
      .eq('user_id', profile_user_id)
      .maybeSingle()

    if (!config?.is_active) {
      return new Response(JSON.stringify({ error: 'Chatbot inactive' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch the requested node (if any) and its children
    let currentNode: Node | null = null
    if (node_id) {
      const { data } = await supabase
        .from('personal_chatbot_nodes')
        .select('id, label, response_text, parent_id, display_order, is_root')
        .eq('id', node_id)
        .eq('user_id', profile_user_id)
        .eq('is_active', true)
        .maybeSingle()
      currentNode = data as Node | null
    }

    // Children of node_id (or root nodes if no node_id)
    let childrenQuery = supabase
      .from('personal_chatbot_nodes')
      .select('id, label, response_text, parent_id, display_order, is_root')
      .eq('user_id', profile_user_id)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    childrenQuery = node_id
      ? childrenQuery.eq('parent_id', node_id)
      : childrenQuery.eq('is_root', true)

    const { data: children } = await childrenQuery

    return new Response(
      JSON.stringify({
        greeting: config.greeting_message,
        current: currentNode,
        children: children || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('chatbot-reply error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
