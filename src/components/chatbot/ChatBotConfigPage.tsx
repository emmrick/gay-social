import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChatBotConfigSection from './ChatBotConfigSection';
import { motion } from 'framer-motion';

interface ChatBotConfigPageProps {
  onBack: () => void;
}

const ChatBotConfigPage = ({ onBack }: ChatBotConfigPageProps) => {
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold">ChatBot Personnel</h1>
      </div>

      {/* Content */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="px-4 pt-4"
      >
        <ChatBotConfigSection />
      </motion.div>
    </div>
  );
};

export default ChatBotConfigPage;
