import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface PendingUpload {
  id: string;
  status: 'uploading' | 'finalizing' | 'done' | 'error';
  progress: number;
  stage: string;
  error?: string;
  preview?: string;
  mediaType?: 'image' | 'video' | null;
  contentSnippet: string;
}

interface QueueItem {
  userId: string;
  content: string;
  mediaFile?: File | null;
  mediaType?: 'image' | 'video' | null;
  pollOptions?: string[];
  preview?: string;
}

interface TweenUploadContextValue {
  uploads: PendingUpload[];
  enqueue: (item: QueueItem) => string;
  dismiss: (id: string) => void;
  retry: (id: string, item: QueueItem) => void;
}

const TweenUploadContext = createContext<TweenUploadContextValue | null>(null);

export const useTweenUploads = () => {
  const ctx = useContext(TweenUploadContext);
  if (!ctx) throw new Error('useTweenUploads must be used within TweenUploadProvider');
  return ctx;
};

const uploadToStorage = async (
  path: string,
  file: File,
  onProgress: (pct: number, stage: string) => void
): Promise<void> => {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    onProgress(
      Math.min(15 + (attempt - 1) * 15, 45),
      attempt === 1 ? 'Envoi du média…' : `Nouvelle tentative (${attempt}/${maxRetries})…`
    );

    try {
      const { error } = await supabase.storage
        .from('media')
        .upload(path, file, {
          cacheControl: '31536000',
          upsert: attempt > 1,
          contentType: file.type || undefined,
        });

      if (!error) return;

      const msg = error.message || 'Erreur d\'envoi.';
      const retryable = /LockManager|timed out|network|fetch|load failed|failed to fetch|abort|aborted/i.test(msg);
      if (!retryable || attempt === maxRetries) {
        throw new Error(retryable ? 'Connexion interrompue pendant l\'envoi.' : msg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur d\'envoi.';
      const retryable = /LockManager|timed out|network|fetch|load failed|failed to fetch|abort|aborted/i.test(msg);
      if (!retryable || attempt === maxRetries) {
        throw new Error(retryable ? 'Connexion interrompue pendant l\'envoi.' : msg);
      }
    }
    await new Promise((r) => setTimeout(r, 400 * attempt));
  }
  throw new Error('Connexion interrompue pendant l\'envoi.');
};

export const TweenUploadProvider = ({ children }: { children: ReactNode }) => {
  const [uploads, setUploads] = useState<PendingUpload[]>([]);
  const queryClient = useQueryClient();

  const updateUpload = useCallback((id: string, patch: Partial<PendingUpload>) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }, []);

  const processUpload = useCallback(
    async (id: string, item: QueueItem) => {
      try {
        let mediaUrl: string | undefined;

        if (item.mediaFile && item.mediaType) {
          const ext = (item.mediaFile.name.split('.').pop() || 'bin').toLowerCase();
          const path = `${item.userId}/tweens/${Date.now()}-${id.slice(0, 6)}.${ext}`;

          await uploadToStorage(path, item.mediaFile, (pct, stage) => {
            updateUpload(id, { progress: pct, stage });
          });

          updateUpload(id, { progress: 75, stage: 'Génération du lien sécurisé…' });

          let signedUrl: string | undefined;
          for (let attempt = 1; attempt <= 2; attempt += 1) {
            const { data: signed, error: signError } = await supabase.storage
              .from('media')
              .createSignedUrl(path, 60 * 60 * 24 * 365);
            if (!signError && signed?.signedUrl) {
              signedUrl = signed.signedUrl;
              break;
            }
            if (attempt === 2) throw new Error(signError?.message || 'Lien indisponible.');
            await new Promise((r) => setTimeout(r, 250));
          }
          mediaUrl = signedUrl;
        }

        updateUpload(id, { progress: 90, stage: 'Publication…', status: 'finalizing' });

        const insertData: any = { user_id: item.userId, content: item.content };
        if (mediaUrl) {
          insertData.media_url = mediaUrl;
          insertData.media_type = item.mediaType;
        }
        const validPoll = item.pollOptions?.filter((o) => o.trim());
        if (validPoll && validPoll.length >= 2) {
          insertData.has_poll = true;
          insertData.poll_options = validPoll.map((text) => ({ text, votes: 0 }));
          insertData.poll_ends_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        }

        const { error: insertError } = await supabase.from('tweens').insert(insertData);
        if (insertError) throw insertError;

        updateUpload(id, { progress: 100, stage: 'Publié !', status: 'done' });
        queryClient.invalidateQueries({ queryKey: ['tweens-feed'] });
        queryClient.invalidateQueries({ queryKey: ['tweens-user'] });
        toast.success('Tween publié !');

        // Auto-dismiss après 3s
        setTimeout(() => {
          setUploads((prev) => prev.filter((u) => u.id !== id));
        }, 3000);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Publication impossible.';
        updateUpload(id, { status: 'error', error: message, stage: 'Échec' });
        toast.error(message);
      }
    },
    [queryClient, updateUpload]
  );

  const enqueue = useCallback(
    (item: QueueItem) => {
      const id = crypto.randomUUID();
      const newUpload: PendingUpload = {
        id,
        status: 'uploading',
        progress: 5,
        stage: 'Préparation…',
        preview: item.preview,
        mediaType: item.mediaType,
        contentSnippet: item.content.slice(0, 80),
      };
      setUploads((prev) => [...prev, newUpload]);
      void processUpload(id, item);
      return id;
    },
    [processUpload]
  );

  const dismiss = useCallback((id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const retry = useCallback(
    (id: string, item: QueueItem) => {
      updateUpload(id, { status: 'uploading', progress: 5, stage: 'Nouvelle tentative…', error: undefined });
      void processUpload(id, item);
    },
    [processUpload, updateUpload]
  );

  return (
    <TweenUploadContext.Provider value={{ uploads, enqueue, dismiss, retry }}>
      {children}
    </TweenUploadContext.Provider>
  );
};
