/**
 * Aide IA pour le propriétaire du chatbot.
 * Mode "rephrase" : reformule un texte saisi.
 * Mode "suggest" : génère 5 idées de blocs (label + réponse) basées sur le profil.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!)
    const { data: { user } } = await anon.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { mode, text, label } = await req.json()
    // mode = 'rephrase' | 'suggest'

    let messages: any[] = []
    let tools: any[] | undefined
    let toolChoice: any | undefined

    if (mode === 'rephrase') {
      if (!text) {
        return new Response(JSON.stringify({ error: 'Missing text' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      messages = [
        {
          role: 'system',
          content:
            "Tu es un assistant qui reformule un message en français pour un chatbot personnel d'application de rencontre gay. " +
            "Garde le sens d'origine. Améliore le ton (chaleureux, naturel, pas trop long). " +
            "Corrige les fautes. Ajoute 1 emoji si pertinent. " +
            "Retourne UNIQUEMENT le texte reformulé, sans guillemets ni intro.",
        },
        {
          role: 'user',
          content: label
            ? `Bouton : "${label}"\nMessage à reformuler :\n${text}`
            : `Reformule :\n${text}`,
        },
      ]
    } else if (mode === 'suggest') {
      // Fetch profile context for personalized suggestions
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, age, region, bio, looking_for, sexual_position, body_type')
        .eq('user_id', user.id)
        .maybeSingle()

      const ctx = [
        profile?.age && `${profile.age} ans`,
        profile?.region,
        profile?.looking_for?.length && `cherche : ${profile.looking_for.join(', ')}`,
        profile?.bio && `bio : ${profile.bio.slice(0, 200)}`,
      ].filter(Boolean).join(' • ')

      messages = [
        {
          role: 'system',
          content:
            "Tu génères des blocs de chatbot personnel pour un profil gay. " +
            "Chaque bloc = un bouton court (max 35 caractères) + une réponse chaleureuse (1-3 phrases, en français, 1 emoji max). " +
            "Évite l'IA évidente, écris comme la personne elle-même.",
        },
        {
          role: 'user',
          content: `Profil : ${ctx || 'aucune info'}\n\nGénère 5 blocs de questions/réponses utiles que les visiteurs poseraient.`,
        },
      ]

      tools = [{
        type: 'function',
        function: {
          name: 'suggest_blocks',
          description: 'Retourne 5 blocs de chatbot.',
          parameters: {
            type: 'object',
            properties: {
              blocks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    label: { type: 'string' },
                    response_text: { type: 'string' },
                  },
                  required: ['label', 'response_text'],
                  additionalProperties: false,
                },
              },
            },
            required: ['blocks'],
            additionalProperties: false,
          },
        },
      }]
      toolChoice = { type: 'function', function: { name: 'suggest_blocks' } }
    } else {
      return new Response(JSON.stringify({ error: 'Invalid mode' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
        ...(tools ? { tools, tool_choice: toolChoice } : {}),
        max_tokens: 800,
        temperature: 0.7,
      }),
    })

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Trop de requêtes, réessaie dans un instant.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Service IA temporairement indisponible.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const t = await aiResponse.text()
      console.error('AI error:', aiResponse.status, t)
      return new Response(JSON.stringify({ error: 'AI error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await aiResponse.json()

    if (mode === 'suggest') {
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]
      const args = toolCall?.function?.arguments
      let parsed: any = { blocks: [] }
      try { parsed = JSON.parse(args || '{}') } catch {/**/}
      return new Response(JSON.stringify({ blocks: parsed.blocks || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const reply = data.choices?.[0]?.message?.content?.trim() || text
    return new Response(JSON.stringify({ text: reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('chatbot-block-suggest error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
