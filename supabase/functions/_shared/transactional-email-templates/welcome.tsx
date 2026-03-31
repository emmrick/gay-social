import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "GaySocial"

interface WelcomeProps {
  pseudo?: string
}

const WelcomeEmail = ({ pseudo }: WelcomeProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Bienvenue sur GaySocial 🌈 — Découvrez votre communauté</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={logo}>{SITE_NAME}</Heading>
        </Section>

        <Heading style={h1}>Bienvenue sur {SITE_NAME} ! 🌈</Heading>

        <Text style={text}>
          {pseudo ? `Salut ${pseudo} !` : 'Salut !'}
        </Text>

        <Text style={text}>
          Nous sommes ravis de vous accueillir sur GaySocial, la plateforme communautaire dédiée aux rencontres entre hommes. Voici un aperçu de ce qui vous attend :
        </Text>

        <Section style={featureBox}>
          <Text style={featureItem}>🏳️‍🌈 <strong>Salons régionaux</strong> — Discutez avec des membres proches de chez vous</Text>
          <Text style={featureItem}>💬 <strong>Messages privés</strong> — Échangez en toute confidentialité</Text>
          <Text style={featureItem}>❤️ <strong>Swipe & Matchs</strong> — Trouvez des profils qui vous correspondent</Text>
          <Text style={featureItem}>📸 <strong>Albums photos</strong> — Partagez vos meilleurs moments</Text>
          <Text style={featureItem}>📖 <strong>Stories</strong> — Publiez des contenus éphémères</Text>
          <Text style={featureItem}>🔒 <strong>Sécurité</strong> — Vérification d'identité obligatoire pour un espace sûr</Text>
        </Section>

        <Text style={text}>
          <strong>Première étape importante :</strong> Pour accéder à toutes les fonctionnalités, vous devez vérifier votre identité. C'est rapide et garantit la sécurité de tous les membres.
        </Text>

        <Section style={buttonSection}>
          <Button style={primaryButton} href="https://gay-connect.lovable.app">
            Découvrir GaySocial
          </Button>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          Des questions ? Notre support est disponible directement dans l'application.
        </Text>
        <Text style={footer}>
          À très bientôt sur {SITE_NAME} ! 🌈
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: 'Bienvenue sur GaySocial 🌈 — Découvrez votre communauté',
  displayName: 'Email de bienvenue',
  previewData: { pseudo: 'Maxime' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logo = { fontSize: '28px', fontWeight: '700' as const, color: '#1a6fb5', margin: '0' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#1a2940', margin: '24px 0 16px', textAlign: 'center' as const }
const text = { fontSize: '15px', color: '#3d4f66', lineHeight: '1.6', margin: '0 0 14px' }
const featureBox = { backgroundColor: '#f0f7ff', borderRadius: '10px', padding: '18px', margin: '16px 0' }
const featureItem = { fontSize: '14px', color: '#1a3a5c', lineHeight: '2', margin: '0' }
const buttonSection = { textAlign: 'center' as const, margin: '28px 0' }
const primaryButton = {
  backgroundColor: '#1a6fb5',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '8px',
  fontSize: '16px',
  fontWeight: '600' as const,
  textDecoration: 'none',
}
const hr = { borderColor: '#e5e9f0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#8899aa', margin: '0 0 4px', textAlign: 'center' as const }
