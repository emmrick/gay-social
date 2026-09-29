import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Bug, CheckCircle, Trash2, RefreshCw, ChevronDown, ChevronUp, 
  Globe, Smartphone, AlertTriangle, XCircle, Terminal, Copy, 
  Layers, Tag
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';

type ErrorLog = {
  id: string;
  user_id: string | null;
  error_message: string;
  error_stack: string | null;
  error_source: string | null;
  page_url: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
};

type GroupedError = {
  key: string;
  message: string;
  source: string | null;
  count: number;
  logs: ErrorLog[];
  latestAt: string;
};

const sourceIcons: Record<string, React.ElementType> = {
  unhandled_rejection: XCircle,
  global_error: AlertTriangle,
  error_boundary: Bug,
  console_error: Terminal,
  network_error: Globe,
  manual: Bug,
};

const sourceLabels: Record<string, string> = {
  unhandled_rejection: 'Promise rejetée',
  global_error: 'Erreur globale',
  error_boundary: 'ErrorBoundary',
  console_error: 'Console',
  network_error: 'Réseau',
  manual: 'Manuel',
};

const priorityLabels: Record<string, { label: string; color: string }> = {
  critical: { label: 'Critique', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  high: { label: 'Haute', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  normal: { label: 'Normale', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  low: { label: 'Basse', color: 'bg-muted text-muted-foreground border-border' },
};

const getAutoPriority = (log: ErrorLog): string => {
  const msg = log.error_message.toLowerCase();
  if (msg.includes('crash') || msg.includes('fatal') || log.error_source === 'error_boundary') return 'critical';
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('supabase')) return 'high';
  if (log.error_source === 'console_error') return 'low';
  return 'normal';
};

const ErrorLogsPanel = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [groupSimilar, setGroupSimilar] = useState(false);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['error-logs', filter, sourceFilter],
    queryFn: async () => {
      let query = supabase
        .from('error_logs' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (filter === 'unresolved') query = query.eq('is_resolved', false);
      if (filter === 'resolved') query = query.eq('is_resolved', true);
      if (sourceFilter !== 'all') query = query.eq('error_source', sourceFilter);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ErrorLog[];
    },
    refetchInterval: 120000,
  });

  const groupedLogs = useMemo<GroupedError[]>(() => {
    if (!logs || !groupSimilar) return [];
    const groups = new Map<string, GroupedError>();
    for (const log of logs) {
      // Normalize: strip numbers, UUIDs, timestamps for grouping
      const normalizedMsg = log.error_message
        .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>')
        .replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g, '<DATE>')
        .replace(/https?:\/\/[^\s]+/g, '<URL>')
        .slice(0, 120);
      const key = `${log.error_source}:${normalizedMsg}`;
      
      if (groups.has(key)) {
        const g = groups.get(key)!;
        g.count++;
        g.logs.push(log);
        if (log.created_at > g.latestAt) g.latestAt = log.created_at;
      } else {
        groups.set(key, {
          key,
          message: log.error_message,
          source: log.error_source,
          count: 1,
          logs: [log],
          latestAt: log.created_at,
        });
      }
    }
    return Array.from(groups.values()).sort((a, b) => 
      b.count - a.count || new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime()
    );
  }, [logs, groupSimilar]);

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('error_logs' as any)
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-logs'] });
      toast.success('Erreur marquée comme résolue');
    },
  });

  const resolveMultipleMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        const { error } = await supabase
          .from('error_logs' as any)
          .update({ is_resolved: true, resolved_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-logs'] });
      toast.success('Erreurs groupées résolues');
    },
  });

  const resolveAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('error_logs' as any)
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('is_resolved', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-logs'] });
      toast.success('Toutes les erreurs marquées comme résolues');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('error_logs' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-logs'] });
      toast.success('Log supprimé');
    },
  });

  const deleteResolvedMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('error_logs' as any)
        .delete()
        .eq('is_resolved', true);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-logs'] });
      toast.success('Logs résolus supprimés');
    },
  });

  const copyErrorDetails = (log: ErrorLog) => {
    const details = [
      `Message: ${log.error_message}`,
      `Source: ${sourceLabels[log.error_source || ''] || log.error_source}`,
      `Date: ${format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}`,
      log.page_url ? `Page: ${log.page_url}` : null,
      log.user_id ? `User ID: ${log.user_id}` : null,
      log.error_stack ? `\nStack trace:\n${log.error_stack}` : null,
      log.metadata && Object.keys(log.metadata).length > 0 ? `\nMetadata:\n${JSON.stringify(log.metadata, null, 2)}` : null,
    ].filter(Boolean).join('\n');
    
    navigator.clipboard.writeText(details);
    toast.success('Détails copiés dans le presse-papier');
  };

  const copyGroupedDetails = (group: GroupedError) => {
    const details = [
      `Erreur groupée (${group.count} occurrences)`,
      `Message: ${group.message}`,
      `Source: ${sourceLabels[group.source || ''] || group.source}`,
      `Dernière occurrence: ${format(new Date(group.latestAt), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}`,
      `\nPages affectées:`,
      ...Array.from(new Set(group.logs.map(l => l.page_url).filter(Boolean))).map(u => `  - ${u}`),
      `\nUsers affectés: ${new Set(group.logs.map(l => l.user_id).filter(Boolean)).size}`,
    ].filter(Boolean).join('\n');
    
    navigator.clipboard.writeText(details);
    toast.success('Détails du groupe copiés');
  };

  const unresolvedCount = logs?.filter(l => !l.is_resolved).length || 0;

  const isMobileUA = (ua: string | null) => {
    if (!ua) return false;
    return /android|iphone|ipad|mobile/i.test(ua);
  };

  const renderLogItem = (log: ErrorLog) => {
    const SourceIcon = sourceIcons[log.error_source || 'manual'] || Bug;
    const isExpanded = expandedId === log.id;
    const priority = getAutoPriority(log);
    const pConfig = priorityLabels[priority];

    return (
      <div 
        key={log.id} 
        className={`rounded-xl border p-3 transition-colors ${
          log.is_resolved 
            ? 'border-border/40 bg-muted/30 opacity-60' 
            : 'border-destructive/20 bg-destructive/5'
        }`}
      >
        <div className="flex items-start gap-2">
          <SourceIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${log.is_resolved ? 'text-muted-foreground' : 'text-destructive'}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {sourceLabels[log.error_source || ''] || log.error_source}
              </Badge>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${pConfig.color}`}>
                <Tag className="w-2.5 h-2.5 mr-0.5" />
                {pConfig.label}
              </Badge>
              {isMobileUA(log.user_agent) ? (
                <Smartphone className="w-3 h-3 text-muted-foreground" />
              ) : (
                <Globe className="w-3 h-3 text-muted-foreground" />
              )}
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: fr })}
              </span>
            </div>
            <p className="text-xs font-mono break-all line-clamp-2">{log.error_message}</p>
            {log.page_url && (
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                📍 {log.page_url.replace(window.location.origin, '')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setExpandedId(isExpanded ? null : log.id)}>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 mr-2" /> : <ChevronDown className="w-3.5 h-3.5 mr-2" />}
                  {isExpanded ? 'Réduire' : 'Détails'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => copyErrorDetails(log)}>
                  <Copy className="w-3.5 h-3.5 mr-2" />
                  Copier les détails
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {!log.is_resolved && (
                  <DropdownMenuItem onClick={() => resolveMutation.mutate(log.id)}>
                    <CheckCircle className="w-3.5 h-3.5 mr-2 text-primary" />
                    Marquer résolu
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={() => deleteMutation.mutate(log.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3 space-y-2 text-xs border-t border-border/50 pt-2">
            {log.error_stack && (
              <details open>
                <summary className="cursor-pointer font-medium text-muted-foreground">Stack trace</summary>
                <pre className="mt-1 p-2 rounded bg-muted text-[10px] overflow-x-auto whitespace-pre-wrap break-all max-h-40">
                  {log.error_stack}
                </pre>
              </details>
            )}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
              <div>
                <span className="font-medium">Date:</span>{' '}
                {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}
              </div>
              <div>
                <span className="font-medium">User ID:</span>{' '}
                {log.user_id ? log.user_id.slice(0, 8) + '...' : 'Anonyme'}
              </div>
              {log.user_agent && (
                <div className="col-span-2">
                  <span className="font-medium">UA:</span>{' '}
                  <span className="break-all">{log.user_agent.slice(0, 120)}</span>
                </div>
              )}
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <div className="col-span-2">
                  <span className="font-medium">Metadata:</span>{' '}
                  <pre className="inline">{JSON.stringify(log.metadata, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderGroupedItem = (group: GroupedError) => {
    const SourceIcon = sourceIcons[group.source || 'manual'] || Bug;
    const isExpanded = expandedId === group.key;
    const allResolved = group.logs.every(l => l.is_resolved);

    return (
      <div 
        key={group.key} 
        className={`rounded-xl border p-3 transition-colors ${
          allResolved
            ? 'border-border/40 bg-muted/30 opacity-60' 
            : 'border-destructive/20 bg-destructive/5'
        }`}
      >
        <div className="flex items-start gap-2">
          <SourceIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${allResolved ? 'text-muted-foreground' : 'text-destructive'}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {sourceLabels[group.source || ''] || group.source}
              </Badge>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                <Layers className="w-2.5 h-2.5 mr-0.5" />
                {group.count}x
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(group.latestAt), { addSuffix: true, locale: fr })}
              </span>
            </div>
            <p className="text-xs font-mono break-all line-clamp-2">{group.message}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => setExpandedId(isExpanded ? null : group.key)}>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 mr-2" /> : <ChevronDown className="w-3.5 h-3.5 mr-2" />}
                  {isExpanded ? 'Réduire' : `Voir ${group.count} occurrences`}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => copyGroupedDetails(group)}>
                  <Copy className="w-3.5 h-3.5 mr-2" />
                  Copier les détails
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {!allResolved && (
                  <DropdownMenuItem onClick={() => resolveMultipleMutation.mutate(group.logs.filter(l => !l.is_resolved).map(l => l.id))}>
                    <CheckCircle className="w-3.5 h-3.5 mr-2 text-primary" />
                    Résoudre le groupe ({group.logs.filter(l => !l.is_resolved).length})
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3 space-y-1.5 border-t border-border/50 pt-2 max-h-60 overflow-y-auto">
            {group.logs.map((log) => (
              <div key={log.id} className="text-[10px] flex items-center gap-2 p-1.5 rounded bg-muted/30">
                <span className="text-muted-foreground">
                  {format(new Date(log.created_at), 'dd/MM HH:mm', { locale: fr })}
                </span>
                <span className="flex-1 truncate font-mono">{log.error_message.slice(0, 80)}</span>
                <span>{log.user_id ? `👤 ${log.user_id.slice(0, 6)}` : '🔓'}</span>
                {!log.is_resolved && (
                  <Button variant="ghost" size="icon" className="h-4 w-4 p-0" onClick={() => resolveMutation.mutate(log.id)}>
                    <CheckCircle className="w-3 h-3 text-primary" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Bug className="w-5 h-5 text-destructive" />
          <h2 className="text-lg font-semibold">Logs d'erreurs</h2>
          {unresolvedCount > 0 && (
            <Badge variant="destructive" className="text-xs">{unresolvedCount}</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['error-logs'] })}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Rafraîchir
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-[150px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unresolved">Non résolues</SelectItem>
            <SelectItem value="resolved">Résolues</SelectItem>
            <SelectItem value="all">Toutes</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes sources</SelectItem>
            <SelectItem value="unhandled_rejection">Promise rejetée</SelectItem>
            <SelectItem value="global_error">Erreur globale</SelectItem>
            <SelectItem value="console_error">Console</SelectItem>
            <SelectItem value="error_boundary">ErrorBoundary</SelectItem>
            <SelectItem value="network_error">Réseau</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5 ml-auto">
          <Layers className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Grouper</span>
          <Switch checked={groupSimilar} onCheckedChange={setGroupSimilar} className="scale-75" />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {unresolvedCount > 0 && (
          <Button 
            variant="outline" size="sm" className="h-8 text-xs"
            onClick={() => resolveAllMutation.mutate()}
            disabled={resolveAllMutation.isPending}
          >
            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Tout résoudre
          </Button>
        )}
        <Button 
          variant="ghost" size="sm" className="h-8 text-xs text-destructive"
          onClick={() => deleteResolvedMutation.mutate()}
          disabled={deleteResolvedMutation.isPending}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1" /> Purger résolus
        </Button>
      </div>

      {/* Logs list */}
      <ScrollArea className="h-[calc(100dvh-320px)]">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : (groupSimilar ? groupedLogs : logs)?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bug className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucune erreur enregistrée 🎉</p>
          </div>
        ) : (
          <div className="space-y-2">
            {groupSimilar 
              ? groupedLogs.map(renderGroupedItem)
              : logs?.map(renderLogItem)
            }
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ErrorLogsPanel;
