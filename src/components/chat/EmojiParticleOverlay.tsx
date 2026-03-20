import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Emoji category mapping ─── */
type EmojiCategory = 'hearts' | 'birthday' | 'fire' | 'stars' | 'sad' | 'laugh' | 'snow' | 'clap' | 'kiss' | null;

const EMOJI_MAP: Record<string, EmojiCategory> = {
  '❤️': 'hearts', '🧡': 'hearts', '💛': 'hearts', '💚': 'hearts',
  '💙': 'hearts', '💜': 'hearts', '🩷': 'hearts', '🖤': 'hearts',
  '🤍': 'hearts', '💕': 'hearts', '💞': 'hearts', '💓': 'hearts',
  '💗': 'hearts', '💖': 'hearts', '💘': 'hearts', '😍': 'hearts',
  '🥰': 'hearts', '😘': 'hearts',
  '🥳': 'birthday', '🎊': 'birthday', '🎉': 'birthday', '🎂': 'birthday',
  '🎈': 'birthday', '🎁': 'birthday', '🪅': 'birthday', '🎆': 'birthday',
  '🔥': 'fire', '🌶️': 'fire', '💥': 'fire', '☄️': 'fire',
  '⭐': 'stars', '🌟': 'stars', '✨': 'stars', '💫': 'stars', '🤩': 'stars',
  '😢': 'sad', '😭': 'sad', '🥺': 'sad', '💔': 'sad', '😿': 'sad',
  '😂': 'laugh', '🤣': 'laugh', '😆': 'laugh', '💀': 'laugh',
  '❄️': 'snow', '⛄': 'snow', '🥶': 'snow', '🌨️': 'snow',
  '👏': 'clap', '🙌': 'clap', '👍': 'clap', '💪': 'clap',
  '💋': 'kiss', '😽': 'kiss', '💌': 'kiss',
};

/* ─── Particle pool per category ─── */
const PARTICLE_EMOJIS: Record<string, string[]> = {
  hearts: ['❤️', '💕', '💖', '💗', '💓', '💞'],
  birthday: ['🎉', '🎊', '🎈', '🎂', '✨', '🪅', '🎁'],
  fire: ['🔥', '💥', '☄️', '✨'],
  stars: ['⭐', '✨', '🌟', '💫'],
  sad: ['💧', '😢', '💔'],
  laugh: ['😂', '🤣', '😆', '💀'],
  snow: ['❄️', '❄️', '✨', '⛄'],
  clap: ['👏', '✨', '⭐', '💫'],
  kiss: ['💋', '💕', '💌', '✨'],
};

/* ─── Sound synthesis (Web Audio API — no external files) ─── */
function playTone(category: EmojiCategory) {
  if (!category) return;
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    if (category === 'hearts' || category === 'kiss') {
      // Soft ascending chime
      [523, 659, 784].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.15, now + i * 0.12 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.45);
      });
    } else if (category === 'birthday') {
      // Fanfare burst
      [392, 523, 659, 784, 1047].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.12, now + i * 0.08 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.55);
      });
    } else if (category === 'fire') {
      // Deep rumble
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.5);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.55);
    } else if (category === 'sad') {
      // Descending tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.6);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.65);
    } else if (category === 'laugh') {
      // Quick bouncy notes
      [440, 520, 440, 520, 660].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + i * 0.07);
        gain.gain.linearRampToValueAtTime(0.1, now + i * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.15);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.2);
      });
    } else {
      // Default sparkle
      [880, 1100, 1320].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.08, now + i * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.35);
      });
    }

    setTimeout(() => ctx.close(), 2000);
  } catch {
    // Audio not available, silently skip
  }
}

/* ─── Particle type ─── */
interface Particle {
  id: number;
  emoji: string;
  x: number;       // vw start
  delay: number;
  duration: number;
  size: number;
  rotate: number;
  swayX: number;
}

function makeParticles(category: EmojiCategory, count = 24): Particle[] {
  if (!category) return [];
  const pool = PARTICLE_EMOJIS[category] || ['✨'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    emoji: pool[Math.floor(Math.random() * pool.length)],
    x: Math.random() * 100,
    delay: Math.random() * 0.6,
    duration: 1.8 + Math.random() * 1.2,
    size: 16 + Math.random() * 18,
    rotate: Math.random() * 360,
    swayX: (Math.random() - 0.5) * 60,
  }));
}

/* ─── Detect category from content ─── */
function getGraphemes(str: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const seg = new (Intl as any).Segmenter('fr', { granularity: 'grapheme' });
    return [...seg.segment(str)].map((s: any) => s.segment);
  }
  return [...str];
}

export function detectEmojiCategory(content: string): EmojiCategory {
  const graphemes = getGraphemes(content.trim());
  for (const g of graphemes) {
    if (EMOJI_MAP[g]) return EMOJI_MAP[g];
  }
  return null;
}

/* ─── Background tint per category ─── */
const BG_TINT: Partial<Record<string, string>> = {
  hearts: 'from-red-500/5 to-pink-500/5',
  birthday: 'from-yellow-400/8 to-purple-400/5',
  fire: 'from-orange-500/6 to-red-600/4',
  snow: 'from-sky-200/8 to-blue-300/5',
};

/* ─── Main component ─── */
interface EmojiParticleOverlayProps {
  content: string;
  triggerId: string; // unique key per message to avoid re-triggering
}

const EmojiParticleOverlay = ({ content, triggerId }: EmojiParticleOverlayProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [category, setCategory] = useState<EmojiCategory>(null);
  const triggered = useRef<Set<string>>(new Set());

  const trigger = useCallback(() => {
    const cat = detectEmojiCategory(content);
    if (!cat) return;
    if (triggered.current.has(triggerId)) return;
    triggered.current.add(triggerId);

    setCategory(cat);
    setParticles(makeParticles(cat));
    playTone(cat);

    // Cleanup after animation
    setTimeout(() => {
      setParticles([]);
      setCategory(null);
    }, 3500);
  }, [content, triggerId]);

  useEffect(() => {
    trigger();
  }, [trigger]);

  if (particles.length === 0) return null;

  const bgClass = category ? BG_TINT[category] : '';

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {/* Optional background tint */}
      {bgClass && (
        <motion.div
          className={`absolute inset-0 bg-gradient-to-b ${bgClass}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        />
      )}

      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute select-none"
            style={{
              left: `${p.x}%`,
              fontSize: p.size,
              top: -40,
            }}
            initial={{ y: -40, x: 0, rotate: p.rotate, opacity: 1 }}
            animate={{
              y: '110vh',
              x: p.swayX,
              rotate: p.rotate + 180,
              opacity: [1, 1, 0.8, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {p.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default EmojiParticleOverlay;
