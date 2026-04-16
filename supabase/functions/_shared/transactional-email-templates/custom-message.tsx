import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_DISPLAY = "Gay Social"

interface CustomMessageProps {
  pseudo?: string
  subject?: string
  message?: string
}

const CustomMessageEmail = ({ pseudo, subject, message }: CustomMessageProps) => {
  const lines = (message ?? '').split(/\n+/).filter(Boolean)
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>{subject ?? 'Un message de Gay Social'}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <Heading style={logoStyle}>
              <span style={logoGay}>Gay</span>{' '}
              <span style={logoSocial}>Social</span>
            </Heading>
          </Section>

          <Heading style={h1}>{subject ?? 'Un message pour vous'}</Heading>

          <Text style={text}>{pseudo ? `Bonjour ${pseudo},` : 'Bonjour,'}</Text>

          <Section style={messageBox}>
            {lines.length > 0
              ? lines.map((line, i) => (
                  <Text key={i} style={messageText}>{line}</Text>
                ))
              : <Text style={messageText}>{message}</Text>}
          </Section>

          <Hr style={hr} />

          <Text style={footer}>L'équipe {SITE_DISPLAY} 🌈</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CustomMessageEmail,
  subject: (data: Record<string, any>) => data.subject ?? 'Un message de Gay Social',
  displayName: 'Message personnalisé',
  previewData: { pseudo: 'Maxime', subject: 'Information importante', message: 'Bonjour, voici un message important...' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '24px 0 10px' }
const logoStyle = { fontSize: '32px', fontWeight: '800' as const, margin: '0', letterSpacing: '-0.5px' }
const logoGay = { color: '#e63946' }
const logoSocial = { color: '#1a6fb5' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a2940', margin: '20px 0 16px', textAlign: 'center' as const, lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#3d4f66', lineHeight: '1.7', margin: '0 0 14px' }
const messageBox = { backgroundColor: '#f6f8fb', borderRadius: '12px', padding: '20px 22px', margin: '8px 0 16px', borderLeft: '4px solid #1a6fb5' }
const messageText = { fontSize: '15px', color: '#1a2940', lineHeight: '1.7', margin: '0 0 10px', whiteSpace: 'pre-wrap' as const }
const hr = { borderColor: '#e5e9f0', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#8899aa', margin: '0', textAlign: 'center' as const }
