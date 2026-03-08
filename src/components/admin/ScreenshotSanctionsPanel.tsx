import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Camera, Shield, Clock, AlertTriangle, Trash2, Search, Loader2, User, Eye, FileWarning } from 'lucide-react';
import { notifyScreenshotSanctionLifted } from '@/services/pushNotificationService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface ScreenshotViolation {
  id: string;
  user_id: string;
  violation_count: number;
  suspended_until: string | null;
  last_violation_at: string | null;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
  pending_tasks: number;
}

const ScreenshotSanctionsPanel = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all screenshot violations with profiles + pending tasks count
  const { data: violations, isLoading } = useQuery({
    queryKey: ['admin-screenshot-violations'],
    queryFn: async () => {
      const { data: violationsData, error } = await supabase
        .from('screenshot_violations')
        .select('*')
        .order('last_violation_at', { ascending: false });
      
      if (error) throw error;
      
      const userIds = violationsData?.map(v => v.user_id) || [];

      // Fetch profiles + pending moderation tasks in parallel
      const [profilesRes, tasksRes] = await Promise.all([
        supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', userIds),
        supabase.from('moderation_tasks')
          .select('target_user_id, id')
          .eq('task_type', 'screenshot_investigation')
          .in('status', ['pending', 'reserved'])
          .in('target_user_id', userIds),
      ]);
      
      const taskCountMap: Record<string, number> = {};
      tasksRes.data?.forEach(t => {
        if (t.target_user_id) {
          taskCountMap[t.target_user_id] = (taskCountMap[t.target_user_id] || 0) + 1;
        }
      });

      return violationsData?.map(v => ({
        ...v,
        profile: profilesRes.data?.find(p => p.user_id === v.user_id),
        pending_tasks: taskCountMap[v.user_id] || 0,
      })) as ScreenshotViolation[];
    },
    refetchInterval: 30000,
  });

  const liftSanction = useMutation({
    mutationFn: async (violation: ScreenshotViolation) => {
      const { error } = await supabase
        .from('screenshot_violations')
        .update({ suspended_until: null, updated_at: new Date().toISOString() })
        .eq('id', violation.id);
      if (error) throw error;
      await notifyScreenshotSanctionLifted(violation.user_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-screenshot-violations'] });
      toast.success('Sanction levée avec succès');
    },
    onError: () => toast.error('Erreur lors de la levée de la sanction'),
  });

  const resetViolations = useMutation({
    mutationFn: async (violationId: string) => {
      const { error } = await supabase
        .from('screenshot_violations')
        .update({ violation_count: 0, suspended_until: null, last_violation_at: null })
        .eq('id', violationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-screenshot-violations'] });
      toast.success('Compteur réinitialisé');
    },
    onError: () => toast.error('Erreur lors de la réinitialisation'),
  });

  const filteredViolations = violations?.filter(v => 
    v.profile?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.user_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isSuspended = (suspendedUntil: string | null) => {
    if (!suspendedUntil) return false;
    return new Date() < new Date(suspendedUntil);
  };

  const getSuspensionTimeLeft = (suspendedUntil: string) => {
    const end = new Date(suspendedUntil);
    const now = new Date();
    if (now >= end) return null;
    const diff = end.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return `${Math.floor(hours / 24)}j`;
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes} min`;
  };

  const getSeverityBadge = (count: number) => {
    if (count >= 5) return <Badge variant="destructive" className="gap-1">🚨 Critique ({count})</Badge>;
    if (count >= 3) return <Badge variant="destructive">Sévère ({count})</Badge>;
    if (count === 2) return <Badge className="bg-warning text-warning-foreground">Modéré ({count})</Badge>;
    return <Badge variant="secondary">Mineur ({count})</Badge>;
  };

  const activeSuspensions = violations?.filter(v => isSuspended(v.suspended_until)).length || 0;
  const totalViolations = violations?.reduce((acc, v) => acc + v.violation_count, 0) || 0;
  const repeatOffenders = violations?.filter(v => v.violation_count >= 3).length || 0;
  const pendingInvestigations = violations?.reduce((acc, v) => acc + v.pending_tasks, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Camera className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Sanctions & Surveillance captures d'écran</h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <div>
                <p className="text-xl font-bold">{violations?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Utilisateurs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning" />
              <div>
                <p className="text-xl font-bold">{activeSuspensions}</p>
                <p className="text-xs text-muted-foreground">Suspensions actives</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <FileWarning className="w-4 h-4 text-destructive" />
              <div>
                <p className="text-xl font-bold">{repeatOffenders}</p>
                <p className="text-xs text-muted-foreground">Récidivistes (3+)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xl font-bold">{pendingInvestigations}</p>
                <p className="text-xs text-muted-foreground">Enquêtes en attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom d'utilisateur..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Violations List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Liste des violations & enquêtes</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[450px]">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : filteredViolations?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucune violation de capture d'écran</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredViolations?.map((violation) => {
                  const suspended = isSuspended(violation.suspended_until);
                  const timeLeft = violation.suspended_until ? getSuspensionTimeLeft(violation.suspended_until) : null;
                  const isRepeatOffender = violation.violation_count >= 3;

                  return (
                    <div
                      key={violation.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        isRepeatOffender
                          ? 'border-destructive/50 bg-destructive/5'
                          : 'bg-card hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {violation.profile?.avatar_url ? (
                            <img
                              src={violation.profile.avatar_url}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                              <User className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {violation.profile?.username || 'Utilisateur inconnu'}
                              </p>
                              {isRepeatOffender && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                  RÉCIDIVISTE
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              ID: {violation.user_id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          {getSeverityBadge(violation.violation_count)}
                          {suspended && timeLeft && (
                            <Badge variant="destructive" className="gap-1 text-xs">
                              <Clock className="w-3 h-3" />
                              {timeLeft}
                            </Badge>
                          )}
                          {violation.pending_tasks > 0 && (
                            <Badge variant="outline" className="gap-1 text-xs border-primary text-primary">
                              <Eye className="w-3 h-3" />
                              {violation.pending_tasks} enquête{violation.pending_tasks > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {violation.last_violation_at && (
                            <p>
                              Dernière: {format(new Date(violation.last_violation_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                            </p>
                          )}
                          <p>
                            Première: {format(new Date(violation.created_at), 'dd MMM yyyy', { locale: fr })}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          {suspended && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  Lever la sanction
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Lever la sanction ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    L'utilisateur pourra à nouveau accéder aux médias. Le compteur de violations sera conservé.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => liftSanction.mutate(violation)}
                                    disabled={liftSanction.isPending}
                                  >
                                    {liftSanction.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Confirmer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Réinitialiser le compteur ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Toutes les violations seront supprimées. L'utilisateur repartira à zéro.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => resetViolations.mutate(violation.id)}
                                  disabled={resetViolations.isPending}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  {resetViolations.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                  Réinitialiser
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScreenshotSanctionsPanel;
