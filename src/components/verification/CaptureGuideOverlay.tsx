import { cn } from '@/lib/utils';
import { User, CreditCard, AlertCircle, Check, MoveVertical } from 'lucide-react';

interface CaptureGuideOverlayProps {
  type: 'selfie' | 'id_front' | 'id_back';
  isGoodDistance?: boolean;
}

const CaptureGuideOverlay = ({ type, isGoodDistance = true }: CaptureGuideOverlayProps) => {
  if (type === 'selfie') {
    return (
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
        {/* Face oval guide */}
        <div className="relative">
          {/* Outer glow effect */}
          <div 
            className={cn(
              "w-48 h-64 rounded-[50%] transition-all duration-300",
              isGoodDistance 
                ? "border-4 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]" 
                : "border-4 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.4)]"
            )}
          />
          
          {/* Corner guides */}
          <div className="absolute -top-2 -left-2 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
          <div className="absolute -top-2 -right-2 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
          <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
          <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />
          
          {/* Center face icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <User className="w-16 h-16 text-white/30" />
          </div>
        </div>
        
        {/* Distance indicator */}
        <div className={cn(
          "mt-6 px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-300",
          isGoodDistance 
            ? "bg-green-500/90 text-white" 
            : "bg-yellow-500/90 text-black"
        )}>
          {isGoodDistance ? (
            <>
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Bonne distance</span>
            </>
          ) : (
            <>
              <MoveVertical className="w-4 h-4" />
              <span className="text-sm font-medium">Rapproche-toi</span>
            </>
          )}
        </div>
        
        {/* Instructions */}
        <div className="absolute bottom-24 left-4 right-4">
          <div className="bg-black/70 rounded-xl px-4 py-3 text-white text-center">
            <p className="text-sm font-medium mb-1">Place ton visage dans l'ovale</p>
            <p className="text-xs text-white/70">Garde une expression neutre et regarde la caméra</p>
          </div>
        </div>
      </div>
    );
  }

  // ID Card guides (front and back)
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
      {/* Card frame guide */}
      <div className="relative w-full max-w-xs">
        {/* Card outline - credit card ratio 85.6 × 54 mm = ~1.586 */}
        <div 
          className={cn(
            "aspect-[1.586/1] w-full rounded-xl transition-all duration-300",
            isGoodDistance 
              ? "border-4 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]" 
              : "border-4 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.4)]"
          )}
        >
          {/* Corner guides */}
          <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl" />
          <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl" />
          <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl" />
          <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl" />
          
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <CreditCard className="w-16 h-16 text-white/30" />
          </div>
          
          {/* Side label */}
          <div className="absolute top-2 left-2 px-2 py-1 bg-white/20 rounded text-white text-xs font-medium">
            {type === 'id_front' ? 'RECTO' : 'VERSO'}
          </div>
        </div>
        
        {/* Distance indicator */}
        <div className={cn(
          "mt-4 mx-auto w-fit px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-300",
          isGoodDistance 
            ? "bg-green-500/90 text-white" 
            : "bg-yellow-500/90 text-black"
        )}>
          {isGoodDistance ? (
            <>
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Document bien cadré</span>
            </>
          ) : (
            <>
              <MoveVertical className="w-4 h-4" />
              <span className="text-sm font-medium">Ajuste le cadrage</span>
            </>
          )}
        </div>
      </div>
      
      {/* Instructions */}
      <div className="absolute bottom-24 left-4 right-4">
        <div className="bg-black/70 rounded-xl px-4 py-3 text-white">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-yellow-400" />
            <div>
              <p className="text-sm font-medium mb-1">
                {type === 'id_front' ? 'Photo du RECTO' : 'Photo du VERSO'}
              </p>
              <ul className="text-xs text-white/70 space-y-0.5">
                <li>• Place le document à plat sur une surface claire</li>
                <li>• Assure-toi que toutes les informations sont lisibles</li>
                <li>• Évite les reflets et les ombres</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaptureGuideOverlay;
