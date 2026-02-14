import { useState, useEffect } from 'react';
import { Clock, Shield, X, AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVerificationDeadline } from '@/hooks/useVerificationDeadline';
import IdentityVerificationDialog from './IdentityVerificationDialog';

const VerificationReminderBanner = () => {
  const { 
    canAccessApp, 
    isVerificationComplete, 
    isVerificationPending,
    daysUntilPurge,
    isLoading 
  } = useVerificationDeadline();
  
  const [showBanner, setShowBanner] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  // Don't show if loading, verified, pending verification, or banner dismissed
  if (isLoading || isVerificationComplete || isVerificationPending || !showBanner || !canAccessApp) {
    return null;
  }

  if (daysUntilPurge === null || daysUntilPurge < 0) return null;

  // Determine urgency level
  const isCritical = daysUntilPurge <= 3;
  const isUrgent = daysUntilPurge <= 7;

  return (
    <>
      <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 ${
        isCritical 
          ? 'bg-destructive text-destructive-foreground' 
          : isUrgent 
            ? 'bg-yellow-500 text-yellow-950' 
            : 'bg-primary text-primary-foreground'
      }`}>
        <div className="max-w-screen-lg mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isCritical ? <Trash2 className="w-4 h-4 flex-shrink-0" /> : <Clock className="w-4 h-4 flex-shrink-0" />}
            <p className="text-sm truncate">
              <span className="font-bold">
                {isCritical ? '🚨 ' : '⏰ '}
                {daysUntilPurge} jour{daysUntilPurge > 1 ? 's' : ''}
              </span>
              {' '}avant suppression définitive de ton compte
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button 
              size="sm" 
              variant={isCritical ? "secondary" : "outline"}
              className={`h-7 text-xs ${!isCritical && 'bg-transparent border-current text-current hover:bg-white/20'}`}
              onClick={() => setShowDialog(true)}
            >
              <Shield className="w-3 h-3 mr-1" />
              Vérifier
            </Button>
            <button 
              onClick={() => setShowBanner(false)}
              className="p-1 hover:bg-white/20 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Spacer to prevent content from going under banner */}
      <div className="h-10" />

      <IdentityVerificationDialog 
        open={showDialog} 
        onOpenChange={setShowDialog}
      />
    </>
  );
};

export default VerificationReminderBanner;