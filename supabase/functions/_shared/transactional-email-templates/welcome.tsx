import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_DISPLAY = "Gay Social"

interface WelcomeProps {
  pseudo?: string
}

const WelcomeEmail = ({ pseudo }: WelcomeProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Bienvenue sur Gay Social 🌈 — Découvrez votre communauté</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={logoStyle}>
            <span style={logoGay}>Gay</span>{' '}
            <span style={logoSocial}>Social</span>
          </Heading>
        </Section>

        <Heading style={h1}>
          Bienvenue sur{' '}
          <span style={logoGay}>Gay</span>{' '}
          <span style={logoSocial}>Social</span>{' '}
          🌈
        </Heading>

        <Text style={text}>
          {pseudo ? `Salut ${pseudo} ! 👋` : 'Salut ! 👋'}
        </Text>

        <Text style={text}>
          Nous sommes ravis de vous accueillir sur {SITE_DISPLAY}, la plateforme communautaire 100% dédiée aux rencontres et échanges entre hommes. Ici, vous trouverez un espace bienveillant, sécurisé et convivial pour faire de nouvelles rencontres.
        </Text>

        <Section style={dividerSection}>
          <Text style={sectionTitle}>🚀 Ce qui vous attend</Text>
        </Section>

        <Section style={featureBox}>
          <Text style={featureItem}>🏳️‍🌈 <strong>Salons régionaux</strong> — Rejoignez le salon de votre région et discutez avec des membres proches de chez vous en temps réel.</Text>
          <Text style={featureItem}>💬 <strong>Messages privés</strong> — Échangez en toute confidentialité avec les membres qui vous intéressent.</Text>
          <Text style={featureItem}>❤️ <strong>Swipe & Matchs</strong> — Découvrez des profils, likez, et connectez-vous avec ceux qui partagent vos affinités.</Text>
          <Text style={featureItem}>📸 <strong>Albums photos privés</strong> — Créez des albums et partagez-les uniquement avec les personnes de votre choix.</Text>
          <Text style={featureItem}>📖 <strong>Stories éphémères</strong> — Publiez des moments de vie visibles pendant 24h par toute la communauté.</Text>
          <Text style={featureItem}>🎁 <strong>Crédits & Cadeaux</strong> — Envoyez des cadeaux en crédits aux membres que vous appréciez.</Text>
          <Text style={featureItem}>🤖 <strong>Chatbot personnel</strong> — Configurez un assistant automatique qui répond à vos visiteurs quand vous êtes absent.</Text>
          <Text style={featureItem}>📢 <strong>Tweens</strong> — Publiez des messages courts visibles par toute la communauté, comme un fil d'actualité.</Text>
        </Section>

        <Section style={dividerSection}>
          <Text style={sectionTitle}>🔒 Votre sécurité, notre priorité</Text>
        </Section>

        <Section style={securityBox}>
          <Text style={securityItem}>✅ <strong>Vérification d'identité obligatoire</strong> — Chaque membre est vérifié pour garantir un espace sûr et authentique.</Text>
          <Text style={securityItem}>🛡️ <strong>Modération active</strong> — Notre équipe veille en permanence au respect des règles de la communauté.</Text>
          <Text style={securityItem}>🚫 <strong>Blocage & Signalement</strong> — Bloquez ou signalez facilement tout comportement inapproprié.</Text>
          <Text style={securityItem}>🔐 <strong>Contenus protégés</strong> — Vos photos et albums sont protégés contre les captures d'écran.</Text>
        </Section>

        <Section style={dividerSection}>
          <Text style={sectionTitle}>⚡ Première étape importante</Text>
        </Section>

        <Section style={stepBox}>
          <Text style={stepText}>
            Pour accéder à toutes les fonctionnalités, vous devez <strong>vérifier votre identité</strong>. C'est rapide (moins de 2 minutes) et cela garantit la sécurité de tous les membres.
          </Text>
          <Text style={stepDetail}>📸 Un selfie + 🪪 Recto/Verso de votre pièce d'identité</Text>
        </Section>

        <Section style={buttonSection}>
          <Button style={primaryButton} href="https://gaysocial.fr">
            🚀 Découvrir Gay Social
          </Button>
        </Section>

        <Hr style={hr} />

        <Section style={tipsSection}>
          <Text style={tipsTitle}>💡 Conseils pour bien démarrer :</Text>
          <Text style={tipItem}>1. Complétez votre profil avec une belle photo</Text>
          <Text style={tipItem}>2. Vérifiez votre identité pour débloquer toutes les fonctionnalités</Text>
          <Text style={tipItem}>3. Rejoignez le salon de votre région pour commencer à discuter</Text>
          <Text style={tipItem}>4. Utilisez le swipe pour découvrir des profils compatibles</Text>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          Des questions ? Notre support est disponible directement dans l'application.
        </Text>
        <Text style={footer}>
          À très bientôt sur {SITE_DISPLAY} ! 🌈
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: 'Bienvenue sur Gay Social 🌈 — Découvrez votre communauté',
  displayName: 'Email de bienvenue',
  previewData: { pseudo: 'Maxime' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '24px 0 10px' }
const logoStyle = { fontSize: '32px', fontWeight: '800' as const, margin: '0', letterSpacing: '-0.5px' }
const logoGay = { color: '#e63946' }
const logoSocial = { color: '#1a6fb5' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#1a2940', margin: '24px 0 16px', textAlign: 'center' as const, lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#3d4f66', lineHeight: '1.7', margin: '0 0 14px' }
const dividerSection = { margin: '24px 0 8px' }
const sectionTitle = { fontSize: '17px', fontWeight: '700' as const, color: '#1a2940', margin: '0 0 8px' }
const featureBox = { backgroundColor: '#f0f7ff', borderRadius: '12px', padding: '18px 20px', margin: '0 0 16px' }
const featureItem = { fontSize: '14px', color: '#1a3a5c', lineHeight: '1.8', margin: '0 0 6px' }
const securityBox = { backgroundColor: '#f0fdf4', borderRadius: '12px', padding: '18px 20px', margin: '0 0 16px' }
const securityItem = { fontSize: '14px', color: '#166534', lineHeight: '1.8', margin: '0 0 6px' }
const stepBox = { backgroundColor: '#fffbeb', borderRadius: '12px', padding: '18px 20px', margin: '0 0 16px', borderLeft: '4px solid #f59e0b' }
const stepText = { fontSize: '15px', color: '#92400e', lineHeight: '1.6', margin: '0 0 8px' }
const stepDetail = { fontSize: '14px', color: '#92400e', margin: '0', fontWeight: '600' as const }
const buttonSection = { textAlign: 'center' as const, margin: '28px 0' }
const primaryButton = {
  backgroundColor: '#1a6fb5',
  color: '#ffffff',
  padding: '14px 36px',
  borderRadius: '10px',
  fontSize: '16px',
  fontWeight: '700' as const,
  textDecoration: 'none',
}
const tipsSection = { backgroundColor: '#faf5ff', borderRadius: '12px', padding: '18px 20px', margin: '16px 0' }
const tipsTitle = { fontSize: '15px', fontWeight: '700' as const, color: '#6b21a8', margin: '0 0 8px' }
const tipItem = { fontSize: '14px', color: '#6b21a8', lineHeight: '1.8', margin: '0' }
const hr = { borderColor: '#e5e9f0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#8899aa', margin: '0 0 4px', textAlign: 'center' as const }
