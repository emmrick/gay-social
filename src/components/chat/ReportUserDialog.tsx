import { useState } from 'react';
import { AlertTriangle, Flag, Loader2, CheckCircle } from 'lucide-react';
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
  useReports, 
  ReportReason, 
  reportReasonLabels, 
  reportReasonDescriptions 
} from '@/hooks/useReports';

interface ReportUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  username: string;
}

const reportReasons: ReportReason[] = [
  'harassment',
  'inappropriate_content',
  'spam',
  'fake_profile',
  'underage',
  'other',
];

const ReportUserDialog = ({ 
  open, 
  onOpenChange, 
  userId, 
  username 
}: ReportUserDialogProps) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  
  const { createReport, useHasReported } = useReports();
  const { data: hasReported, isLoading: checkingReport } = useHasReported(userId);

  const handleSubmit = async () => {
    if (!selectedReason) return;

    await createReport.mutateAsync({
      reportedUserId: userId,
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

  // Already reported state
  if (hasReported && !submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              Déjà signalé
            </DialogTitle>
            <DialogDescription>
              Vous avez déjà signalé cet utilisateur. Notre équipe examine votre signalement.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={handleClose}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
            <p className="text-muted-foreground text-sm mb-3">
              L'utilisateur avec lequel vous avez échangé a été signalé.
            </p>
            <div className="bg-muted/60 rounded-lg p-3 text-left">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">🔍 Que se passe-t-il maintenant ?</strong><br />
                Vous ne verrez aucun changement de votre côté. Seule notre équipe de modération analysera l'ensemble des conversations pour déterminer si cet utilisateur respecte les conditions d'utilisation du site. Des mesures seront prises si nécessaire.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-destructive" />
            Signaler {username}
          </DialogTitle>
          <DialogDescription>
            Sélectionnez la raison du signalement. Les faux signalements peuvent entraîner des sanctions.
          </DialogDescription>
        </DialogHeader>

        {checkingReport ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
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
                    <RadioGroupItem value={reason} id={reason} className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor={reason} className="font-medium cursor-pointer">
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
              <Label htmlFor="description" className="text-sm font-medium">
                Détails supplémentaires (optionnel)
              </Label>
              <Textarea
                id="description"
                placeholder="Décrivez la situation en détail..."
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
                Les faux signalements sont passibles de suspension. Assurez-vous que votre signalement est légitime.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSubmit}
            disabled={!selectedReason || createReport.isPending}
          >
            {createReport.isPending ? (
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

export default ReportUserDialog;
