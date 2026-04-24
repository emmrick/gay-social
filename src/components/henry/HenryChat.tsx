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
  buildIntroSuggestions,
} from '@/lib/henry/henryFlow';
import { useHenryChat, HenryProfileMatch } from '@/hooks/useHenryChat';
import { useCredits } from '@/hooks/useCredits';
import HenryProfileCard from './HenryProfileCard';
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

const labelFor = (
  step: HenryStep,
  value: string,
): string => {
  const def = HENRY_FLOW[step];
  return def.options?.find((o) => o.value === value)?.label ?? value;
};

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
  const initRef = useRef(false);

  const currentStep = (conversation?.current_step ?? 'greeting') as HenryStep;
  const stepDef = HENRY_FLOW[currentStep];

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length, matches.length, currentStep]);

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
    saveBotMessage.mutate({
      content: HENRY_FLOW.greeting.question,
      payload: { step: 'greeting' },
    });
  }, [conversation, messages.length, isLoading, saveBotMessage]);

  const interests = conversation?.interests ?? [];

  const handleQuickReply = async (value: string, label: string) => {
    if (sendUserMessage.isPending || saveBotMessage.isPending) return;

    // Multi-select accumulation
    if (stepDef.multi && value !== '__no_pref__') {
      const next = multiSel.includes(value)
        ? multiSel.filter((v) => v !== value)
        : [...multiSel, value];
      setMultiSel(next);
      return;
    }

    // Pre-flight credit check (next message would push pending to 5)
    const nextPending = (conversation?.pending_message_count ?? 0) + 1;
    if (nextPending >= 5 && availableCredits < 1) {
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
    const labels = multiSel
      .map((v) => labelFor(currentStep, v))
      .join(', ');
    await advance(multiSel.join(','), labels, multiSel);
    setMultiSel([]);
  };

  const advance = async (
    rawValue: string,
    displayLabel: string,
    multiValues?: string[],
  ) => {
    try {
      // 1. Save user choice
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

    // 2. Update criteria based on step
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

    // 3. Bot response
    if (nextStep === 'matching') {
      await saveBotMessage.mutateAsync({
        content: HENRY_FLOW.matching.question,
        payload: { step: 'matching' },
      });
      await runMatching();
    } else if (nextStep === 'free') {
      // already handled by matching path
    } else {
      const nextDef = HENRY_FLOW[nextStep];
      await saveBotMessage.mutateAsync({
        content: nextDef.question,
        payload: { step: nextStep },
      });
    }
  };

  const runMatching = async () => {
    setSearching(true);
    try {
      const results = await findMatches(shownIds);
      if (results.length === 0) {
        await saveBotMessage.mutateAsync({
          content:
            "😕 Je n'ai pas trouvé de profils correspondant à 100 % à tes critères. Essaie d'élargir la zone ou la tranche d'âge !",
          payload: { step: 'no_match' },
        });
      } else {
        setMatches(results);
        setMatchIndex(0);
        setShownIds((prev) => [...prev, ...results.map((r) => r.user_id)]);
        await saveBotMessage.mutateAsync({
          content: `🎯 J'ai trouvé **${results.length} profils** susceptibles de te plaire. Voici le premier :`,
          payload: { step: 'matches', count: results.length },
        });
      }
      await updateCriteria.mutateAsync({ current_step: 'free' });
    } finally {
      setSearching(false);
    }
  };

  const handleNextMatch = async () => {
    const nextIdx = matchIndex + 1;
    if (nextIdx < matches.length) {
      setMatchIndex(nextIdx);
    } else {
      // Out of matches → propose to refresh
      await saveBotMessage.mutateAsync({
        content:
          'Tu as vu tous les profils que j\'avais en réserve ! Veux-tu que je relance une nouvelle recherche ?',
        payload: { step: 'free' },
      });
      setMatches([]);
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
      await saveBotMessage.mutateAsync({
        content: HENRY_FLOW.goal.question,
        payload: { step: 'goal' },
      });
    } else if (value === '__reset__') {
      await resetConversation.mutateAsync();
      setMatches([]);
      setShownIds([]);
      setMatchIndex(0);
      initRef.current = false;
    }
  };

  const currentMatch = matches[matchIndex];

  const showQuickReplies = useMemo(() => {
    if (searching) return false;
    if (currentMatch) return false;
    if (currentStep === 'matching') return false;
    return !!stepDef.options?.length;
  }, [searching, currentMatch, currentStep, stepDef.options]);

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
            Votre assistant de mise en relation
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
        💡 1 crédit débité tous les 5 messages échangés ({conversation?.pending_message_count ?? 0}/5)
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
          {currentMatch && (
            <div className="flex justify-center pt-2">
              <HenryProfileCard
                profile={currentMatch}
                interests={interests}
                onSkip={handleNextMatch}
              />
            </div>
          )}
        </div>
      </ScrollArea>

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
              Henry débite <strong>1 crédit tous les 5 messages</strong> envoyés.
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
