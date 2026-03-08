import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Users,
  CreditCard,
  Shield,
  Sparkles,
  Camera,
  Image,
  Eye,
  Bell,
  Settings,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Zap,
  Gift,
  Star,
  Lock,
  Flag,
  UserX,
  Search,
  MapPin,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import SEOHead from '@/components/seo/SEOHead';

interface GuideSection {
  id: string;
  icon: React.ReactNode;
  title: string;
  color: string;
  bg: string;
  steps: { title: string; description: string }[];
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'getting-started',
    icon: <Zap className="w-5 h-5" />,
    title: 'Premiers pas',
    color: 'text-primary',
    bg: 'bg-primary/10',
    steps: [
      {
        title: 'Créer votre compte',
        description: 'Inscrivez-vous avec votre email et un mot de passe. Vous recevrez un email de confirmation pour activer votre compte.',
      },
      {
        title: 'Vérifier votre identité',
        description: 'Pour la sécurité de tous, une vérification d\'identité est requise. Prenez un selfie et une photo de votre pièce d\'identité. Votre vérification sera traitée rapidement.',
      },
      {
        title: 'Compléter votre profil',
        description: 'Ajoutez une photo de profil (obligatoire), votre description, votre âge, et votre région pour être visible par les autres membres.',
      },
      {
        title: 'Explorer le site',
        description: 'Une fois vérifié, vous avez accès à toutes les fonctionnalités : découverte, chat, swipe, et bien plus !',
      },
    ],
  },
  {
    id: 'navigation',
    icon: <Layers className="w-5 h-5" />,
    title: 'Navigation',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    steps: [
      {
        title: 'La barre de navigation',
        description: 'En bas de l\'écran, vous trouverez les onglets principaux : Accueil (découverte), Chat (salons régionaux), Messages privés, Swipe, et votre Profil.',
      },
      {
        title: 'Page d\'accueil',
        description: 'L\'accueil affiche les membres proches de vous, vos favoris, et les profils populaires. C\'est votre point de départ pour découvrir la communauté.',
      },
      {
        title: 'Notifications',
        description: 'La cloche en haut de l\'écran affiche vos notifications : nouveaux messages, réactions, mentions, et mises à jour importantes.',
      },
    ],
  },
  {
    id: 'discovery',
    icon: <Search className="w-5 h-5" />,
    title: 'Découvrir des profils',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    steps: [
      {
        title: 'Swipe',
        description: 'Glissez les profils vers la droite pour liker, vers la gauche pour passer. Si vous vous likez mutuellement, c\'est un match ! Vous pourrez alors discuter en privé.',
      },
      {
        title: 'Grille de découverte',
        description: 'Parcourez les profils sous forme de grille sur la page d\'accueil. Cliquez sur un profil pour voir ses détails, ses photos et interagir.',
      },
      {
        title: 'Membres proches',
        description: 'Si vous activez la géolocalisation, vous verrez les membres à proximité. Cette fonctionnalité nécessite des crédits pour être débloquée.',
      },
      {
        title: 'Favoris',
        description: 'Ajoutez des profils en favoris en cliquant sur l\'étoile. Retrouvez-les facilement depuis la page d\'accueil.',
      },
    ],
  },
  {
    id: 'messaging',
    icon: <MessageCircle className="w-5 h-5" />,
    title: 'Messagerie',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    steps: [
      {
        title: 'Salons de chat régionaux',
        description: 'Rejoignez le salon de votre région pour discuter avec les membres proches de chez vous. Vous pouvez aussi rejoindre des groupes personnalisés.',
      },
      {
        title: 'Messages privés',
        description: 'Envoyez des messages privés aux membres. L\'envoi du premier message coûte des crédits, mais les messages suivants sont gratuits.',
      },
      {
        title: 'Médias éphémères',
        description: 'Envoyez des photos et vidéos qui disparaissent après visionnage. Le destinataire ne peut les voir qu\'une seule fois.',
      },
      {
        title: 'Médias classiques',
        description: 'Partagez des photos et vidéos permanentes dans vos conversations. Elles restent accessibles dans la galerie du chat.',
      },
      {
        title: 'Mentions & Réponses',
        description: 'Mentionnez un membre avec @ dans un salon de chat. Répondez directement à un message en le maintenant appuyé.',
      },
      {
        title: 'Réactions',
        description: 'Réagissez aux messages avec des emojis en maintenant un message appuyé, puis en choisissant une réaction.',
      },
    ],
  },
  {
    id: 'albums-stories',
    icon: <Image className="w-5 h-5" />,
    title: 'Albums & Stories',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    steps: [
      {
        title: 'Créer un album privé',
        description: 'Depuis votre profil, créez des albums photos privés. Vous contrôlez qui peut les voir en les partageant individuellement.',
      },
      {
        title: 'Partager un album',
        description: 'Partagez un album avec un membre spécifique. Vous pouvez définir une durée d\'accès limitée. Révoquez l\'accès à tout moment.',
      },
      {
        title: 'Stories',
        description: 'Publiez des stories visibles par tous les membres pendant 24h. C\'est un excellent moyen de montrer votre quotidien !',
      },
    ],
  },
  {
    id: 'credits',
    icon: <CreditCard className="w-5 h-5" />,
    title: 'Système de crédits',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    steps: [
      {
        title: 'À quoi servent les crédits ?',
        description: 'Les crédits permettent d\'envoyer des messages privés, débloquer des fonctionnalités premium comme les membres proches, booster votre profil, et plus encore.',
      },
      {
        title: 'Gagner des crédits gratuitement',
        description: 'Parrainez vos amis pour gagner des crédits ! Vous et votre filleul recevez des crédits quand il vérifie son identité. Utilisez aussi les codes promo des flyers.',
      },
      {
        title: 'Acheter des crédits',
        description: 'Rendez-vous dans la section Crédits de votre profil. Choisissez un pack et suivez les instructions de paiement.',
      },
      {
        title: 'Historique',
        description: 'Consultez votre historique de transactions pour voir vos dépenses et gains de crédits détaillés.',
      },
    ],
  },
  {
    id: 'referral',
    icon: <Gift className="w-5 h-5" />,
    title: 'Parrainage',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    steps: [
      {
        title: 'Trouver votre lien',
        description: 'Accédez à votre lien de parrainage unique depuis la section Parrainage (accessible via votre profil ou la page Crédits).',
      },
      {
        title: 'Inviter un ami',
        description: 'Partagez votre lien par WhatsApp, Instagram, Telegram ou tout autre moyen. Envoyez-le en message privé pour un meilleur résultat.',
      },
      {
        title: 'Recevoir la récompense',
        description: 'Quand votre ami s\'inscrit via votre lien ET vérifie son identité, vous recevez tous les deux des crédits gratuits automatiquement !',
      },
    ],
  },
  {
    id: 'profile',
    icon: <Users className="w-5 h-5" />,
    title: 'Gérer votre profil',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    steps: [
      {
        title: 'Modifier votre profil',
        description: 'Cliquez sur l\'icône d\'édition sur votre profil pour changer votre photo, description, âge, région et autres informations.',
      },
      {
        title: 'Galerie photos',
        description: 'Ajoutez jusqu\'à plusieurs photos à votre galerie de profil. Les visiteurs pourront les faire défiler sur votre profil.',
      },
      {
        title: 'ChatBot personnel',
        description: 'Configurez un chatbot automatique pour répondre aux visiteurs de votre profil quand vous n\'êtes pas en ligne.',
      },
      {
        title: 'Boost de profil',
        description: 'Boostez votre profil pour apparaître en priorité dans les recherches et la grille de découverte pendant une durée limitée.',
      },
    ],
  },
  {
    id: 'security',
    icon: <Shield className="w-5 h-5" />,
    title: 'Sécurité & Confidentialité',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    steps: [
      {
        title: 'Bloquer un membre',
        description: 'Bloquez un utilisateur depuis son profil ou une conversation. Il ne pourra plus vous contacter ni voir votre profil.',
      },
      {
        title: 'Signaler un comportement',
        description: 'Signaler un message ou un profil inapproprié. Notre équipe de modération examinera chaque signalement et prendra les mesures nécessaires.',
      },
      {
        title: 'Protection des captures d\'écran',
        description: 'Le site détecte les captures d\'écran sur les contenus sensibles. Les médias éphémères sont protégés par un système de watermark.',
      },
      {
        title: 'Paramètres de confidentialité',
        description: 'Depuis les paramètres de votre profil, gérez qui peut voir votre statut en ligne, votre dernière connexion et d\'autres informations.',
      },
      {
        title: 'Exporter vos données',
        description: 'Conformément au RGPD, vous pouvez demander l\'export complet de vos données personnelles depuis les paramètres.',
      },
    ],
  },
  {
    id: 'notifications',
    icon: <Bell className="w-5 h-5" />,
    title: 'Notifications',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    steps: [
      {
        title: 'Activer les notifications push',
        description: 'Autorisez les notifications push pour recevoir des alertes même quand le site est fermé : nouveaux messages, matchs, mentions, etc.',
      },
      {
        title: 'Personnaliser vos notifications',
        description: 'Dans les paramètres, choisissez quelles notifications vous souhaitez recevoir : messages privés, groupes, mentions, réactions, annonces...',
      },
      {
        title: 'Mettre un salon en sourdine',
        description: 'Si un salon est trop actif, mettez-le en sourdine pour ne plus recevoir de notifications tout en gardant l\'accès.',
      },
    ],
  },
  {
    id: 'support',
    icon: <BookOpen className="w-5 h-5" />,
    title: 'Aide & Support',
    color: 'text-muted-foreground',
    bg: 'bg-muted/50',
    steps: [
      {
        title: 'Centre d\'aide',
        description: 'Consultez notre FAQ complète sur /aide pour trouver des réponses aux questions les plus fréquentes, classées par catégorie.',
      },
      {
        title: 'Chatbot d\'assistance',
        description: 'Sur /aide/chat, notre chatbot intelligent cherche les réponses dans notre base de connaissances. S\'il ne trouve pas, il vous met en relation avec un agent.',
      },
      {
        title: 'Contacter le support',
        description: 'Si le chatbot ne peut pas vous aider, demandez à être mis en relation avec un agent humain. Le support répond généralement dans les minutes qui suivent.',
      },
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
        canonical="https://gay-connect.lovable.app/guide"
      />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display text-xl font-bold">Guide d'utilisation</h1>
              <p className="text-xs text-muted-foreground">Tout savoir sur Gay Connect</p>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-6 max-w-3xl pb-24">
          {/* Intro */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/20 mb-6"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-base">Bienvenue sur Gay Connect !</h2>
                <p className="text-xs text-muted-foreground">Ce guide vous accompagne pas à pas</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Découvrez toutes les fonctionnalités du site pour profiter pleinement de votre expérience. 
              Cliquez sur chaque section pour voir les détails.
            </p>
          </motion.div>

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
                  className="rounded-2xl border border-border bg-card overflow-hidden"
                >
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-xl ${section.bg} flex items-center justify-center ${section.color} flex-shrink-0`}>
                      {section.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{section.title}</p>
                      <p className="text-xs text-muted-foreground">{section.steps.length} étape{section.steps.length > 1 ? 's' : ''}</p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="px-4 pb-4"
                    >
                      <div className="space-y-3 ml-2 border-l-2 border-border pl-4">
                        {section.steps.map((step, j) => (
                          <div key={j} className="relative">
                            <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-background border-2 border-primary" />
                            <h4 className="text-sm font-medium">{step.title}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.description}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Quick links footer */}
          <div className="mt-8 p-4 rounded-2xl bg-muted/30 border border-border text-center space-y-3">
            <p className="text-sm font-medium">Besoin d'aide supplémentaire ?</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/aide')}>
                <BookOpen className="w-4 h-4 mr-1" /> FAQ
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/aide/chat')}>
                <MessageCircle className="w-4 h-4 mr-1" /> Support
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/regles')}>
                <Heart className="w-4 h-4 mr-1" /> Règles
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GuidePage;
