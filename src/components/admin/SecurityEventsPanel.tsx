import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  ShieldAlert, ShieldCheck, AlertTriangle, Bug, Zap, Globe, Lock, 
  Trash2, CheckCircle, RefreshCw, Eye, Filter, Clock, Ban, UserX, 
  RotateCcw, Copy, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type SecurityEvent = {
  id: string;
  event_type: string;
  severity: string;
  source_ip: string | null;
  user_id: string | null;
  user_agent: string | null;
  page_url: string | null;
  description: string;
  payload: string | null;
  metadata: Record<string, unknown> | null;
  is_blocked: boolean;
  is_resolved: boolean;
  created_at: string;
};

const severityConfig: Record<string, { color: string; icon: React.ElementType }> = {
  critical: { color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: ShieldAlert },
  high: { color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: AlertTriangle },
  medium: { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: Bug },
  low: { color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Eye },
};

const eventTypeLabels: Record<string, string> = {
  xss_attempt: 'Tentative XSS',
  sql_injection: 'Injection SQL',
  brute_force: 'Force brute',
  failed_login: 'Échec connexion',
  ddos: 'Attaque DDoS',
  rapid_requests: 'Requêtes rapides',
  url_manipulation: 'Manipulation URL',
  csrf_attempt: 'Tentative CSRF',
  devtools_opened: 'DevTools ouvert',
  suspicious_storage_access: 'Accès stockage suspect',
  prototype_pollution: 'Pollution prototype',
  console_tampering: 'Modification console',
  insecure_connection: 'Connexion non sécurisée',
  rate_limit_exceeded: 'Limite atteinte',
  unauthorized_access: 'Accès non autorisé',
};

