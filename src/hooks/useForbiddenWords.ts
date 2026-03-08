import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Forbidden words extracted from Rules page sections
const FORBIDDEN_WORDS = [
  // Harassment & insults
  'pute', 'salope', 'connard', 'connasse', 'enculé', 'enculer', 'nique', 'niquer',
  'ntm', 'fdp', 'fils de pute', 'ta mère', 'ta mere',
  'pd', 'pédé', 'pédale', 'tapette', 'tarlouze', 'travelo',
  // Racism & discrimination
  'nègre', 'negre', 'bougnoule', 'bougnoul', 'arabe de merde', 'sale noir',
  'sale arabe', 'sale juif', 'youpin', 'chinetoque', 'bridé',
  // Serophobia
  'sidaïque', 'sidaique', 'sale séro', 'sale sero',
  // Transphobia
  'tranny', 'travesti de merde',
  // Fatphobia
  'gros porc', 'grosse vache', 'obèse de merde',
  // Threats & violence
  'je vais te tuer', 'je vais te buter', 'tu vas mourir', 'crève', 'creve',
  'suicide toi', 'suicide-toi', 'va te pendre', 'va mourir',
  // Prostitution
  'escort', 'escorte', 'tarifé', 'combien pour', 'prix pour',
  'pipe gratuite', 'plan tarifé', 'monnayer',
  // Blackmail
  'chantage', 'je balance', 'je diffuse tes photos', 'je montre à tout le monde',
  // Illegal content
  'mineur', 'mineure', 'gamin', 'petit garçon', 'petite fille',
  // Spam-like
  'rejoins mon', 'clique ici', 'lien payant', 'onlyfans', 'mym',
  // Impersonation
  'je suis admin', 'je suis modérateur', 'je suis modo',
];

// Normalize text for matching (remove accents, lowercase)
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizedForbiddenWords = FORBIDDEN_WORDS.map(normalizeText);

export const detectForbiddenWord = (message: string): string | null => {
  const normalized = normalizeText(message);
  for (let i = 0; i < normalizedForbiddenWords.length; i++) {
    if (normalized.includes(normalizedForbiddenWords[i])) {
      return FORBIDDEN_WORDS[i];
    }
  }
  return null;
};

// Store recent messages per conversation for context
const recentMessagesCache: Map<string, Array<{ sender: string; content: string }>> = new Map();

export const addToRecentMessages = (conversationId: string, sender: string, content: string) => {
  const existing = recentMessagesCache.get(conversationId) || [];
  existing.push({ sender, content });
  // Keep last 15 messages for context
  if (existing.length > 15) existing.shift();
  recentMessagesCache.set(conversationId, existing);
};

export const getRecentMessages = (conversationId: string) => {
  return recentMessagesCache.get(conversationId) || [];
};

interface AIAnalysisResult {
  is_hostile: boolean;
  confidence: number;
  reason: string;
}

const analyzeWithAI = async (
  message: string,
  detectedWord: string,
  recentMessages: Array<{ sender: string; content: string }>
): Promise<AIAnalysisResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-message', {
      body: {
        message,
        detected_word: detectedWord,
        recent_messages: recentMessages,
      },
    });

    if (error) {
      console.error('AI analysis error:', error);
      // Fallback: treat as hostile for safety
      return { is_hostile: true, confidence: 0.5, reason: 'Analyse IA indisponible' };
    }

    // Handle rate limit / payment errors
    if (data?.error) {
      console.warn('AI analysis service error:', data.error);
      if (data.error.includes('Rate limit')) {
        toast.error('Service d\'analyse temporairement surchargé, réessayez dans un instant.');
      }
      return { is_hostile: true, confidence: 0.5, reason: data.error };
    }

    return {
      is_hostile: data.is_hostile ?? true,
      confidence: data.confidence ?? 0.5,
      reason: data.reason ?? 'Analyse IA',
    };
  } catch (err) {
    console.error('AI analysis failed:', err);
    return { is_hostile: true, confidence: 0.5, reason: 'Erreur d\'analyse' };
  }
};

export const useUserInfractions = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-infractions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_infractions' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user?.id,
  });
};

