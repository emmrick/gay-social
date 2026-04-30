/**
 * Éditeur de l'arbre de blocs du ChatBot Personnel.
 *
 * - Liste des blocs racine + sous-blocs imbriqués (1 niveau visible à la fois)
 * - Ajout d'un bloc (label + réponse) avec débit progressif des crédits
 * - Reformulation IA (texte) et suggestion IA de blocs prêts à l'emploi
 * - Le coût n'est PAS basé sur l'IA : c'est une grille tarifaire stockée en base
 *   (1 bloc=1, 2=3, 3=7, 4=12 … cf. table personal_chatbot_pricing)
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Bot, Plus, X, MessageSquare, Loader2, Sparkles, Wand2, ChevronRight,
  ChevronLeft, Save, Coins, Zap, TrendingUp, Wallet, ArrowRight,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  useChatbotConfig,
  useUpdateChatbotConfig,
  useChatbotNodes,
  useCreateChatbotNode,
  useUpdateChatbotNode,
  useDeleteChatbotNode,
  useNodeCost,
  useAiRephrase,
  useAiSuggestBlocks,
  useEnsureChatbotConfig,
  useActivateChatbot,
  type ChatbotNode,
} from '@/hooks/useChatbotConfig';
import { useCredits } from '@/hooks/useCredits';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { notifyInsufficientCreditsSync } from '@/lib/credits/insufficientCreditsToast';

const ChatBotConfigSection = () => {
  const { data: config, isLoading } = useChatbotConfig();
  const { data: nodes = [], isLoading: nodesLoading } = useChatbotNodes();
  const updateConfig = useUpdateChatbotConfig();
  const activateChatbot = useActivateChatbot();
  const createNode = useCreateChatbotNode();
  const updateNode = useUpdateChatbotNode();
  const deleteNode = useDeleteChatbotNode();
  const aiRephrase = useAiRephrase();
  const aiSuggest = useAiSuggestBlocks();
  const ensureConfig = useEnsureChatbotConfig();
  const { credits } = useCredits();
  const availableCredits = credits?.total_credits ?? 0;

  /* ─── Migration douce : à l'ouverture, garantir une config et basculer
        l'utilisateur sur le nouveau système (l'ancien chatbot IA n'existe plus). ─── */
  useEffect(() => {
    ensureConfig.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [parentStack, setParentStack] = useState<ChatbotNode[]>([]); // navigation par niveau
  const [editGreeting, setEditGreeting] = useState(false);
  const [greetingText, setGreetingText] = useState('');
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ChatbotNode | null>(null);
  const [draftLabel, setDraftLabel] = useState('');
  const [draftText, setDraftText] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<{ label: string; response_text: string }[]>([]);

  const isActive = config?.is_active || false;
  const greeting = config?.greeting_message ||
    'Salut ! Je suis le chatbot de ce profil. Choisis un sujet ! 😊';

  const currentParent = parentStack[parentStack.length - 1] || null;
  const visibleNodes = useMemo(() => {
    if (!currentParent) return nodes.filter(n => n.is_root);
    return nodes.filter(n => n.parent_id === currentParent.id);
  }, [nodes, currentParent]);

  const totalNodes = nodes.length;
  const { data: currentTotalCost = 0 } = useNodeCost(totalNodes);
  const { data: nextTotalCost = 0 } = useNodeCost(totalNodes + 1);
  const { data: nextNextTotalCost = 0 } = useNodeCost(totalNodes + 2);
  const nextBlockCost = Math.max(0, nextTotalCost - currentTotalCost);
  const followingBlockCost = Math.max(0, nextNextTotalCost - nextTotalCost);
  const creditsAfterPurchase = Math.max(0, availableCredits - nextBlockCost);
  const canAfford = availableCredits >= nextBlockCost;
  const budgetUsedPct = availableCredits + currentTotalCost > 0
    ? Math.min(100, Math.round((currentTotalCost / (currentTotalCost + availableCredits)) * 100))
    : 0;

  const resetDraft = () => { setDraftLabel(''); setDraftText(''); setEditing(null); };

  /* ----------------------- handlers ----------------------- */
  const handleToggle = () => {
    if (isActive) {
      // Désactivation : toujours gratuit
      updateConfig.mutate({ is_active: false });
      return;
    }
    // Activation : 10 crédits une seule fois (jamais re-facturé après)
    const alreadyPaid = (config as any)?.activation_paid === true;
    if (!alreadyPaid && availableCredits < 10) {
      notifyInsufficientCreditsSync('Activation du chatbot');
      return;
    }
    if (!alreadyPaid) {
      const ok = window.confirm(
        "Activer le ChatBot Personnel coûte 10 crédits (paiement unique). Tu pourras le désactiver et le réactiver gratuitement ensuite. Continuer ?"
      );
      if (!ok) return;
    }
    activateChatbot.mutate();
  };

  const handleSaveGreeting = () => {
    if (greetingText.trim()) updateConfig.mutate({ greeting_message: greetingText.trim() });
    setEditGreeting(false);
  };

  const handleOpenNew = () => {
    resetDraft();
    setNewDialogOpen(true);
  };

  const handleOpenEdit = (node: ChatbotNode) => {
    setEditing(node);
    setDraftLabel(node.label);
    setDraftText(node.response_text || '');
    setNewDialogOpen(true);
  };

  const handleSubmitDraft = async () => {
    const label = draftLabel.trim();
    const text = draftText.trim();
    if (!label) return toast.error('Le bouton ne peut pas être vide');
    if (!text) return toast.error('La réponse ne peut pas être vide');

    if (editing) {
      await updateNode.mutateAsync({ id: editing.id, label, response_text: text });
    } else {
      if (availableCredits < nextBlockCost) {
        notifyInsufficientCreditsSync(`Bloc chatbot (${nextBlockCost} cr requis)`);
        return;
      }
      await createNode.mutateAsync({
        label,
        response_text: text,
        parent_id: currentParent?.id || null,
        is_root: !currentParent,
      });
    }
    setNewDialogOpen(false);
    resetDraft();
  };

  const handleRephrase = async () => {
    if (!draftText.trim()) return toast.info('Écris d\'abord un message à reformuler');
    try {
      const newText = await aiRephrase.mutateAsync({ text: draftText, label: draftLabel });
      setDraftText(newText);
      toast.success('Message reformulé ✨');
    } catch {/**/}
  };

  const handleSuggest = async () => {
    try {
      const blocks = await aiSuggest.mutateAsync();
      if (!blocks.length) return toast.info('Aucune suggestion');
      setSuggestions(blocks);
      setSuggestionsOpen(true);
    } catch {/**/}
  };

  const handlePickSuggestion = (s: { label: string; response_text: string }) => {
    setDraftLabel(s.label);
    setDraftText(s.response_text);
    setSuggestionsOpen(false);
    setNewDialogOpen(true);
  };

  /* ----------------------- render ----------------------- */
  if (isLoading) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* ─── Carte d'état + greeting ─── */}
      <Card className="bg-card/80 backdrop-blur-sm border-border/50 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Bot className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">ChatBot Personnel</h3>
                <p className="text-[11px] text-muted-foreground">
                  {isActive ? '🟢 Visible sur ton profil' : '⚫ Désactivé'}
                </p>
              </div>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={handleToggle}
              disabled={updateConfig.isPending || activateChatbot.isPending}
            />
          </div>

          <div className="mb-3 p-2.5 rounded-lg bg-secondary/30 border border-border/30">
            <p className="text-[11px] text-foreground leading-relaxed">
              💬 Crée tes propres <strong>blocs de messages</strong> que les visiteurs verront sous forme de boutons.
              Aucune IA en direct : <strong>tes réponses, ton style</strong>. L'IA t'aide juste à rédiger.
            </p>
          </div>

          {/* Greeting */}
          <div>
            <p className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Message d'accueil
            </p>
            {editGreeting ? (
              <div className="space-y-2">
                <Textarea
                  value={greetingText}
                  onChange={(e) => setGreetingText(e.target.value)}
                  className="text-sm min-h-[60px]"
                  maxLength={200}
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditGreeting(false)} className="text-xs">Annuler</Button>
                  <Button size="sm" onClick={handleSaveGreeting} disabled={updateConfig.isPending} className="text-xs">
                    <Save className="w-3 h-3 mr-1" /> Enregistrer
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setGreetingText(greeting); setEditGreeting(true); }}
                className="w-full text-left p-2.5 rounded-lg bg-secondary/50 text-sm hover:bg-secondary/80 transition-colors"
              >
                {greeting}
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Carte blocs ─── */}
      <Card className="bg-card/80 backdrop-blur-sm border-border/50 overflow-hidden">
        <CardContent className="p-4">
          {/* ── Mini-dashboard sticky : coût total & prochain palier ── */}
          <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-3 px-4 pt-4 pb-3 bg-gradient-to-b from-card/95 to-card/80 backdrop-blur-md border-b border-border/40">
            <div className="grid grid-cols-3 gap-2">
              {/* Total actuel */}
              <div className="rounded-lg bg-secondary/40 border border-border/30 p-2">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
                  <Coins className="w-3 h-3" /> Investi
                </div>
                <div className="text-base font-bold leading-none tabular-nums">
                  {currentTotalCost}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {totalNodes} bloc{totalNodes > 1 ? 's' : ''}
                </div>
              </div>

              {/* Solde */}
              <div className="rounded-lg bg-secondary/40 border border-border/30 p-2">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
                  <Wallet className="w-3 h-3" /> Solde
                </div>
                <div className="text-base font-bold leading-none tabular-nums">
                  {availableCredits}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">disponible</div>
              </div>

              {/* Prochain palier */}
              <div className={cn(
                'rounded-lg border p-2 transition-colors',
                canAfford
                  ? 'bg-primary/10 border-primary/30'
                  : 'bg-destructive/10 border-destructive/30',
              )}>
                <div className={cn(
                  'flex items-center gap-1 text-[10px] mb-0.5',
                  canAfford ? 'text-primary' : 'text-destructive',
                )}>
                  <TrendingUp className="w-3 h-3" /> Prochain
                </div>
                <div className={cn(
                  'text-base font-bold leading-none tabular-nums',
                  canAfford ? 'text-primary' : 'text-destructive',
                )}>
                  −{nextBlockCost}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  reste {creditsAfterPurchase}
                </div>
              </div>
            </div>

            {/* Progress budget */}
            <div className="mt-2">
              <Progress value={budgetUsedPct} className="h-1" />
              <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                <span>{budgetUsedPct}% du budget utilisé</span>
                {followingBlockCost > nextBlockCost && (
                  <span className="text-destructive font-medium">
                    +1 = −{followingBlockCost} ⚠
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {parentStack.length > 0 && (
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => setParentStack(s => s.slice(0, -1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              )}
              <h4 className="text-sm font-semibold truncate">
                {currentParent ? currentParent.label : 'Blocs principaux'}
              </h4>
            </div>
          </div>

          {/* Boutons IA */}
          <div className="flex gap-2 mb-3">
            <Button
              size="sm" variant="outline"
              className="flex-1 h-9 text-xs gap-1.5 border-primary/30 hover:bg-primary/5"
              onClick={handleSuggest}
              disabled={aiSuggest.isPending}
            >
              {aiSuggest.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Sparkles className="w-3.5 h-3.5 text-primary" />}
              Suggérer des blocs
            </Button>
            <Button
              size="sm"
              className="flex-1 h-9 text-xs gap-1.5"
              onClick={handleOpenNew}
              disabled={createNode.isPending || !canAfford}
            >
              <Plus className="w-3.5 h-3.5" />
              Nouveau bloc <span className="opacity-70">· −{nextBlockCost}</span>
            </Button>
          </div>

          {nodesLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : visibleNodes.length === 0 ? (
            <div className="text-center py-6 px-3 text-[12px] text-muted-foreground">
              Aucun bloc {currentParent ? 'enfant' : 'principal'} pour le moment.
              <br />Crée-en un pour démarrer.
            </div>
          ) : (
            <div className="space-y-1.5">
              <AnimatePresence>
                {visibleNodes.map(node => {
                  const childCount = nodes.filter(n => n.parent_id === node.id).length;
                  return (
                    <motion.div
                      key={node.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="group flex items-center gap-2 p-2.5 rounded-lg bg-secondary/40 hover:bg-secondary/70 border border-border/30 transition-colors"
                    >
                      <button
                        onClick={() => handleOpenEdit(node)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="text-[13px] font-medium truncate">{node.label}</div>
                        {node.response_text && (
                          <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {node.response_text}
                          </div>
                        )}
                      </button>
                      {childCount > 0 && (
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {childCount}
                        </Badge>
                      )}
                      <Button
                        size="icon" variant="ghost"
                        className="h-7 w-7 opacity-60 hover:opacity-100"
                        onClick={() => setParentStack(s => [...s, node])}
                        title="Ouvrir les sous-blocs"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        className="h-7 w-7 opacity-60 hover:opacity-100 hover:text-destructive"
                        onClick={() => {
                          if (confirm('Supprimer ce bloc ? Aucun remboursement.')) deleteNode.mutate(node.id);
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed flex items-start gap-1.5">
            <Zap className="w-3 h-3 text-primary shrink-0 mt-px" />
            Plus tu ajoutes de blocs, plus le palier suivant coûte cher (1·3·7·12·18·25·33·42·52·63 puis +30 par bloc).
          </p>
        </CardContent>
      </Card>

      {/* ─── Dialog création / édition ─── */}
      <Dialog open={newDialogOpen} onOpenChange={(o) => { setNewDialogOpen(o); if (!o) resetDraft(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le bloc' : 'Nouveau bloc'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Libellé du bouton</label>
              <Input
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                placeholder="Ex: Tu cherches quoi ?"
                maxLength={80}
                className="text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-muted-foreground">Réponse</label>
                <Button
                  size="sm" variant="ghost"
                  className="h-7 text-[11px] gap-1 text-primary"
                  onClick={handleRephrase}
                  disabled={aiRephrase.isPending || !draftText.trim()}
                >
                  {aiRephrase.isPending
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Wand2 className="w-3 h-3" />}
                  Reformuler avec l'IA
                </Button>
              </div>
              <Textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                placeholder="La réponse qui sera envoyée au visiteur quand il cliquera ce bouton…"
                maxLength={500}
                className="text-sm min-h-[100px]"
              />
              <p className="text-[10px] text-muted-foreground mt-1">{draftText.length} / 500</p>
            </div>

            {!editing && (
              <div className={cn(
                'rounded-lg border p-3 space-y-2',
                canAfford ? 'bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/30',
              )}>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  <Coins className="w-3 h-3" /> Récapitulatif du débit
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Solde actuel</span>
                    <span className="font-medium tabular-nums">{availableCredits}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Coût de ce bloc (n°{totalNodes + 1})</span>
                    <span className="font-medium text-destructive tabular-nums">−{nextBlockCost}</span>
                  </div>
                  <div className="border-t border-border/40 pt-1 flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" /> Solde après
                    </span>
                    <span className={cn(
                      'font-bold tabular-nums',
                      canAfford ? 'text-primary' : 'text-destructive',
                    )}>
                      {creditsAfterPurchase}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-muted-foreground border-t border-border/40 pt-1.5 flex items-center justify-between">
                  <span>Total investi : <strong className="text-foreground">{nextTotalCost}</strong> crédits</span>
                  {followingBlockCost > 0 && (
                    <span>+1 = <strong className="text-destructive">−{followingBlockCost}</strong></span>
                  )}
                </div>

                {!canAfford && (
                  <div className="text-[11px] text-destructive font-medium">
                    Crédits insuffisants — il manque {nextBlockCost - availableCredits} crédit{(nextBlockCost - availableCredits) > 1 ? 's' : ''}.
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={handleSubmitDraft}
              disabled={createNode.isPending || updateNode.isPending || (!editing && !canAfford)}
            >
              {(createNode.isPending || updateNode.isPending)
                ? <Loader2 className="w-4 h-4 animate-spin mr-1" />
                : <Save className="w-4 h-4 mr-1" />}
              {editing ? 'Enregistrer' : `Créer (−${nextBlockCost})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog suggestions IA ─── */}
      <Dialog open={suggestionsOpen} onOpenChange={setSuggestionsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Suggestions de l'IA
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handlePickSuggestion(s)}
                className={cn(
                  'w-full text-left p-3 rounded-lg border border-border/50',
                  'bg-secondary/30 hover:bg-primary/10 hover:border-primary/40 transition-colors',
                )}
              >
                <div className="text-[13px] font-semibold mb-1">{s.label}</div>
                <div className="text-[12px] text-muted-foreground line-clamp-3">{s.response_text}</div>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            Clique sur une suggestion pour la modifier puis la créer.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatBotConfigSection;
