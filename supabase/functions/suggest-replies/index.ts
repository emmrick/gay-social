import { requireUser } from '../_shared/auth-guard.ts';
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const recentMessages: IncomingMessage[] = Array.isArray(body?.messages) ? body.messages.slice(-8) : [];

    if (recentMessages.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Last message must be from the other person, otherwise no suggestion
    const last = recentMessages[recentMessages.length - 1];
    if (last.role !== 'assistant') {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `Tu es un assistant de messagerie qui propose 3 réponses rapides courtes, naturelles et variées en français pour répondre au dernier message reçu.

Règles :
- 3 suggestions distinctes (1 affirmative/enthousiaste, 1 question/relance, 1 neutre/courte)
- Chaque suggestion : maximum 8 mots, ton décontracté, style chat (peut inclure 1 emoji max)
- Pas de ponctuation finale lourde, pas de "Bien sûr,"
- Adapte au contexte (drague, amical, info, etc.)
- N'invente pas de faits, ne pose pas de questions personnelles intrusives
- JAMAIS de contenu explicite, illégal, haineux ou discriminant`;

    const conversationContext = recentMessages.map((m) => {
      const speaker = m.role === 'user' ? 'Moi' : 'Lui';
      return `${speaker}: ${m.content}`;
    }).join('\n');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Voici la conversation :\n${conversationContext}\n\nPropose 3 réponses rapides.` },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'propose_replies',
              description: 'Propose 3 quick reply suggestions',
              parameters: {
                type: 'object',
                properties: {
                  suggestions: {
                    type: 'array',
                    items: { type: 'string' },
                    minItems: 3,
                    maxItems: 3,
                  },
                },
                required: ['suggestions'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'propose_replies' } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'rate_limited', suggestions: [] }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'payment_required', suggestions: [] }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const txt = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, txt);
      return new Response(JSON.stringify({ error: 'ai_error', suggestions: [] }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await aiResponse.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    let suggestions: string[] = [];
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        if (Array.isArray(args.suggestions)) {
          suggestions = args.suggestions
            .filter((s: any) => typeof s === 'string' && s.trim().length > 0)
            .map((s: string) => s.trim().slice(0, 80))
            .slice(0, 3);
        }
      } catch (e) {
        console.error('Failed to parse tool args:', e);
      }
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('suggest-replies error:', e);
    return new Response(JSON.stringify({ error: 'unknown', suggestions: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
