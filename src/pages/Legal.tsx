import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, AlertTriangle, Scale, Search, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Accordion } from '@/components/ui/accordion';
import { useAuth } from '@/contexts/AuthContext';
import DataExportDialog from '@/components/profile/DataExportDialog';
import SEOHead from '@/components/seo/SEOHead';
import {
  CGUSection,
  PrivacySection,
  CookiesSection,
  DataRetentionSection,
  PurgePolicySection,
  AntiProstitutionSection,
  CGVSection,
  RulesSection,
  ProtectionSection,
  MentionsLegalesSection,
} from '@/components/legal/sections';

// Define searchable sections (used for filtering + accordion default values)
const LEGAL_SECTIONS = [
  { id: 'cgu', title: "Conditions Générales d'Utilisation (CGU)", keywords: ['cgu', 'conditions', 'utilisation', 'accès', 'inscription', 'vérification', 'identité', 'responsabilité', 'sanctions'] },
  { id: 'privacy', title: 'Politique de confidentialité (RGPD)', keywords: ['rgpd', 'confidentialité', 'données', 'protection', 'cookies', 'droits', 'accès', 'rectification', 'effacement', 'portabilité', 'télécharger'] },
  { id: 'cookies', title: 'Politique de cookies', keywords: ['cookies', 'traceurs', 'localStorage', 'session', 'consentement', 'préférences'] },
  { id: 'data-retention', title: 'Politique de conservation & suppression des données', keywords: ['conservation', 'rétention', 'suppression', 'durée', 'automatique', 'nettoyage', '2 ans', '5 ans', '90 jours', 'purge', 'inactivité'] },
  { id: 'purge-policy', title: 'Suppression des comptes non vérifiés (30 jours)', keywords: ['suppression', 'purge', '30 jours', 'non vérifié', 'destruction', 'données', 'compte', 'automatique', 'vérification'] },
  { id: 'anti-prostitution', title: 'Clause anti-prostitution', keywords: ['prostitution', 'escorting', 'paiement', 'argent', 'interdit', 'banni'] },
  { id: 'cgv', title: 'Système de crédits & CGV', keywords: ['crédits', 'paiement', 'achat', 'prix', 'tarif', 'remboursement', 'cgv', 'premium', 'monétisation'] },
  { id: 'rules', title: 'Règlement du site', keywords: ['règlement', 'règles', 'interdit', 'comportement', 'sanctions', 'signalement', 'harcèlement', 'spam'] },
  { id: 'protection', title: 'Protection des utilisateurs', keywords: ['protection', 'sécurité', 'chiffrement', 'modération', 'capture', 'écran', 'éphémère'] },
  { id: 'mentions-legales', title: 'Mentions légales - Éditeur & Développeur', keywords: ['mentions', 'légales', 'éditeur', 'développeur', 'bayart', 'emmrick', 'auto-entrepreneur', 'adresse', 'contact', 'hébergeur'] },
];

const Legal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter sections based on search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return LEGAL_SECTIONS.map(s => s.id);
    const query = searchQuery.toLowerCase();
    return LEGAL_SECTIONS
      .filter(section =>
        section.title.toLowerCase().includes(query) ||
        section.keywords.some(keyword => keyword.includes(query))
      )
      .map(s => s.id);
  }, [searchQuery]);

  // Auto-open section based on hash
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (!hash) return;
    const element = document.getElementById(hash);
    if (!element) return;
    const t = window.setTimeout(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => window.clearTimeout(t);
  }, [location.hash]);

  const visible = (id: string) => filteredSections.includes(id);

  return (
    <>
      <SEOHead
        title="Mentions légales & CGU - Gay Social"
        description="Conditions générales d'utilisation, politique de confidentialité RGPD, et mentions légales de Gay Social. Site réservé aux +18 ans."
        canonical="https://gaysocial.fr/legal"
      />
      <DataExportDialog open={showExportDialog} onOpenChange={setShowExportDialog} />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-display text-xl font-bold">Mentions légales</h1>
          </div>
        </header>

        {/* Warning Banner */}
        <section className="bg-destructive/10 border-b border-destructive/20">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-8 h-8 text-destructive flex-shrink-0 mt-1" />
              <div>
                <h2 className="font-display text-xl font-bold text-destructive mb-2">
                  Site réservé aux adultes (+18 ans)
                </h2>
                <p className="text-muted-foreground">
                  L'accès à Gay Social est strictement réservé aux personnes majeures (18 ans et plus)
                  et exclusivement aux hommes. Une vérification d'identité est requise lors de l'inscription.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div id="legal" className="mb-6">
            <h2 className="text-2xl font-display font-bold flex items-center gap-3">
              <Scale className="w-6 h-6 text-primary" />
              Cadre juridique
            </h2>
            <p className="text-muted-foreground mt-1">
              Consultez l'ensemble des documents légaux régissant l'utilisation de GaySocial.
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher dans la FAQ (ex: crédits, RGPD, inscription...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-12 h-12 text-base rounded-xl bg-card border-border"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            {searchQuery && (
              <p className="text-sm text-muted-foreground mt-2">
                {filteredSections.length} résultat{filteredSections.length > 1 ? 's' : ''} trouvé{filteredSections.length > 1 ? 's' : ''}
              </p>
            )}
          </div>

          {searchQuery && filteredSections.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <Search className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">Aucun résultat trouvé</p>
              <p className="text-muted-foreground text-sm mt-1">
                Essayez avec d'autres mots-clés
              </p>
            </motion.div>
          )}

          <Accordion
            type="multiple"
            defaultValue={searchQuery ? filteredSections : []}
            className="space-y-4"
          >
            {visible('cgu') && <CGUSection />}
            {visible('privacy') && (
              <PrivacySection
                isAuthenticated={!!user}
                onExportData={() => setShowExportDialog(true)}
              />
            )}
            {visible('cookies') && <CookiesSection />}
            {visible('data-retention') && <DataRetentionSection />}
            {visible('purge-policy') && <PurgePolicySection />}
            {visible('anti-prostitution') && <AntiProstitutionSection />}
            {visible('cgv') && <CGVSection />}
            {visible('rules') && <RulesSection />}
            {visible('protection') && <ProtectionSection />}
            {visible('mentions-legales') && <MentionsLegalesSection />}
          </Accordion>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 text-center"
          >
            <p className="text-sm text-muted-foreground mb-2">
              Dernière mise à jour : Mars 2026
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Pour toute question, contactez-nous via la messagerie de l'application ou à pipaselfie@gmail.com.
            </p>
            <Button variant="outline" onClick={() => navigate('/')}>
              Retour à l'accueil
            </Button>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default Legal;
