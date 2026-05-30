import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CustomQA {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
}

export interface MediaTier {
  id: string;
  label: string;
  album_id: string;
  album_name?: string;
  threshold: number; // nombre de messages échangés avant déblocage auto
}

export interface PlanNowPreset {
  id: string;
  name: string;
  emoji: string;
  looking_for: string;
  available_now: string;
  photo_exchange: string;
  custom_qa: CustomQA[];
  media_tiers: MediaTier[];
}

export interface PlanNowAutoReplies {
  user_id: string;
  looking_for: string | null;
  available_now: string | null;
  photo_exchange: string | null;
  enabled: boolean;
  custom_qa: CustomQA[];
  media_tiers: MediaTier[];
  presets: PlanNowPreset[];
  active_preset_id: string | null;
}

const DEFAULT_PRESETS: PlanNowPreset[] = [
  {
    id: 'preset-soiree',
    name: 'Soirée now',
    emoji: '🔥',
    looking_for: 'Un plan chaud ce soir, dispo maintenant 🔥',
    available_now: 'Là tout de suite, jusqu\'à tard',
    photo_exchange: 'Oui, échange direct si tu joues le jeu 😏',
    custom_qa: [],
    media_tiers: [],
  },
  {
    id: 'preset-curieux',
    name: 'Curieux discret',
    emoji: '🌙',
    looking_for: 'Discussion d\'abord, voir ensuite. Discrétion absolue.',
    available_now: 'Plutôt en fin de soirée, en discret',
    photo_exchange: 'On verra après quelques messages, doucement',
    custom_qa: [],
    media_tiers: [],
  },
  {
    id: 'preset-sport',
    name: 'Sport & rencontre',
    emoji: '💪',
    looking_for: 'Mec sportif, motivé, sympa avant tout',
    available_now: 'Selon les entraînements, plutôt en journée',
    photo_exchange: 'Photos sport ok, le reste après contact',
    custom_qa: [],
    media_tiers: [],
  },
];

const DEFAULTS: Omit<PlanNowAutoReplies, 'user_id'> = {
  looking_for: '',
  available_now: '',
  photo_exchange: '',
  enabled: true,
  custom_qa: [],
  media_tiers: [],
  presets: DEFAULT_PRESETS,
  active_preset_id: null,
};

const normalize = (row: any, userId: string): PlanNowAutoReplies => ({
  user_id: userId,
  looking_for: row?.looking_for ?? '',
  available_now: row?.available_now ?? '',
  photo_exchange: row?.photo_exchange ?? '',
  enabled: row?.enabled ?? true,
  custom_qa: Array.isArray(row?.custom_qa) ? row.custom_qa : [],
  media_tiers: Array.isArray(row?.media_tiers) ? row.media_tiers : [],
  presets: Array.isArray(row?.presets) && row.presets.length > 0 ? row.presets : DEFAULT_PRESETS,
  active_preset_id: row?.active_preset_id ?? null,
});

export const usePlanNowAutoReplies = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['plan-now-auto-replies', user?.id],
    queryFn: async (): Promise<PlanNowAutoReplies | null> => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('plan_now_auto_replies' as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return normalize(data, user.id);
    },
    enabled: !!user?.id,
  });

  const upsert = useMutation({
    mutationFn: async (patch: Partial<Omit<PlanNowAutoReplies, 'user_id'>>) => {
      if (!user?.id) throw new Error('Non authentifié');
      const current = query.data ?? { ...DEFAULTS, user_id: user.id };
      const row = { ...current, ...patch, user_id: user.id };
      const { error } = await supabase
        .from('plan_now_auto_replies' as any)
        .upsert(row as any, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-now-auto-replies', user?.id] });
    },
    onError: (err: Error) => toast.error('Erreur', { description: err.message }),
  });

  return {
    data: query.data ?? { ...DEFAULTS, user_id: user?.id ?? '' },
    isLoading: query.isLoading,
    save: upsert.mutateAsync,
    isSaving: upsert.isPending,
  };
};

export { DEFAULT_PRESETS };
