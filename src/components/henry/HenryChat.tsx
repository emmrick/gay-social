import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, Coins } from 'lucide-react';

/** Rendu inline minimal : transforme **gras** en <strong>. */
const renderRich = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? (
      <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
};
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import {
  HENRY_FLOW,
  HenryStep,
  REJECT_REASONS,
} from '@/lib/henry/henryFlow';
import { useHenryChat, HenryProfileMatch } from '@/hooks/useHenryChat';
import { useCredits } from '@/hooks/useCredits';
import HenryProfileCard from './HenryProfileCard';
import HenryTypingBubble from './HenryTypingBubble';
import { toast } from 'sonner';
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

const labelFor = (step: HenryStep, value: string): string => {
  const def = HENRY_FLOW[step];
  return def.options?.find((o) => o.value === value)?.label ?? value;
};

const REJECT_REPLIES: Record<string, string> = {
  not_my_type: 'Ok noté ✌️ Je te trouve quelqu\'un dans un autre style.',
  too_far: 'Compris, je cherche plus proche de chez toi 📍',
  age_off: 'Bien reçu, j\'ajuste l\'âge 🎂',
  no_photo: 'Ok, je privilégie des profils avec photo claire 📸',
  no_bio: 'Bien noté, je te propose des profils avec une bio 📝',
  other: 'D\'accord, voyons un autre profil 👇',
};

