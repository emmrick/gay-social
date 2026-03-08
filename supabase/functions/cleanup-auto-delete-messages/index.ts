import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all conversation statuses with auto-delete enabled
    const { data: statuses, error: fetchError } = await supabase
      .from('private_conversation_status')
      .select('*')
      .neq('auto_delete_mode', 'never')

    if (fetchError) throw fetchError
    if (!statuses || statuses.length === 0) {
      return new Response(JSON.stringify({ updated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const intervals: Record<string, number> = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    }

    let updatedCount = 0

    for (const status of statuses) {
      const mode = status.auto_delete_mode
      let newHiddenBefore: string | null = null

      if (mode === 'immediate') {
        // For immediate mode: hide all messages up to now
        // (messages are hidden as soon as they exist)
        newHiddenBefore = new Date().toISOString()
      } else if (intervals[mode]) {
        // Time-based: hide messages older than the interval
        newHiddenBefore = new Date(Date.now() - intervals[mode]).toISOString()
      }

      if (newHiddenBefore) {
        const { error: updateError } = await supabase
          .from('private_conversation_status')
          .update({
            messages_hidden_before: newHiddenBefore,
            updated_at: new Date().toISOString(),
          })
          .eq('id', status.id)

        if (!updateError) updatedCount++
      }
    }

    return new Response(
      JSON.stringify({ success: true, updated: updatedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Auto-delete cleanup error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
