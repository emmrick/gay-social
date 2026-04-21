/**
 * Dense Linear-style mission card.
 * Color-coded by type, SLA pulse, action menu, hover preview.
 */
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Clock,
  Euro,
  RefreshCw,
  AlertTriangle,
  Lock,
  MoreHorizontal,
  Copy,
  Flame,
  Shield,
  Headphones,
  IdCard,
  Image as ImageIcon,
  Megaphone,
  UserX,
  CreditCard,
  Banknote,
  Ticket,
  Bird,
  Eye,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { getTaskTypeLabel, formatCentsReward } from '@/hooks/useModerationTaskQueue';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TYPE_META: Record<string, { color: string; bg: string; icon: React.ComponentType<any> }> = {
  identity_verification: { color: 'border-l-cyan-500', bg: 'bg-cyan-500/10', icon: IdCard },
  report_review: { color: 'border-l-rose-500', bg: 'bg-rose-500/10', icon: AlertTriangle },
  content_moderation: { color: 'border-l-orange-500', bg: 'bg-orange-500/10', icon: ImageIcon },
  ad_review: { color: 'border-l-amber-500', bg: 'bg-amber-500/10', icon: Megaphone },
  user_suspension: { color: 'border-l-red-600', bg: 'bg-red-600/10', icon: UserX },
  credit_management: { color: 'border-l-emerald-500', bg: 'bg-emerald-500/10', icon: CreditCard },
  withdrawal_management: { color: 'border-l-emerald-600', bg: 'bg-emerald-600/10', icon: Banknote },
  promo_validation: { color: 'border-l-purple-500', bg: 'bg-purple-500/10', icon: Ticket },
  support_chat: { color: 'border-l-violet-500', bg: 'bg-violet-500/10', icon: Headphones },
  tween_review: { color: 'border-l-sky-500', bg: 'bg-sky-500/10', icon: Bird },
  screenshot_investigation: { color: 'border-l-pink-500', bg: 'bg-pink-500/10', icon: Shield },
};

const getSlaLevel = (createdAt: string): 'fresh' | 'warning' | 'critical' => {
  const ageMin = (Date.now() - new Date(createdAt).getTime()) / 60000;
  if (ageMin > 15) return 'critical';
  if (ageMin > 5) return 'warning';
  return 'fresh';
};

interface MissionCardProps {
  task: any;
  index?: number;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onRecycle?: (id: string) => void;
  onViewTarget?: (userId: string) => void;
  recycling?: boolean;
}

const MissionCard = ({
  task,
  index,
  selected,
  onToggleSelect,
  onRecycle,
  onViewTarget,
  recycling,
}: MissionCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const isReserved = task.status === 'reserved';
  const meta = TYPE_META[task.task_type] || {
    color: 'border-l-muted-foreground/40',
    bg: 'bg-muted',
    icon: Shield,
  };
  const Icon = meta.icon;
  const sla = getSlaLevel(task.created_at);
  const refusalCount = task.refused_by?.length || 0;
  const isHot = task.priority_score >= 100 || sla === 'critical' || refusalCount >= 2;

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 rounded-lg border-l-2 border border-border bg-card px-2.5 py-2 transition-all hover:bg-muted/40 hover:shadow-sm',
        meta.color,
        isReserved && 'bg-primary/5 border-primary/30',
        selected && 'ring-2 ring-primary/50 bg-primary/5',
        sla === 'critical' && !isReserved && 'animate-pulse-subtle',
      )}
    >
      {/* Selection checkbox (admin bulk) */}
      {onToggleSelect && (
        <button
          type="button"
          onClick={() => onToggleSelect(task.id)}
          className={cn(
            'w-4 h-4 rounded border-2 shrink-0 transition-colors',
            selected ? 'bg-primary border-primary' : 'border-muted-foreground/40 hover:border-primary',
          )}
          aria-label="Sélectionner"
        >
          {selected && <span className="block text-[10px] leading-none text-primary-foreground">✓</span>}
        </button>
      )}

      {/* Type icon */}
      <div className={cn('w-7 h-7 rounded-md flex items-center justify-center shrink-0', meta.bg)}>
        {isReserved ? <Lock className="w-3.5 h-3.5 text-primary" /> : <Icon className="w-3.5 h-3.5" />}
      </div>

      {/* Index */}
      {typeof index === 'number' && !isReserved && (
        <span className="text-[10px] font-mono text-muted-foreground/60 tabular-nums shrink-0 w-6">
          #{index + 1}
        </span>
      )}

      {/* Main content — single dense row */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-[13px] font-medium text-foreground truncate">
          {getTaskTypeLabel(task.task_type)}
        </span>
        {task.description && (
          <span className="text-xs text-muted-foreground/80 truncate hidden sm:inline">
            · {task.description}
          </span>
        )}
      </div>

      {/* SLA + reward badges */}
      <div className="flex items-center gap-1 shrink-0">
        {isHot && (
          <Flame className="w-3.5 h-3.5 text-orange-500 animate-pulse" aria-label="Priorité haute" />
        )}
        <span
          className={cn(
            'text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded',
            sla === 'fresh' && 'text-emerald-600 bg-emerald-500/10',
            sla === 'warning' && 'text-amber-600 bg-amber-500/10',
            sla === 'critical' && 'text-rose-600 bg-rose-500/10 font-semibold',
          )}
        >
          {formatDistanceToNow(new Date(isReserved ? task.reserved_at ?? task.created_at : task.created_at), {
            locale: fr,
          })
            .replace('environ ', '')
            .replace('moins d’une minute', '<1m')
            .replace(' minutes', 'm')
            .replace(' minute', 'm')
            .replace(' heures', 'h')
            .replace(' heure', 'h')
            .replace(' jours', 'j')
            .replace(' jour', 'j')}
        </span>
        <Badge
          variant="outline"
          className="text-[10px] tabular-nums px-1.5 py-0 h-5 text-primary border-primary/30"
        >
          <Euro className="w-2.5 h-2.5 mr-0.5" />
          {formatCentsReward(task.reward_cents)}
        </Badge>
        {refusalCount > 0 && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">
            {refusalCount}× refus
          </Badge>
        )}
        {isReserved && (
          <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5">
            Réservée
          </Badge>
        )}
      </div>

      {/* Actions */}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {task.target_user_id && onViewTarget && (
            <DropdownMenuItem onClick={() => onViewTarget(task.target_user_id)}>
              <Eye className="w-3.5 h-3.5 mr-2" />
              Voir l'utilisateur
            </DropdownMenuItem>
          )}
          {onRecycle && (
            <DropdownMenuItem
              disabled={recycling}
              onClick={() => onRecycle(task.id)}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Ré-attribuer
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(task.id);
              toast.success('ID copié');
            }}
          >
            <Copy className="w-3.5 h-3.5 mr-2" />
            Copier l'ID
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default MissionCard;
