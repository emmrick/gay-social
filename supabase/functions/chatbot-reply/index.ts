import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get auth token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!)
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { profile_user_id, message, conversation_history } = await req.json()

    if (!profile_user_id || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get chatbot config
    const { data: config } = await supabase
      .from('user_chatbot_config')
      .select('*')
      .eq('user_id', profile_user_id)
      .eq('is_active', true)
      .single()

    if (!config) {
      return new Response(JSON.stringify({ error: 'Chatbot not active' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get profile info
    const { data: profileData } = await supabase
      .from('profiles')
      .select('username, bio, age, region, looking_for, sexual_position, body_type, tribes, ethnicity, height, weight, endowment, relationship_status, position_detail, hiv_status')
      .eq('user_id', profile_user_id)
      .single()

    // Get visitor profile for context
    const { data: visitorProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', user.id)
      .single()

    const username = profileData?.username || 'cet utilisateur'

    // Build structured knowledge base from chatbot_info
    const infoLines = (config.chatbot_info || []).map((info: string, i: number) => `${i + 1}. ${info}`).join('\n')

    // Build detailed profile section
    const profileDetails: string[] = []
    if (profileData?.age) profileDetails.push(`Âge : ${profileData.age} ans`)
    if (profileData?.region) profileDetails.push(`Région : ${profileData.region}`)
    if (profileData?.bio) profileDetails.push(`Bio : ${profileData.bio}`)
    if (profileData?.looking_for?.length) profileDetails.push(`Recherche : ${profileData.looking_for.join(', ')}`)
    if (profileData?.sexual_position) profileDetails.push(`Position : ${profileData.sexual_position}`)
    if (profileData?.position_detail) profileDetails.push(`Détail position : ${profileData.position_detail}`)
    if (profileData?.body_type) profileDetails.push(`Physique : ${profileData.body_type}`)
    if (profileData?.height) profileDetails.push(`Taille : ${profileData.height} cm`)
    if (profileData?.weight) profileDetails.push(`Poids : ${profileData.weight} kg`)
    if (profileData?.ethnicity) profileDetails.push(`Ethnicité : ${profileData.ethnicity}`)
    if (profileData?.endowment) profileDetails.push(`Endowment : ${profileData.endowment}`)
    if (profileData?.tribes?.length) profileDetails.push(`Tribes : ${profileData.tribes.join(', ')}`)
    if (profileData?.relationship_status) profileDetails.push(`Statut : ${profileData.relationship_status}`)
    if (profileData?.hiv_status) profileDetails.push(`Statut VIH : ${profileData.hiv_status}`)

    const systemPrompt = `Tu es l'assistant personnel de ${username} sur une application de rencontres gay appelée GaySocial.

## TON RÔLE
Tu représentes ${username} et tu réponds aux questions des visiteurs de son profil. Tu dois être chaleureux, naturel et utile. Réponds TOUJOURS en français.

## RÈGLES STRICTES
1. **Réponds PRÉCISÉMENT à la question posée.** Ne divague pas. Si on te demande l'âge, donne l'âge. Si on demande ce qu'il recherche, dis ce qu'il recherche.
2. **Base-toi UNIQUEMENT sur les données ci-dessous.** Ne fabrique JAMAIS d'informations.
3. **Si tu n'as PAS l'information demandée**, réponds avec ce format EXACT :
   "Je n'ai pas cette information pour le moment. 😊 Je vais transmettre ta question à ${username} pour qu'il puisse y répondre !"
   Puis ajoute sur une nouvelle ligne : [QUESTION_SANS_REPONSE]
4. **Sois concis** : 1 à 3 phrases maximum.
5. **Ne partage JAMAIS** d'informations sensibles (email, mot de passe, localisation exacte).
6. **Adapte ton ton** : amical et décontracté, comme un ami qui présente quelqu'un.

## PROFIL DE ${username.toUpperCase()}
${profileDetails.length > 0 ? profileDetails.join('\n') : 'Aucune information de profil disponible.'}

## INFORMATIONS PERSONNALISÉES PAR ${username.toUpperCase()}
${infoLines || 'Aucune information personnalisée ajoutée.'}

## VISITEUR
Le visiteur s'appelle ${visitorProfile?.username || 'un utilisateur'}.

## EXEMPLES DE BONNES RÉPONSES
- Question : "Salut, il a quel âge ?" → "${username} a ${profileData?.age || 'X'} ans ! 😊"
- Question : "Il cherche quoi ?" → "${username} recherche ${profileData?.looking_for?.join(', ') || 'pas encore précisé'}."
- Question : "Il aime quoi au lit ?" → Si l'info est dans le profil/config, la partager. Sinon : "Je n'ai pas cette information pour le moment. 😊 Je vais transmettre ta question à ${username} pour qu'il puisse y répondre ! [QUESTION_SANS_REPONSE]"`

    // Build messages array with conversation history
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversation_history || []).slice(-20).map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ]

    // Call AI via correct Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured')
      const fallbackResponse = generateFallbackResponse(message, config, profileData)
      await saveMessages(supabase, user.id, profile_user_id, message, fallbackResponse)
      return new Response(JSON.stringify({ reply: fallbackResponse }), {
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
        max_tokens: 300,
        temperature: 0.3,
      }),
    })

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      console.error('AI gateway error:', aiResponse.status, errorText)

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Trop de requêtes, réessaie dans quelques secondes.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Service temporairement indisponible.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Fallback
      const fallbackResponse = generateFallbackResponse(message, config, profileData)
      await saveMessages(supabase, user.id, profile_user_id, message, fallbackResponse)
      return new Response(JSON.stringify({ reply: fallbackResponse }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const aiData = await aiResponse.json()
    let reply = aiData.choices?.[0]?.message?.content || generateFallbackResponse(message, config, profileData)

    // Check if the bot couldn't answer and should notify the profile owner
    const hasUnansweredQuestion = reply.includes('[QUESTION_SANS_REPONSE]')
    
    // Clean up the marker from the visible reply
    reply = reply.replace(/\[QUESTION_SANS_REPONSE\]/g, '').trim()

    // Save messages
    await saveMessages(supabase, user.id, profile_user_id, message, reply)

    // If there's an unanswered question, create a notification for the profile owner
    if (hasUnansweredQuestion) {
      const visitorName = visitorProfile?.username || 'Un visiteur'
      await supabase.from('notifications').insert({
        user_id: profile_user_id,
        type: 'chatbot_unanswered',
        title: '🤖 Question sans réponse',
        message: `${visitorName} a posé une question à votre chatbot : "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}". Ajoutez cette info à votre bot !`,
        action_url: '/profile?tab=chatbot',
      })
    }

    return new Response(JSON.stringify({ reply, unanswered: hasUnansweredQuestion }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Chatbot error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function saveMessages(supabase: any, visitorId: string, profileUserId: string, userMsg: string, botReply: string) {
  await supabase.from('chatbot_conversations').insert([
    { visitor_user_id: visitorId, profile_user_id: profileUserId, role: 'user', content: userMsg },
    { visitor_user_id: visitorId, profile_user_id: profileUserId, role: 'assistant', content: botReply },
  ])
}

function generateFallbackResponse(message: string, config: any, profile: any): string {
  const lowerMsg = message.toLowerCase()
  const username = profile?.username || 'cette personne'
  const infos = config.chatbot_info || []

  if (lowerMsg.includes('salut') || lowerMsg.includes('bonjour') || lowerMsg.includes('hello') || lowerMsg.includes('coucou') || lowerMsg.includes('hey')) {
    return config.greeting_message || `Salut ! Je suis le chatbot de ${username}. Comment puis-je t'aider ? 😊`
  }

  if (lowerMsg.includes('cherche') || lowerMsg.includes('recherche') || lowerMsg.includes('looking')) {
    if (profile?.looking_for?.length) {
      return `${username} recherche : ${profile.looking_for.join(', ')}. 😉`
    }
  }

  if (lowerMsg.includes('âge') || lowerMsg.includes('age') || lowerMsg.includes('ans') || lowerMsg.includes('vieux')) {
    if (profile?.age) return `${username} a ${profile.age} ans.`
  }

  if (lowerMsg.includes('où') || lowerMsg.includes('region') || lowerMsg.includes('ville') || lowerMsg.includes('habite')) {
    if (profile?.region) return `${username} est dans la région ${profile.region}.`
  }

  // Search through chatbot_info for relevant answer
  for (const info of infos) {
    const infoLower = info.toLowerCase()
    const words = lowerMsg.split(/\s+/).filter((w: string) => w.length > 3)
    if (words.some((word: string) => infoLower.includes(word))) {
      return info
    }
  }

  return `Je n'ai pas cette information pour le moment. 😊 Le mieux serait de contacter ${username} directement !`
}