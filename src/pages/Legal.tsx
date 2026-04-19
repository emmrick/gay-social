import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Shield, AlertTriangle, FileText, Lock, Users, CreditCard, Ban, Scale, Mail, Download, Search, X, Trash2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAuth } from '@/contexts/AuthContext';
import DataExportDialog from '@/components/profile/DataExportDialog';
import SEOHead from '@/components/seo/SEOHead';


// Define searchable sections
const LEGAL_SECTIONS = [
  { id: 'cgu', title: 'Conditions Générales d\'Utilisation (CGU)', keywords: ['cgu', 'conditions', 'utilisation', 'accès', 'inscription', 'vérification', 'identité', 'responsabilité', 'sanctions'] },
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

  // Le Consent Manager InMobi est désormais chargé globalement depuis index.html

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
    if (hash) {
      const element = document.getElementById(hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [location.hash]);

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
        {/* Section Title */}
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

        {/* No results message */}
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

        <Accordion type="multiple" defaultValue={searchQuery ? filteredSections : []} className="space-y-4">
          
          {/* CGU Section */}
          {filteredSections.includes('cgu') && (
          <AccordionItem id="cgu" value="cgu" className="glass-card rounded-2xl px-6 border-border bg-card">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <span className="font-display font-semibold text-lg">Conditions Générales d'Utilisation (CGU)</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pt-4">
              <div>
                <h4 className="font-semibold text-foreground mb-2">1. Objet</h4>
                <p>
                  Les présentes Conditions Générales d'Utilisation régissent l'accès et l'utilisation 
                  de la plateforme Gay Social, un service de mise en relation pour adultes majeurs 
                  de sexe masculin.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-foreground mb-2">2. Conditions d'accès</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Être âgé d'au moins 18 ans</li>
                  <li>Être de sexe masculin</li>
                  <li>Fournir une pièce d'identité valide pour vérification</li>
                  <li>Accepter les présentes CGU et la politique de confidentialité</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">3. Vérification d'identité</h4>
                <p>
                  Chaque utilisateur doit soumettre une pièce d'identité valide lors de son inscription. 
                  Cette vérification permet de confirmer l'âge et l'identité de l'utilisateur. 
                  <strong className="text-foreground"> Toutes les données d'identification sont définitivement 
                  supprimées après validation du compte.</strong>
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">4. Responsabilités de l'utilisateur</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Respecter les autres membres et leur dignité</li>
                  <li>Ne pas partager de contenus illégaux</li>
                  <li>Ne pas usurper l'identité d'autrui</li>
                  <li>Signaler tout comportement suspect ou abusif</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">5. Sanctions</h4>
                <p>
                  Tout manquement aux présentes CGU peut entraîner la suspension temporaire ou 
                  définitive du compte, sans préavis ni remboursement.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
          )}

          {/* Privacy Policy Section */}
          {filteredSections.includes('privacy') && (
          <AccordionItem id="privacy" value="privacy" className="glass-card rounded-2xl px-6 border-border bg-card">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <span className="font-display font-semibold text-lg">Politique de confidentialité (RGPD)</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pt-4">
              <div>
                <h4 className="font-semibold text-foreground mb-2">1. Responsable du traitement</h4>
                <p>
                  Le responsable du traitement des données est BAYART Emmrick, auto-entrepreneur, 
                  domicilié au 61 Rue de Lion, 75012 Paris, France (SIRET : 977 861 665 00015).
                  Contact : <a href="mailto:pipaselfie@gmail.com" className="text-primary hover:underline">pipaselfie@gmail.com</a>.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">2. Données collectées</h4>
                <p>Nous collectons les catégories de données suivantes :</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li><strong>Données d'identification</strong> : pseudo, âge, région, adresse email</li>
                  <li><strong>Données de vérification</strong> : pièce d'identité et selfie (conservés max 72h, voir section dédiée)</li>
                  <li><strong>Données de profil</strong> : photos, bio, préférences</li>
                  <li><strong>Données de localisation</strong> : latitude/longitude (optionnel, avec consentement explicite)</li>
                  <li><strong>Contenus échangés</strong> : messages texte, photos, vidéos, médias éphémères, messages vocaux</li>
                  <li><strong>Données financières</strong> : historique de crédits, transactions, achats</li>
                  <li><strong>Données techniques</strong> : adresse IP, user agent, horodatages de connexion, statut en ligne</li>
                  <li><strong>Données de modération</strong> : signalements, infractions, sanctions, captures d'écran détectées</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">3. Finalités du traitement</h4>
                <p>Vos données sont traitées pour les finalités suivantes :</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li><strong>Fonctionnement du service</strong> : mise en relation, messagerie, partage de contenus</li>
                  <li><strong>Sécurité</strong> : vérification d'identité, détection des comportements abusifs, modération des contenus</li>
                  <li><strong>Modération & infractions</strong> : en cas d'infraction, l'historique des conversations et médias est analysé par nos modérateurs pour garantir la sécurité de la communauté</li>
                  <li><strong>Anti-fraude</strong> : détection des faux profils, captures d'écran, comportements suspects</li>
                  <li><strong>Obligations légales</strong> : réponse aux réquisitions judiciaires, conservation légale</li>
                  <li><strong>Amélioration du service</strong> : statistiques anonymisées d'utilisation</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">4. Base légale du traitement</h4>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li><strong>Exécution du contrat</strong> (art. 6.1.b RGPD) : fonctionnalités du service, système de crédits</li>
                  <li><strong>Intérêt légitime</strong> (art. 6.1.f RGPD) : sécurité de la plateforme, modération, anti-fraude</li>
                  <li><strong>Consentement</strong> (art. 6.1.a RGPD) : géolocalisation, notifications push</li>
                  <li><strong>Obligation légale</strong> (art. 6.1.c RGPD) : vérification de majorité, coopération judiciaire</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">5. Protection des données</h4>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Chiffrement</strong> : toutes les données sont chiffrées en transit (TLS/HTTPS) 
                    et au repos sur nos serveurs sécurisés.
                  </li>
                  <li>
                    <strong>Médias privés</strong> : tous les médias (photos, vidéos, albums) sont stockés 
                    dans des espaces privés et accessibles uniquement via des URLs temporaires signées.
                  </li>
                  <li>
                    <strong>Médias éphémères</strong> : les contenus éphémères sont définitivement supprimés 
                    après consultation par le destinataire.
                  </li>
                  <li>
                    <strong>Aucune vente de données</strong> : nous ne vendons, ne louons et ne partageons 
                    jamais vos données personnelles avec des tiers à des fins commerciales.
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">6. Sous-traitants</h4>
                <p>
                  Nos données sont hébergées sur des serveurs Lovable Cloud (infrastructure Supabase), 
                  conformes aux normes de sécurité européennes. Aucun autre sous-traitant n'a accès 
                  à vos données personnelles.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">7. Vos droits (RGPD)</h4>
                <p>Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants :</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li><strong>Droit d'accès</strong> (art. 15) : consulter l'ensemble de vos données personnelles</li>
                  <li><strong>Droit de rectification</strong> (art. 16) : corriger vos données inexactes</li>
                  <li><strong>Droit à l'effacement</strong> (art. 17) : supprimer votre compte et toutes vos données</li>
                  <li><strong>Droit à la portabilité</strong> (art. 20) : télécharger vos données au format structuré (ZIP/JSON)</li>
                  <li><strong>Droit d'opposition</strong> (art. 21) : vous opposer au traitement de vos données</li>
                  <li><strong>Droit à la limitation</strong> (art. 18) : demander la limitation du traitement</li>
                </ul>
                <p className="mt-2 text-sm">
                  Pour exercer vos droits, contactez-nous à <a href="mailto:pipaselfie@gmail.com" className="text-primary hover:underline">pipaselfie@gmail.com</a> ou 
                  via le support intégré à l'application. Délai de réponse : 30 jours maximum.
                </p>
              </div>

              <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  8. Documents d'identité - Rétention limitée (72h)
                </h4>
                <p className="text-sm mb-3">
                  Conformément au principe de minimisation des données du RGPD, nous appliquons une politique 
                  stricte de conservation des documents d'identité :
                </p>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  <li>
                    <strong>Délai maximum de 72 heures</strong> : Vos documents (selfie, pièce d'identité) 
                    sont conservés uniquement pendant le temps nécessaire à la vérification.
                  </li>
                  <li>
                    <strong>Suppression automatique après validation</strong> : Dès que votre identité est 
                    approuvée ou refusée, vos documents sont immédiatement et définitivement supprimés.
                  </li>
                  <li>
                    <strong>Suppression automatique après 72h</strong> : Si la vérification n'a pas été 
                    traitée dans les 72 heures, une tâche automatique supprime vos documents.
                  </li>
                  <li>
                    <strong>Aucune conservation</strong> : Seul le statut de vérification (vérifié/non vérifié) 
                    est conservé. Vos documents d'identité ne sont jamais archivés.
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">9. Transparence sur la modération</h4>
                <p className="mb-2">
                  En cas d'infraction détectée ou de signalement, nous nous réservons le droit de :
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Consulter l'historique des conversations et médias échangés de l'utilisateur concerné</li>
                  <li>Analyser le profil et les comportements de l'utilisateur via nos outils de modération</li>
                  <li>Conserver les preuves nécessaires à l'enquête interne ou à une éventuelle procédure judiciaire</li>
                </ul>
                <p className="mt-2 text-sm">
                  L'utilisateur en infraction est notifié par une mention « Infraction en cours » sur son compte. 
                  Ces données sont accessibles uniquement aux modérateurs et administrateurs autorisés.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">10. Réclamation</h4>
                <p>
                  Si vous estimez que le traitement de vos données ne respecte pas la réglementation, 
                  vous pouvez introduire une réclamation auprès de la <strong>CNIL</strong> (Commission Nationale 
                  de l'Informatique et des Libertés) : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.cnil.fr</a>.
                </p>
              </div>

              {/* Data Export Button */}
              {user && (
                <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
                  <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Download className="w-4 h-4 text-primary" />
                    Télécharger mes données
                  </h4>
                  <p className="text-sm mb-3">
                    Conformément à l'article 20 du RGPD (droit à la portabilité), vous pouvez 
                    télécharger l'ensemble de vos données personnelles dans une archive ZIP contenant 
                    vos données structurées (JSON) et tous vos médias.
                  </p>
                  <Button 
                    onClick={() => setShowExportDialog(true)}
                    className="bg-gradient-to-r from-primary to-primary/80"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger mes données
                  </Button>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
          )}

          {/* Cookies Policy Section */}
          {filteredSections.includes('cookies') && (
          <AccordionItem id="cookies" value="cookies" className="glass-card rounded-2xl px-6 border-border bg-card">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <span className="font-display font-semibold text-lg">Politique de cookies</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pt-4">
              <div>
                <h4 className="font-semibold text-foreground mb-2">1. Qu'est-ce qu'un cookie ?</h4>
                <p>
                  Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, smartphone, tablette) 
                  lors de votre visite sur un site web. Il permet au site de mémoriser certaines informations 
                  pour faciliter votre navigation.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">2. Cookies utilisés par Gay Social</h4>
                <p className="mb-3">
                  Gay Social utilise <strong className="text-foreground">uniquement des cookies techniques 
                  et fonctionnels</strong>. Nous n'utilisons <strong className="text-foreground">aucun cookie publicitaire, 
                  aucun traceur tiers, ni aucun outil de profilage marketing</strong>.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-4 font-semibold text-foreground">Cookie / Stockage</th>
                        <th className="text-left py-2 pr-4 font-semibold text-foreground">Finalité</th>
                        <th className="text-left py-2 font-semibold text-foreground">Durée</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4 font-mono text-xs">sb-*-auth-token</td>
                        <td className="py-2 pr-4">Session d'authentification</td>
                        <td className="py-2">Session / 7 jours</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4 font-mono text-xs">gc_cookie_consent</td>
                        <td className="py-2 pr-4">Mémorisation du choix cookies</td>
                        <td className="py-2">1 an</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4 font-mono text-xs">gc_age_confirmed</td>
                        <td className="py-2 pr-4">Confirmation de majorité</td>
                        <td className="py-2">Session</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4 font-mono text-xs">theme</td>
                        <td className="py-2 pr-4">Préférence thème clair/sombre</td>
                        <td className="py-2">Persistant</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4 font-mono text-xs">localStorage divers</td>
                        <td className="py-2 pr-4">Préférences de navigation, PWA, onboarding</td>
                        <td className="py-2">Persistant</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">3. Catégories de cookies</h4>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Cookies essentiels</strong> (obligatoires) : nécessaires au fonctionnement du site 
                    (authentification, sécurité, session). Ne peuvent pas être désactivés.
                  </li>
                  <li>
                    <strong>Cookies de préférences</strong> (optionnels) : mémorisent vos choix de personnalisation 
                    (thème, langue, dernière page visitée).
                  </li>
                  <li>
                    <strong>Cookies de statistiques anonymes</strong> (optionnels) : nous permettent d'améliorer 
                    le service en comptabilisant les visites de manière anonyme. Aucune donnée n'est transmise à des tiers.
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">4. Cookies tiers</h4>
                <p>
                  <strong className="text-foreground">Gay Social n'utilise aucun cookie tiers.</strong> Nous 
                  n'intégrons aucun outil de tracking externe (pas de Google Analytics, Facebook Pixel, 
                  ni aucun réseau publicitaire). Votre activité sur notre site n'est jamais partagée avec 
                  des annonceurs ou des réseaux sociaux.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">5. Gestion de vos préférences</h4>
                <p>
                  Vous pouvez modifier vos préférences de cookies à tout moment en supprimant vos données 
                  de navigation dans les paramètres de votre navigateur ou en effaçant le stockage local du site.
                </p>
                <p className="mt-2 text-sm">
                  <strong>Important :</strong> La désactivation des cookies essentiels empêchera le fonctionnement 
                  normal du site (connexion, navigation).
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">6. Base légale</h4>
                <p>
                  Conformément à l'article 82 de la loi Informatique et Libertés et à la directive ePrivacy 
                  (2002/58/CE), les cookies strictement nécessaires sont exemptés de consentement. 
                  Pour les cookies non essentiels, votre consentement est recueilli via notre bandeau cookies 
                  lors de votre première visite.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
          )}

          {/* Data Retention Policy */}
          {filteredSections.includes('data-retention') && (
          <AccordionItem id="data-retention" value="data-retention" className="glass-card rounded-2xl px-6 border-border bg-card">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-amber-500" />
                </div>
                <span className="font-display font-semibold text-lg">Politique de conservation & suppression des données</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pt-4">
              <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  🔒 Transparence totale — Gay Social applique une politique stricte de conservation 
                  limitée des données, conformément au principe de minimisation du RGPD (art. 5.1.e).
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">1. Durée maximale de conservation</h4>
                <p className="mb-3">
                  Nous ne conservons aucune donnée personnelle au-delà de <strong className="text-foreground">2 ans</strong>. 
                  Passé ce délai, les données sont automatiquement et définitivement supprimées de nos serveurs.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-4 font-semibold text-foreground">Type de données</th>
                        <th className="text-left py-2 font-semibold text-foreground">Durée de conservation</th>
                      </tr>
                    </thead>
                    <tbody className="space-y-1">
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4">Documents d'identité (vérification)</td>
                        <td className="py-2"><strong>72 heures maximum</strong></td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4">Médias éphémères consultés</td>
                        <td className="py-2"><strong>Supprimés immédiatement</strong> après visionnage</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4">Médias éphémères non consultés</td>
                        <td className="py-2">90 jours maximum</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4">Notifications lues</td>
                        <td className="py-2">6 mois (180 jours)</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4">Historique des transactions de crédits</td>
                        <td className="py-2">1 an (365 jours) — audit financier</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4">Messages, événements de sécurité, logs</td>
                        <td className="py-2"><strong>2 ans maximum</strong></td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4">Actions de modération & revenus modérateurs</td>
                        <td className="py-2"><strong>2 ans maximum</strong></td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4">Fichiers orphelins (stockage)</td>
                        <td className="py-2">90 jours</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">2. Suppression automatique des comptes anciens (5 ans d'inactivité)</h4>
                <p>
                  Tout compte dont la <strong className="text-foreground">dernière connexion</strong> remonte à plus de 
                  <strong className="text-foreground"> 5 ans</strong> est automatiquement et définitivement supprimé, 
                  ainsi que l'intégralité des données associées. <strong className="text-foreground">Chaque connexion 
                  repousse automatiquement cette échéance de 5 ans.</strong>
                </p>
                <p className="mt-2 text-sm">
                  Des notifications de rappel sont envoyées à 90, 30 et 7 jours avant la suppression, 
                  invitant l'utilisateur à se reconnecter pour conserver son compte.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">3. Suppression pour inactivité prolongée (2 ans)</h4>
                <p>
                  Tout compte inactif depuis plus de <strong className="text-foreground">2 ans</strong> (aucune connexion) 
                  est automatiquement supprimé. Des notifications de rappel sont envoyées à 90, 30 et 7 jours 
                  avant la suppression.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">4. Nettoyage automatique hebdomadaire</h4>
                <p>
                  Un processus automatisé s'exécute chaque semaine pour supprimer :
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Les médias éphémères consultés et les fichiers orphelins de plus de 90 jours</li>
                  <li>Les notifications lues de plus de 6 mois</li>
                  <li>L'historique des transactions de crédits de plus d'1 an</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">5. Suppression configurable par l'utilisateur</h4>
                <p>
                  Chaque utilisateur peut configurer la suppression automatique de ses messages privés 
                  selon ses préférences : immédiatement après lecture, après 24h, 7 jours, 30 jours, 
                  90 jours, ou conservation indéfinie (dans la limite de 2 ans).
                </p>
                <p className="mt-2 text-sm">
                  <strong>Note :</strong> Cette suppression est uniquement côté client (affichage). Les données 
                  restent accessibles aux modérateurs en cas d'enquête sur une infraction.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">6. Suppression définitive du compte</h4>
                <p>
                  Lorsqu'un utilisateur supprime son compte, <strong className="text-foreground">toutes</strong> ses 
                  données sont définitivement et irréversiblement effacées de tous nos serveurs :
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Profil, photos, albums et tous les médias stockés</li>
                  <li>Messages privés et de groupe</li>
                  <li>Historique de crédits et transactions</li>
                  <li>Favoris, réactions, préférences et paramètres</li>
                  <li>Signalements, actions de modération et logs associés</li>
                  <li>Compte d'authentification</li>
                </ul>
                <p className="mt-2 text-sm">
                  Aucune donnée n'est conservée après la suppression du compte. Cette action est irréversible.
                </p>
              </div>

              <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  7. Exception : enquête en cours
                </h4>
                <p className="text-sm">
                  En cas d'infraction avérée ou d'enquête judiciaire en cours, les données pertinentes 
                  peuvent être conservées au-delà des durées indiquées, conformément à nos obligations 
                  légales (art. 6.1.c RGPD). L'utilisateur concerné en est informé par une notification 
                  « Infraction en cours » sur son compte.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
          )}

          {/* Purge Policy - 30 days */}
          {filteredSections.includes('purge-policy') && (
          <AccordionItem id="purge-policy" value="purge-policy" className="glass-card rounded-2xl px-6 border-border bg-card">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-destructive" />
                </div>
                <span className="font-display font-semibold text-lg">Suppression des comptes non vérifiés (30 jours)</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pt-4">
              <div className="bg-destructive/10 rounded-xl p-4 border border-destructive/20">
                <p className="font-semibold text-destructive">
                  ⚠️ Tout compte non vérifié dans un délai de 30 jours après l'inscription sera 
                  définitivement supprimé, ainsi que l'intégralité des données associées.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">1. Principe</h4>
                <p>
                  La vérification d'identité est obligatoire pour utiliser GaySocial. Afin de garantir 
                  la sécurité de notre communauté et le respect de la législation sur les contenus adultes, 
                  tout utilisateur dispose d'un délai de <strong className="text-foreground">30 jours calendaires</strong> à 
                  compter de son inscription pour compléter sa vérification d'identité.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">2. Notifications de rappel</h4>
                <p>Avant la suppression, l'utilisateur reçoit des notifications de rappel :</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>
                    <strong>J-7</strong> : Première notification de rappel indiquant qu'il reste 7 jours 
                    avant la suppression du compte.
                  </li>
                  <li>
                    <strong>J-3</strong> : Notification d'avertissement urgente avec 3 jours restants.
                  </li>
                  <li>
                    <strong>J-1</strong> : Dernière notification critique indiquant la suppression imminente 
                    dans les 24 heures.
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">3. Données supprimées</h4>
                <p>
                  En cas de non-vérification dans le délai imparti, les éléments suivants sont 
                  <strong className="text-destructive"> définitivement et irréversiblement supprimés</strong> de 
                  tous nos serveurs :
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Profil utilisateur et toutes les informations personnelles</li>
                  <li>Photos de profil et albums photos</li>
                  <li>Messages privés et messages de groupe</li>
                  <li>Médias éphémères et fichiers partagés</li>
                  <li>Historique de crédits et transactions</li>
                  <li>Favoris, réactions et préférences</li>
                  <li>Compte d'authentification</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">4. Caractère irréversible</h4>
                <p>
                  La suppression est <strong className="text-foreground">totale et définitive</strong>. 
                  Aucune récupération de données ne sera possible après l'exécution de la purge. 
                  L'utilisateur devra créer un nouveau compte et recommencer le processus d'inscription 
                  et de vérification.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">5. Exceptions</h4>
                <p>
                  Les comptes dont la vérification est <strong className="text-foreground">en cours de traitement</strong> (soumise 
                  et en attente de validation par notre équipe) ne sont pas concernés par cette politique 
                  de suppression automatique tant que le dossier est à l'étude.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
          )}

          {/* Anti-Prostitution Clause */}
          {filteredSections.includes('anti-prostitution') && (
          <AccordionItem value="anti-prostitution" className="glass-card rounded-2xl px-6 border-border bg-card">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
                  <Ban className="w-5 h-5 text-destructive" />
                </div>
                <span className="font-display font-semibold text-lg">Clause anti-prostitution</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pt-4">
              <div className="bg-destructive/10 rounded-xl p-4 border border-destructive/20">
                <p className="font-semibold text-destructive">
                  ⚠️ Toute transaction financière entre utilisateurs en échange d'un acte sexuel 
                  est strictement interdite.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Interdictions formelles</h4>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Paiement pour une rencontre garantie</strong> : Il est interdit de 
                    proposer ou demander de l'argent en échange d'une rencontre.
                  </li>
                  <li>
                    <strong>Paiement pour un rapport sexuel</strong> : Toute forme de prostitution 
                    ou d'escorting est prohibée.
                  </li>
                  <li>
                    <strong>Transactions entre membres pour du sexe</strong> : Aucun échange d'argent, 
                    de cadeaux ou de services contre des faveurs sexuelles n'est toléré.
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Sanctions</h4>
                <p>
                  Tout utilisateur ne respectant pas ces règles sera <strong>immédiatement et 
                  définitivement banni</strong> de la plateforme. Les autorités compétentes 
                  pourront être alertées si nécessaire.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
          )}

          {/* Credits & Monetization */}
          {filteredSections.includes('cgv') && (
          <AccordionItem id="cgv" value="cgv" className="glass-card rounded-2xl px-6 border-border bg-card">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <span className="font-display font-semibold text-lg">Système de crédits & CGV</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pt-4">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Monétisation du site</h4>
                <p>
                  Gay Social fonctionne avec un système de crédits. Les crédits permettent 
                  d'utiliser les différentes fonctionnalités de la plateforme et servent à 
                  financer le développement et la maintenance du service.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Comment obtenir des crédits</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Crédits offerts à l'inscription</strong> : 15 crédits de bienvenue</li>
                  <li><strong>Vérification d'identité</strong> : 30 crédits bonus</li>
                  <li><strong>Parrainage</strong> : 10 crédits pour le parrain et le filleul (après vérification)</li>
                  <li><strong>Crédits quotidiens</strong> : 5 crédits/jour (max 7 jours/mois)</li>
                  <li><strong>Achat</strong> : 100 crédits pour 5,99 € via Revolut</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Coût des fonctionnalités</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Message texte : 0.1 crédit</li>
                  <li>Photo/Vidéo simple : 0.2 crédit</li>
                  <li>Média éphémère : 0.5 crédit</li>
                  <li>Partage d'album : 1.0 crédit</li>
                  <li>Création d'album : 10.0 crédits</li>
                  <li>Réaction sur profil : 0.3 crédit</li>
                  <li>Consultation de profil : 0.1 crédit</li>
                  <li>Création de message enregistré : 1er gratuit, puis progressif (5, 10, 15... crédits)</li>
                  <li>Modification de message enregistré : 2.0 crédits</li>
                </ul>
                <p className="font-medium text-foreground mt-3 mb-2">Fonctionnalité Swipe :</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Aimer un profil (swipe droite) : 0.5 crédit</li>
                  <li>Passer un profil (swipe gauche) : 0.2 crédit - le profil revient après 3 mois</li>
                  <li>Masquer définitivement (swipe haut) : 0.1 crédit</li>
                </ul>
              </div>

              <div className="bg-muted/50 rounded-xl p-4">
                <h4 className="font-semibold text-foreground mb-2">⚠️ Ce que les crédits ne garantissent PAS</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Une rencontre garantie</li>
                  <li>Des réponses aux messages</li>
                  <li>Un quelconque rapport sexuel</li>
                </ul>
                <p className="mt-2 text-sm">
                  Les crédits permettent d'utiliser les fonctionnalités de la plateforme mais 
                  ne garantissent aucun résultat en termes de rencontres.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Remboursements</h4>
                <p>
                  Conformément à l'article L221-28 du Code de la consommation, le droit de 
                  rétractation ne s'applique pas aux services de contenu numérique. 
                  Aucun remboursement ne sera effectué pour les crédits achetés ou utilisés.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Validité des crédits</h4>
                <p>
                  Les crédits quotidiens ne sont pas cumulables et doivent être réclamés chaque jour. 
                  Les crédits achetés et bonus n'ont pas de date d'expiration tant que le compte reste actif. 
                  En cas de suspension ou de suppression de compte, les crédits restants sont perdus sans remboursement.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
          )}

          {/* Site Rules */}
          {filteredSections.includes('rules') && (
          <AccordionItem value="rules" className="glass-card rounded-2xl px-6 border-border bg-card">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <span className="font-display font-semibold text-lg">Règlement du site</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pt-4">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Accès au site</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Réservé aux hommes de 18 ans et plus</strong></li>
                  <li>Vérification d'identité obligatoire à l'inscription</li>
                  <li>Un seul compte par personne</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Comportements interdits</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Harcèlement, insultes ou menaces</li>
                  <li>Discrimination sous toute forme</li>
                  <li>Spam ou publicité non sollicitée</li>
                  <li>Partage de contenus illégaux</li>
                  <li>Capture d'écran de contenus éphémères</li>
                  <li>Usurpation d'identité ou faux profils</li>
                </ul>
              </div>

              <div className="bg-destructive/10 rounded-xl p-4 border border-destructive/20">
                <h4 className="font-semibold text-destructive mb-2">🛡️ Protection contre les personnes mal intentionnées</h4>
                <p className="mb-3">
                  Gay Social met en place des mesures strictes pour protéger ses membres :
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Détection des profils suspects</strong> : Les comptes créés 
                    uniquement pour cibler des membres plus âgés ou vulnérables sont 
                    identifiés et supprimés.
                  </li>
                  <li>
                    <strong>Signalement facilité</strong> : Tout comportement suspect peut 
                    être signalé en quelques clics.
                  </li>
                  <li>
                    <strong>Modération active</strong> : Notre équipe surveille la plateforme 
                    24/7 pour détecter les arnaques et comportements malveillants.
                  </li>
                  <li>
                    <strong>Vérification d'identité</strong> : Limite les faux profils et 
                    les personnes mal intentionnées.
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Signaux d'alerte</h4>
                <p className="mb-2">Méfiez-vous des utilisateurs qui :</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Demandent de l'argent ou des cadeaux</li>
                  <li>Refusent de se montrer en vidéo</li>
                  <li>Proposent de quitter rapidement la plateforme</li>
                  <li>Racontent des histoires dramatiques pour obtenir de l'aide financière</li>
                  <li>Semblent trop insistants ou pressés</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Sanctions</h4>
                <p>Les infractions au règlement entraînent :</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Avertissement</strong> pour les infractions mineures</li>
                  <li><strong>Suspension temporaire</strong> (24h à 30 jours) selon la gravité</li>
                  <li><strong>Bannissement définitif</strong> pour les infractions graves</li>
                  <li><strong>Signalement aux autorités</strong> si nécessaire</li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>
          )}

          {/* User Protection */}
          {filteredSections.includes('protection') && (
          <AccordionItem value="protection" className="glass-card rounded-2xl px-6 border-border bg-card">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <span className="font-display font-semibold text-lg">Protection des utilisateurs</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pt-4">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Notre engagement</h4>
                <p>
                  Gay Social s'engage à fournir un environnement sûr et respectueux pour 
                  tous ses membres. Nous mettons en œuvre des technologies et des processus 
                  de modération pour garantir votre sécurité.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Mesures de protection</h4>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Médias éphémères</strong> : Les photos/vidéos sensibles disparaissent 
                    définitivement après consultation par le destinataire. Aucune copie n'est conservée.
                  </li>
                  <li>
                    <strong>Chiffrement</strong> : Vos données sont chiffrées en transit (TLS/HTTPS) et au repos
                  </li>
                  <li>
                    <strong>Médias privés</strong> : Tous les fichiers sont stockés dans des espaces sécurisés, 
                    accessibles uniquement via des URLs temporaires signées
                  </li>
                  <li>
                    <strong>Modération 24/7</strong> : Équipe dédiée à la surveillance de la plateforme 
                    avec système de tâches automatisé
                  </li>
                </ul>
              </div>

              <div className="bg-destructive/10 rounded-xl p-4 border border-destructive/20">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-destructive" />
                  Politique anti-capture d'écran
                </h4>
                <p className="text-sm mb-3">
                  <strong className="text-foreground">Transparence :</strong> Aucune technologie ne permet 
                  d'empêcher physiquement une capture d'écran sur un appareil. Cependant, Gay Social a mis 
                  en place un <strong>système de détection et de sanctions automatiques</strong> pour dissuader 
                  et punir cette pratique.
                </p>
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-foreground">Comment ça fonctionne :</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Notre système détecte les captures d'écran effectuées pendant la consultation de contenus privés et éphémères</li>
                    <li>Chaque détection génère une <strong>notification automatique</strong> visible par les deux utilisateurs dans la conversation</li>
                    <li>L'expéditeur du média est immédiatement informé que son contenu a été capturé</li>
                    <li>Une tâche d'enquête est automatiquement créée pour nos modérateurs</li>
                  </ul>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <p className="font-semibold text-foreground">Sanctions progressives :</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>1ère infraction</strong> : Avertissement officiel</li>
                    <li><strong>2ème infraction</strong> : Suspension automatique de 1 heure</li>
                    <li><strong>3ème et 4ème infraction</strong> : Suspension automatique de 24 heures</li>
                    <li><strong>5ème infraction et plus</strong> : Suspension automatique de 7 jours</li>
                  </ul>
                  <p className="mt-2 text-muted-foreground">
                    Les récidivistes peuvent faire l'objet d'un bannissement définitif après examen par l'équipe de modération.
                  </p>
                </div>
                <div className="mt-3 text-sm">
                  <p className="font-semibold text-foreground">Limites honnêtes :</p>
                  <p className="mt-1">
                    Nous ne prétendons pas bloquer 100% des captures. Un utilisateur déterminé peut toujours 
                    photographier son écran avec un autre appareil. Notre système vise à <strong>dissuader</strong>, 
                    <strong> détecter</strong> et <strong>sanctionner</strong> les contrevenants pour protéger au 
                    mieux la vie privée de nos membres.
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Comment nous contacter</h4>
                <p>
                  Pour toute question relative à vos données ou pour exercer vos droits RGPD, 
                  vous pouvez nous contacter via le support intégré à l'application ou par 
                  email à <a href="mailto:pipaselfie@gmail.com" className="text-primary hover:underline">pipaselfie@gmail.com</a>.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
          )}

          {/* Mentions légales - Éditeur & Développeur */}
          {filteredSections.includes('mentions-legales') && (
          <AccordionItem id="mentions-legales" value="mentions-legales" className="glass-card rounded-2xl px-6 border-border bg-card">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Scale className="w-5 h-5 text-primary" />
                </div>
                <span className="font-display font-semibold text-lg">Mentions légales - Éditeur & Développeur</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pt-4">
              <div>
                <h4 className="font-semibold text-foreground mb-2">1. Éditeur et développeur du site</h4>
                <ul className="space-y-2">
                  <li><strong>Nom :</strong> BAYART Emmrick</li>
                  <li><strong>Statut :</strong> Auto-entrepreneur</li>
                  <li><strong>Adresse de domiciliation :</strong> 61 Rue de Lion, 75012 Paris, France</li>
                  <li><strong>SIRET :</strong> 977 861 665 00015</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">2. Directeur de la publication</h4>
                <p>BAYART Emmrick</p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">3. Contact</h4>
                <p>
                  Pour toute question relative au site, vous pouvez nous contacter :
                </p>
                <ul className="space-y-2 mt-2">
                  <li><strong>Email :</strong> <a href="mailto:pipaselfie@gmail.com" className="text-primary hover:underline">pipaselfie@gmail.com</a></li>
                  <li>Ou via la messagerie intégrée à l'application.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">4. Hébergement</h4>
                <p>
                  Le site est hébergé par Lovable Cloud. Les données sont stockées sur des 
                  serveurs sécurisés conformément aux normes en vigueur.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">5. Propriété intellectuelle</h4>
                <p>
                  L'ensemble du contenu du site Gay Social (textes, images, logos, code source) 
                  est la propriété exclusive de BAYART Emmrick. Toute reproduction, même partielle, 
                  est interdite sans autorisation préalable.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
          )}
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
