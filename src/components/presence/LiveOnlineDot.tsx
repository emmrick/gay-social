import { cn } from '@/lib/utils';
import { useLivePresence } from '@/hooks/useLivePresence';

interface LiveOnlineDotProps {
  profile: {
    user_id?: string | null;
    is_online?: boolean | null;
    last_seen?: string | null;
    hide_online_status?: boolean | null;
    hide_last_seen?: boolean | null;
  } | null | undefined;
  /** Visual size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Show grey dot when offline (default true) */
  showOffline?: boolean;
  /** Animate ping ring when online */
  pulse?: boolean;
  /** Border ring color (use semantic token) */
  borderClassName?: string;
  className?: string;
}

const SIZE_MAP = {
  xs: 'w-2 h-2',
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
  lg: 'w-3.5 h-3.5',
};

const LiveOnlineDot = ({
  profile,
  size = 'md',
  showOffline = false,
  pulse = false,
  borderClassName = 'border-background',
  className,
}: LiveOnlineDotProps) => {
  const live = useLivePresence(profile);
  const sizeCls = SIZE_MAP[size];

  if (live.showIndicator) {
    return (
      <span className={cn('relative inline-flex', sizeCls, className)} aria-label="En ligne">
        {pulse && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50 animate-ping" />
        )}
        <span
          className={cn(
            'relative inline-flex rounded-full bg-green-500 border-2 shadow-sm',
            sizeCls,
            borderClassName,
          )}
        />
      </span>
    );
  }

  if (!showOffline || profile?.hide_online_status) return null;

  return (
    <span
      className={cn(
        'inline-block rounded-full bg-muted-foreground/40 border-2',
        sizeCls,
        borderClassName,
        className,
      )}
      aria-label="Hors ligne"
    />
  );
};

export default LiveOnlineDot;
