import { ShieldCheck, BanIcon, HelpCircle } from 'lucide-react';

const AdFreeBanner = () => {
  return (
    <div className="rounded-xl border border-border/50 bg-gradient-to-r from-secondary/60 via-background to-secondary/60 p-4 space-y-2">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
          <BanIcon className="w-4.5 h-4.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">
            🚫 Zéro publicité. Pour toujours.
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed pl-[46px]">
        Notre site est construit sur des bases solides et <span className="font-medium text-foreground">sans aucune publicité</span>. 
        Parce que la pub, c'est très emmerdant ! Nous ne voulons pas gâcher votre expérience. 
        La seule économie du site repose sur les <span className="font-medium text-foreground">crédits</span>, rechargeables de plusieurs façons.
      </p>
      <a
        href="/?tab=help"
        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline pl-[46px] pt-1"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        Consultez la FAQ dédiée pour comprendre les crédits
      </a>
    </div>
  );
};

export default AdFreeBanner;
