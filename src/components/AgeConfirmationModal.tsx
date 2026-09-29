import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Shield, Users } from 'lucide-react';

const AGE_CONFIRMED_KEY = 'age_confirmed';

export const AgeConfirmationModal = () => {
  const [showModal, setShowModal] = useState<boolean | null>(null); // null = checking

  useEffect(() => {
    // Wrap in try-catch to avoid crashing if localStorage is blocked
    try {
      const isConfirmed = window.localStorage.getItem(AGE_CONFIRMED_KEY);
      setShowModal(!isConfirmed);
    } catch {
      // Cannot read, default to showing modal
      setShowModal(true);
    }
  }, []);

  const handleConfirm = () => {
    try {
      window.localStorage.setItem(AGE_CONFIRMED_KEY, 'true');
    } catch {
      // Ignore, let user through even if storage fails
    }
    setShowModal(false);
  };

  const handleDecline = () => {
    window.location.href = 'https://www.google.com';
  };

  // Don't render anything until we've checked localStorage, prevents overlay flash
  if (showModal === null || showModal === false) {
    return null;
  }

  return (
    <AlertDialog open={showModal} onOpenChange={() => {}}>
      <AlertDialogContent className="left-[max(1rem,env(safe-area-inset-left,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] top-[max(1rem,env(safe-area-inset-top,0px))] bottom-[max(1rem,env(safe-area-inset-bottom,0px))] w-auto max-w-md translate-x-0 translate-y-0 place-self-center overflow-y-auto border-0 bg-transparent p-0 shadow-none sm:left-1/2 sm:right-auto sm:top-1/2 sm:bottom-auto sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2">
        <div className="relative w-full overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl">
          {/* Gradient background effect */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-primary/30 blur-3xl" />
            <div className="absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-accent/30 blur-3xl" />
          </div>

          {/* Content */}
          <div className="relative p-5 sm:p-6">
            <AlertDialogHeader className="text-center">
              {/* Logo Section */}
              <div className="mb-4 flex flex-col items-center sm:mb-6">
                <div className="relative mb-3 sm:mb-4">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-accent opacity-20 blur-xl" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg sm:h-20 sm:w-20">
                    <Users className="h-8 w-8 text-primary-foreground sm:h-10 sm:w-10" />
                  </div>
                </div>
                <h1 className="font-['Space_Grotesk'] text-3xl font-bold">
                  <span className="gradient-text">Gay</span>
                  <span className="text-foreground"> Social</span>
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Communauté & Rencontres
                </p>
              </div>

              {/* Divider */}
              <div className="mb-4 h-px bg-gradient-to-r from-transparent via-border to-transparent sm:mb-6" />

              {/* Warning Badge */}
              <div className="mx-auto mb-3 inline-flex max-w-full items-center gap-2 rounded-full bg-destructive/10 px-3 py-2 text-destructive sm:mb-4 sm:px-4">
                <Shield className="h-5 w-5" />
                <span className="text-xs font-semibold sm:text-sm">Contenu réservé aux adultes</span>
              </div>

              <AlertDialogTitle className="text-xl font-bold text-foreground">
                Vérification d'âge requise
              </AlertDialogTitle>
              
              <AlertDialogDescription className="mt-4 space-y-4 text-center" asChild>
                <div>
                  <p className="text-base text-muted-foreground">
                    Ce site est réservé aux personnes de{' '}
                    <strong className="text-primary">18 ans et plus</strong>.
                  </p>
                  
                  <div className="rounded-xl border border-border/50 bg-secondary/30 p-4 text-left">
                    <p className="text-sm text-muted-foreground">
                      En cliquant sur <strong className="text-foreground">"Entrer"</strong>, vous confirmez :
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Avoir 18 ans ou plus
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Accepter les conditions d'utilisation
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Comprendre la nature du contenu
                      </li>
                    </ul>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="mt-4 flex-col gap-2 sm:mt-6 sm:flex-col sm:gap-3">
              <Button 
                onClick={handleConfirm}
                className="h-auto min-h-11 w-full whitespace-normal bg-gradient-to-r from-primary to-accent py-3 text-center text-primary-foreground hover:opacity-90"
                size="lg"
              >
                J'ai 18 ans ou plus — Entrer
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleDecline}
                className="h-auto min-h-11 w-full whitespace-normal py-3 text-center text-muted-foreground hover:text-foreground"
                size="lg"
              >
                J'ai moins de 18 ans — Quitter
              </Button>
            </AlertDialogFooter>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
