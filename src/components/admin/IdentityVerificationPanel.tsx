import { useState, useEffect, useCallback } from 'react';
import { useAdminVerifications } from '@/hooks/useIdentityVerification';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Eye, 
  Check, 
  X, 
  Loader2, 
  AlertTriangle, 
  Clock,
  User,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface VerificationWithProfile {
  id: string;
  user_id: string;
  selfie_url: string | null;
  id_front_url: string | null;
  id_back_url: string | null;
  status: string;
  submitted_at: string | null;
  admin_viewed_at: string | null;
  profiles: {
    user_id: string;
    username: string;
    avatar_url: string | null;
    age: number | null;
    region: string;
  } | null;
}

const IdentityVerificationPanel = () => {
  const { pendingVerifications, isLoading, markAsViewed, reportScreenshot, approveVerification, rejectVerification } = useAdminVerifications();
  const [selectedVerification, setSelectedVerification] = useState<VerificationWithProfile | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);
  const [signedUrls, setSignedUrls] = useState<{
    selfie: string | null;
    idFront: string | null;
    idBack: string | null;
  }>({ selfie: null, idFront: null, idBack: null });

  // Screenshot detection for admin
  const detectScreenshot = useCallback(() => {
    if (selectedVerification && viewDialogOpen) {
      reportScreenshot.mutate(selectedVerification.id);
      toast.error('Capture d\'écran détectée ! L\'utilisateur sera notifié.');
    }
  }, [selectedVerification, viewDialogOpen, reportScreenshot]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect PrintScreen or common screenshot shortcuts
      if (e.key === 'PrintScreen' || 
          (e.ctrlKey && e.shiftKey && (e.key === 's' || e.key === 'S')) ||
          (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5'))) {
        e.preventDefault();
        detectScreenshot();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && viewDialogOpen && selectedVerification) {
        detectScreenshot();
      }
    };

    if (viewDialogOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [viewDialogOpen, detectScreenshot, selectedVerification]);

  const handleViewVerification = async (verification: VerificationWithProfile) => {
    setSelectedVerification(verification);
    setHasViewed(false);
    setSignedUrls({ selfie: null, idFront: null, idBack: null });
    
    // Get signed URLs for the documents
    try {
      const getSignedUrl = async (path: string | null) => {
        if (!path) return null;
        // Extract the file path from the URL or use as-is if it's already a path
        const filePath = path.includes('/') ? path.split('/').slice(-2).join('/') : path;
        const { data } = await supabase.storage
          .from('identity-documents')
          .createSignedUrl(filePath, 300); // 5 minutes
        return data?.signedUrl || null;
      };

      const [selfie, idFront, idBack] = await Promise.all([
        getSignedUrl(verification.selfie_url),
        getSignedUrl(verification.id_front_url),
        getSignedUrl(verification.id_back_url),
      ]);

      setSignedUrls({ selfie, idFront, idBack });
    } catch (error) {
      console.error('Error getting signed URLs:', error);
    }

    setViewDialogOpen(true);

    // Mark as viewed if not already
    if (!verification.admin_viewed_at) {
      markAsViewed.mutate(verification.id);
    }
  };

  const handleApprove = async () => {
    if (!selectedVerification) return;
    
    setIsProcessing(true);
    try {
      await approveVerification.mutateAsync({
        verificationId: selectedVerification.id,
        userId: selectedVerification.user_id,
      });
      toast.success('Utilisateur vérifié et documents supprimés');
      setViewDialogOpen(false);
      setSelectedVerification(null);
    } catch (error) {
      toast.error('Erreur lors de l\'approbation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedVerification || !rejectionReason.trim()) {
      toast.error('Veuillez indiquer une raison de refus');
      return;
    }
    
    setIsProcessing(true);
    try {
      await rejectVerification.mutateAsync({
        verificationId: selectedVerification.id,
        reason: rejectionReason,
      });
      toast.success('Vérification refusée');
      setRejectDialogOpen(false);
      setViewDialogOpen(false);
      setSelectedVerification(null);
      setRejectionReason('');
    } catch (error) {
      toast.error('Erreur lors du refus');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">Vérifications d'identité</h2>
          <p className="text-sm text-muted-foreground">
            {pendingVerifications?.length || 0} demande(s) en attente
          </p>
        </div>
      </div>

      {pendingVerifications && pendingVerifications.length > 0 ? (
        <div className="space-y-3">
          {pendingVerifications.map((verification) => (
            <div 
              key={verification.id}
              className="glass-card rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={verification.profiles?.avatar_url || ''} />
                  <AvatarFallback>
                    <User className="w-6 h-6" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{verification.profiles?.username || 'Utilisateur'}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{verification.profiles?.age || '?'} ans</span>
                    <span>•</span>
                    <span>{verification.profiles?.region}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="text-right mr-2">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {verification.submitted_at && formatDistanceToNow(new Date(verification.submitted_at), { 
                      addSuffix: true, 
                      locale: fr 
                    })}
                  </Badge>
                  {verification.admin_viewed_at && (
                    <p className="text-xs text-muted-foreground mt-1">Déjà consulté</p>
                  )}
                </div>
                <Button 
                  size="sm" 
                  onClick={() => handleViewVerification(verification as VerificationWithProfile)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Examiner
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Aucune demande de vérification en attente</p>
        </div>
      )}

      {/* View Verification Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Vérification - {selectedVerification?.profiles?.username}
            </DialogTitle>
            <DialogDescription>
              Examinez les documents pour vérifier l'identité de l'utilisateur
            </DialogDescription>
          </DialogHeader>

          {selectedVerification && (
            <div className="space-y-6">
              {/* Warning Banner */}
              <div className="bg-destructive/10 rounded-xl p-4 border border-destructive/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-destructive">Protection des données</p>
                    <p className="text-muted-foreground mt-1">
                      Les captures d'écran sont détectées et l'utilisateur sera notifié. 
                      Ces documents seront supprimés après validation.
                    </p>
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-xl">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={selectedVerification.profiles?.avatar_url || ''} />
                  <AvatarFallback>
                    <User className="w-8 h-8" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-display text-lg font-semibold">
                    {selectedVerification.profiles?.username}
                  </p>
                  <p className="text-muted-foreground">
                    {selectedVerification.profiles?.age} ans • {selectedVerification.profiles?.region}
                  </p>
                </div>
              </div>

              {/* Documents - Only show once */}
              {!hasViewed ? (
                <div className="space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setHasViewed(true)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Afficher les documents (une seule consultation)
                  </Button>
                </div>
              ) : (
                <div 
                  className="space-y-4 select-none"
                  onContextMenu={(e) => e.preventDefault()}
                  style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                >
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-center">Selfie</p>
                      <div className="aspect-square bg-secondary rounded-xl overflow-hidden">
                        {signedUrls.selfie ? (
                          <img 
                            src={signedUrls.selfie} 
                            alt="Selfie" 
                            className="w-full h-full object-cover pointer-events-none"
                            draggable={false}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-center">Recto ID</p>
                      <div className="aspect-square bg-secondary rounded-xl overflow-hidden">
                        {signedUrls.idFront ? (
                          <img 
                            src={signedUrls.idFront} 
                            alt="ID Recto" 
                            className="w-full h-full object-cover pointer-events-none"
                            draggable={false}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-center">Verso ID</p>
                      <div className="aspect-square bg-secondary rounded-xl overflow-hidden">
                        {signedUrls.idBack ? (
                          <img 
                            src={signedUrls.idBack} 
                            alt="ID Verso" 
                            className="w-full h-full object-cover pointer-events-none"
                            draggable={false}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground text-center">
                    Vérifiez que le selfie correspond à la photo d'identité et que l'âge est ≥ 18 ans
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setRejectDialogOpen(true)}
                  disabled={isProcessing}
                >
                  <X className="w-4 h-4 mr-2" />
                  Refuser
                </Button>
                <Button 
                  variant="hero" 
                  className="flex-1"
                  onClick={handleApprove}
                  disabled={isProcessing || !hasViewed}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Approuver
                    </>
                  )}
                </Button>
              </div>

              <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Trash2 className="w-3 h-3" />
                Les documents seront supprimés après approbation
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser la vérification</DialogTitle>
            <DialogDescription>
              Indiquez la raison du refus. L'utilisateur pourra soumettre de nouveaux documents.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Raison du refus (ex: Photo floue, document illisible...)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setRejectDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Confirmer le refus'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IdentityVerificationPanel;
