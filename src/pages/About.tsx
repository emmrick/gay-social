import { Button } from '@/components/ui/button';
import { 
  Shield, 
  MessageCircle, 
  Users, 
  MapPin, 
  Eye, 
  Lock, 
  Heart, 
  Camera,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEOHead from '@/components/seo/SEOHead';

const About = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <MapPin className="w-8 h-8" />,
      title: "Discussions par région",
      description: "Rejoins des salons de discussion organisés par département. Rencontre des personnes près de chez toi et crée des liens avec ta communauté locale."
    },
    {
      icon: <MessageCircle className="w-8 h-8" />,
      title: "Messages privés",
      description: "Échange en toute confidentialité avec d'autres membres. Nos conversations sont sécurisées et respectent ta vie privée."
    },
    {
      icon: <Camera className="w-8 h-8" />,
      title: "Médias éphémères",
      description: "Partage des photos et vidéos qui disparaissent après consultation, comme sur Snapchat. Garde le contrôle sur ton contenu."
    },
    {
      icon: <Eye className="w-8 h-8" />,
      title: "Protection anti-capture",
      description: "Notre technologie détecte les tentatives de capture d'écran et suspend automatiquement les comptes qui violent la vie privée des autres."
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Profils détaillés",
      description: "Crée un profil complet avec tes préférences, ce que tu recherches, et trouve des personnes compatibles avec tes attentes."
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Espace safe",
      description: "Modération active, signalement des comportements inappropriés, et communauté bienveillante. Ici, tu es en sécurité."
    }
  ];

  const values = [
    {
      icon: <Heart className="w-6 h-6" />,
      title: "Respect",
      description: "Chaque membre est traité avec dignité"
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: "Confidentialité",
      description: "Tes données restent privées"
    },
    {
      icon: <CheckCircle2 className="w-6 h-6" />,
      title: "Authenticité",
      description: "Sois toi-même, sans jugement"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="À propos de Gay Social - Site de Rencontre Gay & Sexe Gay Sécurisé"
        description="Gay Social : le site de rencontre gay et de sexe entre hommes n°1 en France. Espace safe, profils vérifiés, médias éphémères et modération active. Plan cul gay sécurisé."
        canonical="https://gaysocial.fr/about"
        keywords="site gay, rencontre gay, sexe gay, communauté gay france, plan cul gay sécurisé, tchat gay, espace safe gay, gay social avis"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: 'À propos de Gay Social - Rencontre Gay & Sexe Gay',
          description: 'Gay Social : site de rencontre gay et de sexe entre hommes sécurisé en France. Profils vérifiés, médias éphémères, anti-capture d\'écran.',
          url: 'https://gaysocial.fr/about',
        }}
      />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-xl font-bold">À propos</h1>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-primary/20 via-transparent to-transparent" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/20 rounded-full blur-[128px]" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="font-display text-4xl md:text-6xl font-bold mb-6">
              Un espace <span className="gradient-text">safe</span> pour la communauté
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Gay Social est né d'un besoin simple : créer un lieu de rencontre respectueux, 
              sécurisé et bienveillant pour la communauté gay en France.
            </p>
            <Button variant="hero" size="xl" onClick={() => navigate('/auth')}>
              <Users className="w-5 h-5" />
              Rejoindre la communauté
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <h3 className="font-display text-2xl font-bold text-center mb-12">Nos valeurs</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-card rounded-2xl p-6 text-center"
              >
                <div className="w-14 h-14 mx-auto rounded-full bg-primary/20 flex items-center justify-center text-primary mb-4">
                  {value.icon}
                </div>
                <h4 className="font-display font-semibold text-lg mb-2">{value.title}</h4>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h3 className="font-display text-3xl font-bold text-center mb-4">
            Tout ce dont tu as besoin
          </h3>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
            Une application pensée pour toi, avec des fonctionnalités qui respectent ta vie privée.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-card rounded-2xl p-6 hover:border-primary/50 transition-colors"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white mb-4">
                  {feature.icon}
                </div>
                <h4 className="font-display font-semibold text-lg mb-2">{feature.title}</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Shield className="w-16 h-16 mx-auto text-primary mb-6" />
            <h3 className="font-display text-3xl font-bold mb-4">Ta vie privée, notre priorité</h3>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Nous ne vendons jamais tes données. Tes messages sont privés. 
              Les médias éphémères sont vraiment supprimés après consultation. 
              Et notre système anti-capture protège ton contenu contre les screenshots non autorisés.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Données chiffrées
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Pas de revente
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Suppression réelle
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto text-center glass-card rounded-3xl p-8 md:p-12"
          >
            <h3 className="font-display text-3xl font-bold mb-4">
              Prêt à nous rejoindre ?
            </h3>
            <p className="text-muted-foreground mb-8">
              Inscris-toi gratuitement et commence à échanger avec des milliers de membres.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="xl" onClick={() => navigate('/auth')}>
                Créer mon compte
              </Button>
              <Button variant="outline" size="xl" onClick={() => navigate('/')}>
                Retour à l'accueil
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p className="mb-2">© 2025 Gay Social. Tous droits réservés.</p>
          <Button 
            variant="link" 
            className="text-muted-foreground hover:text-primary"
            onClick={() => navigate('/legal')}
          >
            Mentions légales & CGU
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default About;
