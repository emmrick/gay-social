import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PassiveCountdownProps {
  lastPassiveCreditAt: string | null;
  intervalHours: number;
  amount: number;
  isAtMax: boolean;
  isPromo?: boolean;
}

const formatDuration = (totalSeconds: number) => {
  if (totalSeconds <= 0) return 'imminent';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
};

const PassiveCountdown = ({
  lastPassiveCreditAt,
  intervalHours,
  amount,
  isAtMax,
  isPromo,
}: PassiveCountdownProps) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (isAtMax) {
    return (
      <p className="text-[9px] text-muted-foreground/70 font-medium mt-1 flex items-center gap-1">
        <Timer className="w-2.5 h-2.5" />
        Maximum atteint
      </p>
    );
  }

  if (!lastPassiveCreditAt) {
    return (
      <p className="text-[9px] text-muted-foreground/70 font-medium mt-1 flex items-center gap-1">
        <Timer className="w-2.5 h-2.5" />
        Prochaine recharge bientôt
      </p>
    );
  }

  const lastMs = new Date(lastPassiveCreditAt).getTime();
  const intervalMs = intervalHours * 3600 * 1000;
  const elapsed = now - lastMs;
  const remainingMs = intervalMs - (elapsed % intervalMs);
  const remainingSec = Math.max(0, Math.floor(remainingMs / 1000));

  return (
    <p
      className={cn(
        "text-[9px] font-semibold mt-1 flex items-center gap-1 tabular-nums",
        isPromo ? "text-orange-500" : "text-amber-500"
      )}
    >
      <Timer className="w-2.5 h-2.5 animate-pulse" />
      +{amount} dans {formatDuration(remainingSec)}
    </p>
  );
};

export default PassiveCountdown;
