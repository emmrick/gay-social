import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { memo } from 'react';

interface MatchPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: () => void;
  myAvatar?: string | null;
  matchAvatar?: string | null;
  matchUsername: string;
}

const MatchPopup = memo(({ isOpen, onClose, onSendMessage, myAvatar, matchAvatar, matchUsername }: MatchPopupProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="relative w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center">
              {/* Animated heart */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
                className="mb-6"
              >
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-[0_0_60px_rgba(244,63,94,0.4)]">
                  <Heart className="w-10 h-10 text-white" fill="white" />
                </div>
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-black text-white mb-2 tracking-tight"
              >
                C'est un Match !
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-white/60 text-sm mb-8"
              >
                Toi et <span className="text-white font-semibold">{matchUsername}</span> vous aimez mutuellement
              </motion.p>

              {/* Avatars */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-4 mb-8"
              >
                <Avatar className="w-20 h-20 border-4 border-pink-500/50 shadow-lg">
                  <AvatarImage src={myAvatar || undefined} className="object-cover" />
                  <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">Moi</AvatarFallback>
                </Avatar>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Heart className="w-8 h-8 text-pink-500" fill="currentColor" />
                </motion.div>
                <Avatar className="w-20 h-20 border-4 border-pink-500/50 shadow-lg">
                  <AvatarImage src={matchAvatar || undefined} className="object-cover" />
                  <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
                    {matchUsername.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-3"
              >
                <Button
                  onClick={onSendMessage}
                  className="w-full h-12 rounded-2xl text-sm font-bold gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-lg shadow-pink-500/25"
                >
                  <MessageCircle className="w-4 h-4" />
                  Envoyer un message
                </Button>
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="w-full h-10 rounded-2xl text-sm text-white/50 hover:text-white/70 hover:bg-white/5"
                >
                  Continuer à swiper
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

MatchPopup.displayName = 'MatchPopup';

export default MatchPopup;