/** Petit délai pour simuler la frappe d'Henry. */
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const HenryChat = () => {
  const navigate = useNavigate();
  const {
    conversation,
    messages,
    isLoading,
    sendUserMessage,
    saveBotMessage,
    updateCriteria,
    resetConversation,
    findMatches,
  } = useHenryChat();
  const { availableCredits } = useCredits();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [matches, setMatches] = useState<HenryProfileMatch[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const [shownIds, setShownIds] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [multiSel, setMultiSel] = useState<string[]>([]);
  const [creditAlert, setCreditAlert] = useState(false);
  const [henryTyping, setHenryTyping] = useState(false);
  /** true → on demande la raison du rejet du profil courant. */
  const [askingReason, setAskingReason] = useState(false);
  const initRef = useRef(false);

  const currentStep = (conversation?.current_step ?? 'greeting') as HenryStep;
  const stepDef = HENRY_FLOW[currentStep];

  // Auto-scroll : ScrollArea (Radix) scrolle sur son viewport interne, pas sur la racine.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const viewport = root.querySelector<HTMLElement>(
      '[data-radix-scroll-area-viewport]',
    );
    const target = viewport ?? root;
    // double rAF pour laisser le DOM se peindre (motion + image)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        target.scrollTo({ top: target.scrollHeight, behavior: 'smooth' });
      });
    });
  }, [messages.length, matches.length, matchIndex, currentStep, henryTyping, askingReason, searching]);

  /** Envoie un message Henry avec animation de frappe. */
  const sendBotMessage = async (
    content: string,
    payload?: any,
    typingMs = 700,
  ) => {
    setHenryTyping(true);
    // durée proportionnelle à la longueur, plafonnée
    const dur = Math.min(1600, Math.max(typingMs, content.length * 18));
    await wait(dur);
    try {
      await saveBotMessage.mutateAsync({ content, payload });
    } finally {
      setHenryTyping(false);
    }
  };

  // Initial greeting
  useEffect(() => {
    if (initRef.current) return;
    if (isLoading) return;
    if (!conversation) return;
    if (messages.length > 0) {
      initRef.current = true;
      return;
    }
    initRef.current = true;
    sendBotMessage(HENRY_FLOW.greeting.question, { step: 'greeting' }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation, messages.length, isLoading]);

  const interests = conversation?.interests ?? [];

  const handleQuickReply = async (value: string, label: string) => {
    if (sendUserMessage.isPending || saveBotMessage.isPending || henryTyping) return;

    if (stepDef.multi && value !== '__no_pref__') {
      const next = multiSel.includes(value)
        ? multiSel.filter((v) => v !== value)
        : [...multiSel, value];
      setMultiSel(next);
      return;
    }

    // Vérification crédits : 0.2 crédit par message
    if (availableCredits < 0.2) {
      setCreditAlert(true);
      return;
    }

    await advance(value, label);
  };

  const handleMultiConfirm = async () => {
    if (multiSel.length === 0) {
      toast.error('Choisis au moins une option 🙂');
      return;
    }
    const labels = multiSel.map((v) => labelFor(currentStep, v)).join(', ');
    await advance(multiSel.join(','), labels, multiSel);
    setMultiSel([]);
  };

  const advance = async (
    rawValue: string,
    displayLabel: string,
    multiValues?: string[],
  ) => {
    try {
      await sendUserMessage.mutateAsync({
        content: displayLabel,
        payload: { step: currentStep, value: rawValue },
      });
    } catch (err: any) {
      if (err?.message === 'INSUFFICIENT_CREDITS') {
        setCreditAlert(true);
        return;
      }
      toast.error('Henry ne peut pas envoyer ton message. Réessaie.');
      return;
    }

    const criteriaUpdate: any = {};
    if (currentStep === 'goal') criteriaUpdate.relationship_goal = rawValue;
    if (currentStep === 'age') {
      const [mn, mx] = rawValue.split('-').map(Number);
      criteriaUpdate.age_min = mn;
      criteriaUpdate.age_max = mx;
    }
    if (currentStep === 'region') {
      criteriaUpdate.region = rawValue === '__any__' ? null : rawValue;
    }
    if (currentStep === 'tribes') {
      criteriaUpdate.tribes = (multiValues ?? [rawValue]).filter(
        (v) => v !== 'no_pref',
      );
    }
    if (currentStep === 'interests') {
      criteriaUpdate.interests = multiValues ?? [rawValue];
    }

    const nextStep = stepDef.next;
    criteriaUpdate.current_step = nextStep;

    if (Object.keys(criteriaUpdate).length > 0) {
      await updateCriteria.mutateAsync(criteriaUpdate);
    }

    if (nextStep === 'matching') {
      await sendBotMessage(HENRY_FLOW.matching.question, { step: 'matching' });
      await runMatching();
    } else if (nextStep !== 'free') {
      const nextDef = HENRY_FLOW[nextStep];
      await sendBotMessage(nextDef.question, { step: nextStep });
    }
  };

  const runMatching = async () => {
    setSearching(true);
    try {
      const results = await findMatches(shownIds);
      if (results.length === 0) {
        await sendBotMessage(
          "😕 Je n'ai pas trouvé de profils correspondant à 100 % à tes critères. Essaie d'élargir la zone ou la tranche d'âge !",
          { step: 'no_match' },
        );
      } else {
        setMatches(results);
        setMatchIndex(0);
        setShownIds((prev) => [...prev, ...results.map((r) => r.user_id)]);
        await sendBotMessage(
          `🎯 J'ai trouvé **${results.length} profils** susceptibles de te plaire. Voici le premier :`,
          { step: 'matches', count: results.length },
        );
      }
      await updateCriteria.mutateAsync({ current_step: 'free' });
    } finally {
      setSearching(false);
    }
  };

  /** L'utilisateur clique sur "Suivant" → on demande pourquoi. */
  const handleSkipRequest = async () => {
    setAskingReason(true);
    await sendBotMessage(
      'Pourquoi ce profil ne te plaît pas ? Ça m\'aide à mieux te cibler 👇',
      { step: 'reject_reason' },
      400,
    );
  };

  /** L'utilisateur choisit une raison → on passe au profil suivant. */
  const handleRejectReason = async (value: string, label: string) => {
    setAskingReason(false);
    try {
      await sendUserMessage.mutateAsync({
        content: label,
        payload: { step: 'reject_reason', value },
      });
    } catch (err: any) {
      if (err?.message === 'INSUFFICIENT_CREDITS') {
        setCreditAlert(true);
        return;
      }
    }
    await sendBotMessage(REJECT_REPLIES[value] ?? REJECT_REPLIES.other);
    await goNextProfile();
  };

  const goNextProfile = async () => {
    const nextIdx = matchIndex + 1;
    if (nextIdx < matches.length) {
      setMatchIndex(nextIdx);
      await sendBotMessage('Voici un autre profil 👇', undefined, 400);
    } else {
      setMatches([]);
      await sendBotMessage(
        'Tu as vu tous les profils de cette sélection. Veux-tu que je relance une nouvelle recherche ?',
        { step: 'free' },
      );
    }
  };

  const handleFreeAction = async (value: string) => {
    if (value === '__more__') {
      await sendUserMessage.mutateAsync({
        content: 'Propose-moi d\'autres profils',
      });
      await runMatching();
    } else if (value === '__refine__') {
      await sendUserMessage.mutateAsync({ content: 'Affiner ma recherche' });
      await updateCriteria.mutateAsync({ current_step: 'goal' });
      await sendBotMessage(HENRY_FLOW.goal.question, { step: 'goal' });
    } else if (value === '__reset__') {
      await resetConversation.mutateAsync();
      setMatches([]);
      setShownIds([]);
      setMatchIndex(0);
      setAskingReason(false);
      initRef.current = false;
    }
  };

  const currentMatch = matches[matchIndex];

  const showQuickReplies = useMemo(() => {
    if (searching || henryTyping) return false;
    if (askingReason) return false;
    if (currentMatch) return false;
    if (currentStep === 'matching') return false;
    return !!stepDef.options?.length;
  }, [searching, henryTyping, askingReason, currentMatch, currentStep, stepDef.options]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card/50 backdrop-blur shrink-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground shadow">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base leading-tight">Henry</h1>
          <p className="text-xs text-muted-foreground">
            {henryTyping ? 'écrit…' : 'Votre assistant de mise en relation'}
          </p>
        </div>
        <Badge variant="outline" className="gap-1 text-xs">
          <Coins className="w-3 h-3" />
          {Math.floor(availableCredits)}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleFreeAction('__reset__')}
          title="Recommencer"
          className="h-9 w-9"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Cost notice */}
      <div className="px-4 py-2 text-[11px] text-center text-muted-foreground bg-muted/40 border-b border-border/30">
        💡 0,2 crédit débité par message envoyé à Henry
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef as any}>
        <div className="px-4 py-4 space-y-3 max-w-2xl mx-auto">
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted text-foreground rounded-bl-md'
                  }`}
                >
                  <p className="m-0 whitespace-pre-wrap">{renderRich(m.content)}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {henryTyping && <HenryTypingBubble key="typing" />}
          </AnimatePresence>

          {/* Searching indicator */}
          {searching && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-sm text-muted-foreground px-2"
            >
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Henry cherche les meilleurs profils…
            </motion.div>
          )}

          {/* Profile card */}
          {currentMatch && !askingReason && !henryTyping && (
            <div className="flex justify-center pt-2">
              <HenryProfileCard
                profile={currentMatch}
                interests={interests}
                onSkip={handleSkipRequest}
              />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Reject reason quick replies */}
      {askingReason && !henryTyping && (
        <div className="border-t border-border/50 bg-card/30 backdrop-blur p-3 shrink-0">
          <div className="max-w-2xl mx-auto flex flex-wrap gap-2">
            {REJECT_REASONS.map((opt) => (
              <Button
                key={opt.value}
                variant="outline"
                size="sm"
                onClick={() => handleRejectReason(opt.value, opt.label)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Quick replies */}
      {showQuickReplies && (
        <div className="border-t border-border/50 bg-card/30 backdrop-blur p-3 shrink-0">
          <div className="max-w-2xl mx-auto">
            {stepDef.multi && (
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-xs text-muted-foreground">
                  {multiSel.length === 0
                    ? 'Sélectionne une ou plusieurs options'
                    : `${multiSel.length} sélectionné${multiSel.length > 1 ? 's' : ''}`}
                </p>
                <Button
                  size="sm"
                  disabled={multiSel.length === 0 || sendUserMessage.isPending}
                  onClick={handleMultiConfirm}
                >
                  Continuer →
                </Button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {stepDef.options!.map((opt) => {
                const selected = stepDef.multi && multiSel.includes(opt.value);
                if (currentStep === 'free') {
                  return (
                    <Button
                      key={opt.value}
                      variant="outline"
                      size="sm"
                      onClick={() => handleFreeAction(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  );
                }
                return (
                  <Button
                    key={opt.value}
                    variant={selected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleQuickReply(opt.value, opt.label)}
                    disabled={sendUserMessage.isPending}
                  >
                    {opt.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Insufficient credits dialog */}
      <AlertDialog open={creditAlert} onOpenChange={setCreditAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Crédits insuffisants 🪙</AlertDialogTitle>
            <AlertDialogDescription>
              Henry débite <strong>0,2 crédit par message</strong> envoyé.
              Tu dois recharger ton solde pour continuer ta conversation.
              <br />
              <br />
              Tu peux recharger tes crédits via la boutique ou en réclamant tes
              bonus quotidiens.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Plus tard</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate('/credits')}>
              Recharger mes crédits
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HenryChat;
