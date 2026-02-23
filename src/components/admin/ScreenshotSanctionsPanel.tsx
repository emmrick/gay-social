import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Camera, Shield, Clock, AlertTriangle, Trash2, Search, Loader2, User } from 'lucide-react';
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
}

const ScreenshotSanctionsPanel = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all screenshot violations with profiles
  const { data: violations, isLoading } = useQuery({
    queryKey: ['admin-screenshot-violations'],
    queryFn: async () => {
      // Fetch violations
      const { data: violationsData, error } = await supabase
        .from('screenshot_violations')
        .select('*')
        .order('last_violation_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = violationsData?.map(v => v.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);
      
      return violationsData?.map(v => ({
        ...v,
        profile: profiles?.find(p => p.user_id === v.user_id)
      })) as ScreenshotViolation[];
    },
    refetchInterval: 30000,
  });

  // Lift sanction mutation
  const liftSanction = useMutation({
    mutationFn: async (violation: ScreenshotViolation) => {
      const { error } = await supabase
        .from('screenshot_violations')
        .update({
          suspended_until: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', violation.id);

      if (error) throw error;
      
      // Notify user that their sanction has been lifted
      await notifyScreenshotSanctionLifted(violation.user_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-screenshot-violations'] });
      toast.success('Sanction levée avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la levée de la sanction');
    },
  });

  // Reset violations mutation (full reset)
  const resetViolations = useMutation({
    mutationFn: async (violationId: string) => {
      const { error } = await supabase
        .from('screenshot_violations')
        .delete()
        .eq('id', violationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-screenshot-violations'] });
      toast.success('Compteur réinitialisé avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la réinitialisation');
    },
  });

  // Filter violations by search
  const filteredViolations = violations?.filter(v => 
    v.profile?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.user_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if user is currently suspended
  const isSuspended = (suspendedUntil: string | null) => {
    if (!suspendedUntil) return false;
    return new Date() < new Date(suspendedUntil);
  };

  // Get remaining suspension time
  const getSuspensionTimeLeft = (suspendedUntil: string) => {
    const end = new Date(suspendedUntil);
    const now = new Date();
    if (now >= end) return null;
    
    const diff = end.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} jour${days > 1 ? 's' : ''}`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes} min`;
  };

  // Get severity color based on violation count
  const getSeverityBadge = (count: number) => {
    if (count >= 3) return <Badge variant="destructive">Sévère ({count})</Badge>;
    if (count === 2) return <Badge className="bg-warning text-warning-foreground">Modéré ({count})</Badge>;
    return <Badge variant="secondary">Mineur ({count})</Badge>;
  };

  // Stats
  const activeSuspensions = violations?.filter(v => isSuspended(v.suspended_until)).length || 0;
  const totalViolations = violations?.reduce((acc, v) => acc + v.violation_count, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Camera className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Sanctions captures d'écran</h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/20">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{violations?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Utilisateurs avec violations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/20">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeSuspensions}</p>
                <p className="text-sm text-muted-foreground">Suspensions actives</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Camera className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalViolations}</p>
                <p className="text-sm text-muted-foreground">Total violations</p>
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
          <CardTitle className="text-base">Liste des violations</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
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

                  return (
                    <div
                      key={violation.id}
                      className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
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
                            <p className="font-medium">
                              {violation.profile?.username || 'Utilisateur inconnu'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ID: {violation.user_id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {getSeverityBadge(violation.violation_count)}
                          {suspended && (
                            <Badge variant="destructive" className="gap-1">
                              <Clock className="w-3 h-3" />
                              {timeLeft}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          {violation.last_violation_at && (
                            <span>
                              Dernière violation: {format(new Date(violation.last_violation_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                            </span>
                          )}
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
                                    L'utilisateur pourra à nouveau accéder aux médias éphémères et albums.
                                    Le compteur de violations sera conservé.
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
                                  Cette action supprimera toutes les violations de cet utilisateur.
                                  Il repartira à zéro comme s'il n'avait jamais fait de capture.
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
