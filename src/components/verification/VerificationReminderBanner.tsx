import { useState, useEffect } from 'react';
import { Clock, Shield, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVerificationDeadline } from '@/hooks/useVerificationDeadline';
import IdentityVerificationDialog from './IdentityVerificationDialog';

const VerificationReminderBanner = () => {
  const { 
    canAccessApp, 
    isVerificationComplete, 
    isVerificationPending,
    hoursRemaining, 
    minutesRemaining,
    deadlineDate,
    isLoading 
  } = useVerificationDeadline();
  
  const [showBanner, setShowBanner] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: hoursRemaining || 0, minutes: minutesRemaining || 0 });

  // Update countdown every minute
  useEffect(() => {
    if (!deadlineDate || isVerificationComplete || isVerificationPending) return;

    const updateTime = () => {
      const now = new Date();
      const diff = deadlineDate.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0 });
        return;
      }
      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      });
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [deadlineDate, isVerificationComplete, isVerificationPending]);

  // Don't show if loading, verified, pending verification, or banner dismissed
  if (isLoading || isVerificationComplete || isVerificationPending || !showBanner || !canAccessApp) {
    return null;
  }

  // Determine urgency level
  const isUrgent = timeLeft.hours < 3;
  const isCritical = timeLeft.hours < 1;

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
            <Clock className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm truncate">
              <span className="font-medium">
                {isCritical ? '⚠️ Urgent : ' : ''}
                {String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}min
              </span>
              {' '}pour vérifier ton identité
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
