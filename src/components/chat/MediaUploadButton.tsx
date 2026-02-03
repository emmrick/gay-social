import { useState, useRef } from 'react';
import { Image, Video, Camera, X, Send, Clock, Loader2, Aperture, Lock, Crown, ShieldOff, ImagePlus, VideoIcon, Infinity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useEphemeralMediaUpload } from '@/hooks/useEphemeralMediaUpload';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import CameraCapture from './CameraCapture';
import RegularMediaWarningDialog from './RegularMediaWarningDialog';
import RegularMediaPreview from './RegularMediaPreview';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MediaUploadButtonProps {
  chatRoomId?: string;
  recipientId?: string;
  isPrivate: boolean;
}

const MediaUploadButton = ({ chatRoomId, recipientId, isPrivate }: MediaUploadButtonProps) => {
  // Ephemeral media states
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [viewDuration, setViewDuration] = useState(10);
  const [showCamera, setShowCamera] = useState(false);
  
  // Regular media states
  const [regularPreviewFile, setRegularPreviewFile] = useState<File | null>(null);
  const [regularPreviewUrl, setRegularPreviewUrl] = useState<string | null>(null);
  const [regularMediaType, setRegularMediaType] = useState<'image' | 'video'>('image');
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [pendingRegularFile, setPendingRegularFile] = useState<{ file: File; type: 'image' | 'video' } | null>(null);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const regularImageInputRef = useRef<HTMLInputElement>(null);
  const regularVideoInputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { uploadEphemeralMedia, isUploading, progress, canSend, creditsNeeded, totalCredits, showInsufficientCreditsDialog } = useEphemeralMediaUpload();
  const { uploadMedia, isUploading: isUploadingRegular, progress: regularProgress } = useMediaUpload();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = type === 'image' ? 20 * 1024 * 1024 : 500 * 1024 * 1024;
      const maxSizeLabel = type === 'image' ? '20 Mo' : '500 Mo';
      
      if (file.size > maxSize) {
        toast.error(`Le fichier est trop volumineux (max ${maxSizeLabel})`);
        return;
      }
      setPreviewFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setMediaType(type);
    }
    e.target.value = '';
  };

  const handleRegularFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = type === 'image' ? 20 * 1024 * 1024 : 500 * 1024 * 1024;
      const maxSizeLabel = type === 'image' ? '20 Mo' : '500 Mo';
      
      if (file.size > maxSize) {
        toast.error(`Le fichier est trop volumineux (max ${maxSizeLabel})`);
        return;
      }
      // Show warning dialog first
      setPendingRegularFile({ file, type });
      setShowWarningDialog(true);
    }
    e.target.value = '';
  };

  const handleWarningConfirm = () => {
    if (pendingRegularFile) {
      setRegularPreviewFile(pendingRegularFile.file);
      setRegularPreviewUrl(URL.createObjectURL(pendingRegularFile.file));
      setRegularMediaType(pendingRegularFile.type);
      setPendingRegularFile(null);
    }
    setShowWarningDialog(false);
  };

  const handleSend = async () => {
    if (!previewFile) return;

    try {
      await uploadEphemeralMedia.mutateAsync({
        file: previewFile,
        messageType: mediaType,
        viewDuration,
        chatRoomId,
        recipientId,
        isPrivate,
      });
      toast.success('Média éphémère envoyé !');
      handleCancel();
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const handleSendRegular = async () => {
    if (!regularPreviewFile || !user) return;
    
    // Vérifier qu'on a soit un recipientId soit un chatRoomId
    if (!recipientId && !chatRoomId) {
      toast.error('Destination non définie');
      return;
    }

    try {
      const mediaUrl = await uploadMedia(regularPreviewFile);
      if (!mediaUrl) {
        toast.error('Erreur lors de l\'envoi du média');
        return;
      }

      // Créer le message directement via Supabase
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: isPrivate ? recipientId : null,
          chat_room_id: isPrivate ? null : chatRoomId,
          content: mediaUrl,
          message_type: regularMediaType,
          is_private: isPrivate,
        });

      if (error) throw error;

      // Invalider les queries pour rafraîchir la conversation
      if (isPrivate && recipientId) {
        await queryClient.invalidateQueries({ 
          queryKey: ['private-messages', user.id, recipientId] 
        });
        await queryClient.invalidateQueries({ 
          queryKey: ['private-conversations', user.id] 
        });
      } else if (chatRoomId) {
        await queryClient.invalidateQueries({ 
          queryKey: ['messages', chatRoomId] 
        });
      }

      toast.success('Média envoyé !');
      handleCancelRegular();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erreur lors de l\'envoi du média');
    }
  };

  const handleCancel = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewFile(null);
    setPreviewUrl(null);
  };

  const handleCancelRegular = () => {
    if (regularPreviewUrl) {
      URL.revokeObjectURL(regularPreviewUrl);
    }
    setRegularPreviewFile(null);
    setRegularPreviewUrl(null);
  };

  const handleMenuClick = (action: () => void) => {
    if (!canSend) {
      showInsufficientCreditsDialog();
      return;
    }
    action();
  };

  const durations = [5, 10, 15, 30, 0]; // 0 = unlimited

  // Ephemeral media preview - using Dialog
  const ephemeralPreviewDialog = (
    <Dialog open={!!previewUrl} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-md max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border">
          <DialogTitle className="text-center font-display">
            Envoyer {mediaType === 'image' ? 'une photo' : 'une vidéo'} éphémère
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="p-4 space-y-4">
            {/* Media preview */}
            <div className="flex items-center justify-center bg-secondary/30 rounded-xl overflow-hidden">
              {mediaType === 'image' ? (
                <img 
                  src={previewUrl || ''} 
                  alt="Preview" 
                  className="max-w-full max-h-[40vh] object-contain"
                />
              ) : (
                <video 
                  src={previewUrl || ''} 
                  className="max-w-full max-h-[40vh] object-contain"
                  controls
                />
              )}
            </div>
            
            {/* Duration selector */}
            <div>
              <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Durée d'affichage
              </p>
              <div className="flex gap-2 mb-2">
                {durations.filter(d => d > 0).map((d) => (
                  <button
                    key={d}
                    onClick={() => setViewDuration(d)}
                    disabled={isUploading}
                    className={`flex-1 py-2 rounded-lg font-medium transition-all text-sm ${
                      viewDuration === d 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    } disabled:opacity-50`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
              <button
                onClick={() => setViewDuration(0)}
                disabled={isUploading}
                className={`w-full py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  viewDuration === 0 
                    ? 'bg-green-500 text-white' 
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                } disabled:opacity-50`}
              >
                <Infinity className="w-4 h-4" />
                Illimité (enregistrable)
              </button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {viewDuration === 0 
                  ? '✓ Le destinataire pourra enregistrer ce média' 
                  : '🔒 Le média disparaîtra après visionnage'}
              </p>
            </div>

            {/* Progress bar */}
            {isUploading && (
              <div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1 text-center">
                  Envoi en cours... {progress}%
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* Footer actions */}
        <div className="p-4 border-t border-border flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={handleCancel}
            disabled={isUploading}
          >
            <X className="w-4 h-4 mr-2" />
            Annuler
          </Button>
          <Button 
            variant="hero" 
            className="flex-1"
            onClick={handleSend}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Envoi...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Envoyer
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      {/* Ephemeral media preview dialog */}
      {ephemeralPreviewDialog}

      {/* Regular media preview dialog */}
      {regularPreviewUrl && (
        <RegularMediaPreview
          previewUrl={regularPreviewUrl}
          mediaType={regularMediaType}
          isUploading={isUploadingRegular}
          progress={regularProgress}
          onSend={handleSendRegular}
          onCancel={handleCancelRegular}
        />
      )}

      {/* Camera capture component */}
      <CameraCapture
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        chatRoomId={chatRoomId}
        recipientId={recipientId}
        isPrivate={isPrivate}
      />

      {/* Warning dialog for regular media */}
      <RegularMediaWarningDialog
        open={showWarningDialog}
        onOpenChange={setShowWarningDialog}
        onConfirm={handleWarningConfirm}
        mediaType={pendingRegularFile?.type || 'image'}
      />

      {/* Hidden file inputs for ephemeral media */}
      <input 
        type="file" 
        ref={imageInputRef} 
        accept="image/*" 
        className="hidden" 
        onChange={(e) => handleFileSelect(e, 'image')}
      />
      <input 
        type="file" 
        ref={videoInputRef} 
        accept="video/*" 
        className="hidden" 
        onChange={(e) => handleFileSelect(e, 'video')}
      />
      
      {/* Hidden file inputs for regular media */}
      <input 
        type="file" 
        ref={regularImageInputRef} 
        accept="image/*" 
        className="hidden" 
        onChange={(e) => handleRegularFileSelect(e, 'image')}
      />
      <input 
        type="file" 
        ref={regularVideoInputRef} 
        accept="video/*" 
        className="hidden" 
        onChange={(e) => handleRegularFileSelect(e, 'video')}
      />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className={`text-muted-foreground hover:text-primary relative ${!canSend ? 'opacity-60' : ''}`}
          >
            <Camera className="w-5 h-5" />
            {!canSend && (
              <Lock className="w-3 h-3 absolute -bottom-0.5 -right-0.5 text-amber-500" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {/* Ephemeral media section */}
          <DropdownMenuLabel className="flex items-center gap-2 text-xs text-primary">
            <Clock className="w-3 h-3" />
            Médias éphémères (protégés)
          </DropdownMenuLabel>
          
          <div className="px-2 py-1 mb-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {canSend ? (
                <span>Coût: {creditsNeeded} crédits (solde: {totalCredits.toFixed(1)})</span>
              ) : (
                <div className="flex items-center gap-1 text-destructive">
                  <Lock className="w-3 h-3" />
                  <span>Crédits insuffisants ({totalCredits.toFixed(1)}/{creditsNeeded})</span>
                </div>
              )}
            </div>
          </div>
          
          <DropdownMenuItem 
            onClick={() => handleMenuClick(() => setShowCamera(true))}
            disabled={!canSend}
          >
            <Aperture className="w-4 h-4 mr-2" />
            Prendre une photo/vidéo
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleMenuClick(() => imageInputRef.current?.click())}
            disabled={!canSend}
          >
            <Image className="w-4 h-4 mr-2" />
            Photo éphémère
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleMenuClick(() => videoInputRef.current?.click())}
            disabled={!canSend}
          >
            <Video className="w-4 h-4 mr-2" />
            Vidéo éphémère
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Regular media section */}
          <DropdownMenuLabel className="flex items-center gap-2 text-xs text-amber-500">
            <ShieldOff className="w-3 h-3" />
            Médias standards (non protégés)
          </DropdownMenuLabel>
          
          <DropdownMenuItem 
            onClick={() => regularImageInputRef.current?.click()}
            className="text-muted-foreground"
          >
            <ImagePlus className="w-4 h-4 mr-2" />
            Photo standard
            <Badge variant="outline" className="ml-auto text-[9px] px-1 py-0 h-4 text-amber-500 border-amber-500/30">
              visible
            </Badge>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => regularVideoInputRef.current?.click()}
            className="text-muted-foreground"
          >
            <VideoIcon className="w-4 h-4 mr-2" />
            Vidéo standard
            <Badge variant="outline" className="ml-auto text-[9px] px-1 py-0 h-4 text-amber-500 border-amber-500/30">
              visible
            </Badge>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export default MediaUploadButton;
