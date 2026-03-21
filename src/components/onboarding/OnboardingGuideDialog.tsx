import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Zap,
  MessageCircle,
  Heart,
  CreditCard,
  Shield,
  ChevronRight,
  ChevronLeft,
  X,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';

const ONBOARDING_KEY = 'gc_onboarding_completed';

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const STEPS: OnboardingStep[] = [
  {
    icon: <Zap className="w-8 h-8" />,
    title: 'Bienvenue sur Gay Social ! 🎉',
    description: 'Découvrez une communauté bienveillante. Votre profil et votre vérification d\'identité vous donnent accès à toutes les fonctionnalités.',
    color: 'text-primary',
  },
  {
    icon: <Heart className="w-8 h-8" />,
    title: 'Découvrez & Swipez',
    description: 'Explorez les profils proches de vous, swipez pour matcher, et ajoutez vos coups de cœur en favoris. Un match mutuel ouvre la conversation !',
    color: 'text-pink-500',
  },
  {
    icon: <MessageCircle className="w-8 h-8" />,
    title: 'Discutez librement',
    description: 'Rejoignez les salons de chat de votre région, envoyez des messages privés, partagez des médias éphémères ou créez des groupes.',
    color: 'text-violet-500',
  },
  {
    icon: <CreditCard className="w-8 h-8" />,
    title: 'Crédits & Parrainage',
    description: 'Les crédits débloquent les fonctionnalités premium. Gagnez-en gratuitement en parrainant vos amis — vous recevez tous les deux des crédits !',
    color: 'text-amber-500',
  },
  {
    icon: <Shield className="w-8 h-8" />,
    title: 'Votre sécurité avant tout',
    description: 'Tous les membres sont vérifiés. Bloquez ou signalez facilement les comportements inappropriés. Vos données sont protégées.',
    color: 'text-emerald-500',
  },
];

const OnboardingGuideDialog = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user) return;
    const completed = localStorage.getItem(`${ONBOARDING_KEY}_${user.id}`);
    if (!completed) {
      // Small delay to not overlap with other modals
      const timer = setTimeout(() => setOpen(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleClose = () => {
    if (user) {
      localStorage.setItem(`${ONBOARDING_KEY}_${user.id}`, 'true');
    }
    setOpen(false);
  };

  const handleFinish = () => {
    handleClose();
  };

  const handleViewGuide = () => {
    handleClose();
    navigate('/guide');
  };

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl border-border">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 z-10 p-1 rounded-full hover:bg-muted/50 transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Content */}
        <div className="p-6 pt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="text-center space-y-4"
            >
              <div className={`w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto ${currentStep.color}`}>
                {currentStep.icon}
              </div>
              <h3 className="text-lg font-bold">{currentStep.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{currentStep.description}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 py-3">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-2">
          {step > 0 && (
            <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)} className="flex-shrink-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          {isLast ? (
            <div className="flex gap-2 flex-1">
              <Button variant="outline" size="sm" onClick={handleViewGuide} className="flex-1 text-xs">
                <BookOpen className="w-4 h-4 mr-1" />
                Guide complet
              </Button>
              <Button size="sm" onClick={handleFinish} className="flex-1 text-xs">
                C'est parti ! 🚀
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => setStep(s => s + 1)} className="flex-1">
              Suivant
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingGuideDialog;
