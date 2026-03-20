import { Gift, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const SendGiftSection = () => {
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border/60 bg-card">
      <div className="w-9 h-9 rounded-lg bg-pink-500/10 flex items-center justify-center shrink-0">
        <Gift className="w-4 h-4 text-pink-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium">Offrir des crédits</p>
        <p className="text-[11px] text-muted-foreground">1 à 5 crédits bonus, max 10 cadeaux/jour</p>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="p-1 hover:bg-muted rounded-full transition-colors shrink-0">
            <Info className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs max-w-52">
          Pour offrir des crédits, ouvrez une conversation privée et utilisez le bouton cadeau 🎁
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default SendGiftSection;
