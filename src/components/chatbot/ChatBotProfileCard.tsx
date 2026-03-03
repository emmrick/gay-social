import { Bot, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useChatbotConfig } from '@/hooks/useChatbotConfig';

interface ChatBotProfileCardProps {
  onOpen: () => void;
}

const ChatBotProfileCard = ({ onOpen }: ChatBotProfileCardProps) => {
  const { data: config, isLoading } = useChatbotConfig();

  const isActive = config?.is_active || false;
  const infosCount = config?.chatbot_info?.length || 0;

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
    <Card 
      className="bg-card/80 backdrop-blur-sm border-border/50 overflow-hidden cursor-pointer hover:bg-accent/30 transition-colors active:scale-[0.98]"
      onClick={onOpen}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">ChatBot Personnel</h3>
              <Badge 
                variant={isActive ? "default" : "secondary"} 
                className={`text-[10px] ${isActive ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : ''}`}
              >
                {isActive ? '🟢 Actif' : '⚫ Inactif'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isActive 
                ? `${infosCount} info${infosCount > 1 ? 's' : ''} configurée${infosCount > 1 ? 's' : ''}` 
                : 'Configurez votre assistant IA'}
            </p>
          </div>

          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatBotProfileCard;
