import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { deductCredits, checkSufficientCredits } from '@/hooks/useCredits';
import { useCreditDialog } from '@/contexts/CreditDialogContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  chatRoomId: string;
  recipientId?: string;
  isPrivate: boolean;
  onMessageSent?: () => void;
}

const VOICE_MESSAGE_COST = 0.3;

const VoiceRecorder = ({ chatRoomId, recipientId, isPrivate, onMessageSent }: VoiceRecorderProps) => {
  const { user } = useAuth();
  const { showInsufficientCreditsDialog } = useCreditDialog();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= 120) { // Max 2 minutes
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      toast.error("Impossible d'accéder au microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob || !user?.id) return;

    // Check credits
    const hasCredits = await checkSufficientCredits(user.id, VOICE_MESSAGE_COST);
    if (!hasCredits) {
      showInsufficientCreditsDialog(VOICE_MESSAGE_COST, 'Message vocal');
      return;
    }

    setIsSending(true);
    try {
      // Upload audio
      const filename = `voice_${user.id}_${Date.now()}.webm`;
      const path = `voice-messages/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(path, audioBlob, { contentType: 'audio/webm' });

      if (uploadError) throw uploadError;

      // Get signed URL
      const { data: signedData } = await supabase.storage
        .from('media')
        .createSignedUrl(path, 60 * 60 * 24 * 365);

      if (!signedData?.signedUrl) throw new Error('Failed to get signed URL');

      // Send message
      const { error: msgError } = await supabase.from('messages').insert({
        chat_room_id: isPrivate ? null : chatRoomId,
        sender_id: user.id,
        recipient_id: isPrivate ? recipientId : null,
        content: `🎤 Message vocal (${formatDuration(duration)})|||${signedData.signedUrl}`,
        message_type: 'audio',
        is_private: isPrivate,
      });

      if (msgError) throw msgError;

      // Deduct credits
      await deductCredits(user.id, VOICE_MESSAGE_COST, 'voice_message', 'Message vocal envoyé');

      cancelRecording();
      onMessageSent?.();
    } catch (error) {
      console.error('Voice send error:', error);
      toast.error("Erreur lors de l'envoi du message vocal");
    } finally {
      setIsSending(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Recording state
  if (isRecording) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 bg-destructive/10 rounded-xl border border-destructive/20 animate-pulse">
        <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
        <span className="text-sm font-medium text-destructive flex-1">
          Enregistrement... {formatDuration(duration)}
        </span>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelRecording}>
          <X className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="destructive" className="h-8 w-8" onClick={stopRecording}>
          <Square className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // Preview state
  if (audioBlob && audioUrl) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 bg-secondary/50 rounded-xl border border-border">
        <audio src={audioUrl} controls className="flex-1 h-8" />
        <span className="text-xs text-muted-foreground">{VOICE_MESSAGE_COST} cr.</span>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelRecording}>
          <X className="w-4 h-4" />
        </Button>
        <Button size="icon" className="h-8 w-8" onClick={sendVoiceMessage} disabled={isSending}>
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    );
  }

  // Default button
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 text-muted-foreground hover:text-primary"
      onClick={startRecording}
    >
      <Mic className="w-5 h-5" />
    </Button>
  );
};

export default VoiceRecorder;
