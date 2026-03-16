import { useState, useEffect, useCallback } from 'react';
import { useAdminVerifications } from '@/hooks/useIdentityVerification';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, Eye, Check, X, Loader2, AlertTriangle, Clock,
  User, Trash2, Euro, ZoomIn, ZoomOut, RotateCw, Maximize2, Move, RotateCcw,
  Brain, CalendarDays
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useRecordEarning, useTaskRates, formatCents } from '@/hooks/useModeratorEarnings';
import { useLogModerationAction } from '@/hooks/useModerationActions';
import { useIsMobile } from '@/hooks/use-mobile';
import { useActiveTask } from '@/hooks/useModerationTaskQueue';

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

interface ImageViewerState {
  isOpen: boolean;
  imageUrl: string | null;
  title: string;
  zoom: number;
  rotation: number;
  panX: number;
  panY: number;
  isDragging: boolean;
  startX: number;
  startY: number;
}

const IdentityVerificationPanel = () => {
  const { pendingVerifications, isLoading, markAsViewed, reportScreenshot, approveVerification, rejectVerification } = useAdminVerifications();
  const { data: activeTask } = useActiveTask();
  const [selectedVerification, setSelectedVerification] = useState<VerificationWithProfile | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);
  const [autoOpenedTaskId, setAutoOpenedTaskId] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<{
    selfie: string | null;
    idFront: string | null;
    idBack: string | null;
  }>({ selfie: null, idFront: null, idBack: null });
  const [imageViewer, setImageViewer] = useState<ImageViewerState>({
    isOpen: false, imageUrl: null, title: '', zoom: 1, rotation: 0,
    panX: 0, panY: 0, isDragging: false, startX: 0, startY: 0,
  });
  const [aiAnalysis, setAiAnalysis] = useState<{
    isLoading: boolean;
    result: {
      date_of_birth: string | null;
      calculated_age: number | null;
      is_adult: boolean;
      confidence: string;
      document_type?: string;
      name_on_document?: string;
      error?: string;
    } | null;
  }>({ isLoading: false, result: null });
  
  const isMobile = useIsMobile();
  const recordEarning = useRecordEarning();
  const logAction = useLogModerationAction();
  const { data: taskRates } = useTaskRates();
  const verificationRate = taskRates?.find(r => r.task_type === 'identity_verification')?.rate_cents || 50;

  // Auto-open the verification linked to the active task
  useEffect(() => {
    if (
      activeTask?.task_type === 'identity_verification' &&
      pendingVerifications?.length &&
      activeTask.id !== autoOpenedTaskId
    ) {
      const targetEntityId = activeTask.target_entity_id;
      const match = pendingVerifications.find(v => v.id === targetEntityId);
      if (match) {
        setAutoOpenedTaskId(activeTask.id);
        handleViewVerification(match as VerificationWithProfile);
      }
    }
  }, [activeTask, pendingVerifications, autoOpenedTaskId]);

  // Image viewer functions
  const openImageViewer = (url: string, title: string) => {
    setImageViewer({
      isOpen: true, imageUrl: url, title, zoom: 1, rotation: 0,
      panX: 0, panY: 0, isDragging: false, startX: 0, startY: 0,
    });
  };
  const closeImageViewer = () => {
    setImageViewer({
      isOpen: false, imageUrl: null, title: '', zoom: 1, rotation: 0,
      panX: 0, panY: 0, isDragging: false, startX: 0, startY: 0,
    });
  };
  const handleZoomIn = () => setImageViewer(prev => ({ ...prev, zoom: Math.min(prev.zoom + 0.5, 4) }));
  const handleZoomOut = () => setImageViewer(prev => {
    const z = Math.max(prev.zoom - 0.5, 0.5);
    return z <= 1 ? { ...prev, zoom: z, panX: 0, panY: 0 } : { ...prev, zoom: z };
  });
  const handleRotate = () => setImageViewer(prev => ({ ...prev, rotation: (prev.rotation + 90) % 360, panX: 0, panY: 0 }));
  const handleResetView = () => setImageViewer(prev => ({ ...prev, zoom: 1, rotation: 0, panX: 0, panY: 0 }));

  const handleMouseDown = (e: React.MouseEvent) => {
    if (imageViewer.zoom > 1) {
      e.preventDefault();
      setImageViewer(prev => ({ ...prev, isDragging: true, startX: e.clientX - prev.panX, startY: e.clientY - prev.panY }));
    }
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (imageViewer.isDragging && imageViewer.zoom > 1) {
      e.preventDefault();
      setImageViewer(prev => ({ ...prev, panX: e.clientX - prev.startX, panY: e.clientY - prev.startY }));
    }
  };
  const handleMouseUp = () => setImageViewer(prev => ({ ...prev, isDragging: false }));
  const handleTouchStart = (e: React.TouchEvent) => {
    if (imageViewer.zoom > 1 && e.touches.length === 1) {
      const t = e.touches[0];
      setImageViewer(prev => ({ ...prev, isDragging: true, startX: t.clientX - prev.panX, startY: t.clientY - prev.panY }));
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (imageViewer.isDragging && imageViewer.zoom > 1 && e.touches.length === 1) {
      const t = e.touches[0];
      setImageViewer(prev => ({ ...prev, panX: t.clientX - prev.startX, panY: t.clientY - prev.startY }));
    }
  };
  const handleTouchEnd = () => setImageViewer(prev => ({ ...prev, isDragging: false }));
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const d = e.deltaY > 0 ? -0.25 : 0.25;
    setImageViewer(prev => {
      const z = Math.max(0.5, Math.min(4, prev.zoom + d));
      return z <= 1 ? { ...prev, zoom: z, panX: 0, panY: 0 } : { ...prev, zoom: z };
    });
  };

  // Screenshot detection
  const detectScreenshot = useCallback(() => {
    if (selectedVerification && viewDialogOpen) {
      reportScreenshot.mutate(selectedVerification.id);
      toast.error('Capture d\'écran détectée ! L\'utilisateur sera notifié.');
    }
  }, [selectedVerification, viewDialogOpen, reportScreenshot]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || 
          (e.ctrlKey && e.shiftKey && (e.key === 's' || e.key === 'S')) ||
          (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5'))) {
        e.preventDefault();
        detectScreenshot();
      }
    };
    const handleVisibility = () => {
      if (document.hidden && viewDialogOpen && selectedVerification) detectScreenshot();
    };
    if (viewDialogOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('visibilitychange', handleVisibility);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [viewDialogOpen, detectScreenshot, selectedVerification]);

  const handleAiAnalysis = async () => {
    const imageUrl = signedUrls.idFront || signedUrls.idBack;
    if (!imageUrl) {
      toast.error('Aucun document disponible pour l\'analyse');
      return;
    }
    setAiAnalysis({ isLoading: true, result: null });
    try {
      const { data, error } = await supabase.functions.invoke('analyze-id-document', {
        body: { imageUrl },
      });
      if (error) throw error;
      setAiAnalysis({ isLoading: false, result: data });
    } catch (err) {
      console.error('AI analysis error:', err);
      toast.error('Erreur lors de l\'analyse IA');
      setAiAnalysis({ isLoading: false, result: null });
    }
  };


    setSelectedVerification(verification);
    setHasViewed(false);
    setSignedUrls({ selfie: null, idFront: null, idBack: null });
    setAiAnalysis({ isLoading: false, result: null });
    
    try {
      const getSignedUrl = async (path: string | null) => {
        if (!path) return null;
        const filePath = path.includes('/') ? path.split('/').slice(-2).join('/') : path;
        const { data } = await supabase.storage
          .from('identity-documents')
          .createSignedUrl(filePath, 300);
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
      await logAction.mutateAsync({
        targetUserId: selectedVerification.user_id,
        actionType: 'verification_approved',
        details: `Vérification approuvée pour ${selectedVerification.profiles?.username}`,
        metadata: { verificationId: selectedVerification.id },
      });
      const earned = await recordEarning.mutateAsync({
        taskType: 'identity_verification',
        targetUserId: selectedVerification.user_id,
        targetEntityId: selectedVerification.id,
        description: `Vérification de ${selectedVerification.profiles?.username}`,
      });
      toast.success(earned ? `Utilisateur vérifié (+${formatCents(verificationRate)})` : 'Utilisateur vérifié et documents supprimés');
      setViewDialogOpen(false);
      setSelectedVerification(null);
    } catch {
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
      await logAction.mutateAsync({
        targetUserId: selectedVerification.user_id,
        actionType: 'verification_rejected',
        details: `Vérification refusée pour ${selectedVerification.profiles?.username}: ${rejectionReason}`,
        metadata: { verificationId: selectedVerification.id, reason: rejectionReason },
      });
      toast.success('Vérification refusée');
      setRejectDialogOpen(false);
      setViewDialogOpen(false);
      setSelectedVerification(null);
      setRejectionReason('');
    } catch {
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

  const renderDocImage = (url: string | null, label: string) => (
    <div className="space-y-1.5">
      <p className="text-xs sm:text-sm font-medium text-center">{label}</p>
      <div 
        className="aspect-square bg-secondary rounded-xl overflow-hidden cursor-pointer relative group"
        onClick={() => url && openImageViewer(url, label)}
      >
        {url ? (
          <>
            <img src={url} alt={label} className="w-full h-full object-cover pointer-events-none" draggable={false} />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity flex items-center justify-center">
              <Maximize2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-base sm:text-lg font-semibold">Vérifications d'identité</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {pendingVerifications?.length || 0} demande(s) en attente
          </p>
        </div>
      </div>

      {/* List */}
      {pendingVerifications && pendingVerifications.length > 0 ? (
        <div className="space-y-2.5 sm:space-y-3">
          {pendingVerifications.map((verification) => (
            <div 
              key={verification.id}
              className="rounded-xl p-3 sm:p-4 bg-card border border-border shadow-sm"
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 sm:w-12 sm:h-12 shrink-0">
                  <AvatarImage src={verification.profiles?.avatar_url || ''} />
                  <AvatarFallback><User className="w-5 h-5 sm:w-6 sm:h-6" /></AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base truncate">{verification.profiles?.username || 'Utilisateur'}</p>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                    <span>{verification.profiles?.age || '?'} ans</span>
                    <span>•</span>
                    <span className="truncate">{verification.profiles?.region}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <Badge variant="outline" className="text-[10px] sm:text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {verification.submitted_at && formatDistanceToNow(new Date(verification.submitted_at), { addSuffix: true, locale: fr })}
                  </Badge>
                  <Button 
                    size="sm" 
                    className="h-8 text-xs sm:text-sm"
                    onClick={() => handleViewVerification(verification as VerificationWithProfile)}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Examiner
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 sm:py-12 text-muted-foreground">
          <Shield className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
          <p className="text-sm">Aucune demande de vérification en attente</p>
        </div>
      )}

      {/* View Verification Dialog — fullscreen on mobile */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className={
          isMobile 
            ? "max-w-full h-[100dvh] w-full rounded-none border-none p-0 overflow-y-auto" 
            : "max-w-2xl max-h-[90vh] overflow-y-auto"
        }>
          {/* Mobile header */}
          {isMobile && (
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border px-3 py-2.5 flex items-center gap-2" style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top, 0px))' }}>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewDialogOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Shield className="w-4 h-4 text-primary shrink-0" />
                <span className="font-semibold text-sm truncate">
                  Vérification — {selectedVerification?.profiles?.username}
                </span>
              </div>
            </div>
          )}

          {!isMobile && (
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Vérification - {selectedVerification?.profiles?.username}
              </DialogTitle>
              <DialogDescription>
                Examinez les documents pour vérifier l'identité de l'utilisateur
              </DialogDescription>
            </DialogHeader>
          )}

          {selectedVerification && (
            <div className={`space-y-4 sm:space-y-6 ${isMobile ? 'p-3 pb-8' : ''}`}>
              {/* Warning */}
              <div className="bg-destructive/10 rounded-xl p-3 sm:p-4 border border-destructive/20">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm">
                    <p className="font-semibold text-destructive">Protection des données</p>
                    <p className="text-muted-foreground mt-0.5 sm:mt-1">
                      Les captures d'écran sont détectées. Documents supprimés après validation.
                    </p>
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-muted rounded-xl">
                <Avatar className="w-12 h-12 sm:w-16 sm:h-16">
                  <AvatarImage src={selectedVerification.profiles?.avatar_url || ''} />
                  <AvatarFallback><User className="w-6 h-6 sm:w-8 sm:h-8" /></AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-display text-base sm:text-lg font-semibold">
                    {selectedVerification.profiles?.username}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedVerification.profiles?.age} ans • {selectedVerification.profiles?.region}
                  </p>
                </div>
              </div>

              {/* Documents */}
              {!hasViewed ? (
                <Button variant="outline" className="w-full h-11" onClick={() => setHasViewed(true)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Afficher les documents (une seule consultation)
                </Button>
              ) : (
                <div 
                  className="space-y-3 sm:space-y-4 select-none"
                  onContextMenu={(e) => e.preventDefault()}
                  style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                >
                  <div className={isMobile ? "space-y-3" : "grid grid-cols-3 gap-4"}>
                    {renderDocImage(signedUrls.selfie, 'Selfie')}
                    {renderDocImage(signedUrls.idFront, 'Recto ID')}
                    {renderDocImage(signedUrls.idBack, 'Verso ID')}
                  </div>

                  <div className="bg-primary/10 rounded-xl p-2.5 sm:p-3 text-xs text-center flex items-center justify-center gap-2">
                    <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {isMobile ? 'Appuyez pour agrandir' : 'Cliquez sur une image pour l\'agrandir et zoomer'}
                  </div>

                  <div className="bg-muted/50 rounded-xl p-2.5 sm:p-3 text-xs text-muted-foreground text-center">
                    Vérifiez que le selfie correspond à la photo d'identité et que l'âge est ≥ 18 ans
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2.5 sm:gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 h-11"
                  onClick={() => setRejectDialogOpen(true)}
                  disabled={isProcessing}
                >
                  <X className="w-4 h-4 mr-1.5" />
                  Refuser
                </Button>
                <Button 
                  className="flex-1 h-11 bg-primary hover:bg-primary/90"
                  onClick={handleApprove}
                  disabled={isProcessing || !hasViewed}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  ) : (
                    <Check className="w-4 h-4 mr-1.5" />
                  )}
                  Approuver
                </Button>
              </div>

              <div className="text-center text-[10px] sm:text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <Trash2 className="w-3 h-3" />
                Les documents seront supprimés après approbation
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className={isMobile ? "max-w-[calc(100vw-2rem)]" : ""}>
          <DialogHeader>
            <DialogTitle>Refuser la vérification</DialogTitle>
            <DialogDescription>
              Indiquez la raison du refus. L'utilisateur pourra soumettre de nouveaux documents.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Raison du refus (ex: Photo floue...)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-11" onClick={() => setRejectDialogOpen(false)}>
                Annuler
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1 h-11"
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmer le refus'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Dialog */}
      <Dialog open={imageViewer.isOpen} onOpenChange={(open) => !open && closeImageViewer()}>
        <DialogContent 
          className="max-w-[100vw] max-h-[100dvh] w-full h-full p-0 bg-black/95 border-none rounded-none"
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="relative w-full h-full flex flex-col">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-black/80 to-transparent" style={{ paddingTop: isMobile ? 'max(0.75rem, env(safe-area-inset-top, 0px))' : undefined }}>
              <div className="flex items-center gap-2 sm:gap-3">
                <h3 className="text-white font-medium text-sm sm:text-base">{imageViewer.title}</h3>
                <Badge variant="secondary" className="bg-white/20 text-white text-[10px] sm:text-xs">
                  {Math.round(imageViewer.zoom * 100)}%
                </Badge>
              </div>
              <Button variant="ghost" size="icon" onClick={closeImageViewer} className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Image */}
            <div 
              className={`flex-1 flex items-center justify-center overflow-hidden p-4 sm:p-8 pt-14 sm:pt-16 pb-20 ${
                imageViewer.zoom > 1 ? 'cursor-grab' : 'cursor-default'
              } ${imageViewer.isDragging ? 'cursor-grabbing' : ''}`}
              style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
            >
              {imageViewer.imageUrl && (
                <img
                  src={imageViewer.imageUrl}
                  alt={imageViewer.title}
                  className="max-w-full max-h-full object-contain select-none"
                  style={{
                    transform: `translate(${imageViewer.panX}px, ${imageViewer.panY}px) scale(${imageViewer.zoom}) rotate(${imageViewer.rotation}deg)`,
                    transition: imageViewer.isDragging ? 'none' : 'transform 0.2s ease-out',
                    pointerEvents: 'none',
                  }}
                  draggable={false}
                />
              )}
            </div>

            {imageViewer.zoom > 1 && (
              <div className="absolute top-14 sm:top-16 left-0 right-0 flex justify-center pointer-events-none">
                <div className="bg-white/20 text-white text-[10px] sm:text-xs px-3 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-sm">
                  <Move className="w-3 h-3" />
                  Glissez pour déplacer
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-1.5 sm:gap-2 p-3 sm:p-4 bg-gradient-to-t from-black/80 to-transparent" style={{ paddingBottom: isMobile ? 'max(0.75rem, env(safe-area-inset-bottom, 0px))' : undefined }}>
              <Button variant="secondary" size="icon" onClick={handleZoomOut} disabled={imageViewer.zoom <= 0.5} className="bg-white/20 hover:bg-white/30 text-white border-none h-10 w-10">
                <ZoomOut className="w-5 h-5" />
              </Button>
              <Button variant="secondary" size="icon" onClick={handleZoomIn} disabled={imageViewer.zoom >= 4} className="bg-white/20 hover:bg-white/30 text-white border-none h-10 w-10">
                <ZoomIn className="w-5 h-5" />
              </Button>
              <Button variant="secondary" size="icon" onClick={handleRotate} className="bg-white/20 hover:bg-white/30 text-white border-none h-10 w-10">
                <RotateCw className="w-5 h-5" />
              </Button>
              <Button variant="secondary" size="icon" onClick={handleResetView} className="bg-white/20 hover:bg-white/30 text-white border-none h-10 w-10">
                <RotateCcw className="w-5 h-5" />
              </Button>
            </div>

            <div className="absolute bottom-14 sm:bottom-16 left-0 right-0 flex justify-center">
              <div className="bg-destructive/80 text-white text-[10px] sm:text-xs px-3 py-1 rounded-full flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                Captures d'écran détectées
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IdentityVerificationPanel;
