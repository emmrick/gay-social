import { motion } from 'framer-motion';

/** Bulle "Henry est en train d'écrire…" — trois points qui rebondissent. */
const HenryTypingBubble = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
      className="flex justify-start"
    >
      <div className="bg-muted text-foreground rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5 shadow-sm">
        <span
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
          style={{ animationDelay: '0ms', animationDuration: '900ms' }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
          style={{ animationDelay: '150ms', animationDuration: '900ms' }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
          style={{ animationDelay: '300ms', animationDuration: '900ms' }}
        />
      </div>
    </motion.div>
  );
};

export default HenryTypingBubble;
