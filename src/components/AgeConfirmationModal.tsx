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
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const isConfirmed = localStorage.getItem(AGE_CONFIRMED_KEY);
    if (!isConfirmed) {
      setShowModal(true);
    }
  }, []);

  const handleConfirm = () => {
    localStorage.setItem(AGE_CONFIRMED_KEY, 'true');
    setShowModal(false);
  };

  const handleDecline = () => {
    window.location.href = 'https://www.google.com';
  };

  return (
    <AlertDialog open={showModal}>
      <AlertDialogContent className="max-w-md border-0 bg-transparent p-0 shadow-none">
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl">
          {/* Gradient background effect */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-primary/30 blur-3xl" />
            <div className="absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-accent/30 blur-3xl" />
          </div>

          {/* Content */}
          <div className="relative p-6">
            <AlertDialogHeader className="text-center">
              {/* Logo Section */}
              <div className="mb-6 flex flex-col items-center">
                <div className="relative mb-4">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-accent opacity-20 blur-xl" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg">
                    <Users className="h-10 w-10 text-white" />
                  </div>
                </div>
                <h1 className="font-['Space_Grotesk'] text-3xl font-bold">
                  <span className="gradient-text">Gay</span>
                  <span className="text-foreground">Connect</span>
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Communauté & Rencontres
                </p>
              </div>

              {/* Divider */}
              <div className="mb-6 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

              {/* Warning Badge */}
              <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-destructive/10 px-4 py-2 text-destructive">
                <Shield className="h-5 w-5" />
                <span className="text-sm font-semibold">Contenu réservé aux adultes</span>
              </div>

              <AlertDialogTitle className="text-xl font-bold text-foreground">
                Vérification d'âge requise
              </AlertDialogTitle>
              
              <AlertDialogDescription className="mt-4 space-y-4 text-center">
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
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="mt-6 flex-col gap-3 sm:flex-col">
              <Button 
                onClick={handleConfirm}
                className="w-full bg-gradient-to-r from-primary to-accent text-white hover:opacity-90"
                size="lg"
              >
                J'ai 18 ans ou plus — Entrer
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleDecline}
                className="w-full text-muted-foreground hover:text-foreground"
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