export const useUserInfractionCount = () => {
  const { data: infractions = [] } = useUserInfractions();
  return infractions.length;
};

export const useForbiddenWords = (conversationId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const checkMessage = useCallback(async (message: string): Promise<{ blocked: boolean; word?: string; warningCount?: number; sanctioned?: boolean }> => {
    if (!user?.id) return { blocked: false };

    // Step 1: Quick keyword detection
    const detectedWord = detectForbiddenWord(message);
    if (!detectedWord) return { blocked: false };

    // Step 2: AI contextual analysis - is it really hostile?
    const recentMessages = conversationId ? getRecentMessages(conversationId) : [];

    toast.loading('Analyse du message en cours...', { id: 'ai-analysis' });

    const aiResult = await analyzeWithAI(message, detectedWord, recentMessages);

    toast.dismiss('ai-analysis');

    // Step 3: If AI says it's NOT hostile with good confidence, let it pass
    if (!aiResult.is_hostile && aiResult.confidence >= 0.6) {
      console.log(`[ForbiddenWords] AI cleared message: "${aiResult.reason}" (confidence: ${aiResult.confidence})`);
      return { blocked: false };
    }

    // Step 4: If AI is uncertain (low confidence), warn but don't count as infraction
    if (!aiResult.is_hostile && aiResult.confidence < 0.6) {
      toast.info(`💬 Attention : votre message a été détecté comme potentiellement inapproprié. Il a été envoyé, mais faites attention à votre langage.`);
      return { blocked: false };
    }

    // Step 5: AI confirmed hostile → proceed with infraction system
    const { data: existingInfractions } = await supabase
      .from('user_infractions' as any)
      .select('id')
      .eq('user_id', user.id);

    const currentCount = (existingInfractions || []).length;
    const newWarningNumber = currentCount + 1;
    const isSanctioned = newWarningNumber >= 3;

    let supportTicketId: string | null = null;

    // If sanctioned (3+ warnings), auto-create support ticket
    if (isSanctioned) {
      const { data: ticketData } = await supabase
        .from('support_tickets' as any)
        .insert({
          user_id: user.id,
          ticket_number: '',
          subject: `⚠️ Sanction automatique - ${newWarningNumber} infractions détectées`,
          status: 'open',
          chatbot_history: JSON.stringify([
            { type: 'system', text: `L'utilisateur a accumulé ${newWarningNumber} infractions pour utilisation de mots interdits. Analyse IA : "${aiResult.reason}" (confiance: ${Math.round(aiResult.confidence * 100)}%). Une vérification approfondie est requise.` }
          ]),
        })
        .select('id')
        .single();

      if (ticketData) {
        supportTicketId = (ticketData as any).id;

        await supabase
          .from('support_messages' as any)
          .insert({
            ticket_id: supportTicketId,
            sender_id: user.id,
            content: `⚠️ **Sanction automatique** : ${newWarningNumber} infractions détectées.\n\n**Dernière analyse IA** : ${aiResult.reason}\n\nUn membre du support va examiner votre dossier. Vous ne pourrez pas quitter cette conversation tant que le problème n'est pas résolu.`,
            message_type: 'system',
          });
      }
    }

    // Record infraction with AI analysis details
    await supabase
      .from('user_infractions' as any)
      .insert({
        user_id: user.id,
        detected_word: detectedWord,
        message_content: message.substring(0, 500),
        context: `chat | AI: ${aiResult.reason} (${Math.round(aiResult.confidence * 100)}%)`,
        warning_number: newWarningNumber,
        is_sanctioned: isSanctioned,
        support_ticket_id: supportTicketId,
      });

    queryClient.invalidateQueries({ queryKey: ['user-infractions'] });

    if (isSanctioned) {
      toast.error(`🚫 Vous avez atteint ${newWarningNumber} avertissements. Vous devez discuter avec le support.`);
    } else {
      toast.warning(`⚠️ Avertissement ${newWarningNumber}/3 : Votre message a été identifié comme inapproprié. Raison : ${aiResult.reason}`);
    }

    return {
      blocked: true,
      word: detectedWord,
      warningCount: newWarningNumber,
      sanctioned: isSanctioned,
    };
  }, [user?.id, queryClient, conversationId]);

  return { checkMessage };
};
