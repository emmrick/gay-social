import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Users,
  CreditCard,
  Shield,
  Image,
  Bell,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Zap,
  Gift,
  Search,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import SEOHead from '@/components/seo/SEOHead';

interface GuideSection {
  id: string;
  icon: React.ReactNode;
  title: string;
  color: string;
  bg: string;
  emoji: string;
  steps: { title: string; description: string }[];
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'getting-started',
    icon: <Zap className="w-5 h-5" />,
    title: 'Premiers pas',
    color: 'text-primary',
    bg: 'bg-primary/10',
    emoji: '🚀',
    steps: [
      { title: 'Créer votre compte', description: 'Inscrivez-vous avec votre email et un mot de passe. Vous recevrez un email de confirmation pour activer votre compte.' },
      { title: 'Vérifier votre identité', description: 'Pour la sécurité de tous, une vérification d\'identité est requise. Prenez un selfie et une photo de votre pièce d\'identité.' },
      { title: 'Compléter votre profil', description: 'Ajoutez une photo de profil (obligatoire), votre description, votre âge, et votre région pour être visible par les autres membres.' },
      { title: 'Explorer le site', description: 'Une fois vérifié, vous avez accès à toutes les fonctionnalités : découverte, chat, swipe, et bien plus !' },
    ],
  },
  {
    id: 'navigation',
    icon: <Layers className="w-5 h-5" />,
    title: 'Navigation',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    emoji: '🧭',
    steps: [
      { title: 'La barre de navigation', description: 'En bas de l\'écran : Accueil (découverte), Chat (salons régionaux), Messages privés, Swipe, et votre Profil.' },
      { title: 'Page d\'accueil', description: 'L\'accueil affiche les membres proches, vos favoris, et les profils populaires. Votre point de départ pour explorer.' },
      { title: 'Notifications', description: 'La cloche en haut de l\'écran affiche vos notifications : nouveaux messages, réactions, mentions, et mises à jour.' },
    ],
  },
  {
    id: 'discovery',
    icon: <Search className="w-5 h-5" />,
    title: 'Découvrir des profils',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    emoji: '💫',
    steps: [
      { title: 'Swipe', description: 'Glissez vers la droite pour liker, vers la gauche pour passer. Un match mutuel ouvre la conversation !' },
      { title: 'Grille de découverte', description: 'Parcourez les profils sous forme de grille. Cliquez sur un profil pour voir ses détails et interagir.' },
      { title: 'Membres proches', description: 'Activez la géolocalisation pour voir les membres à proximité. Nécessite des crédits.' },
      { title: 'Favoris', description: 'Ajoutez des profils en favoris avec l\'étoile. Retrouvez-les depuis la page d\'accueil.' },
    ],
  },
  {
    id: 'messaging',
    icon: <MessageCircle className="w-5 h-5" />,
    title: 'Messagerie',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    emoji: '💬',
    steps: [
      { title: 'Salons de chat régionaux', description: 'Rejoignez le salon de votre région pour discuter avec les membres proches. Rejoignez aussi des groupes personnalisés.' },
      { title: 'Messages privés', description: 'Le premier message coûte des crédits, mais les suivants sont gratuits.' },
      { title: 'Médias éphémères', description: 'Photos et vidéos qui disparaissent après visionnage. Le destinataire ne peut les voir qu\'une seule fois.' },
      { title: 'Médias classiques', description: 'Photos et vidéos permanentes dans vos conversations, accessibles dans la galerie du chat.' },
      { title: 'Mentions & Réponses', description: 'Mentionnez avec @ dans un salon. Répondez en maintenant un message appuyé.' },
      { title: 'Réactions', description: 'Réagissez avec des emojis en maintenant un message appuyé.' },
    ],
  },
  {
    id: 'albums-stories',
    icon: <Image className="w-5 h-5" />,
    title: 'Albums & Stories',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    emoji: '📸',
    steps: [
      { title: 'Albums privés', description: 'Créez des albums photos privés depuis votre profil. Contrôlez qui peut les voir.' },
      { title: 'Partager un album', description: 'Partagez avec un membre spécifique, avec une durée d\'accès limitée. Révoquez à tout moment.' },
      { title: 'Stories', description: 'Publiez des stories visibles 24h par tous les membres. Montrez votre quotidien !' },
    ],
  },
  {
    id: 'credits',
    icon: <CreditCard className="w-5 h-5" />,
    title: 'Crédits',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    emoji: '💰',
    steps: [
      { title: 'À quoi servent-ils ?', description: 'Messages privés, membres proches, boost de profil, et plus de fonctionnalités premium.' },
      { title: 'Gagner gratuitement', description: 'Parrainez vos amis ! Vous recevez tous les deux des crédits quand le filleul vérifie son identité. Codes promo disponibles.' },
      { title: 'Acheter des crédits', description: 'Section Crédits de votre profil. Choisissez un pack et suivez les instructions.' },
      { title: 'Historique', description: 'Consultez vos dépenses et gains de crédits en détail.' },
    ],
  },
  {
    id: 'referral',
    icon: <Gift className="w-5 h-5" />,
    title: 'Parrainage',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    emoji: '🎁',
    steps: [
      { title: 'Votre lien unique', description: 'Accédez-y depuis la section Parrainage (profil ou page Crédits).' },
      { title: 'Inviter un ami', description: 'Partagez par WhatsApp, Instagram, Telegram… Un message privé est plus efficace !' },
      { title: 'La récompense', description: 'Inscription + vérification = crédits gratuits pour vous deux, automatiquement !' },
    ],
  },
  {
    id: 'profile',
    icon: <Users className="w-5 h-5" />,
    title: 'Votre profil',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    emoji: '👤',
    steps: [
      { title: 'Modifier', description: 'Icône d\'édition pour changer photo, description, âge, région et plus.' },
      { title: 'Galerie photos', description: 'Ajoutez plusieurs photos que les visiteurs pourront faire défiler.' },
      { title: 'ChatBot personnel', description: 'Un chatbot automatique répond aux visiteurs quand vous êtes hors ligne.' },
      { title: 'Boost de profil', description: 'Apparaissez en priorité dans les recherches et la grille de découverte.' },
    ],
  },
  {
    id: 'security',
    icon: <Shield className="w-5 h-5" />,
    title: 'Sécurité & Confidentialité',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    emoji: '🔒',
    steps: [
      { title: 'Bloquer', description: 'Bloquez depuis un profil ou une conversation. Plus de contact ni de visibilité.' },
      { title: 'Signaler', description: 'Message ou profil inapproprié ? Notre modération examine chaque signalement.' },
      { title: 'Captures d\'écran', description: 'Détection automatique sur contenus sensibles + watermark sur les médias éphémères.' },
      { title: 'Confidentialité', description: 'Gérez la visibilité de votre statut en ligne et dernière connexion.' },
      { title: 'Export RGPD', description: 'Demandez l\'export de toutes vos données personnelles depuis les paramètres.' },
    ],
  },
  {
    id: 'notifications',
    icon: <Bell className="w-5 h-5" />,
    title: 'Notifications',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    emoji: '🔔',
    steps: [
      { title: 'Push', description: 'Autorisez les push pour recevoir des alertes même hors du site.' },
      { title: 'Personnaliser', description: 'Choisissez : messages privés, groupes, mentions, réactions, annonces…' },
      { title: 'Sourdine', description: 'Mettez un salon en sourdine pour stopper ses notifications.' },
    ],
  },
  {
    id: 'support',
    icon: <BookOpen className="w-5 h-5" />,
    title: 'Aide & Support',
    color: 'text-muted-foreground',
    bg: 'bg-muted/50',
    emoji: '🆘',
    steps: [
      { title: 'FAQ', description: 'Réponses aux questions fréquentes classées par catégorie sur /aide.' },
      { title: 'Chatbot', description: 'Notre assistant intelligent cherche les réponses automatiquement.' },
      { title: 'Agent humain', description: 'Si le chatbot ne suffit pas, un agent vous répond rapidement.' },
    ],
  },
];

