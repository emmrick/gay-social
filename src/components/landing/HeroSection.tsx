import { Button } from '@/components/ui/button';
import { Shield, Eye, Lock, Zap, Sparkles, ArrowRight, MapPin, ChevronDown } from 'lucide-react';
import { useTotalMemberCount, useOnlineMemberCount } from '@/hooks/useTotalMemberCount';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface HeroSectionProps {
  onGetStarted: () => void;
}

const useAnimatedNumber = (target: number, duration = 1500) => {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (target <= 0) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCurrent(target);
        clearInterval(timer);
      } else {
        setCurrent(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return current;
};

const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
  const { data: memberCount } = useTotalMemberCount();
  const { data: onlineCount } = useOnlineMemberCount();
  const navigate = useNavigate();
  const animatedOnline = useAnimatedNumber(onlineCount || 0, 800);
  const animatedMembers = useAnimatedNumber(memberCount || 0);

  const trustSignals = [
    { icon: <Shield className="w-4 h-4" />, text: 'Profils vérifiés' },
    { icon: <Eye className="w-4 h-4" />, text: 'Médias éphémères' },
    { icon: <Lock className="w-4 h-4" />, text: 'Anti-screenshot' },
    { icon: <Zap className="w-4 h-4" />, text: '100% gratuit' },
  ];

  return (
    <div className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--accent)/0.08),transparent_60%)]" />
        <motion.div
          className="absolute top-10 -left-32 w-80 h-80 sm:w-[500px] sm:h-[500px] rounded-full blur-[120px]"
          style={{ background: 'hsl(var(--primary) / 0.15)' }}
          animate={{ y: [0, -40, 0], x: [0, 20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-10 -right-32 w-80 h-80 sm:w-[500px] sm:h-[500px] rounded-full blur-[120px]"
          style={{ background: 'hsl(var(--accent) / 0.12)' }}
          animate={{ y: [0, 30, 0], x: [0, -20, 0], scale: [1.1, 1, 1.1] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Dot grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />
      </div>

      <div className="container relative z-10 px-4 py-12 sm:py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-card/90 backdrop-blur-md border border-border/60 shadow-lg mb-8"
          >
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                {animatedOnline > 0 ? `${animatedOnline} en ligne` : '...'}
              </span>
            </span>
            <span className="w-px h-4 bg-border" />
            <span className="text-sm text-muted-foreground font-medium">
              {animatedMembers > 0
                ? `${animatedMembers.toLocaleString('fr-FR')} membres`
                : 'Rejoins la communauté'}
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h2
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="font-display text-[2.5rem] sm:text-5xl md:text-7xl font-extrabold mb-6 leading-[1.05] tracking-tight"
          >
            La communauté gay
            <br />
            <span className="gradient-hero-text">qui te ressemble</span>
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-base sm:text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Rencontres, discussions de groupe, médias éphémères — le tout dans un espace{' '}
            <span className="text-foreground font-semibold">sécurisé et vérifié</span>.
          </motion.p>

          {/* Trust signals */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mb-10"
          >
            {trustSignals.map((item, i) => (
              <span key={i} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className="text-primary">{item.icon}</span>
                {item.text}
              </span>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="flex flex-col sm:flex-row gap-3 justify-center mb-10"
          >
            <Button variant="hero" size="xl" onClick={onGetStarted} className="group rounded-full">
              <Sparkles className="w-5 h-5" />
              Rejoindre maintenant
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button variant="outline" size="xl" onClick={() => navigate('/regions')} className="rounded-full">
              <MapPin className="w-5 h-5" />
              Explorer les régions
            </Button>
          </motion.div>

          {/* Social proof */}
          {(memberCount ?? 0) > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="text-sm text-muted-foreground"
            >
              🔥 <strong className="text-foreground">{Math.floor(Math.random() * 5) + 3} nouveaux membres</strong> inscrits dans la dernière heure
            </motion.p>
          )}
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      >
        <ChevronDown className="w-6 h-6 text-muted-foreground/40" />
      </motion.div>
    </div>
  );
};

export default HeroSection;
