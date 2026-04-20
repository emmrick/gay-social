import { lazy, Suspense, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const PrivateChatRoom = lazy(() => import('@/components/chat/PrivateChatRoom'));

const PrivateChatPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { openSnap?: boolean } | null;
  const [snapOpened, setSnapOpened] = useState(false);

  // NB: pas de useMobileNavigation ici — c'est PrivateChatRoom (enfant) qui le gère.
  // Doublonner créerait deux sentinelles d'historique et casserait le bouton retour.
  const handleBack = () => navigate('/messages', { replace: true });

  if (!userId) return null;

  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'tween', duration: 0.15, ease: 'easeOut' }}
        className="min-h-screen"
      >
        <PrivateChatRoom
          otherUserId={userId}
          onBack={handleBack}
          autoOpenSnap={!snapOpened && !!state?.openSnap}
          onSnapOpened={() => setSnapOpened(true)}
        />
      </motion.div>
    </Suspense>
  );
};

export default PrivateChatPage;
