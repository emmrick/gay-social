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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { messages, username } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Missing messages array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch all published FAQ articles to use as knowledge base
    const { data: faqArticles } = await supabase
      .from('faq_articles')
      .select('question, answer, category')
      .eq('is_published', true)
      .order('display_order', { ascending: true })

    // Build FAQ knowledge base
    const faqKnowledge = (faqArticles || []).map((a: any, i: number) => 
      `### ${a.category} — ${a.question}\n${a.answer}`
    ).join('\n\n')

    const systemPrompt = `Tu es **l'assistant intelligent** du centre d'aide de **Gay Social**, un site de rencontre gay français.

## TON RÔLE
Tu aides les utilisateurs à résoudre leurs problèmes et répondre à leurs questions sur la plateforme. Tu es **chaleureux**, **professionnel** et **concis**.

## RÈGLES IMPORTANTES
1. **Réponds TOUJOURS en français.**
2. **Utilise du texte en gras** (**mot**) pour mettre en valeur les informations clés dans tes réponses. Cela améliore la lisibilité.
3. **Base-toi sur la FAQ ci-dessous** pour répondre aux questions. Si la réponse se trouve dans la FAQ, reformule-la de manière naturelle et conversationnelle.
4. **Si tu ne connais PAS la réponse** ou si la question est trop spécifique/personnelle (problème de compte, bug technique précis, demande de remboursement), réponds de ton mieux puis ajoute le marqueur [ESCALADE] à la fin de ta réponse pour proposer un contact avec un agent humain.
5. **Reste dans le contexte** de la conversation. Si l'utilisateur pose des questions de suivi, ne recommence pas depuis le début.
6. **Sois concis** : 2-4 phrases maximum sauf si une explication détaillée est nécessaire.
7. **N'invente JAMAIS** de fonctionnalités ou d'informations qui ne sont pas dans la FAQ.
8. Quand tu proposes l'escalade, formule-le naturellement : "Si tu as besoin d'aide supplémentaire, tu peux **contacter un agent** du support."

## UTILISATEUR
L'utilisateur s'appelle ${username || 'cher utilisateur'}.

## BASE DE CONNAISSANCES (FAQ)
${faqKnowledge || 'Aucun article FAQ disponible pour le moment.'}

## INFORMATIONS GÉNÉRALES SUR GAY SOCIAL
- **Gay Social** est un site de rencontre gay **100% français**, organisé par **101 départements**.
- L'inscription est **gratuite**.
- Les profils sont **vérifiés par pièce d'identité**.
- Le site propose des **médias éphémères** (photos/vidéos qui disparaissent après consultation).
- Une **protection anti-capture d'écran** est intégrée.
- Le système de **crédits** permet d'accéder à certaines fonctionnalités premium (boost de profil, messages privés, etc.).
- Les crédits peuvent être obtenus gratuitement (inscription, parrainage) ou achetés.
- Il n'y a **aucune publicité** sur le site.
- Le site est réservé aux **+18 ans**.
- Les fonctionnalités incluent : chat de groupe par département, messages privés, swipe/match, albums photo, stories, groupes thématiques.`

    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-30), // Keep last 30 messages for context
    ]

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: aiMessages,
        max_tokens: 600,
        temperature: 0.4,
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

      return new Response(JSON.stringify({ 
        reply: "Désolé, je rencontre un **problème technique** temporaire. Tu peux **contacter un agent** du support pour obtenir de l'aide.",
        needsEscalation: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const aiData = await aiResponse.json()
    let reply = aiData.choices?.[0]?.message?.content || "Je n'ai pas pu générer une réponse. **Contacte un agent** pour plus d'aide."

    // Check if escalation is needed
    const needsEscalation = reply.includes('[ESCALADE]')
    reply = reply.replace(/\[ESCALADE\]/g, '').trim()

    return new Response(JSON.stringify({ reply, needsEscalation }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Help chat error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
