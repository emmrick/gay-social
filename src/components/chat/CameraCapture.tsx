import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  X, 
  RotateCcw, 
  Video, 
  Circle, 
  Square, 
  Send, 
  Clock,
  Loader2,
  SwitchCamera,
  ShieldAlert,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEphemeralMediaUpload } from '@/hooks/useEphemeralMediaUpload';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import { toast } from 'sonner';

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  chatRoomId?: string;
  recipientId?: string;
  isPrivate: boolean;
}

const CameraCapture = ({ 
  isOpen, 
  onClose, 
  chatRoomId, 
  recipientId, 
  isPrivate 
}: CameraCaptureProps) => {
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [capturedMedia, setCapturedMedia] = useState<{
    type: 'photo' | 'video';
    blob: Blob;
    url: string;
  } | null>(null);
  const [viewDuration, setViewDuration] = useState(10);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const { uploadEphemeralMedia, isUploading, progress } = useEphemeralMediaUpload();
  const { permissions, isCameraDenied, needsPermission, requestCameraAccess } = useCameraPermission();

  const durations = [5, 10, 15, 30];

  // Start camera with permission handling
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      setIsInitializing(true);
      
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: mode === 'video',
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setIsInitializing(false);
    } catch (err: unknown) {
      console.error('Camera error:', err);
      const error = err as { name?: string };
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraError('permission_denied');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setCameraError('Aucune caméra détectée sur cet appareil');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setCameraError('La caméra est utilisée par une autre application');
      } else {
        setCameraError('Impossible d\'accéder à la caméra');
      }
      setIsInitializing(false);
    }
  }, [facingMode, mode]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
  }, []);

  // Initialize camera when opened
  useEffect(() => {
    if (isOpen && !capturedMedia) {
      startCamera();
    }
    
    return () => {
      if (!isOpen) {
        stopCamera();
      }
    };
  }, [isOpen, startCamera, stopCamera, capturedMedia]);

  // Handle camera switch
  const switchCamera = async () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  useEffect(() => {
    if (isOpen && !capturedMedia) {
      startCamera();
    }
  }, [facingMode, isOpen, capturedMedia, startCamera]);

  // Take photo
  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Mirror if front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedMedia({
          type: 'photo',
          blob,
          url: URL.createObjectURL(blob),
        });
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  };

  // Start/Stop video recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp9',
    });
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setCapturedMedia({
        type: 'video',
        blob,
        url: URL.createObjectURL(blob),
      });
      stopCamera();
    };
    
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTime(0);
    
    recordingIntervalRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  // Retake
  const handleRetake = () => {
    if (capturedMedia) {
      URL.revokeObjectURL(capturedMedia.url);
    }
    setCapturedMedia(null);
    startCamera();
  };

  // Send media
  const handleSend = async () => {
    if (!capturedMedia) return;

    try {
      const file = new File(
        [capturedMedia.blob], 
        `capture-${Date.now()}.${capturedMedia.type === 'photo' ? 'jpg' : 'webm'}`,
        { type: capturedMedia.type === 'photo' ? 'image/jpeg' : 'video/webm' }
      );

      await uploadEphemeralMedia.mutateAsync({
        file,
        messageType: capturedMedia.type === 'photo' ? 'image' : 'video',
        viewDuration,
        chatRoomId,
        recipientId,
        isPrivate,
      });

      toast.success('Média envoyé !');
      handleClose();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Erreur lors de l'envoi");
    }
  };

  // Close
  const handleClose = () => {
    stopCamera();
    if (capturedMedia) {
      URL.revokeObjectURL(capturedMedia.url);
    }
    setCapturedMedia(null);
    setIsRecording(false);
    setRecordingTime(0);
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black"
      >
        <canvas ref={canvasRef} className="hidden" />

        {/* Close button */}
        <div className="absolute top-4 left-4 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-white bg-black/30 hover:bg-black/50 rounded-full"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Permission request state */}
        {isInitializing && !cameraError && !capturedMedia && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-white text-lg">Initialisation de la caméra...</p>
          </div>
        )}

        {/* Camera permission denied state */}
        {cameraError === 'permission_denied' && !capturedMedia && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-b from-black to-gray-900">
            <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mb-6">
              <ShieldAlert className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-white text-xl font-semibold mb-2">
              Accès à la caméra refusé
            </h2>
            <p className="text-white/70 text-sm mb-6 max-w-xs">
              Pour prendre des photos et vidéos, tu dois autoriser l'accès à la caméra dans les paramètres de ton navigateur.
            </p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Button 
                variant="default" 
                onClick={startCamera}
                className="w-full bg-primary hover:bg-primary/90"
              >
                <Camera className="w-4 h-4 mr-2" />
                Réessayer
              </Button>
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                Annuler
              </Button>
            </div>
            <p className="text-white/50 text-xs mt-6 flex items-center gap-1">
              <Settings className="w-3 h-3" />
              Paramètres → Site → Caméra → Autoriser
            </p>
          </div>
        )}

        {/* Other camera errors */}
        {cameraError && cameraError !== 'permission_denied' && !capturedMedia && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-b from-black to-gray-900">
            <Camera className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-white text-lg mb-4">{cameraError}</p>
            <Button variant="outline" onClick={startCamera} className="border-white/20 text-white hover:bg-white/10">
              Réessayer
            </Button>
          </div>
        )}

        {/* Camera preview */}
        {!capturedMedia && !cameraError && !isInitializing && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />

            {/* Recording indicator */}
            {isRecording && (
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600 px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-white text-sm font-medium">
                  {formatTime(recordingTime)}
                </span>
              </div>
            )}

            {/* Switch camera */}
            <div className="absolute top-4 right-4">
              {!isRecording && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={switchCamera}
                  className="text-white bg-black/30 hover:bg-black/50 rounded-full"
                >
                  <SwitchCamera className="w-6 h-6" />
                </Button>
              )}
            </div>

            {/* Mode toggle */}
            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex gap-4">
              <Button
                variant={mode === 'photo' ? 'default' : 'ghost'}
                onClick={() => setMode('photo')}
                className={`rounded-full ${mode === 'photo' ? 'bg-white text-black' : 'text-white'}`}
                disabled={isRecording}
              >
                <Camera className="w-5 h-5 mr-2" />
                Photo
              </Button>
              <Button
                variant={mode === 'video' ? 'default' : 'ghost'}
                onClick={() => setMode('video')}
                className={`rounded-full ${mode === 'video' ? 'bg-white text-black' : 'text-white'}`}
                disabled={isRecording}
              >
                <Video className="w-5 h-5 mr-2" />
                Vidéo
              </Button>
            </div>

            {/* Capture button */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
              {mode === 'photo' ? (
                <button
                  onClick={takePhoto}
                  className="w-20 h-20 rounded-full border-4 border-white bg-white/20 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform"
                >
                  <div className="w-16 h-16 rounded-full bg-white" />
                </button>
              ) : (
                <button
                  onClick={toggleRecording}
                  className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-all ${
                    isRecording ? 'bg-red-600' : 'bg-white/20 backdrop-blur-sm'
                  }`}
                >
                  {isRecording ? (
                    <Square className="w-8 h-8 text-white fill-white" />
                  ) : (
                    <Circle className="w-16 h-16 text-red-500 fill-red-500" />
                  )}
                </button>
              )}
            </div>
          </>
        )}

        {/* Captured media preview */}
        {capturedMedia && (
          <>
            {capturedMedia.type === 'photo' ? (
              <img
                src={capturedMedia.url}
                alt="Captured"
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                src={capturedMedia.url}
                autoPlay
                loop
                playsInline
                className="w-full h-full object-cover"
              />
            )}

            {/* Duration selector */}
            <div className="absolute bottom-48 left-0 right-0 px-6">
              <p className="text-sm text-white/80 mb-3 flex items-center gap-2 justify-center">
                <Clock className="w-4 h-4" />
                Durée d'affichage
              </p>
              <div className="flex gap-2 justify-center">
                {durations.map((d) => (
                  <button
                    key={d}
                    onClick={() => setViewDuration(d)}
                    disabled={isUploading}
                    className={`px-4 py-2 rounded-full font-medium transition-all ${
                      viewDuration === d 
                        ? 'bg-white text-black' 
                        : 'bg-white/20 text-white hover:bg-white/30'
                    } disabled:opacity-50`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>

            {/* Progress bar */}
            {isUploading && (
              <div className="absolute bottom-36 left-6 right-6">
                <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-white"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-8">
              <Button
                variant="ghost"
                size="lg"
                onClick={handleRetake}
                disabled={isUploading}
                className="text-white bg-black/30 hover:bg-black/50 rounded-full px-6"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Reprendre
              </Button>
              
              <Button
                variant="default"
                size="lg"
                onClick={handleSend}
                disabled={isUploading}
                className="bg-primary hover:bg-primary/90 rounded-full px-8"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Envoyer
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default CameraCapture;
