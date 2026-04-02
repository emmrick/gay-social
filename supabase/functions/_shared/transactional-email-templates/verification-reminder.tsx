import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_DISPLAY = "Gay Social"

interface VerificationReminderProps {
  pseudo?: string
  daysLeft?: number
}

const VerificationReminderEmail = ({ pseudo, daysLeft }: VerificationReminderProps) => {
  const isUrgent = daysLeft !== undefined && daysLeft <= 7
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>
        {isUrgent
          ? `⚠️ Plus que ${daysLeft} jour${(daysLeft ?? 0) > 1 ? 's' : ''} pour vérifier votre identité`
          : 'Vérifiez votre identité pour continuer à utiliser Gay Social'}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <Heading style={logoStyle}>
              <span style={logoGay}>Gay</span>{' '}
              <span style={logoSocial}>Social</span>
            </Heading>
          </Section>

          <Heading style={h1}>
            {isUrgent ? '⚠️ Action urgente requise' : 'Vérification d\'identité requise'}
          </Heading>

          <Text style={text}>
            {pseudo ? `Bonjour ${pseudo},` : 'Bonjour,'}
          </Text>

          <Text style={text}>
            {isUrgent
              ? `Il ne vous reste que ${daysLeft} jour${(daysLeft ?? 0) > 1 ? 's' : ''} pour vérifier votre identité. Sans vérification, votre compte sera automatiquement supprimé.`
              : `Nous vous rappelons que la vérification de votre identité est obligatoire pour continuer à utiliser ${SITE_DISPLAY}. Cette étape garantit la sécurité de tous nos membres.`}
          </Text>

          <Text style={text}>
            Pour vérifier votre identité, vous devez fournir :
          </Text>

          <Text style={listItem}>📸 Un selfie de votre visage</Text>
          <Text style={listItem}>🪪 Une photo recto de votre pièce d'identité</Text>
          <Text style={listItem}>🪪 Une photo verso de votre pièce d'identité</Text>

          <Section style={buttonSection}>
            <Button style={isUrgent ? urgentButton : primaryButton} href="https://gaysocial.fr">
              Vérifier mon identité maintenant
            </Button>
          </Section>

          {isUrgent && (
            <Text style={warningText}>
              ⏰ Attention : Sans vérification dans les {daysLeft} prochains jours, votre compte et toutes vos données seront définitivement supprimés.
            </Text>
          )}

          <Hr style={hr} />

          <Text style={footer}>
            Cet email a été envoyé par {SITE_DISPLAY}. Si vous avez des questions, contactez notre support via l'application.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: VerificationReminderEmail,
  subject: (data: Record<string, any>) => {
    const days = data?.daysLeft
    if (days !== undefined && days <= 7) {
      return `⚠️ Plus que ${days} jour${days > 1 ? 's' : ''} pour vérifier votre identité — Gay Social`
    }
    return 'Rappel : Vérifiez votre identité — Gay Social'
  },
  displayName: 'Rappel de vérification d\'identité',
  previewData: { pseudo: 'Maxime', daysLeft: 5 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logoStyle = { fontSize: '28px', fontWeight: '800' as const, margin: '0' }
const logoGay = { color: '#e63946' }
const logoSocial = { color: '#1a6fb5' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a2940', margin: '24px 0 16px' }
const text = { fontSize: '15px', color: '#3d4f66', lineHeight: '1.6', margin: '0 0 12px' }
const listItem = { fontSize: '15px', color: '#3d4f66', lineHeight: '1.6', margin: '4px 0', paddingLeft: '8px' }
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
const urgentButton = {
  ...primaryButton,
  backgroundColor: '#dc2626',
}
const warningText = { fontSize: '14px', color: '#dc2626', lineHeight: '1.5', margin: '16px 0', padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px' }
const hr = { borderColor: '#e5e9f0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#8899aa', margin: '0' }
