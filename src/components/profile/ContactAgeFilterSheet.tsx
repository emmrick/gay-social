import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shield, AlertTriangle, Check } from 'lucide-react';
import { useContactAgeFilter } from '@/hooks/useContactAgeFilter';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ContactAgeFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ContactAgeFilterSheet = ({ open, onOpenChange }: ContactAgeFilterSheetProps) => {
  const { preference, isLoading, savePreference } = useContactAgeFilter();
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 99]);
  const [isActive, setIsActive] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingActivation, setPendingActivation] = useState(false);

  useEffect(() => {
    if (preference) {
      setAgeRange([preference.min_age, preference.max_age]);
      setIsActive(preference.is_active);
    }
  }, [preference]);

  const handleToggle = (checked: boolean) => {
    if (checked && !isActive) {
      setPendingActivation(true);
      setShowConfirm(true);
    } else {
      setIsActive(checked);
      savePreference.mutate(
        { minAge: ageRange[0], maxAge: ageRange[1], isActive: checked },
        { onSuccess: () => toast.success(checked ? 'Filtre d\'âge activé' : 'Filtre d\'âge désactivé') }
      );
    }
  };

  const confirmActivation = () => {
    setIsActive(true);
    setPendingActivation(false);
    setShowConfirm(false);
    savePreference.mutate(
      { minAge: ageRange[0], maxAge: ageRange[1], isActive: true },
      { onSuccess: () => toast.success('Filtre d\'âge activé') }
    );
  };

  const handleSaveRange = () => {
    savePreference.mutate(
      { minAge: ageRange[0], maxAge: ageRange[1], isActive },
      { onSuccess: () => toast.success('Tranche d\'âge mise à jour') }
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-auto max-h-[75vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              Filtre d'âge de contact
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-6 pb-8">
            {/* Toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/50">
              <div className="flex-1">
                <Label className="font-semibold text-sm">Activer le filtre</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Bloquer les messages des personnes hors de votre tranche d'âge
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={handleToggle}
                disabled={savePreference.isPending}
              />
            </div>

            {/* Age range slider */}
            <AnimatePresence>
              {(isActive || preference?.is_active) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div className="p-4 rounded-2xl bg-secondary/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Tranche d'âge autorisée</Label>
                      <span className="text-sm font-bold text-primary">
                        {ageRange[0]} – {ageRange[1]} ans
                      </span>
                    </div>

                    <Slider
                      min={18}
                      max={99}
                      step={1}
                      value={ageRange}
                      onValueChange={(v) => setAgeRange(v as [number, number])}
                      className="py-2"
                    />

                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>18 ans</span>
                      <span>99 ans</span>
                    </div>

                    <Button
                      size="sm"
                      className="w-full rounded-xl"
                      onClick={handleSaveRange}
                      disabled={savePreference.isPending}
                    >
                      <Check className="w-4 h-4 mr-1.5" />
                      Enregistrer la tranche
                    </Button>
                  </div>

                  {/* Info box */}
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                    <div className="flex gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1.5">
                        <p className="text-xs text-foreground leading-relaxed">
                          Les membres en dehors de cette tranche d'âge <strong>ne pourront pas vous envoyer de messages</strong>.
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Ils pourront toujours réagir à votre profil. Si <strong>vous leur envoyez un message en premier</strong>, le filtre sera levé pour ce membre uniquement.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirmation dialog */}
      <AlertDialog open={showConfirm} onOpenChange={(o) => { if (!o) { setPendingActivation(false); setShowConfirm(false); } }}>
        <AlertDialogContent className="rounded-2xl max-w-[90vw]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Confirmer le filtre d'âge
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-2">
              <p>
                Vous avez fixé une tranche d'âge comprise entre <strong>{ageRange[0]}</strong> et <strong>{ageRange[1]} ans</strong>.
              </p>
              <p>
                Si vous confirmez, vous <strong>ne recevrez plus de messages</strong> des utilisateurs qui ne correspondent pas à cette tranche d'âge.
              </p>
              <p className="text-xs text-muted-foreground">
                Les membres bloqués pourront toujours réagir à votre profil. Si vous leur envoyez un message, le blocage sera levé pour ce membre.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmActivation} className="rounded-xl">
              Confirmer et activer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ContactAgeFilterSheet;
