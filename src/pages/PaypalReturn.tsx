import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PaypalReturn = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [credits, setCredits] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setErrorMsg('Aucun identifiant de commande trouvé.');
      return;
    }

    const captureOrder = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('capture-paypal-order', {
          body: { order_id: token },
        });

        if (error) throw error;

        if (data?.already_captured) {
          setStatus('success');
          setCredits(data.credits || 0);
          return;
        }

        if (data?.success) {
          setStatus('success');
          setCredits(data.credits || 0);
        } else {
          throw new Error(data?.error || 'Échec de la capture');
        }
      } catch (err: any) {
        console.error('PayPal capture error:', err);
        setStatus('error');
        setErrorMsg(err.message || 'Une erreur est survenue');
      }
    };

    captureOrder();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-6">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <p className="text-lg font-medium">Validation du paiement en cours…</p>
            <p className="text-sm text-muted-foreground">Ne fermez pas cette page.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold">Paiement réussi !</h1>
            <p className="text-muted-foreground">
              <span className="text-xl font-bold text-foreground">{credits}</span> crédits ont été ajoutés à ton compte.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              Retour à l'accueil
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h1 className="text-2xl font-bold">Erreur de paiement</h1>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <div className="space-y-2">
              <Button onClick={() => navigate('/')} className="w-full">
                Retour à l'accueil
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
                Réessayer
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaypalReturn;
