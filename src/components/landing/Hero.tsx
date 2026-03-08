import { Button } from '@/components/ui/button';
import { 
  MessageCircle, Users, Shield, MapPin, AlertTriangle, Star, Zap, Eye, 
  Heart, Camera, Lock, ArrowRight, Sparkles, Globe, UserCheck, 
  ImageIcon, Send, ChevronDown 
} from 'lucide-react';
import { useTotalMemberCount, useOnlineMemberCount } from '@/hooks/useTotalMemberCount';
import { useNavigate, Link } from 'react-router-dom';
import SEOHead, { websiteJsonLd, organizationJsonLd, faqPageJsonLd } from '@/components/seo/SEOHead';
import React, { useEffect, useState, useRef } from 'react';
import { ProfileGridPreview, SwipeCardPreview, ChatPreview } from './AppPreviews';
import fakeProfile1 from '@/assets/fake-profile-1.jpg';
import fakeProfile2 from '@/assets/fake-profile-2.jpg';
import fakeProfile6 from '@/assets/fake-profile-6.jpg';
import { motion, useInView } from 'framer-motion';
import { useTheme } from 'next-themes';
import LandingSupportChat from './LandingSupportChat';
import logoImg from '@/assets/logo.png';

interface HeroProps {
  onGetStarted: () => void;
  onLearnMore?: () => void;
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

const FadeInWhenVisible = ({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const Hero = ({ onGetStarted, onLearnMore }: HeroProps) => {
  const { data: memberCount } = useTotalMemberCount();
  const { data: onlineCount } = useOnlineMemberCount();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const previousThemeRef = useRef(theme);
  const animatedMembers = useAnimatedNumber(memberCount || 0);
  const animatedOnline = useAnimatedNumber(onlineCount || 0, 800);

  // Force light theme on landing page
  useEffect(() => {
    previousThemeRef.current = theme;
    if (theme !== 'light') {
      setTheme('light');
    }
    return () => {
      // Restore previous theme when leaving landing page
      if (previousThemeRef.current && previousThemeRef.current !== 'light') {
        setTheme(previousThemeRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const seoFaqs = [
    { question: 'Comment fonctionne Gay Connect ?', answer: 'Gay Connect est un site de rencontre gay gratuit qui permet aux hommes de se rencontrer par département. Créez votre profil, rejoignez le chat de votre région et échangez avec des hommes près de chez vous.' },
    { question: 'Gay Connect est-il gratuit ?', answer: "Oui, l'inscription et l'accès au chat de groupe sont gratuits. Des fonctionnalités premium comme le boost de profil sont disponibles avec des crédits." },
    { question: 'Le site est-il sécurisé ?', answer: 'Oui, nous vérifions l\'identité des membres, détectons les captures d\'écran et modérons activement la plateforme. Vos données restent confidentielles.' },
    { question: 'Comment trouver un plan cul gay près de chez moi ?', answer: 'Rejoignez le chat de votre département pour rencontrer des hommes gay de votre région. Utilisez la fonction de proximité pour voir les membres les plus proches.' },
    { question: 'Peut-on envoyer des photos et vidéos ?', answer: 'Oui, Gay Connect permet l\'envoi de photos et vidéos éphémères qui disparaissent après consultation, ainsi que des médias classiques dans les conversations privées.' },
    { question: 'Quelle est la différence avec Grindr ?', answer: 'Gay Connect est un site français centré sur la communauté locale par département, avec des chats de groupe, la vérification d\'identité, et une protection anti-capture d\'écran unique.' },
  ];

  const combinedJsonLd = { ...websiteJsonLd, ...organizationJsonLd };

  const features = [
    {
      icon: <MapPin className="w-7 h-7" />,
      title: '101 départements',
      description: 'Des salons de discussion dédiés pour chaque département français. Trouve des mecs près de chez toi instantanément.',
      color: 'from-blue-500/20 to-cyan-500/20',
      iconBg: 'bg-blue-500/15 text-blue-500 dark:text-blue-400',
    },
    {
      icon: <Camera className="w-7 h-7" />,
      title: 'Médias éphémères',
      description: 'Envoie des photos et vidéos qui disparaissent après consultation. Style Snapchat, avec protection anti-screenshot.',
      color: 'from-purple-500/20 to-pink-500/20',
      iconBg: 'bg-purple-500/15 text-purple-500 dark:text-purple-400',
    },
    {
      icon: <Shield className="w-7 h-7" />,
      title: 'Profils vérifiés',
      description: 'Vérification d\'identité obligatoire. Fini les faux profils et les arnaques. Communauté 100% authentique.',
      color: 'from-green-500/20 to-emerald-500/20',
      iconBg: 'bg-green-500/15 text-green-500 dark:text-green-400',
    },
    {
      icon: <Lock className="w-7 h-7" />,
      title: 'Anti-screenshot',
      description: 'Technologie exclusive de détection de captures d\'écran. Tes photos privées restent privées.',
      color: 'from-orange-500/20 to-amber-500/20',
      iconBg: 'bg-orange-500/15 text-orange-500 dark:text-orange-400',
    },
    {
      icon: <Heart className="w-7 h-7" />,
      title: 'Swipe & Match',
      description: 'Fais défiler les profils et matche avec ceux qui te plaisent. Système de compatibilité intelligent.',
      color: 'from-rose-500/20 to-red-500/20',
      iconBg: 'bg-rose-500/15 text-rose-500 dark:text-rose-400',
    },
    {
      icon: <Users className="w-7 h-7" />,
      title: 'Groupes privés',
      description: 'Crée ou rejoins des groupes thématiques. Discussions entre bears, twinks, sportifs, gamers…',
      color: 'from-indigo-500/20 to-violet-500/20',
      iconBg: 'bg-indigo-500/15 text-indigo-500 dark:text-indigo-400',
    },
  ];

  const howItWorks = [
    { step: '01', title: 'Crée ton profil', description: 'Inscription gratuite en 30 secondes. Ajoute tes photos et tes préférences.', icon: <UserCheck className="w-6 h-6" /> },
    { step: '02', title: 'Explore ta région', description: 'Rejoins le chat de ton département et découvre les membres près de chez toi.', icon: <Globe className="w-6 h-6" /> },
    { step: '03', title: 'Échange en privé', description: 'Envoie des messages, photos et vidéos éphémères en toute discrétion.', icon: <Send className="w-6 h-6" /> },
    { step: '04', title: 'Rencontre IRL', description: 'Passe du virtuel au réel. Rendez-vous dans ta ville avec des mecs vérifiés.', icon: <Heart className="w-6 h-6" /> },
  ];

  return (
    <section className="relative flex flex-col overflow-hidden">
      <SEOHead
        title="Gay Connect - Site de Rencontre Gay, Sexe Gay & Tchat Gay France"
        description="Gay Connect : le site gay n°1 pour les rencontres et le sexe entre hommes en France. Tchat gay gratuit, plan cul gay par département, échanges de photos et vidéos. Communauté vérifiée. +18 ans."
        canonical="https://gay-connect.lovable.app/"
        keywords="site gay, rencontre gay, sexe gay, plan cul gay, tchat gay, chat gay, plan gay, drague gay, annonce gay, homme cherche homme, hookup gay, sexfriend gay, gay paris, gay lyon, gay marseille, gay toulouse, gay bordeaux, gay nantes, gay lille, rencontre sexe gay, plan cul homme, site plan cul gay, appli gay, application rencontre gay, mec gay, gay actif, gay passif, gay versatile, bear gay, twink, daddy gay, ours gay"
        jsonLd={combinedJsonLd}
      />

      {/* Top bar with branding */}
      <div className="bg-background/95 backdrop-blur-lg border-b border-border/50 py-3 px-5 relative z-20">
        <div className="container mx-auto flex items-center gap-2.5">
          <img src={logoImg} alt="Gay Connect" className="h-9 w-9" />
          <h1 className="font-display text-2xl font-extrabold rainbow-text leading-tight">
            Gay Connect
          </h1>
        </div>
      </div>

      {/* 18+ Warning Banner */}
      <div className="bg-destructive/90 text-destructive-foreground py-2.5 px-4 text-center relative z-20">
        <div className="container mx-auto flex items-center justify-center gap-2 flex-wrap">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="font-semibold text-xs sm:text-sm">
            Site réservé aux adultes (+18 ans) • Hommes uniquement
          </span>
          <Link to="/legal" className="underline hover:no-underline text-xs ml-1">
            Mentions légales
          </Link>
        </div>
      </div>

      {/* ===== HERO SECTION ===== */}
      <div className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--accent)/0.1),transparent_70%)]" />
          <motion.div 
            className="absolute top-20 -left-20 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-primary/20 blur-[100px]"
            animate={{ y: [0, -30, 0], x: [0, 15, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div 
            className="absolute bottom-20 -right-20 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-accent/20 blur-[100px]"
            animate={{ y: [0, 20, 0], x: [0, -15, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        </div>

        <div className="container relative z-10 px-4 py-12 sm:py-20">
          <div className="max-w-4xl mx-auto text-center">
            {/* Live badge */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-card/80 backdrop-blur-md border border-border/50 shadow-lg mb-8"
            >
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
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
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-display text-4xl sm:text-5xl md:text-7xl font-bold mb-6 leading-[1.1] tracking-tight"
            >
              La communauté gay
              <br />
              <span className="rainbow-text">qui te ressemble</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              Rencontres, discussions de groupe, médias éphémères — le tout dans un espace{' '}
              <span className="text-foreground font-semibold">sécurisé et vérifié</span>.
            </motion.p>

            {/* Trust signals */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-10"
            >
              {[
                { icon: <Shield className="w-4 h-4" />, text: 'Profils vérifiés' },
                { icon: <Eye className="w-4 h-4" />, text: 'Médias éphémères' },
                { icon: <Lock className="w-4 h-4" />, text: 'Anti-screenshot' },
                { icon: <Zap className="w-4 h-4" />, text: '100% gratuit' },
              ].map((item, i) => (
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
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-3 justify-center mb-10"
            >
              <Button variant="hero" size="xl" onClick={onGetStarted} className="group">
                <Sparkles className="w-5 h-5" />
                Rejoindre maintenant
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button variant="outline" size="xl" onClick={() => navigate('/regions')}>
                <MapPin className="w-5 h-5" />
                Explorer les régions
              </Button>
            </motion.div>

            {/* Social proof */}
            {(memberCount ?? 0) > 0 && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
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
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="w-6 h-6 text-muted-foreground/50" />
        </motion.div>
      </div>

      {/* ===== APP SHOWCASE SECTION ===== */}
      <div className="relative z-10 py-20 sm:py-28 bg-gradient-to-b from-background to-secondary/20 overflow-hidden">
        <div className="container mx-auto px-4 max-w-6xl">
          <FadeInWhenVisible className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
              <Eye className="w-4 h-4" />
              Aperçu
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Découvre l'expérience
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Un aperçu de ce qui t'attend sur Gay Connect. Des profils réels, des conversations authentiques.
            </p>
          </FadeInWhenVisible>

          {/* Showcase cards - realistic app previews */}
          <div className="grid md:grid-cols-3 gap-8 items-start">
            {/* Profiles grid */}
            <FadeInWhenVisible delay={0}>
              <div className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <ProfileGridPreview />
                  <div className="p-4 text-center">
                    <h3 className="font-display font-bold text-foreground mb-1">Explore les profils</h3>
                    <p className="text-xs text-muted-foreground">Des milliers de membres vérifiés t'attendent dans ton département.</p>
                  </div>
                </div>
              </div>
            </FadeInWhenVisible>

            {/* Swipe card */}
            <FadeInWhenVisible delay={0.15}>
              <div className="relative group md:-mt-6">
                <div className="absolute -inset-2 bg-gradient-to-br from-rose-500/20 to-pink-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <SwipeCardPreview />
                  <div className="p-4 text-center">
                    <h3 className="font-display font-bold text-foreground mb-1">Swipe & Match</h3>
                    <p className="text-xs text-muted-foreground">Fais défiler les profils et connecte-toi avec ceux qui te plaisent.</p>
                  </div>
                </div>
              </div>
            </FadeInWhenVisible>

            {/* Chat */}
            <FadeInWhenVisible delay={0.3}>
              <div className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <ChatPreview />
                  <div className="p-4 text-center">
                    <h3 className="font-display font-bold text-foreground mb-1">Chats privés</h3>
                    <p className="text-xs text-muted-foreground">Messages, photos éphémères et médias en toute discrétion.</p>
                  </div>
                </div>
              </div>
            </FadeInWhenVisible>
          </div>

        </div>
      </div>

      {/* ===== FEATURES SECTION ===== */}
      <div className="relative z-10 py-20 sm:py-28 bg-secondary/20">
        <div className="container mx-auto px-4 max-w-6xl">
          <FadeInWhenVisible className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
              <Sparkles className="w-4 h-4" />
              Fonctionnalités
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Tout ce qu'il te faut
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Des outils conçus pour la communauté, par la communauté. Sécurité, discrétion et plaisir.
            </p>
          </FadeInWhenVisible>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <FadeInWhenVisible key={i} delay={i * 0.08}>
                <div className="group relative h-full bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl ${feature.iconBg} mb-4 transition-transform group-hover:scale-110`}>
                    {feature.icon}
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </FadeInWhenVisible>
            ))}
          </div>
        </div>
      </div>

      {/* ===== HOW IT WORKS ===== */}
      <div className="relative z-10 py-20 sm:py-28">
        <div className="container mx-auto px-4 max-w-5xl">
          <FadeInWhenVisible className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-4">
              <Zap className="w-4 h-4" />
              Comment ça marche
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              En 4 étapes simples
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              De l'inscription à la rencontre, tout est fluide.
            </p>
          </FadeInWhenVisible>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((item, i) => (
              <FadeInWhenVisible key={i} delay={i * 0.1}>
                <div className="relative text-center group">
                  {/* Connector line */}
                  {i < 3 && (
                    <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-border to-transparent" />
                  )}
                  <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-border/50 mb-5 group-hover:border-primary/30 transition-colors">
                    <span className="text-primary">{item.icon}</span>
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-lg">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </FadeInWhenVisible>
            ))}
          </div>

          {/* CTA after steps */}
          <FadeInWhenVisible delay={0.4} className="text-center mt-14">
            <Button variant="hero" size="xl" onClick={onGetStarted} className="group">
              Commencer gratuitement
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </FadeInWhenVisible>
        </div>
      </div>

      {/* ===== STATS SECTION ===== */}
      <div className="relative z-10 py-16 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-y border-border/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <FadeInWhenVisible>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { value: '101', label: 'Départements', suffix: '' },
                { value: animatedMembers > 0 ? animatedMembers.toLocaleString('fr-FR') : '...', label: 'Membres inscrits', suffix: '' },
                { value: '0', label: 'Publicité', suffix: '' },
                { value: '100', label: 'Gratuit', suffix: '%' },
              ].map((stat, i) => (
                <div key={i} className="space-y-1">
                  <p className="font-display text-3xl sm:text-4xl font-bold text-primary">
                    {stat.value}{stat.suffix}
                  </p>
                  <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </FadeInWhenVisible>
        </div>
      </div>

      {/* ===== ZERO ADS SECTION ===== */}
      <div className="relative z-10 py-16 sm:py-20">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <FadeInWhenVisible>
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-5 py-2 rounded-full text-sm font-bold mb-5">
              🚫 Zéro publicité. Pour toujours.
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Pas de pub, pas de bullshit
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Notre site est construit sur des bases solides et <span className="font-semibold text-foreground">sans aucune publicité</span>. 
              La seule économie du site repose sur les <span className="font-semibold text-foreground">crédits</span>, rechargeables de plusieurs façons.
            </p>
            <p className="text-sm text-muted-foreground">
              Consultez la <Link to="/about" className="text-primary hover:underline font-semibold">FAQ dédiée</Link> pour comprendre les crédits.
            </p>
          </FadeInWhenVisible>
        </div>
      </div>

      {/* ===== SEO CONTENT ===== */}
      <div className="relative z-10 bg-secondary/20 border-t border-border/30">
        <div className="container mx-auto px-4 py-16 sm:py-20 max-w-5xl">
          <FadeInWhenVisible className="text-center mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Le meilleur site de rencontre gay en France
            </h2>
          </FadeInWhenVisible>
          <div className="grid md:grid-cols-2 gap-8 text-sm text-muted-foreground leading-relaxed">
            <FadeInWhenVisible delay={0.1}>
              <div className="space-y-4">
                <h3 className="font-display text-lg font-semibold text-foreground">Rencontres gay & sexe gay par département</h3>
                <p>
                  Gay Connect est le <strong>site de rencontre gay</strong> et de <strong>sexe entre hommes</strong> n°1 en France. 
                  Que tu cherches un <strong>plan cul gay</strong>, une <strong>rencontre gay sérieuse</strong> ou simplement 
                  un <strong>tchat gay gratuit</strong>, notre plateforme te connecte avec des milliers d'hommes dans les 
                  <strong> 101 départements français</strong>.
                </p>
                <p>
                  Contrairement aux autres sites comme Grindr ou Scruff, Gay Connect est 100% français et organisé 
                  par région. Trouve des <strong>mecs gay près de chez toi</strong> : <strong>gay Paris</strong>, <strong>gay Lyon</strong>, 
                  <strong> gay Marseille</strong>, <strong>gay Toulouse</strong>, <strong>gay Bordeaux</strong> et partout en France !
                </p>
              </div>
            </FadeInWhenVisible>
            <FadeInWhenVisible delay={0.2}>
              <div className="space-y-4">
                <h3 className="font-display text-lg font-semibold text-foreground">Plan cul gay sécurisé & discret</h3>
                <p>
                  Sur Gay Connect, ta <strong>vie privée</strong> est notre priorité. Tous les profils sont 
                  <strong> vérifiés par pièce d'identité</strong>, les <strong>médias éphémères</strong> disparaissent après 
                  consultation, et notre technologie <strong>anti-capture d'écran</strong> protège tes photos et vidéos.
                </p>
                <p>
                  Que tu sois <strong>gay actif</strong>, <strong>gay passif</strong> ou <strong>versatile</strong>, 
                  <strong> bear</strong>, <strong>twink</strong>, <strong>daddy</strong> ou <strong>muscle</strong>, 
                  tu trouveras des profils qui correspondent à tes envies. <strong>Inscription gratuite</strong> et immédiate !
                </p>
              </div>
            </FadeInWhenVisible>
          </div>
        </div>
      </div>

      {/* ===== FAQ SECTION ===== */}
      <div className="relative z-10 py-16 sm:py-20 border-t border-border/30">
        <div className="container mx-auto px-4 max-w-3xl">
          <FadeInWhenVisible className="text-center mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Questions fréquentes
            </h2>
          </FadeInWhenVisible>
          <div className="space-y-3">
            {seoFaqs.map((faq, i) => (
              <FadeInWhenVisible key={i} delay={i * 0.05}>
                <details className="group bg-card/80 backdrop-blur-sm rounded-xl border border-border/50 overflow-hidden hover:border-primary/20 transition-colors">
                  <summary className="px-5 py-4 cursor-pointer font-medium text-foreground hover:text-primary transition-colors list-none flex items-center justify-between gap-4">
                    <span className="text-sm sm:text-base">{faq.question}</span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </div>
                </details>
              </FadeInWhenVisible>
            ))}
          </div>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd(seoFaqs)) }}
          />
        </div>
      </div>

      {/* ===== FINAL CTA ===== */}
      <div className="relative z-10 py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08),transparent_70%)]" />
        <FadeInWhenVisible className="container mx-auto px-4 max-w-3xl text-center relative z-10">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-5">
            Prêt à rejoindre la
            <span className="rainbow-text block mt-1">communauté ?</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
            Inscription gratuite, profils vérifiés, zéro pub. Qu'est-ce que tu attends ?
          </p>
          <Button variant="hero" size="xl" onClick={onGetStarted} className="group">
            <Sparkles className="w-5 h-5" />
            C'est parti !
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </FadeInWhenVisible>
      </div>

      {/* ===== FOOTER ===== */}
      <footer className="relative z-20 py-8 border-t border-border/30 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
            <span>© 2025 Gay Connect</span>
            <span className="hidden md:inline">•</span>
            <Link to="/legal" className="hover:text-primary transition-colors">Mentions légales & CGU</Link>
            <span className="hidden md:inline">•</span>
            <Link to="/about" className="hover:text-primary transition-colors">À propos</Link>
            <span className="hidden md:inline">•</span>
            <Link to="/regions" className="hover:text-primary transition-colors">Toutes les régions</Link>
            <span className="hidden md:inline">•</span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Réservé aux +18 ans
            </span>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground/60">
            <Link to="/region/75-paris" className="hover:text-primary transition-colors">Gay Paris</Link>
            <Link to="/region/69-rhone" className="hover:text-primary transition-colors">Gay Lyon</Link>
            <Link to="/region/13-bouches-du-rhone" className="hover:text-primary transition-colors">Gay Marseille</Link>
            <Link to="/region/31-haute-garonne" className="hover:text-primary transition-colors">Gay Toulouse</Link>
            <Link to="/region/33-gironde" className="hover:text-primary transition-colors">Gay Bordeaux</Link>
            <Link to="/region/44-loire-atlantique" className="hover:text-primary transition-colors">Gay Nantes</Link>
            <Link to="/region/59-nord" className="hover:text-primary transition-colors">Gay Lille</Link>
            <Link to="/region/67-bas-rhin" className="hover:text-primary transition-colors">Gay Strasbourg</Link>
            <Link to="/region/34-herault" className="hover:text-primary transition-colors">Gay Montpellier</Link>
            <Link to="/region/06-alpes-maritimes" className="hover:text-primary transition-colors">Gay Nice</Link>
          </div>
        </div>
      </footer>

      {/* Floating support chat widget */}
      <LandingSupportChat />
    </section>
  );
};

export default Hero;
