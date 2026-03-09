import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, AlertTriangle, Heart, Ban, Eye, MessageCircle, Users, Scale, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import SEOHead from '@/components/seo/SEOHead';

const RULES_SECTIONS = [
  {
    id: 'respect',
    icon: Heart,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    title: 'Respect & Bienveillance',
    rules: [
      { title: 'Traite chaque membre avec respect', desc: 'Pas d\'insultes, moqueries, humiliations, ni propos dégradants. Chacun mérite d\'être traité avec dignité.' },
      { title: 'Pas de discrimination', desc: 'Les propos racistes, sérophobes, transphobes, grossophobes ou tout autre forme de discrimination sont strictement interdits.' },
      { title: 'Accepte le "non"', desc: 'Si un membre ne souhaite pas discuter ou te rencontrer, respecte sa décision sans insister.' },
    ],
  },
  {
    id: 'harassment',
    icon: Ban,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'border-destructive/20',
    title: 'Harcèlement & Comportements interdits',
    rules: [
      { title: 'Zéro tolérance pour le harcèlement', desc: 'Messages répétés non désirés, menaces, chantage, intimidation : bannissement immédiat.' },
      { title: 'Pas de contenu illégal', desc: 'Aucun contenu impliquant des mineurs, aucune apologie de violence. Signalement aux autorités.' },
      { title: 'Pas de prostitution ni d\'escorting', desc: 'Toute transaction financière en échange de services sexuels est strictement interdite.' },
      { title: 'Pas de spam ni publicité', desc: 'Pas de messages promotionnels, liens commerciaux, ou sollicitations non souhaitées.' },
    ],
  },
  {
    id: 'identity',
    icon: Eye,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    title: 'Identité & Authenticité',
    rules: [
      { title: 'Vérification obligatoire', desc: 'Chaque membre doit vérifier son identité sous 30 jours. Les faux profils sont supprimés.' },
      { title: 'Photos authentiques', desc: 'Utilise des photos récentes et réelles de toi. Les photos volées ou trompeuses entraînent une suspension.' },
      { title: 'Informations véridiques', desc: 'Ne mens pas sur ton âge, ta localisation ou toute information de profil.' },
    ],
  },
  {
    id: 'privacy',
    icon: Shield,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    title: 'Vie privée & Sécurité',
    rules: [
      { title: 'Ne partage pas d\'infos personnelles', desc: 'Pour ta sécurité, ne communique pas ton numéro de téléphone, adresse, réseaux sociaux aux inconnus.' },
      { title: 'Captures d\'écran détectées et sanctionnées', desc: 'Les captures d\'écran de conversations privées et de médias éphémères sont automatiquement détectées. Des sanctions progressives s\'appliquent : avertissement, puis suspensions de 1h à 7 jours. Nous ne pouvons pas empêcher physiquement une capture, mais nous la détectons et sanctionnons systématiquement.' },
      { title: 'Respecte la confidentialité', desc: 'Ne diffuse jamais les photos, messages ou informations d\'un autre membre sans son consentement.' },
    ],
  },
  {
    id: 'communication',
    icon: MessageCircle,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    title: 'Communication',
    rules: [
      { title: 'Reste dans la plateforme', desc: 'Communique via Gay Connect. Nous ne pourrons pas t\'aider en cas de problème sur des canaux externes.' },
      { title: 'Signale les abus', desc: 'Si tu es témoin ou victime d\'un comportement inapproprié, signale-le immédiatement via le bouton de signalement.' },
      { title: 'Pas d\'usurpation d\'identité', desc: 'Ne te fais pas passer pour un autre membre, un modérateur ou un administrateur.' },
    ],
  },
  {
    id: 'sanctions',
    icon: Scale,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    title: 'Sanctions',
    rules: [
      { title: 'Avertissement', desc: 'Premier manquement mineur : notification d\'avertissement et rappel des règles.' },
      { title: 'Suspension temporaire', desc: 'Récidive ou manquement grave : suspension du compte de 1h à 7 jours.' },
      { title: 'Bannissement définitif', desc: 'Harcèlement, contenu illégal, prostitution : bannissement permanent sans remboursement.' },
      { title: 'Signalement aux autorités', desc: 'En cas de comportement criminel, les autorités compétentes seront immédiatement alertées.' },
    ],
  },
];

const Rules = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const sectionId = location.hash.replace('#', '');

  return (
    <>
      <SEOHead
        title="Règles de conduite - Gay Connect"
        description="Règles de conduite de la communauté Gay Connect. Respect, bienveillance et sécurité pour tous les membres."
        canonical="https://gay-connect.fr/rules"
      />
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display text-xl font-bold">Règles de conduite</h1>
              <p className="text-xs text-muted-foreground">Communauté Gay Connect</p>
            </div>
          </div>
        </header>

        <section className="bg-primary/5 border-b border-primary/10">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-start gap-4">
              <Shield className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h2 className="font-display text-lg font-bold mb-1">Notre engagement</h2>
                <p className="text-muted-foreground text-sm">
                  Gay Connect s'engage à offrir un espace sûr, respectueux et bienveillant pour tous ses membres.
                  Le non-respect de ces règles entraîne des sanctions immédiates.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
          {RULES_SECTIONS.map((section, index) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.id}
                id={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-2xl border ${section.border} ${section.bg} p-5`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl ${section.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${section.color}`} />
                  </div>
                  <h3 className="font-display font-bold text-lg">{section.title}</h3>
                </div>
                <div className="space-y-3">
                  {section.rules.map((rule, i) => (
                    <div key={i} className="bg-background/60 rounded-xl p-4">
                      <h4 className="font-semibold text-sm mb-1">{rule.title}</h4>
                      <p className="text-sm text-muted-foreground">{rule.desc}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}

          {/* Links to other legal pages */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              Documents juridiques
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Conditions Générales d\'Utilisation', path: '/legal#cgu' },
                { label: 'Politique de confidentialité (RGPD)', path: '/legal#privacy' },
                { label: 'Système de crédits & CGV', path: '/legal#cgv' },
                { label: 'Charte anti-prostitution', path: '/legal#anti-prostitution' },
                { label: 'Mentions légales', path: '/legal#mentions-legales' },
              ].map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
                >
                  <span className="text-sm font-medium">{link.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Rules;
