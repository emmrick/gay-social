/**
 * MessagesTabs — refonte Phase A "Premium iMessage".
 * Tabs en pilules glass avec indicateur animé, badges premium.
 */
import { Users, Archive, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessagesTabsProps {
  value: 'conversations' | 'groups' | 'archived';
  onValueChange: (value: string) => void;
  unreadCount: number;
  archivedCount: number;
  groupsCount: number;
}

const TabButton = ({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  count: number;
}) => (
  <button
    onClick={onClick}
    className={cn(
      'relative flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-semibold transition-all duration-200 active:scale-95',
      active
        ? 'text-foreground bg-background shadow-[0_2px_8px_-2px_hsl(220_30%_20%/0.08),0_0_0_0.5px_hsl(var(--border))]'
        : 'text-muted-foreground hover:text-foreground/80',
    )}
  >
    <Icon className={cn('w-3.5 h-3.5 transition-colors', active && 'text-primary')} />
    <span>{label}</span>
    {count > 0 && (
      <span
        className={cn(
          'min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center tabular-nums transition-colors',
          active ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-primary/15 text-primary',
        )}
      >
        {count > 99 ? '99+' : count}
      </span>
    )}
  </button>
);

const MessagesTabs = ({
  value,
  onValueChange,
  unreadCount,
  archivedCount,
  groupsCount,
}: MessagesTabsProps) => {
  return (
    <div className="px-4 pb-3">
      <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-muted/40 border border-border/30">
        <TabButton
          active={value === 'conversations'}
          onClick={() => onValueChange('conversations')}
          icon={MessageSquare}
          label="Messages"
          count={unreadCount}
        />
        <TabButton
          active={value === 'groups'}
          onClick={() => onValueChange('groups')}
          icon={Users}
          label="Groupes"
          count={groupsCount}
        />
        <TabButton
          active={value === 'archived'}
          onClick={() => onValueChange('archived')}
          icon={Archive}
          label="Archives"
          count={archivedCount}
        />
      </div>
    </div>
  );
};

export default MessagesTabs;
