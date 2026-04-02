import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_DISPLAY = "Gay Social"

interface VerificationRejectedProps {
  pseudo?: string
  rejectionReason?: string
}

const VerificationRejectedEmail = ({ pseudo, rejectionReason }: VerificationRejectedProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre vérification d'identité a été refusée — Gay Social</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={logoStyle}>
            <span style={logoGay}>Gay</span>{' '}
            <span style={logoSocial}>Social</span>
          </Heading>
        </Section>

        <Heading style={h1}>Vérification d'identité refusée</Heading>

        <Text style={text}>
          {pseudo ? `Bonjour ${pseudo},` : 'Bonjour,'}
        </Text>

        <Text style={text}>
          Nous avons examiné les documents que vous avez soumis pour la vérification de votre identité. Malheureusement, votre demande a été refusée.
        </Text>

        {rejectionReason && (
          <Section style={reasonBox}>
            <Text style={reasonLabel}>Motif du refus :</Text>
            <Text style={reasonText}>{rejectionReason}</Text>
          </Section>
        )}

        <Text style={text}>
          Voici les raisons courantes de refus :
        </Text>

        <Text style={listItem}>• Photo floue ou illisible</Text>
        <Text style={listItem}>• Document expiré ou non valide</Text>
        <Text style={listItem}>• Le selfie ne correspond pas au document</Text>
        <Text style={listItem}>• Informations partiellement cachées</Text>
        <Text style={listItem}>• Document recadré ou incomplet</Text>

        <Text style={text}>
          Vous pouvez soumettre de nouveaux documents à tout moment. Assurez-vous que vos photos sont nettes et que toutes les informations sont lisibles.
        </Text>

        <Section style={buttonSection}>
          <Button style={primaryButton} href="https://gaysocial.fr">
            Soumettre à nouveau
          </Button>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          Si vous pensez qu'il s'agit d'une erreur, contactez notre support via l'application {SITE_DISPLAY}.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: VerificationRejectedEmail,
  subject: 'Vérification d\'identité refusée — Gay Social',
  displayName: 'Refus de vérification d\'identité',
  previewData: { pseudo: 'Maxime', rejectionReason: 'Le selfie ne correspond pas à la photo du document d\'identité.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logoStyle = { fontSize: '28px', fontWeight: '800' as const, margin: '0' }
const logoGay = { color: '#e63946' }
const logoSocial = { color: '#1a6fb5' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#dc2626', margin: '24px 0 16px' }
const text = { fontSize: '15px', color: '#3d4f66', lineHeight: '1.6', margin: '0 0 12px' }
const listItem = { fontSize: '14px', color: '#55657a', lineHeight: '1.6', margin: '2px 0', paddingLeft: '8px' }
const reasonBox = { backgroundColor: '#fef2f2', borderRadius: '8px', padding: '16px', margin: '16px 0' }
const reasonLabel = { fontSize: '13px', fontWeight: '600' as const, color: '#991b1b', margin: '0 0 6px', textTransform: 'uppercase' as const }
const reasonText = { fontSize: '15px', color: '#991b1b', margin: '0', lineHeight: '1.5' }
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
const footer = { fontSize: '12px', color: '#8899aa', margin: '0' }
