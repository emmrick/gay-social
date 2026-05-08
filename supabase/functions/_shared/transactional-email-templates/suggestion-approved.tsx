import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_DISPLAY = 'Gay Social'

interface SuggestionApprovedProps {
  pseudo?: string
  suggestionTitle?: string
  creditsAwarded?: number
  adminNotes?: string
  suggestionUrl?: string
}

const SuggestionApprovedEmail = ({
  pseudo,
  suggestionTitle,
  creditsAwarded,
  adminNotes,
  suggestionUrl,
}: SuggestionApprovedProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>🎉 Votre proposition a été approuvée — Gay Social</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={logoStyle}>
            <span style={logoGay}>Gay</span>{' '}
            <span style={logoSocial}>Social</span>
          </Heading>
        </Section>

        <Heading style={h1}>🎉 Votre idée a été approuvée !</Heading>

        <Text style={text}>
          {pseudo ? `Bravo ${pseudo} !` : 'Bravo !'}
        </Text>

        <Text style={text}>
          Notre équipe a examiné votre proposition et l'a approuvée. Merci d'aider à faire évoluer {SITE_DISPLAY} 🙏
        </Text>

        {suggestionTitle ? (
          <Section style={ideaBox}>
            <Text style={ideaLabel}>Votre idée</Text>
            <Text style={ideaTitle}>« {suggestionTitle} »</Text>
          </Section>
        ) : null}

        {creditsAwarded && creditsAwarded > 0 ? (
          <Section style={rewardBox}>
            <Text style={rewardTitle}>🎁 Récompense créditée</Text>
            <Text style={rewardAmount}>+{creditsAwarded} crédits</Text>
            <Text style={rewardSub}>déjà disponibles dans votre solde</Text>
          </Section>
        ) : null}

        {adminNotes ? (
          <Section style={notesBox}>
            <Text style={notesLabel}>Mot de l'équipe</Text>
            <Text style={notesText}>{adminNotes}</Text>
          </Section>
        ) : null}

        <Section style={buttonSection}>
          <Button style={primaryButton} href={suggestionUrl ?? 'https://gaysocial.fr/profile'}>
            {suggestionUrl ? 'Voir mon idée' : 'Voir mes idées'}
          </Button>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          Continuez à partager vos idées — elles font évoluer {SITE_DISPLAY} 🌈
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SuggestionApprovedEmail,
  subject: '🎉 Votre proposition a été approuvée — Gay Social',
  displayName: 'Suggestion approuvée',
  previewData: {
    pseudo: 'Maxime',
    suggestionTitle: 'Ajouter un mode sombre amélioré',
    creditsAwarded: 30,
    adminNotes: 'Excellente idée, on l\'intègre dès la prochaine mise à jour !',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logoStyle = { fontSize: '28px', fontWeight: '800' as const, margin: '0' }
const logoGay = { color: '#e63946' }
const logoSocial = { color: '#1a6fb5' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#16a34a', margin: '24px 0 16px' }
const text = { fontSize: '15px', color: '#3d4f66', lineHeight: '1.6', margin: '0 0 12px' }
const ideaBox = { backgroundColor: '#f8fafc', borderLeft: '3px solid #1a6fb5', borderRadius: '6px', padding: '14px 16px', margin: '16px 0' }
const ideaLabel = { fontSize: '11px', textTransform: 'uppercase' as const, fontWeight: '600' as const, color: '#64748b', margin: '0 0 4px', letterSpacing: '0.5px' }
const ideaTitle = { fontSize: '15px', fontWeight: '600' as const, color: '#0f172a', margin: '0', fontStyle: 'italic' as const }
const rewardBox = { backgroundColor: '#fefce8', border: '1px solid #fde047', borderRadius: '8px', padding: '16px', margin: '16px 0', textAlign: 'center' as const }
const rewardTitle = { fontSize: '13px', fontWeight: '600' as const, color: '#854d0e', margin: '0 0 4px' }
const rewardAmount = { fontSize: '24px', fontWeight: '800' as const, color: '#ca8a04', margin: '4px 0' }
const rewardSub = { fontSize: '12px', color: '#a16207', margin: '0' }
const notesBox = { backgroundColor: '#f0f9ff', borderRadius: '8px', padding: '14px 16px', margin: '16px 0' }
const notesLabel = { fontSize: '11px', textTransform: 'uppercase' as const, fontWeight: '600' as const, color: '#0369a1', margin: '0 0 4px', letterSpacing: '0.5px' }
const notesText = { fontSize: '14px', color: '#0c4a6e', lineHeight: '1.5', margin: '0' }
const buttonSection = { textAlign: 'center' as const, margin: '24px 0' }
const primaryButton = {
  backgroundColor: '#1a6fb5',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#e5e7eb', margin: '24px 0 16px' }
const footer = { fontSize: '13px', color: '#6b7280', textAlign: 'center' as const, margin: '8px 0 0' }
