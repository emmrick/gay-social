import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_DISPLAY = 'Gay Social'

interface AdvertiserMagicLinkProps {
  loginUrl?: string
}

const AdvertiserMagicLinkEmail = ({ loginUrl }: AdvertiserMagicLinkProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre lien de connexion à l'espace annonceur Gay Social</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={logoStyle}>
            <span style={logoGay}>Gay</span>{' '}
            <span style={logoSocial}>Social</span>
          </Heading>
          <Text style={subtitle}>Espace Annonceurs</Text>
        </Section>

        <Heading style={h1}>🔐 Votre lien de connexion sécurisé</Heading>

        <Text style={text}>
          Bonjour, vous avez demandé à accéder à votre espace annonceur sur {SITE_DISPLAY}.
          Cliquez sur le bouton ci-dessous pour vous connecter en toute sécurité.
        </Text>

        <Section style={buttonSection}>
          <Button style={primaryButton} href={loginUrl || 'https://gaysocial.fr/advertise'}>
            🚀 Accéder à mon espace
          </Button>
        </Section>

        <Section style={infoBox}>
          <Text style={infoText}>
            ⏱️ <strong>Lien valable 15 minutes</strong> et utilisable une seule fois.
          </Text>
          <Text style={infoText}>
            🛡️ Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.
            Personne ne pourra accéder à votre espace sans ce lien.
          </Text>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          Une question sur vos campagnes ? Répondez à cet email, notre équipe vous répondra rapidement.
        </Text>
        <Text style={footer}>{SITE_DISPLAY} — Espace Annonceurs 🌈</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdvertiserMagicLinkEmail,
  subject: '🔐 Votre lien de connexion — Espace Annonceurs Gay Social',
  displayName: 'Lien magique annonceur',
  previewData: { loginUrl: 'https://gaysocial.fr/advertise?token=demo' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '24px 0 10px' }
const logoStyle = { fontSize: '32px', fontWeight: '800' as const, margin: '0', letterSpacing: '-0.5px' }
const logoGay = { color: '#e63946' }
const logoSocial = { color: '#1a6fb5' }
const subtitle = { fontSize: '13px', color: '#8899aa', margin: '4px 0 0', textTransform: 'uppercase' as const, letterSpacing: '1.5px', fontWeight: '600' as const }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a2940', margin: '24px 0 16px', textAlign: 'center' as const, lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#3d4f66', lineHeight: '1.7', margin: '0 0 14px' }
const buttonSection = { textAlign: 'center' as const, margin: '32px 0' }
const primaryButton = {
  backgroundColor: '#1a6fb5',
  color: '#ffffff',
  padding: '14px 36px',
  borderRadius: '10px',
  fontSize: '16px',
  fontWeight: '700' as const,
  textDecoration: 'none',
}
const infoBox = { backgroundColor: '#f0f7ff', borderRadius: '12px', padding: '16px 20px', margin: '16px 0' }
const infoText = { fontSize: '13px', color: '#1a3a5c', lineHeight: '1.7', margin: '0 0 8px' }
const hr = { borderColor: '#e5e9f0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#8899aa', margin: '0 0 4px', textAlign: 'center' as const }