const SecurityEventsPanel = () => {
  const queryClient = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [showResolved, setShowResolved] = useState(false);

  const { data: events, isLoading } = useQuery({
    queryKey: ['security-events', severityFilter, showResolved],
    queryFn: async () => {
      let query = (supabase.from('security_events' as any) as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }
      if (!showResolved) {
        query = query.eq('is_resolved', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SecurityEvent[];
    },
    refetchInterval: 60000,
  });

  const { data: stats } = useQuery({
    queryKey: ['security-stats'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('security_events' as any) as any)
        .select('severity, is_resolved')
        .eq('is_resolved', false);
      if (error) throw error;
      
      const arr = (data || []) as { severity: string; is_resolved: boolean }[];
      return {
        critical: arr.filter((e) => e.severity === 'critical').length,
        high: arr.filter((e) => e.severity === 'high').length,
        medium: arr.filter((e) => e.severity === 'medium').length,
        low: arr.filter((e) => e.severity === 'low').length,
        total: arr.length,
      };
    },
    refetchInterval: 60000,
  });

  const resolveMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await (supabase.from('security_events' as any) as any)
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-events'] });
      queryClient.invalidateQueries({ queryKey: ['security-stats'] });
      toast.success('Événement résolu');
    },
  });

  const purgeResolvedMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from('security_events' as any) as any)
        .delete()
        .eq('is_resolved', true);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-events'] });
      queryClient.invalidateQueries({ queryKey: ['security-stats'] });
      toast.success('Événements résolus supprimés');
    },
  });

  const blockUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { user: admin } } = await supabase.auth.getUser();
      if (!admin) throw new Error('Non authentifié');

      // Insert moderation action
      const { error: modError } = await (supabase.from('moderation_actions') as any)
        .insert({
          action_type: 'block',
          performed_by: admin.id,
          target_user_id: userId,
          details: 'Blocage automatique suite à un événement de sécurité',
        });
      if (modError) throw modError;

      // Update profile to blocked
      const { error: profileError } = await supabase
        .from('profiles' as any)
        .update({ is_blocked: true } as any)
        .eq('user_id', userId);
      if (profileError) throw profileError;
    },
    onSuccess: () => {
      toast.success('Utilisateur bloqué avec succès');
      queryClient.invalidateQueries({ queryKey: ['security-events'] });
    },
    onError: () => {
      toast.error('Erreur lors du blocage');
    },
  });

  const suspendUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { user: admin } } = await supabase.auth.getUser();
      if (!admin) throw new Error('Non authentifié');

      const { error: modError } = await (supabase.from('moderation_actions') as any)
        .insert({
          action_type: 'suspend',
          performed_by: admin.id,
          target_user_id: userId,
          details: 'Suspension suite à une menace de sécurité détectée',
        });
      if (modError) throw modError;

      const { error: profileError } = await supabase
        .from('profiles' as any)
        .update({ is_suspended: true } as any)
        .eq('user_id', userId);
      if (profileError) throw profileError;
    },
    onSuccess: () => {
      toast.success('Utilisateur suspendu avec succès');
      queryClient.invalidateQueries({ queryKey: ['security-events'] });
    },
    onError: () => {
      toast.error('Erreur lors de la suspension');
    },
  });

  const resetRateLimitMutation = useMutation({
    mutationFn: async (identifier: string) => {
      const { error } = await (supabase.from('rate_limits' as any) as any)
        .update({ is_blocked: false, blocked_until: null, request_count: 0 })
        .eq('identifier', identifier);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Rate limit réinitialisé');
    },
    onError: () => {
      toast.error('Erreur lors de la réinitialisation');
    },
  });

  const resolveAllBySeverityMutation = useMutation({
    mutationFn: async (severity: string) => {
      let query = (supabase.from('security_events' as any) as any)
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('is_resolved', false);
      
      if (severity !== 'all') {
        query = query.eq('severity', severity);
      }
      
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-events'] });
      queryClient.invalidateQueries({ queryKey: ['security-stats'] });
      toast.success('Événements résolus en masse');
    },
  });

  const copyEventDetails = (event: SecurityEvent) => {
    const details = [
      `Type: ${eventTypeLabels[event.event_type] || event.event_type}`,
      `Sévérité: ${event.severity}`,
      `Description: ${event.description}`,
      `Date: ${format(new Date(event.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}`,
      event.user_id ? `User ID: ${event.user_id}` : null,
      event.page_url ? `URL: ${event.page_url}` : null,
      event.payload ? `Payload: ${event.payload}` : null,
      event.metadata ? `Metadata: ${JSON.stringify(event.metadata, null, 2)}` : null,
    ].filter(Boolean).join('\n');
    
    navigator.clipboard.writeText(details);
    toast.success('Détails copiés dans le presse-papier');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-destructive" />
          <h2 className="text-lg font-semibold">Sécurité & Protection</h2>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowResolved(!showResolved)}>
            {showResolved ? 'Masquer résolus' : 'Voir résolus'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Résoudre
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => resolveAllBySeverityMutation.mutate('all')}>
                Tout résoudre
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => resolveAllBySeverityMutation.mutate('low')}>
                Résoudre les faibles
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => resolveAllBySeverityMutation.mutate('medium')}>
                Résoudre les moyennes
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="destructive" onClick={() => purgeResolvedMutation.mutate()} disabled={purgeResolvedMutation.isPending}>
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Purger
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Critiques', value: stats?.critical || 0, color: 'text-red-500', bg: 'bg-red-500/10' },
          { label: 'Élevées', value: stats?.high || 0, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { label: 'Moyennes', value: stats?.medium || 0, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
          { label: 'Faibles', value: stats?.low || 0, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Total actifs', value: stats?.total || 0, color: 'text-foreground', bg: 'bg-muted' },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* DDoS Protection Status */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Protection DDoS active</p>
            <p className="text-xs text-muted-foreground">
              Rate limiting activé · Détection XSS/SQLi · Surveillance brute force · Monitoring temps réel
            </p>
          </div>
          <Badge variant="outline" className="border-primary/30 text-primary">
            <Lock className="w-3 h-3 mr-1" /> Actif
          </Badge>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <Tabs value={severityFilter} onValueChange={setSeverityFilter}>
        <TabsList className="grid grid-cols-5">
          <TabsTrigger value="all" className="text-xs">Tous</TabsTrigger>
          <TabsTrigger value="critical" className="text-xs">Critiques</TabsTrigger>
          <TabsTrigger value="high" className="text-xs">Élevées</TabsTrigger>
          <TabsTrigger value="medium" className="text-xs">Moyennes</TabsTrigger>
          <TabsTrigger value="low" className="text-xs">Faibles</TabsTrigger>
        </TabsList>

        <TabsContent value={severityFilter} className="mt-3">
          <ScrollArea className="h-[calc(100dvh-520px)]">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            ) : events?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Aucune menace détectée</p>
                <p className="text-xs mt-1">Le site est protégé</p>
              </div>
            ) : (
              <div className="space-y-2">
                {events?.map((event) => {
                  const config = severityConfig[event.severity] || severityConfig.medium;
                  const SevIcon = config.icon;

                  return (
                    <Card key={event.id} className={`border-border/50 ${event.is_resolved ? 'opacity-60' : ''}`}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                            <SevIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={`text-[10px] ${config.color}`}>
                                {event.severity.toUpperCase()}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px]">
                                {eventTypeLabels[event.event_type] || event.event_type}
                              </Badge>
                              {event.is_blocked && (
                                <Badge variant="destructive" className="text-[10px]">Bloqué</Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium truncate">{event.description}</p>
                            {event.payload && (
                              <pre className="text-[10px] text-muted-foreground bg-muted/50 rounded p-1.5 mt-1 overflow-x-auto max-h-16">
                                {event.payload.slice(0, 200)}
                              </pre>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(event.created_at), 'dd/MM HH:mm:ss', { locale: fr })}
                              </span>
                              {event.page_url && (
                                <span className="flex items-center gap-1 truncate max-w-[200px]">
                                  <Globe className="w-3 h-3" />
                                  {new URL(event.page_url).pathname}
                                </span>
                              )}
                              {event.user_id && (
                                <span className="text-[10px] font-mono">
                                  👤 {event.user_id.slice(0, 8)}…
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick Actions Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <Zap className="w-4 h-4 text-primary" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              {!event.is_resolved && (
                                <DropdownMenuItem onClick={() => resolveMutation.mutate(event.id)}>
                                  <CheckCircle className="w-3.5 h-3.5 mr-2 text-primary" />
                                  Marquer résolu
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => copyEventDetails(event)}>
                                <Copy className="w-3.5 h-3.5 mr-2" />
                                Copier les détails
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {event.user_id && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => blockUserMutation.mutate(event.user_id!)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Ban className="w-3.5 h-3.5 mr-2" />
                                    Bloquer l'utilisateur
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => suspendUserMutation.mutate(event.user_id!)}
                                    className="text-orange-500 focus:text-orange-500"
                                  >
                                    <UserX className="w-3.5 h-3.5 mr-2" />
                                    Suspendre le compte
                                  </DropdownMenuItem>
                                </>
                              )}
                              {(event.event_type === 'rate_limit_exceeded' || event.event_type === 'ddos') && event.user_id && (
                                <DropdownMenuItem onClick={() => resetRateLimitMutation.mutate(event.user_id!)}>
                                  <RotateCcw className="w-3.5 h-3.5 mr-2" />
                                  Réinitialiser rate limit
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityEventsPanel;
