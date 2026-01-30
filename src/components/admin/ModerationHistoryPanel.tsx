import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  History,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Ban,
  UserCheck,
  FileCheck,
  FileX,
  Search,
  Filter,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useModerationActions,
  ModerationAction,
  ModerationActionType,
  getActionTypeLabel,
  getActionTypeColor,
} from '@/hooks/useModerationActions';

const getActionIcon = (type: ModerationActionType) => {
  switch (type) {
    case 'user_suspended':
      return <Ban className="w-4 h-4 text-destructive" />;
    case 'user_unblocked':
      return <UserCheck className="w-4 h-4 text-green-500" />;
    case 'verification_approved':
      return <ShieldCheck className="w-4 h-4 text-green-500" />;
    case 'verification_rejected':
      return <ShieldX className="w-4 h-4 text-destructive" />;
    case 'verification_requested':
      return <ShieldAlert className="w-4 h-4 text-blue-500" />;
    case 'report_resolved':
      return <FileCheck className="w-4 h-4 text-green-500" />;
    case 'report_dismissed':
      return <FileX className="w-4 h-4 text-muted-foreground" />;
    case 'manual_verification':
      return <ShieldCheck className="w-4 h-4 text-green-500" />;
    default:
      return <History className="w-4 h-4" />;
  }
};

interface ActionItemProps {
  action: ModerationAction;
  targetUsername?: string;
}

const ActionItem = ({ action, targetUsername }: ActionItemProps) => {
  return (
    <div className="flex items-start gap-3 p-3 border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
      <div className="mt-0.5 p-2 rounded-full bg-secondary/50">
        {getActionIcon(action.action_type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={getActionTypeColor(action.action_type)}>
            {getActionTypeLabel(action.action_type)}
          </Badge>
          {targetUsername && (
            <span className="text-xs text-muted-foreground">
              sur <span className="font-medium text-foreground">{targetUsername}</span>
            </span>
          )}
        </div>
        
        {action.details && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {action.details}
          </p>
        )}
        
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          {action.performer && (
            <div className="flex items-center gap-1">
              <Avatar className="w-4 h-4">
                <AvatarImage src={action.performer.avatar_url || undefined} />
                <AvatarFallback className="text-[8px]">
                  {action.performer.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>{action.performer.username}</span>
            </div>
          )}
          <span>•</span>
          <span>
            {formatDistanceToNow(new Date(action.created_at), {
              addSuffix: true,
              locale: fr,
            })}
          </span>
        </div>
      </div>
    </div>
  );
};

interface ModerationHistoryPanelProps {
  targetUserId?: string;
  targetUsername?: string;
  compact?: boolean;
}

const ModerationHistoryPanel = ({
  targetUserId,
  targetUsername,
  compact = false,
}: ModerationHistoryPanelProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const { data: actions, isLoading } = useModerationActions(targetUserId);

  const filteredActions = actions?.filter((action) => {
    const matchesSearch =
      !searchQuery ||
      action.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      action.performer?.username.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filterType === 'all' || action.action_type === filterType;

    return matchesSearch && matchesFilter;
  });

  if (compact) {
    return (
      <div className="space-y-2">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <History className="w-4 h-4" />
          Historique récent
        </h4>
        <ScrollArea className="h-48">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Chargement...
            </div>
          ) : !filteredActions?.length ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aucune action
            </div>
          ) : (
            filteredActions.slice(0, 5).map((action) => (
              <ActionItem
                key={action.id}
                action={action}
                targetUsername={targetUsername}
              />
            ))
          )}
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <History className="w-5 h-5" />
          Historique des actions
        </h3>
        <Badge variant="secondary">{actions?.length || 0} actions</Badge>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filtrer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les actions</SelectItem>
            <SelectItem value="user_suspended">Suspensions</SelectItem>
            <SelectItem value="user_unblocked">Déblocages</SelectItem>
            <SelectItem value="verification_approved">Vérifications approuvées</SelectItem>
            <SelectItem value="verification_rejected">Vérifications refusées</SelectItem>
            <SelectItem value="verification_requested">Demandes de vérification</SelectItem>
            <SelectItem value="manual_verification">Vérifications manuelles</SelectItem>
            <SelectItem value="report_resolved">Signalements résolus</SelectItem>
            <SelectItem value="report_dismissed">Signalements rejetés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Actions list */}
      <ScrollArea className="h-[500px] border rounded-lg">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            Chargement de l'historique...
          </div>
        ) : !filteredActions?.length ? (
          <div className="p-8 text-center text-muted-foreground">
            <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Aucune action trouvée
          </div>
        ) : (
          filteredActions.map((action) => (
            <ActionItem
              key={action.id}
              action={action}
              targetUsername={targetUsername}
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
};

export default ModerationHistoryPanel;
