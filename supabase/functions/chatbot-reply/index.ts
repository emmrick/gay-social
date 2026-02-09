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
      .select('username, bio, age, region, looking_for, sexual_position, body_type, tribes')
      .eq('user_id', profile_user_id)
      .single()

    // Build system prompt
    const infoLines = (config.chatbot_info || []).map((info: string) => `- ${info}`).join('\n')
    
    const lookingForText = profileData?.looking_for?.length 
      ? `Recherche: ${profileData.looking_for.join(', ')}` 
      : ''

    const systemPrompt = `Tu es le chatbot personnel de ${profileData?.username || 'cet utilisateur'} sur une application de rencontres gay.
Tu dois répondre aux questions des visiteurs en te basant UNIQUEMENT sur les informations fournies ci-dessous.
Sois amical, naturel et engageant. Réponds toujours en français.
Tu ne dois JAMAIS inventer d'informations. Si on te pose une question dont tu n'as pas la réponse, dis poliment que tu ne sais pas et suggère de contacter directement ${profileData?.username || 'cette personne'}.

Informations du profil :
- Pseudo : ${profileData?.username || 'Non précisé'}
- Âge : ${profileData?.age || 'Non précisé'}
- Région : ${profileData?.region || 'Non précisé'}
- Bio : ${profileData?.bio || 'Aucune bio'}
${lookingForText ? `- ${lookingForText}` : ''}
${profileData?.sexual_position ? `- Position : ${profileData.sexual_position}` : ''}
${profileData?.body_type ? `- Physique : ${profileData.body_type}` : ''}

Messages personnalisés de ${profileData?.username || 'l\'utilisateur'} :
${infoLines || 'Aucun message personnalisé configuré.'}

IMPORTANT : Tu parles AU NOM de ${profileData?.username || 'cette personne'}, comme si tu étais son assistant personnel. Utilise "il" ou le prénom pour parler de lui.
Ne partage JAMAIS d'informations sensibles (mot de passe, email, etc.).
Garde tes réponses courtes et naturelles (2-3 phrases max).`

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversation_history || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: message },
    ]

    // Call AI via Lovable AI proxy
    const aiResponse = await fetch('https://lovable.dev/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY') || ''}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        max_tokens: 300,
        temperature: 0.7,
      }),
    })

    if (!aiResponse.ok) {
      // Fallback: generate a simple response based on the config
      const fallbackResponse = generateFallbackResponse(message, config, profileData)
      
      // Save messages
      await supabase.from('chatbot_conversations').insert([
        { visitor_user_id: user.id, profile_user_id, role: 'user', content: message },
        { visitor_user_id: user.id, profile_user_id, role: 'assistant', content: fallbackResponse },
      ])

      return new Response(JSON.stringify({ reply: fallbackResponse }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const aiData = await aiResponse.json()
    const reply = aiData.choices?.[0]?.message?.content || generateFallbackResponse(message, config, profileData)

    // Save messages
    await supabase.from('chatbot_conversations').insert([
      { visitor_user_id: user.id, profile_user_id, role: 'user', content: message },
      { visitor_user_id: user.id, profile_user_id, role: 'assistant', content: reply },
    ])

    return new Response(JSON.stringify({ reply }), {
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

function generateFallbackResponse(message: string, config: any, profile: any): string {
  const lowerMsg = message.toLowerCase()
  const username = profile?.username || 'cette personne'
  const infos = config.chatbot_info || []

  if (lowerMsg.includes('salut') || lowerMsg.includes('bonjour') || lowerMsg.includes('hello') || lowerMsg.includes('coucou')) {
    return config.greeting_message || `Salut ! Je suis le chatbot de ${username}. Comment puis-je t'aider ? 😊`
  }

  if (lowerMsg.includes('cherche') || lowerMsg.includes('recherche') || lowerMsg.includes('looking')) {
    if (profile?.looking_for?.length) {
      return `${username} recherche : ${profile.looking_for.join(', ')}. N'hésite pas à lui envoyer un message si ça te correspond ! 😉`
    }
    return `Je n'ai pas d'info précise sur ce que recherche ${username}. Envoie-lui un message pour en discuter !`
  }

  if (lowerMsg.includes('âge') || lowerMsg.includes('age') || lowerMsg.includes('ans')) {
    if (profile?.age) return `${username} a ${profile.age} ans.`
    return `L'âge n'est pas précisé sur le profil.`
  }

  if (lowerMsg.includes('où') || lowerMsg.includes('region') || lowerMsg.includes('ville')) {
    if (profile?.region) return `${username} est dans la région ${profile.region}.`
    return `La localisation n'est pas précisée.`
  }

  // Return a random info if available
  if (infos.length > 0) {
    const randomInfo = infos[Math.floor(Math.random() * infos.length)]
    return `${randomInfo}\n\nN'hésite pas à contacter ${username} directement si tu veux en savoir plus ! 😊`
  }

  return `Merci pour ta question ! Je ne suis pas sûr d'avoir la réponse. Le mieux serait de contacter ${username} directement. 😊`
}
