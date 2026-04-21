import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_DISPLAY = 'Gay Social'

interface WeeklyDigestProps {
  pseudo?: string
  weekLabel?: string
  // Stats perso
  profileVisits?: number
  newMessages?: number
  reactionsReceived?: number
  swipesReceived?: number
  // Stats communauté
  newMembers?: number
  totalMembers?: number
  tweensCount?: number
  swipesGlobal?: number
  chatbotInteractions?: number
  messagesGlobal?: number
}

const StatCard = ({ value, label, color }: { value: number | string; label: string; color: string }) => (
  <Column style={{ ...statCol, borderLeft: `4px solid ${color}` }}>
    <Text style={{ ...statValue, color }}>{value}</Text>
    <Text style={statLabel}>{label}</Text>
  </Column>
)

const WeeklyDigestEmail = ({
  pseudo,
  weekLabel = 'cette semaine',
  profileVisits = 0,
  newMessages = 0,
  reactionsReceived = 0,
  swipesReceived = 0,
  newMembers = 0,
  totalMembers = 0,
  tweensCount = 0,
  swipesGlobal = 0,
  chatbotInteractions = 0,
  messagesGlobal = 0,
}: WeeklyDigestProps) => {
  const hasPersonalActivity =
    profileVisits + newMessages + reactionsReceived + swipesReceived > 0
  const fmt = (n: number) => n.toLocaleString('fr-FR')

  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>📊 Votre récap {SITE_DISPLAY} de la semaine 🌈</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <Heading style={logoStyle}>
              <span style={logoGay}>Gay</span>{' '}
              <span style={logoSocial}>Social</span>
            </Heading>
            <Text style={tagline}>Votre récapitulatif hebdomadaire</Text>
          </Section>

          <Heading style={h1}>
            {pseudo ? `Salut ${pseudo} ! 👋` : 'Salut ! 👋'}
          </Heading>

          <Text style={intro}>
            Voici ce qu'il s'est passé sur {SITE_DISPLAY} {weekLabel}.
          </Text>

          {/* SECTION PERSO */}
          <Section style={dividerSection}>
            <Text style={sectionTitle}>👤 Votre activité</Text>
          </Section>

          {hasPersonalActivity ? (
            <>
              <Section style={statsGrid}>
                <Row>
                  <StatCard value={fmt(profileVisits)} label="Visites de profil" color="#1a6fb5" />
                  <StatCard value={fmt(newMessages)} label="Nouveaux messages" color="#e63946" />
                </Row>
                <Row>
                  <StatCard value={fmt(reactionsReceived)} label="Réactions reçues" color="#f59e0b" />
                  <StatCard value={fmt(swipesReceived)} label="Likes reçus" color="#16a34a" />
                </Row>
              </Section>
            </>
          ) : (
            <Section style={emptyBox}>
              <Text style={emptyText}>
                Aucune activité cette semaine. Connectez-vous pour découvrir de nouveaux profils ! 🚀
              </Text>
            </Section>
          )}

          <Hr style={hr} />

          {/* SECTION COMMUNAUTÉ */}
          <Section style={dividerSection}>
            <Text style={sectionTitle}>🌍 La communauté en chiffres</Text>
          </Section>

          <Section style={communityBox}>
            <Row>
              <Column style={communityStat}>
                <Text style={{ ...communityValue, color: '#1a6fb5' }}>+{fmt(newMembers)}</Text>
                <Text style={communityLabel}>Nouveaux membres</Text>
              </Column>
              <Column style={communityStat}>
                <Text style={{ ...communityValue, color: '#e63946' }}>{fmt(totalMembers)}</Text>
                <Text style={communityLabel}>Membres au total</Text>
              </Column>
            </Row>
          </Section>

          <Section style={engagementBox}>
            <Text style={engagementTitle}>💬 Engagement de la semaine</Text>
            <Text style={engagementItem}>
              💌 <strong>{fmt(messagesGlobal)}</strong> messages échangés
            </Text>
            <Text style={engagementItem}>
              ❤️ <strong>{fmt(swipesGlobal)}</strong> swipes effectués
            </Text>
            <Text style={engagementItem}>
              📢 <strong>{fmt(tweensCount)}</strong> Tweens publiés
            </Text>
            <Text style={engagementItem}>
              🤖 <strong>{fmt(chatbotInteractions)}</strong> interactions chatbot personnel
            </Text>
          </Section>

          <Section style={buttonSection}>
            <Button style={primaryButton} href="https://gaysocial.fr">
              🌈 Retrouver {SITE_DISPLAY}
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Vous recevez cet email car vous êtes membre vérifié de {SITE_DISPLAY}.
          </Text>
          <Text style={footer}>
            À lundi prochain pour le prochain récap ! 🌈
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WeeklyDigestEmail,
  subject: '📊 Votre récap Gay Social de la semaine 🌈',
  displayName: 'Récapitulatif hebdomadaire',
  previewData: {
    pseudo: 'Maxime',
    weekLabel: 'du 14 au 20 avril',
    profileVisits: 42,
    newMessages: 7,
    reactionsReceived: 12,
    swipesReceived: 18,
    newMembers: 156,
    totalMembers: 12480,
    tweensCount: 423,
    swipesGlobal: 8920,
    chatbotInteractions: 215,
    messagesGlobal: 14250,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '600px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '20px 0 8px' }
const logoStyle = { fontSize: '30px', fontWeight: '800' as const, margin: '0', letterSpacing: '-0.5px' }
const logoGay = { color: '#e63946' }
const logoSocial = { color: '#1a6fb5' }
const tagline = { fontSize: '13px', color: '#8899aa', margin: '6px 0 0', textTransform: 'uppercase' as const, letterSpacing: '1.5px', fontWeight: '600' as const }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a2940', margin: '24px 0 8px', textAlign: 'center' as const }
const intro = { fontSize: '15px', color: '#3d4f66', lineHeight: '1.6', margin: '0 0 16px', textAlign: 'center' as const }
const dividerSection = { margin: '24px 0 12px' }
const sectionTitle = { fontSize: '17px', fontWeight: '700' as const, color: '#1a2940', margin: '0 0 8px' }
const statsGrid = { margin: '0 0 8px' }
const statCol = {
  backgroundColor: '#f8fafc',
  padding: '14px 16px',
  margin: '4px',
  borderRadius: '10px',
  width: '48%',
  display: 'inline-block' as const,
}
const statValue = { fontSize: '26px', fontWeight: '800' as const, margin: '0', lineHeight: '1.1' }
const statLabel = { fontSize: '12px', color: '#64748b', margin: '4px 0 0', textTransform: 'uppercase' as const, letterSpacing: '0.5px', fontWeight: '600' as const }
const emptyBox = { backgroundColor: '#f8fafc', borderRadius: '10px', padding: '16px 18px', textAlign: 'center' as const }
const emptyText = { fontSize: '14px', color: '#64748b', margin: '0', lineHeight: '1.5' }
const communityBox = { backgroundColor: '#f0f7ff', borderRadius: '12px', padding: '20px', margin: '0 0 14px' }
const communityStat = { textAlign: 'center' as const, padding: '0 8px' }
const communityValue = { fontSize: '28px', fontWeight: '800' as const, margin: '0', lineHeight: '1.1' }
const communityLabel = { fontSize: '12px', color: '#64748b', margin: '6px 0 0', textTransform: 'uppercase' as const, letterSpacing: '0.5px', fontWeight: '600' as const }
const engagementBox = { backgroundColor: '#fffbeb', borderRadius: '12px', padding: '18px 20px', margin: '0 0 16px', borderLeft: '4px solid #f59e0b' }
const engagementTitle = { fontSize: '15px', fontWeight: '700' as const, color: '#92400e', margin: '0 0 10px' }
const engagementItem = { fontSize: '14px', color: '#1a2940', lineHeight: '1.9', margin: '0' }
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
const hr = { borderColor: '#e5e9f0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#8899aa', margin: '0 0 4px', textAlign: 'center' as const }
