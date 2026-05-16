import { useEffect, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Preview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

// Cache mémoire partagé entre instances
const cache = new Map<string, Preview | null>();

interface LinkPreviewCardProps {
  url: string;
}

const LinkPreviewCard = ({ url }: LinkPreviewCardProps) => {
  const [preview, setPreview] = useState<Preview | null | undefined>(cache.get(url));
  const [loading, setLoading] = useState(!cache.has(url));

  useEffect(() => {
    if (cache.has(url)) {
      setPreview(cache.get(url) ?? null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase.functions
      .invoke('fetch-link-preview', { body: { url } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data || data.error) {
          cache.set(url, null);
          setPreview(null);
        } else {
          cache.set(url, data as Preview);
          setPreview(data as Preview);
        }
      })
      .catch(() => {
        if (!cancelled) {
          cache.set(url, null);
          setPreview(null);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [url]);

  if (loading) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer ugc"
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background/40 border border-border/40 text-xs text-muted-foreground"
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span className="truncate">{url}</span>
      </a>
    );
  }

  if (!preview || (!preview.title && !preview.description && !preview.image)) {
    let host = url;
    try { host = new URL(url).hostname.replace(/^www\./, ''); } catch {}
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer ugc"
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background/40 border border-border/40 text-xs text-foreground hover:bg-background/60 transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
        <span className="truncate">{host}</span>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer ugc"
      className="block rounded-xl overflow-hidden border border-border/40 bg-background/40 hover:bg-background/70 transition-colors max-w-[420px]"
    >
      {preview.image && (
        <div className="w-full aspect-[1.91/1] bg-muted overflow-hidden">
          <img
            src={preview.image}
            alt={preview.title || preview.siteName || 'Aperçu'}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
      <div className="p-3">
        {preview.siteName && (
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 truncate">
            {preview.siteName}
          </p>
        )}
        {preview.title && (
          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
            {preview.title}
          </p>
        )}
        {preview.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-snug">
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
};

export default LinkPreviewCard;
