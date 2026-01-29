import { useState } from 'react';
import { AlertTriangle, Flag, Loader2, CheckCircle, MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  ReportReason, 
  reportReasonLabels, 
  reportReasonDescriptions 
} from '@/hooks/useReports';
import { useReportMessage } from '@/hooks/useReportMessage';

interface ReportMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageId: string;
  messageContent: string;
  senderId: string;
  senderUsername: string;
}

const reportReasons: ReportReason[] = [
  'harassment',
  'inappropriate_content',
  'spam',
  'underage',
  'other',
];

const ReportMessageDialog = ({ 
  open, 
  onOpenChange, 
  messageId,
  messageContent,
  senderId,
  senderUsername 
}: ReportMessageDialogProps) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  
  const { reportMessage, isReporting } = useReportMessage();

  const handleSubmit = async () => {
    if (!selectedReason) return;

    await reportMessage({
      messageId,
      senderId,
      reason: selectedReason,
      description: description.trim() || undefined,
    });

    setSubmitted(true);
    setTimeout(() => {
      onOpenChange(false);
      setSubmitted(false);
      setSelectedReason(null);
      setDescription('');
    }, 2000);
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedReason(null);
    setDescription('');
    setSubmitted(false);
  };

  // Success state
  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Signalement envoyé</h3>
            <p className="text-muted-foreground text-sm">
              Merci pour votre signalement. Notre équipe va l'examiner dans les plus brefs délais.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-destructive" />
            Signaler ce message
          </DialogTitle>
          <DialogDescription>
            Message de <strong>{senderUsername}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Message preview */}
          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm line-clamp-3">{messageContent || '[Message média]'}</p>
            </div>
          </div>

          {/* Reason selection */}
          <RadioGroup 
            value={selectedReason || ''} 
            onValueChange={(value) => setSelectedReason(value as ReportReason)}
          >
            <div className="space-y-3">
              {reportReasons.map((reason) => (
                <div 
                  key={reason}
                  className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedReason === reason 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedReason(reason)}
                >
                  <RadioGroupItem value={reason} id={`msg-${reason}`} className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor={`msg-${reason}`} className="font-medium cursor-pointer">
                      {reportReasonLabels[reason]}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {reportReasonDescriptions[reason]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </RadioGroup>

          {/* Description (optional) */}
          <div className="space-y-2">
            <Label htmlFor="msg-description" className="text-sm font-medium">
              Détails supplémentaires (optionnel)
            </Label>
            <Textarea
              id="msg-description"
              placeholder="Décrivez le contexte..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/500
            </p>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-xs text-destructive">
              Les faux signalements peuvent entraîner des sanctions sur votre compte.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSubmit}
            disabled={!selectedReason || isReporting}
          >
            {isReporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Flag className="w-4 h-4" />
                Signaler
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportMessageDialog;
