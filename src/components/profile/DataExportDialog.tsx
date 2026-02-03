import { useState } from 'react';
import { Download, Lock, Loader2, Shield, FileJson, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DataExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DataExportDialog = ({ open, onOpenChange }: DataExportDialogProps) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleExport = async () => {
    if (!password.trim()) {
      toast.error('Veuillez entrer votre mot de passe');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('export-user-data', {
        body: { password },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      // Create and download the JSON file
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gayconnect-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIsSuccess(true);
      toast.success('Vos données ont été téléchargées avec succès');

      // Reset and close after delay
      setTimeout(() => {
        setIsSuccess(false);
        setPassword('');
        onOpenChange(false);
      }, 2000);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erreur lors de l\'export des données');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setPassword('');
      setIsSuccess(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="w-5 h-5 text-primary" />
            Télécharger mes données
          </DialogTitle>
          <DialogDescription>
            Conformément au RGPD (Article 20), vous pouvez télécharger l'ensemble de vos données personnelles.
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <p className="font-medium text-lg">Téléchargement réussi !</p>
            <p className="text-sm text-muted-foreground mt-1">
              Vos données ont été exportées au format JSON.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Security notice */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Shield className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-600 dark:text-amber-400">Vérification de sécurité</p>
                <p className="text-muted-foreground mt-1">
                  Pour protéger vos données, veuillez confirmer votre identité en entrant votre mot de passe.
                </p>
              </div>
            </div>

            {/* Password input */}
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Mot de passe du compte
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entrez votre mot de passe"
                disabled={isLoading}
                onKeyDown={(e) => e.key === 'Enter' && handleExport()}
              />
            </div>

            {/* Data included info */}
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Données incluses :</p>
              <ul className="list-disc pl-5 space-y-0.5 text-xs">
                <li>Informations de profil</li>
                <li>Photos et albums</li>
                <li>Messages envoyés</li>
                <li>Historique des crédits</li>
                <li>Favoris et réactions</li>
                <li>Préférences de notification</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleExport}
                disabled={isLoading || !password.trim()}
                className="flex-1 bg-gradient-to-r from-primary to-primary/80"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Export en cours...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DataExportDialog;
