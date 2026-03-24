import { useState } from 'react';
import { Bot, Plus, X, Power, MessageSquare, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useChatbotConfig, useUpdateChatbotConfig } from '@/hooks/useChatbotConfig';
import { useCredits, CREDIT_COSTS, getDynamicCreditCost } from '@/hooks/useCredits';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const ChatBotConfigSection = () => {
  const { data: config, isLoading } = useChatbotConfig();
  const updateConfig = useUpdateChatbotConfig();
  const { deductCredits, hasEnoughCredits } = useCredits();
  const [newInfo, setNewInfo] = useState('');
  const [editGreeting, setEditGreeting] = useState(false);
  const [greetingText, setGreetingText] = useState('');

  const isActive = config?.is_active || false;
  const infos = config?.chatbot_info || [];
  const greeting = config?.greeting_message || 'Salut ! Je suis le chatbot de ce profil. Pose-moi des questions pour en savoir plus ! 😊';

  const handleToggle = async () => {
    if (!isActive) {
      const activateCost = await getDynamicCreditCost('chatbot_activate');
      if (activateCost > 0 && !hasEnoughCredits(activateCost)) {
        toast.error(`Crédits insuffisants (${activateCost} crédits pour activer)`);
        return;
      }
      try {
        if (activateCost > 0) {
          await deductCredits.mutateAsync({
            amount: activateCost,
            transactionType: 'chatbot_activate',
            description: 'Activation du ChatBot personnel',
          });
        }
        updateConfig.mutate({ is_active: true });
      } catch {
        toast.error('Erreur lors de l\'activation');
      }
    } else {
      updateConfig.mutate({ is_active: false });
    }
  };

  const handleAddInfo = async () => {
    const trimmed = newInfo.trim();
    if (!trimmed) return;
    
    const cost = infos.length >= 10 
      ? await getDynamicCreditCost('chatbot_info_extra') 
      : await getDynamicCreditCost('chatbot_info');
    if (cost > 0 && !hasEnoughCredits(cost)) {
      toast.error(`Crédits insuffisants (${cost} crédits par information)`);
      return;
    }

    try {
      if (cost > 0) {
        await deductCredits.mutateAsync({
          amount: cost,
          transactionType: infos.length >= 10 ? 'chatbot_info_extra' : 'chatbot_info',
          description: `Info chatbot (${infos.length + 1}${infos.length >= 10 ? ' - extra' : ''})`,
        });
      }
      updateConfig.mutate({ chatbot_info: [...infos, trimmed] });
      setNewInfo('');
    } catch {
      toast.error('Erreur lors de la déduction des crédits');
    }
  };

  const handleRemoveInfo = (index: number) => {
    const updated = infos.filter((_, i) => i !== index);
    updateConfig.mutate({ chatbot_info: updated });
  };

  const handleSaveGreeting = () => {
    if (greetingText.trim()) {
      updateConfig.mutate({ greeting_message: greetingText.trim() });
    }
    setEditGreeting(false);
  };

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
    <Card className="bg-card/80 backdrop-blur-sm border-border/50 overflow-hidden">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">ChatBot Personnel</h3>
              <p className="text-xs text-muted-foreground">
                {isActive ? '🟢 Actif' : '⚫ Inactif'}
              </p>
            </div>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={handleToggle}
            disabled={updateConfig.isPending}
          />
        </div>

        {/* Description */}
        <div className="mb-3 p-2.5 rounded-lg bg-secondary/30 border border-border/30">
          <p className="text-xs text-foreground leading-relaxed">
            🤖 <span className="font-medium">Votre assistant IA personnel</span> répond automatiquement aux visiteurs de votre profil. 
            Partagez vos préférences, ce que vous recherchez, et laissez votre bot faire le premier contact à votre place. 
            Les visiteurs intéressés pourront ensuite vous écrire directement.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge variant="outline" className="text-[10px]">🔓 Activation : {CREDIT_COSTS.chatbot_activate} crédits</Badge>
            <Badge variant="outline" className="text-[10px]">💬 Message : {CREDIT_COSTS.chatbot_message} crédit</Badge>
            <Badge variant="outline" className="text-[10px]">📝 Info : {CREDIT_COSTS.chatbot_info} crédits</Badge>
          </div>
        </div>

        {/* Greeting message */}
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            Message d'accueil
          </p>
          {editGreeting ? (
            <div className="space-y-2">
              <Textarea
                value={greetingText}
                onChange={(e) => setGreetingText(e.target.value)}
                placeholder="Message d'accueil..."
                className="text-sm min-h-[60px]"
                maxLength={200}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditGreeting(false)} className="text-xs">
                  Annuler
                </Button>
                <Button size="sm" onClick={handleSaveGreeting} disabled={updateConfig.isPending} className="text-xs">
                  Enregistrer
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setGreetingText(greeting); setEditGreeting(true); }}
              className="w-full text-left p-2 rounded-lg bg-secondary/50 text-sm text-muted-foreground hover:bg-secondary/80 transition-colors"
            >
              {greeting}
            </button>
          )}
        </div>

        {/* Info messages */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            Informations pour le chatbot ({infos.length}) — 
            <span className="text-primary font-medium">
              {infos.length >= 10 ? `${CREDIT_COSTS.chatbot_info_extra}` : `${CREDIT_COSTS.chatbot_info}`} crédits/info
            </span>
          </p>

          {infos.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {infos.map((info, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-2 p-2 rounded-lg bg-secondary/30"
                >
                  <p className="text-xs flex-1 text-foreground">{info}</p>
                  <button
                    onClick={() => handleRemoveInfo(index)}
                    className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          {(
            <div className="flex gap-2">
              <Input
                value={newInfo}
                onChange={(e) => setNewInfo(e.target.value)}
                placeholder="Ex: Je cherche des plans réguliers..."
                className="text-xs h-8"
                maxLength={200}
                onKeyDown={(e) => e.key === 'Enter' && handleAddInfo()}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddInfo}
                disabled={!newInfo.trim() || updateConfig.isPending}
                className="h-8 px-2"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Help text */}
        <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
          💡 Ajoutez des informations que votre chatbot pourra partager avec les visiteurs de votre profil. 
          Ils pourront discuter avec votre bot avant de vous contacter directement.
        </p>
      </CardContent>
    </Card>
  );
};

export default ChatBotConfigSection;
