import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Loader2, SwitchCamera, ShieldAlert, Settings, RotateCcw, Lock, LockOpen, Coins
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEphemeralMediaUpload } from '@/hooks/useEphemeralMediaUpload';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MAX_SEGMENT_DURATION = 10; // seconds per segment
const MAX_TOTAL_DURATION = 60; // max total recording time

interface CapturedSegment {
  type: 'photo' | 'video';
  blob: Blob;
  url: string;
  duration?: number;
}

interface SnapCaptureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chatRoomId?: string;
  recipientId?: string;
  isPrivate: boolean;
  onCaptureForStory?: (segments: { file: File; type: 'image' | 'video' }[]) => void;
}

const SnapCaptureDialog = ({
  isOpen,
  onClose,
  chatRoomId,
  recipientId,
  isPrivate,
  onCaptureForStory,
}: SnapCaptureDialogProps) => {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [capturedSegments, setCapturedSegments] = useState<CapturedSegment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [lockHintVisible, setLockHintVisible] = useState(false);
  const [flashVisible, setFlashVisible] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoldingRef = useRef(false);
  const isLockedRef = useRef(false);
  const segmentStartTimeRef = useRef(0);
  const totalRecordingTimeRef = useRef(0);
  const segmentsRef = useRef<CapturedSegment[]>([]);
  const autoSplitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef(0);
  const lockZoneRef = useRef<HTMLDivElement>(null);
  const viewfinderRef = useRef<HTMLDivElement>(null);

  const { uploadEphemeralMedia, isUploading, progress, creditsNeeded } = useEphemeralMediaUpload();
  const { permissions, isCameraDenied } = useCameraPermission();

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      setIsInitializing(true);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsInitializing(false);
    } catch (err: unknown) {
      const error = err as { name?: string };
      if (error.name === 'NotAllowedError') {
        setCameraError('permission_denied');
      } else if (error.name === 'NotFoundError') {
        setCameraError('Aucune caméra détectée');
      } else {
        setCameraError("Impossible d'accéder à la caméra");
      }
      setIsInitializing(false);
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    if (autoSplitTimerRef.current) clearTimeout(autoSplitTimerRef.current);
  }, []);

  useEffect(() => {
    if (isOpen && capturedSegments.length === 0) startCamera();
    return () => { if (!isOpen) stopCamera(); };
  }, [isOpen, startCamera, stopCamera, capturedSegments.length]);

  useEffect(() => {
    if (isOpen && capturedSegments.length === 0) startCamera();
  }, [facingMode, isOpen, capturedSegments.length, startCamera]);

  // Take photo (tap) - captures exactly what the viewfinder shows (object-cover crop)
  const takePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !viewfinderRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flash feedback
    setFlashVisible(true);
    setTimeout(() => setFlashVisible(false), 150);

    // Calculate the object-cover crop to match exactly what the user sees
    const viewRect = viewfinderRef.current.getBoundingClientRect();
    const viewAspect = viewRect.width / viewRect.height;
    const videoAspect = video.videoWidth / video.videoHeight;

    let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;

    if (videoAspect > viewAspect) {
      // Video is wider than viewfinder → crop sides
      sw = video.videoHeight * viewAspect;
      sx = (video.videoWidth - sw) / 2;
    } else {
      // Video is taller than viewfinder → crop top/bottom
      sh = video.videoWidth / viewAspect;
      sy = (video.videoHeight - sh) / 2;
    }

    canvas.width = sw;
    canvas.height = sh;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

    canvas.toBlob((blob) => {
      if (blob) {
        const segment: CapturedSegment = {
          type: 'photo',
          blob,
          url: URL.createObjectURL(blob),
        };
        setCapturedSegments([segment]);
        segmentsRef.current = [segment];
        stopCamera();
      }
    }, 'image/jpeg', 0.92);
  }, [facingMode, stopCamera]);

  // Force stop all recording (called when max duration reached)
  const forceStopRecording = useCallback(() => {
    isHoldingRef.current = false;
    if (autoSplitTimerRef.current) clearTimeout(autoSplitTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Start a single video segment recording
  const startSegmentRecording = useCallback(() => {
    if (!streamRef.current) return;

    // Check if we've exceeded max total duration
    const elapsed = (Date.now() - recordingStartTimeRef.current) / 1000;
    if (elapsed >= MAX_TOTAL_DURATION) {
      forceStopRecording();
      return;
    }

    chunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const segElapsed = (Date.now() - segmentStartTimeRef.current) / 1000;
      const segment: CapturedSegment = {
        type: 'video',
        blob,
        url: URL.createObjectURL(blob),
        duration: Math.min(segElapsed, MAX_SEGMENT_DURATION),
      };
      segmentsRef.current = [...segmentsRef.current, segment];
      setCapturedSegments([...segmentsRef.current]);

      // If still holding and under max duration, start next segment
      const totalElapsed = (Date.now() - recordingStartTimeRef.current) / 1000;
      if (isHoldingRef.current && totalElapsed < MAX_TOTAL_DURATION) {
        segmentStartTimeRef.current = Date.now();
        startSegmentRecording();
      } else {
        // Done recording
        isHoldingRef.current = false;
        setIsRecording(false);
        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        stopCamera();
      }
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    segmentStartTimeRef.current = Date.now();

    // Calculate remaining time for this segment
    const totalElapsed = (Date.now() - recordingStartTimeRef.current) / 1000;
    const remaining = MAX_TOTAL_DURATION - totalElapsed;
    const segmentDuration = Math.min(MAX_SEGMENT_DURATION, remaining);

    // Auto-split after segment duration
    autoSplitTimerRef.current = setTimeout(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    }, segmentDuration * 1000);
  }, [stopCamera, forceStopRecording]);

  // Handle hold start (video recording)
  const handlePointerDown = useCallback(() => {
    isHoldingRef.current = false;
    isLockedRef.current = false;
    setIsLocked(false);
    segmentsRef.current = [];
    setCapturedSegments([]);

    holdTimerRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      setIsRecording(true);
      setRecordingTime(0);
      setLockHintVisible(true);
      totalRecordingTimeRef.current = 0;
      recordingStartTimeRef.current = Date.now();

      recordingIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        setRecordingTime(elapsed);

        if (elapsed >= MAX_TOTAL_DURATION) {
          forceStopRecording();
          setIsLocked(false);
          isLockedRef.current = false;
          setLockHintVisible(false);
        }
      }, 1000);

      startSegmentRecording();
    }, 300);
  }, [startSegmentRecording, forceStopRecording]);

  // Handle pointer move - check if finger is over lock zone
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isHoldingRef.current || isLockedRef.current) return;
    if (!lockZoneRef.current) return;

    const rect = lockZoneRef.current.getBoundingClientRect();
    const isOverLock = (
      e.clientX >= rect.left - 20 &&
      e.clientX <= rect.right + 20 &&
      e.clientY >= rect.top - 20 &&
      e.clientY <= rect.bottom + 20
    );

    if (isOverLock) {
      // Lock recording
      isLockedRef.current = true;
      isHoldingRef.current = true; // keep recording going
      setIsLocked(true);
      setLockHintVisible(false);
    }
  }, []);

  // Handle hold end
  const handlePointerUp = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (!isHoldingRef.current) {
      // Was a tap, not a hold
      if (!isLockedRef.current) {
        takePhoto();
      }
      return;
    }

    // If locked, don't stop recording on release
    if (isLockedRef.current) {
      setLockHintVisible(false);
      return;
    }

    // Not locked - stop recording
    isHoldingRef.current = false;
    setLockHintVisible(false);
    if (autoSplitTimerRef.current) {
      clearTimeout(autoSplitTimerRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, [takePhoto]);

  // Stop locked recording (tap on record button while locked)
  const handleStopLockedRecording = useCallback(() => {
    isHoldingRef.current = false;
    isLockedRef.current = false;
    setIsLocked(false);
    setLockHintVisible(false);
    if (autoSplitTimerRef.current) {
      clearTimeout(autoSplitTimerRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Retake
  const handleRetake = () => {
    capturedSegments.forEach(s => URL.revokeObjectURL(s.url));
    setCapturedSegments([]);
    segmentsRef.current = [];
    setRecordingTime(0);
    startCamera();
  };

  // Send all segments — video view duration = video actual duration
  const handleSend = async () => {
    if (capturedSegments.length === 0) return;

    if (onCaptureForStory) {
      const files = capturedSegments.map((seg, i) => ({
        file: new File(
          [seg.blob],
          `snap-${Date.now()}-${i}.${seg.type === 'photo' ? 'jpg' : 'webm'}`,
          { type: seg.type === 'photo' ? 'image/jpeg' : 'video/webm' }
        ),
        type: (seg.type === 'photo' ? 'image' : 'video') as 'image' | 'video',
      }));
      onCaptureForStory(files);
      handleClose();
      return;
    }

    setIsSending(true);
    setSendProgress(0);

    try {
      for (let i = 0; i < capturedSegments.length; i++) {
        const seg = capturedSegments[i];
        const file = new File(
          [seg.blob],
          `snap-${Date.now()}-${i}.${seg.type === 'photo' ? 'jpg' : 'webm'}`,
          { type: seg.type === 'photo' ? 'image/jpeg' : 'video/webm' }
        );

        // For videos, view duration = video duration. For photos, default 10s.
        const viewDuration = seg.type === 'video' ? Math.ceil(seg.duration || MAX_SEGMENT_DURATION) : 10;

        await uploadEphemeralMedia.mutateAsync({
          file,
          messageType: seg.type === 'photo' ? 'image' : 'video',
          viewDuration,
          chatRoomId,
          recipientId,
          isPrivate,
        });

        setSendProgress(Math.round(((i + 1) / capturedSegments.length) * 100));
      }

      toast.success(
        capturedSegments.length > 1
          ? `${capturedSegments.length} médias envoyés !`
          : 'Média envoyé !'
      );
      handleClose();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Erreur lors de l'envoi");
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    capturedSegments.forEach(s => URL.revokeObjectURL(s.url));
    setCapturedSegments([]);
    segmentsRef.current = [];
    setIsRecording(false);
    setIsLocked(false);
    isLockedRef.current = false;
    setLockHintVisible(false);
    setRecordingTime(0);
    isHoldingRef.current = false;
    onClose();
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const totalDuration = capturedSegments.reduce((sum, s) => sum + (s.duration || 0), 0);
  const hasCapture = capturedSegments.length > 0 && !isRecording;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md max-h-[90vh] p-0 gap-0 overflow-hidden bg-black border-border [&>button:last-child]:hidden">
        <canvas ref={canvasRef} className="hidden" />

        <DialogHeader className="p-4 border-b border-border bg-background/80 backdrop-blur-sm">
          <DialogTitle className="text-center font-display flex items-center justify-center gap-2">
            📸 Selfie
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground text-center mt-1">
            Appuie = 📷 Photo · Maintiens enfoncé = 🎥 Vidéo (max 60s)
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)]">
          {/* Camera initializing */}
          {isInitializing && !cameraError && !hasCapture && (
            <div className="flex flex-col items-center justify-center p-8 min-h-[300px]">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-white text-lg">Initialisation de la caméra...</p>
            </div>
          )}

          {/* Permission denied */}
          {cameraError === 'permission_denied' && !hasCapture && (
            <div className="flex flex-col items-center justify-center text-center p-8 min-h-[300px]">
              <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mb-6">
                <ShieldAlert className="w-10 h-10 text-destructive" />
              </div>
              <h2 className="text-white text-xl font-semibold mb-2">Accès caméra refusé</h2>
              <p className="text-white/70 text-sm mb-6 max-w-xs">
                Autorise l'accès à la caméra dans les paramètres de ton navigateur.
              </p>
              <Button variant="default" onClick={startCamera}>Réessayer</Button>
              <p className="text-white/50 text-xs mt-4 flex items-center gap-1">
                <Settings className="w-3 h-3" /> Paramètres → Caméra → Autoriser
              </p>
            </div>
          )}

          {/* Other errors */}
          {cameraError && cameraError !== 'permission_denied' && !hasCapture && (
            <div className="flex flex-col items-center justify-center p-8 min-h-[300px]">
              <p className="text-white text-lg mb-4">{cameraError}</p>
              <Button variant="outline" onClick={startCamera} className="border-white/20 text-white">Réessayer</Button>
            </div>
          )}

          {/* Live camera preview */}
          {!hasCapture && !cameraError && !isInitializing && (
            <div className="relative">
              <div ref={viewfinderRef} className="aspect-[3/4] bg-black overflow-hidden relative">
                {/* Flash overlay */}
                {flashVisible && (
                  <div className="absolute inset-0 bg-white z-30 pointer-events-none animate-fade-out" />
                )}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />

                {/* Recording indicator */}
                {isRecording && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 px-3 py-1.5 rounded-full z-10">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-white text-sm font-medium">{formatTime(recordingTime)}</span>
                  </div>
                )}

                {/* Max duration progress bar */}
                {isRecording && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 z-10">
                    <div
                      className="h-full bg-red-500 transition-all duration-1000 ease-linear"
                      style={{ width: `${Math.min((recordingTime / MAX_TOTAL_DURATION) * 100, 100)}%` }}
                    />
                  </div>
                )}

                {/* Segment count indicator */}
                {isRecording && segmentsRef.current.length > 0 && (
                  <div className="absolute top-4 right-16 bg-primary px-2.5 py-1 rounded-full z-10">
                    <span className="text-white text-xs font-bold">{segmentsRef.current.length + 1} segments</span>
                  </div>
                )}

                {/* Switch camera */}
                {!isRecording && (
                  <div className="absolute top-4 right-4 z-10">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                      className="text-white bg-black/30 hover:bg-black/50 rounded-full"
                    >
                      <SwitchCamera className="w-6 h-6" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Snap capture button + lock zone + instructions */}
              <div
                className="flex flex-col items-center bg-black/80"
                onPointerMove={handlePointerMove}
                style={{ paddingTop: 12, paddingBottom: 20 }}
              >
                {/* Instruction text - fixed height to prevent shift */}
                <div className="h-5 flex items-center justify-center mb-2">
                  <p className="text-white/60 text-xs text-center">
                    {isLocked
                      ? 'Enregistrement verrouillé • Appuie sur le bouton pour arrêter'
                      : isRecording
                      ? 'Glisse vers le cadenas pour verrouiller 🔒'
                      : 'Tap = Photo • Appui long = Vidéo (max 60s)'}
                  </p>
                </div>

                {/* Lock zone - fixed height container always reserved */}
                <div className="h-[60px] flex items-center justify-center">
                  {isRecording && !isLocked && lockHintVisible ? (
                    <motion.div
                      ref={lockZoneRef}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-0.5"
                    >
                      <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center animate-bounce">
                        <LockOpen className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-[10px] text-white/60">Verrouiller</span>
                    </motion.div>
                  ) : isLocked ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30"
                    >
                      <Lock className="w-3.5 h-3.5 text-white" />
                      <span className="text-xs text-white font-medium">Verrouillé</span>
                    </motion.div>
                  ) : null}
                </div>

                {/* Capture button - no scale transform to avoid shift */}
                <button
                  onPointerDown={isLocked ? undefined : handlePointerDown}
                  onPointerUp={isLocked ? undefined : handlePointerUp}
                  onPointerCancel={isLocked ? undefined : handlePointerUp}
                  onPointerLeave={isLocked ? undefined : handlePointerUp}
                  onClick={isLocked ? handleStopLockedRecording : undefined}
                  className={cn(
                    "w-20 h-20 rounded-full border-4 flex items-center justify-center select-none touch-none transition-colors duration-200",
                    isRecording
                      ? "bg-red-600 border-red-400"
                      : "bg-white/20 backdrop-blur-sm border-white active:bg-white/30"
                  )}
                >
                  {isRecording ? (
                    <div className="w-7 h-7 rounded-sm bg-white" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-white" />
                  )}
                </button>

                {/* Bottom hint - fixed height to prevent shift */}
                <div className="h-5 flex items-center justify-center mt-2">
                  {isRecording && !isLocked && (
                    <p className="text-amber-400 text-xs animate-pulse">
                      ↑ Glisse vers le cadenas
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Captured media preview */}
          {hasCapture && (
            <div className="space-y-4">
              <div className="px-4 pt-4">
                <p className="text-sm text-muted-foreground mb-2">
                  {capturedSegments.length} {capturedSegments.length > 1 ? 'segments' : 'média'}
                  {capturedSegments.some(s => s.type === 'video') && (
                    <span className="text-muted-foreground ml-1">
                      — durée totale : {Math.round(totalDuration)}s
                    </span>
                  )}
                </p>
              </div>

              <div className="flex gap-2 px-4 overflow-x-auto pb-2">
                {capturedSegments.map((seg, i) => (
                  <div key={i} className="relative flex-shrink-0 w-24 h-32 rounded-xl overflow-hidden bg-black border border-border/50">
                    {seg.type === 'photo' ? (
                      <img src={seg.url} alt={`Segment ${i + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <video src={seg.url} className="w-full h-full object-cover" muted playsInline />
                    )}
                    <div className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-[10px] text-white font-medium">
                      {seg.type === 'photo' ? '📷' : `🎥 ${Math.round(seg.duration || 0)}s`}
                    </div>
                    <div className="absolute top-1 right-1 bg-primary/80 px-1.5 py-0.5 rounded text-[10px] text-white font-bold">
                      {i + 1}
                    </div>
                  </div>
                ))}
              </div>

              {/* Credit cost indicator */}
              <div className="px-4 pb-1 space-y-1.5">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
                  <Coins className="w-4 h-4 text-primary flex-shrink-0" />
                  <p className="text-xs text-foreground">
                    <span className="font-semibold">{(creditsNeeded * capturedSegments.length).toFixed(1)} crédits</span>
                    {capturedSegments.length > 1 && (
                      <span className="text-muted-foreground"> ({creditsNeeded} × {capturedSegments.length} segments)</span>
                    )}
                  </p>
                </div>
                {capturedSegments.some(s => s.type === 'video') && (
                  <p className="text-xs text-muted-foreground px-1">
                    ⏱ La durée d'affichage correspond à la durée de chaque vidéo. Les photos s'affichent 10s.
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="px-4 pb-4 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleRetake}
                  disabled={isSending}
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> Reprendre
                </Button>
                <Button
                  variant="default"
                  className="flex-1 bg-gradient-to-r from-primary to-accent"
                  onClick={handleSend}
                  disabled={isSending}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {sendProgress}%
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer{capturedSegments.length > 1 ? ` (${capturedSegments.length})` : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default SnapCaptureDialog;
