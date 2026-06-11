import { AlertTriangle } from 'lucide-react';
import HenryChat from '@/components/henry/HenryChat';

const HenryPage = () => {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Avertissement : chatbot en cours de développement */}
      <div className="shrink-0 mx-3 mt-3 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-amber-400 leading-snug">
              Henry est en cours de construction
            </p>
            <p className="text-[12px] text-amber-300/80 mt-1 leading-relaxed">
              Notre chatbot d'assistance de rencontre n'est pas terminé. Nous vous recommandons de ne pas l'utiliser pour le moment — nous travaillons activement sur la logique de matching.
            </p>
          </div>
        </div>
      </div>
      <HenryChat />
    </div>
  );
};

export default HenryPage;
