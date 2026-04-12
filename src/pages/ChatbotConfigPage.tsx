import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useMobileNavigation } from '@/hooks/useMobileNavigation';

const ChatBotConfigPage = lazy(() => import('@/components/chatbot/ChatBotConfigPage'));

const ChatbotConfigPageRoute = () => {
  const navigate = useNavigate();
  const handleBack = () => navigate('/profile', { replace: true });

  useMobileNavigation({ onBack: handleBack, enabled: true, enableSwipeBack: true });

  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'tween', duration: 0.15, ease: 'easeOut' }}
        className="min-h-screen"
      >
        <ChatBotConfigPage onBack={handleBack} />
      </motion.div>
    </Suspense>
  );
};

export default ChatbotConfigPageRoute;
