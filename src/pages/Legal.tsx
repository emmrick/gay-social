import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, AlertTriangle, FileText, Lock, Users, CreditCard, Ban, Scale, Mail, Download } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAuth } from '@/contexts/AuthContext';
import DataExportDialog from '@/components/profile/DataExportDialog';

const Legal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [showExportDialog, setShowExportDialog] = useState(false);

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
                L'accès à Gay Connect est strictement réservé aux personnes majeures (18 ans et plus) 
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
            Consultez l'ensemble des documents légaux régissant l'utilisation de GayConnect.
          </p>
        </div>

        <Accordion type="multiple" defaultValue={[]} className="space-y-4">
          
          {/* CGU Section */}
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
                  de la plateforme Gay Connect, un service de mise en relation pour adultes majeurs 
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

          {/* Privacy Policy Section */}
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
                <h4 className="font-semibold text-foreground mb-2">1. Données collectées</h4>
                <p>Nous collectons les données suivantes :</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Informations de profil (pseudo, âge, préférences)</li>
                  <li>Données de localisation (optionnelles)</li>
                  <li>Photos de profil</li>
                  <li>Messages échangés sur la plateforme</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">2. Utilisation des données</h4>
                <p>Vos données sont utilisées pour :</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Permettre les fonctionnalités de mise en relation</li>
                  <li>Améliorer l'expérience utilisateur</li>
                  <li>Assurer la sécurité de la plateforme</li>
                  <li>Respecter nos obligations légales</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">3. Protection des données</h4>
                <p>
                  Vos données sont chiffrées et stockées sur des serveurs sécurisés. 
                  Nous ne vendons jamais vos données personnelles à des tiers. 
                  Les médias éphémères sont définitivement supprimés après consultation.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">4. Vos droits (RGPD)</h4>
                <p>Conformément au RGPD, vous disposez des droits suivants :</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li><strong>Droit d'accès</strong> : consulter vos données personnelles</li>
                  <li><strong>Droit de rectification</strong> : corriger vos données</li>
                  <li><strong>Droit à l'effacement</strong> : supprimer votre compte et vos données</li>
                  <li><strong>Droit à la portabilité</strong> : récupérer vos données</li>
                  <li><strong>Droit d'opposition</strong> : vous opposer au traitement de vos données</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">5. Conservation des données</h4>
                <p>
                  Les données de votre compte sont conservées tant que votre compte est actif. 
                  Les documents d'identité sont supprimés immédiatement après vérification. 
                  En cas de suppression de compte, toutes vos données sont effacées sous 30 jours.
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
                    télécharger l'ensemble de vos données personnelles au format JSON.
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

          {/* Anti-Prostitution Clause */}
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

          {/* Credits & Monetization */}
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
                  Gay Connect fonctionne avec un système de crédits. Les crédits permettent 
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
                  <li>Création de message enregistré : 3.5 crédits</li>
                  <li>Modification de message enregistré : 2.0 crédits</li>
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

          {/* Site Rules */}
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
                  Gay Connect met en place des mesures strictes pour protéger ses membres :
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

          {/* User Protection */}
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
                  Gay Connect s'engage à fournir un environnement sûr et respectueux pour 
                  tous ses membres. Nous mettons en œuvre des technologies et des processus 
                  de modération pour garantir votre sécurité.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Mesures de protection</h4>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Anti-capture d'écran</strong> : Système de détection et sanctions 
                    automatiques (suspension de 10 minutes à 1 mois)
                  </li>
                  <li>
                    <strong>Médias éphémères</strong> : Les photos/vidéos sensibles disparaissent 
                    après consultation
                  </li>
                  <li>
                    <strong>Chiffrement</strong> : Vos données sont chiffrées en transit et au repos
                  </li>
                  <li>
                    <strong>Modération 24/7</strong> : Équipe dédiée à la surveillance de la plateforme
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Comment nous contacter</h4>
                <p>
                  Pour toute question relative à vos données ou pour exercer vos droits RGPD, 
                  vous pouvez nous contacter via le formulaire de contact du site ou par 
                  email à l'adresse indiquée dans votre espace membre.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-muted-foreground mb-2">
            Dernière mise à jour : Février 2026
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Pour toute question, contactez-nous via la messagerie de l'application.
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
