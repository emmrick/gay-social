import { useEffect, useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useIdentityVerification } from '@/hooks/useIdentityVerification';
import { Camera, Upload, Check, Loader2, AlertTriangle, Shield, Trash2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface IdentityVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'intro' | 'selfie' | 'id_front' | 'id_back' | 'review' | 'submitted';

const IdentityVerificationDialog = ({ open, onOpenChange }: IdentityVerificationDialogProps) => {
  const { verification, createVerification, uploadDocument, submitVerification, refetch } = useIdentityVerification();
  const [step, setStep] = useState<Step>('intro');
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [idBackPreview, setIdBackPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const revokePreviewUrl = (url: string | null) => {
    if (!url) return;
    if (url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // noop
      }
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: false 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (error) {
      toast.error('Impossible d\'accéder à la caméra');
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Critical: when the dialog closes (or unmounts due to guard changes),
  // stop camera streams and clear previews so we never leave a blocking overlay on Android.
  useEffect(() => {
    if (open) return;

    stopCamera();
    setIsUploading(false);

    revokePreviewUrl(selfiePreview);
    revokePreviewUrl(idFrontPreview);
    revokePreviewUrl(idBackPreview);

    setSelfieFile(null);
    setSelfiePreview(null);
    setIdFrontFile(null);
    setIdFrontPreview(null);
    setIdBackFile(null);
    setIdBackPreview(null);
    setStep('intro');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [open, stopCamera, selfiePreview, idFrontPreview, idBackPreview]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `${step}_${Date.now()}.jpg`, { type: 'image/jpeg' });
            handleFileCapture(file);
          }
        }, 'image/jpeg', 0.9);
      }
    }
    stopCamera();
  };

  const handleFileCapture = (file: File) => {
    const preview = URL.createObjectURL(file);
    
    if (step === 'selfie') {
      setSelfieFile(file);
      setSelfiePreview(preview);
    } else if (step === 'id_front') {
      setIdFrontFile(file);
      setIdFrontPreview(preview);
    } else if (step === 'id_back') {
      setIdBackFile(file);
      setIdBackPreview(preview);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileCapture(file);
    }
  };

  const handleNext = async () => {
    if (step === 'intro') {
      if (!verification) {
        await createVerification.mutateAsync();
      }
      setStep('selfie');
    } else if (step === 'selfie' && selfieFile) {
      setStep('id_front');
    } else if (step === 'id_front' && idFrontFile) {
      setStep('id_back');
    } else if (step === 'id_back' && idBackFile) {
      setStep('review');
    } else if (step === 'review') {
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!selfieFile || !idFrontFile || !idBackFile) return;

    setIsUploading(true);
    try {
      const [selfieUrl, idFrontUrl, idBackUrl] = await Promise.all([
        uploadDocument(selfieFile, 'selfie'),
        uploadDocument(idFrontFile, 'id_front'),
        uploadDocument(idBackFile, 'id_back'),
      ]);

      await submitVerification.mutateAsync({
        selfieUrl,
        idFrontUrl,
        idBackUrl,
      });

      // On Android Chrome, the app may switch from the "blocked" screen to the main app right after this.
      // If the dialog is still open during that transition, Radix overlay can remain stuck.
      // So we close immediately after a successful submit.
      toast.success('Documents envoyés avec succès !');
      onOpenChange(false);
      // Force a refresh of the verification state for the guard/UI.
      refetch();
    } catch (error) {
      toast.error('Erreur lors de l\'envoi des documents');
    } finally {
      setIsUploading(false);
    }
  };

  const renderIntro = () => (
    <div className="space-y-6 text-center">
      <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
        <Shield className="w-10 h-10 text-primary" />
      </div>
      <div>
        <h3 className="font-display text-xl font-semibold mb-2">Vérifie ton identité</h3>
        <p className="text-muted-foreground text-sm">
          Pour garantir un espace sécurisé, nous devons vérifier que tu as bien 18 ans ou plus.
        </p>
      </div>
      
      <div className="bg-secondary/50 rounded-xl p-4 text-left space-y-3">
        <h4 className="font-semibold text-sm">Ce dont tu auras besoin :</h4>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" />
            Un selfie de toi
          </li>
          <li className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" />
            Une photo recto de ta pièce d'identité
          </li>
          <li className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" />
            Une photo verso de ta pièce d'identité
          </li>
        </ul>
      </div>

      <div className="bg-destructive/10 rounded-xl p-4 text-left border border-destructive/20">
        <div className="flex items-start gap-3">
          <Trash2 className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm text-destructive">Protection de tes données</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Tes documents seront <strong>définitivement supprimés</strong> immédiatement 
              après vérification. Un admin ne peut voir tes documents qu'une seule fois.
            </p>
          </div>
        </div>
      </div>

      <Button variant="hero" className="w-full" onClick={handleNext}>
        Commencer la vérification
      </Button>
    </div>
  );

  const renderCaptureStep = (
    title: string,
    description: string,
    preview: string | null,
    onRetake: () => void
  ) => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="font-display text-lg font-semibold mb-1">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      {isCameraActive ? (
        <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={stopCamera}
              className="rounded-full bg-background/80"
            >
              <XCircle className="w-5 h-5" />
            </Button>
            <Button 
              size="icon" 
              onClick={capturePhoto}
              className="rounded-full w-16 h-16 bg-white hover:bg-white/90"
            >
              <div className="w-12 h-12 rounded-full border-4 border-primary" />
            </Button>
          </div>
        </div>
      ) : preview ? (
        <div className="relative aspect-[4/3] bg-secondary rounded-xl overflow-hidden">
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          <div className="absolute top-2 right-2">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={onRetake}
              className="rounded-full"
            >
              Reprendre
            </Button>
          </div>
          <div className="absolute bottom-2 left-2">
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/90 text-white text-xs">
              <Check className="w-3 h-3" />
              Photo capturée
            </div>
          </div>
        </div>
      ) : (
        <div className="aspect-[4/3] bg-secondary/50 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-4">
          <Camera className="w-12 h-12 text-muted-foreground" />
          <div className="flex gap-2">
            <Button variant="outline" onClick={startCamera}>
              <Camera className="w-4 h-4 mr-2" />
              Prendre une photo
            </Button>
            <Button variant="ghost" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Importer
            </Button>
          </div>
          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/*" 
            capture="environment"
            className="hidden" 
            onChange={handleFileSelect}
          />
        </div>
      )}

      <div className="flex gap-2">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={() => {
            stopCamera();
            if (step === 'selfie') setStep('intro');
            else if (step === 'id_front') setStep('selfie');
            else if (step === 'id_back') setStep('id_front');
          }}
        >
          Retour
        </Button>
        <Button 
          variant="hero" 
          className="flex-1"
          onClick={handleNext}
          disabled={!preview}
        >
          Continuer
        </Button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="font-display text-lg font-semibold mb-1">Vérifie tes documents</h3>
        <p className="text-muted-foreground text-sm">Assure-toi que les photos sont lisibles</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground text-center">Selfie</p>
          <div className="aspect-square bg-secondary rounded-lg overflow-hidden">
            {selfiePreview && <img src={selfiePreview} alt="Selfie" className="w-full h-full object-cover" />}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground text-center">Recto ID</p>
          <div className="aspect-square bg-secondary rounded-lg overflow-hidden">
            {idFrontPreview && <img src={idFrontPreview} alt="ID Front" className="w-full h-full object-cover" />}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground text-center">Verso ID</p>
          <div className="aspect-square bg-secondary rounded-lg overflow-hidden">
            {idBackPreview && <img src={idBackPreview} alt="ID Back" className="w-full h-full object-cover" />}
          </div>
        </div>
      </div>

      <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground">
        En envoyant ces documents, tu confirmes avoir 18 ans ou plus et acceptes 
        que tes documents soient vérifiés puis immédiatement supprimés.
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => setStep('id_back')}>
          Retour
        </Button>
        <Button 
          variant="hero" 
          className="flex-1"
          onClick={handleNext}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Envoi...
            </>
          ) : (
            'Envoyer'
          )}
        </Button>
      </div>
    </div>
  );

  const renderSubmitted = () => (
    <div className="space-y-6 text-center">
      <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
        <Clock className="w-10 h-10 text-green-500" />
      </div>
      <div>
        <h3 className="font-display text-xl font-semibold mb-2">Documents envoyés !</h3>
        <p className="text-muted-foreground text-sm">
          Ta demande est en cours de traitement. Tu seras notifié dès que ta vérification sera validée.
        </p>
      </div>
      <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
        Fermer
      </Button>
    </div>
  );

  const renderStatus = () => {
    if (!verification) return null;

    if (verification.status === 'approved') {
      return (
        <div className="space-y-6 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <div>
            <h3 className="font-display text-xl font-semibold mb-2">Identité vérifiée !</h3>
            <p className="text-muted-foreground text-sm">
              Ton compte a été vérifié avec succès. Tous tes documents ont été supprimés.
            </p>
            {verification.documents_deleted && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-green-600">
                <Trash2 className="w-4 h-4" />
                Documents supprimés
              </div>
            )}
          </div>
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </div>
      );
    }

    if (verification.status === 'rejected') {
      return (
        <div className="space-y-6 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
            <XCircle className="w-10 h-10 text-destructive" />
          </div>
          <div>
            <h3 className="font-display text-xl font-semibold mb-2">Vérification refusée</h3>
            <p className="text-muted-foreground text-sm">
              {verification.rejection_reason || 'Ta demande n\'a pas pu être validée.'}
            </p>
          </div>
          <Button 
            variant="hero" 
            className="w-full" 
            onClick={() => {
              setSelfieFile(null);
              setSelfiePreview(null);
              setIdFrontFile(null);
              setIdFrontPreview(null);
              setIdBackFile(null);
              setIdBackPreview(null);
              setStep('selfie');
            }}
          >
            Réessayer
          </Button>
        </div>
      );
    }

    if (verification.submitted_at && verification.status === 'pending') {
      return (
        <div className="space-y-6 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Clock className="w-10 h-10 text-yellow-500" />
          </div>
          <div>
            <h3 className="font-display text-xl font-semibold mb-2">En attente de vérification</h3>
            <p className="text-muted-foreground text-sm">
              Ta demande a été envoyée et est en cours de traitement par notre équipe.
            </p>
            {verification.admin_screenshot_detected && (
              <div className="mt-4 bg-destructive/10 rounded-xl p-3 border border-destructive/20">
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="w-4 h-4" />
                  Une capture d'écran a été détectée lors de la consultation de tes documents.
                </div>
              </div>
            )}
          </div>
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </div>
      );
    }

    return null;
  };

  // Determine what to render based on verification status
  const getContent = () => {
    if (verification?.status === 'approved' || verification?.status === 'rejected' || 
        (verification?.submitted_at && verification?.status === 'pending')) {
      return renderStatus();
    }

    switch (step) {
      case 'intro':
        return renderIntro();
      case 'selfie':
        return renderCaptureStep(
          'Prends un selfie',
          'Une photo claire de ton visage',
          selfiePreview,
          () => { setSelfieFile(null); setSelfiePreview(null); }
        );
      case 'id_front':
        return renderCaptureStep(
          'Recto de ta pièce d\'identité',
          'Carte d\'identité, passeport ou permis de conduire',
          idFrontPreview,
          () => { setIdFrontFile(null); setIdFrontPreview(null); }
        );
      case 'id_back':
        return renderCaptureStep(
          'Verso de ta pièce d\'identité',
          'L\'autre côté de ton document',
          idBackPreview,
          () => { setIdBackFile(null); setIdBackPreview(null); }
        );
      case 'review':
        return renderReview();
      case 'submitted':
        return renderSubmitted();
      default:
        return renderIntro();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Vérification d'identité</DialogTitle>
          <DialogDescription className="sr-only">
            Vérifiez votre identité en prenant une photo et en téléchargeant votre pièce d'identité
          </DialogDescription>
        </DialogHeader>
        {getContent()}
      </DialogContent>
    </Dialog>
  );
};

export default IdentityVerificationDialog;
