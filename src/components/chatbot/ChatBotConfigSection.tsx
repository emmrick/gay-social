import { useState } from 'react';
import { Bot, Plus, X, Power, MessageSquare, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useChatbotConfig, useUpdateChatbotConfig } from '@/hooks/useChatbotConfig';
import { motion } from 'framer-motion';

const ChatBotConfigSection = () => {
  const { data: config, isLoading } = useChatbotConfig();
  const updateConfig = useUpdateChatbotConfig();
  const [newInfo, setNewInfo] = useState('');
  const [editGreeting, setEditGreeting] = useState(false);
  const [greetingText, setGreetingText] = useState('');

  const isActive = config?.is_active || false;
  const infos = config?.chatbot_info || [];
  const greeting = config?.greeting_message || 'Salut ! Je suis le chatbot de ce profil. Pose-moi des questions pour en savoir plus ! 😊';

  const handleToggle = () => {
    updateConfig.mutate({ is_active: !isActive });
  };

  const handleAddInfo = () => {
    const trimmed = newInfo.trim();
    if (!trimmed) return;
    updateConfig.mutate({ chatbot_info: [...infos, trimmed] });
    setNewInfo('');
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
            Informations pour le chatbot ({infos.length}/10)
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

          {infos.length < 10 && (
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
