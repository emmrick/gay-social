import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_DISPLAY = "Gay Social"

interface VerificationConfirmedProps {
  pseudo?: string
}

const VerificationConfirmedEmail = ({ pseudo }: VerificationConfirmedProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>✅ Votre identité a été vérifiée avec succès — Gay Social</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={logoStyle}>
            <span style={logoGay}>Gay</span>{' '}
            <span style={logoSocial}>Social</span>
          </Heading>
        </Section>

        <Heading style={h1}>✅ Identité vérifiée !</Heading>

        <Text style={text}>
          {pseudo ? `Félicitations ${pseudo} !` : 'Félicitations !'}
        </Text>

        <Text style={text}>
          Votre identité a été vérifiée avec succès. Votre compte est maintenant entièrement activé et vous avez accès à toutes les fonctionnalités de {SITE_DISPLAY}.
        </Text>

        <Section style={benefitsBox}>
          <Text style={benefitTitle}>Ce que vous pouvez faire maintenant :</Text>
          <Text style={benefitItem}>💬 Envoyer des messages privés</Text>
          <Text style={benefitItem}>📸 Partager vos albums photos</Text>
          <Text style={benefitItem}>❤️ Utiliser le swipe et les matchs</Text>
          <Text style={benefitItem}>🏳️‍🌈 Rejoindre les salons de discussion</Text>
        </Section>

        <Section style={buttonSection}>
          <Button style={primaryButton} href="https://gaysocial.fr">
            Accéder à mon profil
          </Button>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          Merci de faire partie de la communauté {SITE_DISPLAY} ! 🌈
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: VerificationConfirmedEmail,
  subject: '✅ Votre identité a été vérifiée — Gay Social',
  displayName: 'Confirmation de vérification',
  previewData: { pseudo: 'Maxime' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logoStyle = { fontSize: '28px', fontWeight: '800' as const, margin: '0' }
const logoGay = { color: '#e63946' }
const logoSocial = { color: '#1a6fb5' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#16a34a', margin: '24px 0 16px' }
const text = { fontSize: '15px', color: '#3d4f66', lineHeight: '1.6', margin: '0 0 12px' }
const benefitsBox = { backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '16px', margin: '16px 0' }
const benefitTitle = { fontSize: '14px', fontWeight: '600' as const, color: '#166534', margin: '0 0 8px' }
const benefitItem = { fontSize: '14px', color: '#166534', lineHeight: '1.8', margin: '0' }
const buttonSection = { textAlign: 'center' as const, margin: '24px 0' }
const primaryButton = {
  backgroundColor: '#1a6fb5',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
}
const hr = { borderColor: '#e5e9f0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#8899aa', margin: '0', textAlign: 'center' as const }