const GuidePage = () => {
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['getting-started']));

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <SEOHead
        title="Guide d'utilisation - Gay Connect"
        description="Apprenez à utiliser toutes les fonctionnalités de Gay Connect : profil, messagerie, swipe, crédits, sécurité et bien plus."
        canonical="https://gay-connect.fr/guide"
      />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="mx-auto max-w-2xl px-5 py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-display text-lg font-bold">Guide d'utilisation</h1>
              <p className="text-[11px] text-muted-foreground">Tout savoir sur Gay Connect</p>
            </div>
            <span className="text-2xl">📖</span>
          </div>
        </header>

        <div className="mx-auto max-w-2xl px-5 py-6 pb-28">
          {/* Intro card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 border border-primary/20 p-6 mb-8"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-8 translate-x-8" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center shadow-sm">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-base">Bienvenue sur Gay Connect ! 🎉</h2>
                  <p className="text-xs text-muted-foreground">Ce guide vous accompagne pas à pas</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Explorez toutes les fonctionnalités pour profiter pleinement de votre expérience. 
                Touchez une section pour voir les détails.
              </p>
            </div>
          </motion.div>

          {/* Section count */}
          <div className="flex items-center gap-2 mb-4 px-1">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
              {GUIDE_SECTIONS.length} sections
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Sections */}
          <div className="space-y-3">
            {GUIDE_SECTIONS.map((section, i) => {
              const isExpanded = expandedSections.has(section.id);
              return (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden"
                >
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center gap-3.5 p-4 text-left hover:bg-muted/20 transition-all active:scale-[0.99]"
                  >
                    <div className={`w-11 h-11 rounded-xl ${section.bg} flex items-center justify-center ${section.color} flex-shrink-0 shadow-sm`}>
                      {section.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{section.title}</p>
                        <span className="text-sm">{section.emoji}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {section.steps.length} étape{section.steps.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0"
                    >
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-1">
                          <div className="space-y-4">
                            {section.steps.map((step, j) => (
                              <motion.div
                                key={j}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: j * 0.05 }}
                                className="flex gap-3.5"
                              >
                                {/* Step number */}
                                <div className="flex flex-col items-center flex-shrink-0">
                                  <div className={`w-7 h-7 rounded-full ${section.bg} flex items-center justify-center`}>
                                    <span className={`text-xs font-bold ${section.color}`}>{j + 1}</span>
                                  </div>
                                  {j < section.steps.length - 1 && (
                                    <div className="w-px flex-1 bg-border mt-1.5" />
                                  )}
                                </div>
                                {/* Step content */}
                                <div className="pb-2 min-w-0">
                                  <h4 className="text-sm font-semibold mb-0.5">{step.title}</h4>
                                  <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-10 rounded-3xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50 p-6 text-center space-y-4"
          >
            <p className="text-sm font-semibold">Besoin d'aide supplémentaire ? 🤝</p>
            <p className="text-xs text-muted-foreground">Notre équipe est là pour vous accompagner</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate('/aide')}>
                <BookOpen className="w-3.5 h-3.5 mr-1.5" /> FAQ
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate('/aide/chat')}>
                <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Support
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate('/regles')}>
                <Heart className="w-3.5 h-3.5 mr-1.5" /> Règles
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default GuidePage;
