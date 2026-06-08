// Send weekly digest emails to all verified users.
// Called by pg_cron every Monday at 9h Paris time.
// Computes per-user stats (visits, messages, reactions, swipes received)
// and global community stats over the last 7 days, then enqueues one
// transactional email per recipient (one-to-one, opt-out aware).

import { createClient } from 'npm:@supabase/supabase-js@2'
import { requireServiceRole } from '../_shared/auth-guard.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface PerUserStats {
  profileVisits: number
  newMessages: number
  reactionsReceived: number
  swipesReceived: number
}

const formatWeekLabel = (start: Date, end: Date): string => {
  const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']
  const sd = start.getDate()
  const sm = months[start.getMonth()]
  const ed = end.getDate()
  const em = months[end.getMonth()]
  if (sm === em) return `du ${sd} au ${ed} ${em}`
  return `du ${sd} ${sm} au ${ed} ${em}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const startedAt = Date.now()
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // Optional dry-run / single-user-test mode
  let dryRun = false
  let testUserId: string | null = null
  try {
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      dryRun = !!body.dryRun
      testUserId = typeof body.testUserId === 'string' ? body.testUserId : null
    }
  } catch { /* ignore */ }

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const weekAgoIso = weekAgo.toISOString()
  const weekLabel = formatWeekLabel(weekAgo, now)

  console.log(`[WeeklyDigest] Starting (since ${weekAgoIso}, dryRun=${dryRun}, testUser=${testUserId ?? 'none'})`)

  // ---- GLOBAL COMMUNITY STATS (computed once) ----
  const [
    { count: totalMembers },
    { count: newMembers },
    { count: tweensCount },
    { count: swipesGlobal },
    { count: messagesGlobal },
    { count: chatbotInteractions },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgoIso),
    supabase.from('tweens').select('*', { count: 'exact', head: true }).gte('created_at', weekAgoIso).eq('is_deleted', false),
    supabase.from('swipe_actions').select('*', { count: 'exact', head: true }).gte('created_at', weekAgoIso),
    supabase.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', weekAgoIso),
    // Proxy: count messages sent to chatbot owners (chatbot interactions)
    supabase.from('messages').select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgoIso)
      .eq('message_type', 'chatbot_interaction'),
  ])

  const globalStats = {
    newMembers: newMembers ?? 0,
    totalMembers: totalMembers ?? 0,
    tweensCount: tweensCount ?? 0,
    swipesGlobal: swipesGlobal ?? 0,
    messagesGlobal: messagesGlobal ?? 0,
    chatbotInteractions: chatbotInteractions ?? 0,
  }

  console.log('[WeeklyDigest] Global stats:', globalStats)

  // ---- TARGET RECIPIENTS ----
  // Verified users (is_verified=true), excluding opt-outs and suppressed emails
  let recipientsQuery = supabase
    .from('profiles')
    .select('user_id, username')
    .eq('is_verified', true)

  if (testUserId) recipientsQuery = recipientsQuery.eq('user_id', testUserId)

  const { data: recipients, error: recipientsError } = await recipientsQuery
  if (recipientsError) {
    console.error('[WeeklyDigest] Failed to load recipients:', recipientsError)
    return new Response(JSON.stringify({ error: recipientsError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Opt-outs — fail-closed: if we can't load the list, abort instead of risk
  // sending to users who opted out. Also normalise + dedupe to defend against
  // null user_ids or duplicate rows.
  const { data: optOuts, error: optOutsError } = await supabase
    .from('weekly_digest_unsubscribes')
    .select('user_id')

  if (optOutsError) {
    console.error('[WeeklyDigest] Failed to load opt-outs, aborting to avoid sending to unsubscribed users:', optOutsError)
    return new Response(
      JSON.stringify({ error: 'Failed to load opt-outs', details: optOutsError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const optOutSet = new Set<string>(
    (optOuts ?? [])
      .map((r: any) => (typeof r?.user_id === 'string' ? r.user_id.trim() : null))
      .filter((v: string | null): v is string => !!v),
  )
  console.log(`[WeeklyDigest] Loaded ${optOutSet.size} unique opt-outs (raw rows: ${optOuts?.length ?? 0})`)

  const eligible = (recipients ?? []).filter((r: any) => {
    const uid = typeof r?.user_id === 'string' ? r.user_id.trim() : null
    if (!uid) return false // skip corrupted recipient rows
    return !optOutSet.has(uid)
  })
  console.log(`[WeeklyDigest] Eligible recipients: ${eligible.length} / ${recipients?.length ?? 0}`)

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const profile of eligible) {
    const userId = profile.user_id

    // Per-user stats (parallel)
    const [
      { count: profileVisits },
      { count: newMessages },
      { count: reactionsReceived },
      { count: swipesReceived },
    ] = await Promise.all([
      supabase.from('profile_visits').select('*', { count: 'exact', head: true })
        .eq('visited_user_id', userId)
        .gte('visited_at', weekAgoIso),
      supabase.from('messages').select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .gte('created_at', weekAgoIso),
      supabase.from('profile_reactions').select('*', { count: 'exact', head: true })
        .eq('profile_user_id', userId)
        .gte('created_at', weekAgoIso),
      supabase.from('swipe_actions').select('*', { count: 'exact', head: true })
        .eq('target_user_id', userId)
        .eq('action_type', 'like')
        .gte('created_at', weekAgoIso),
    ])

    const userStats: PerUserStats = {
      profileVisits: profileVisits ?? 0,
      newMessages: newMessages ?? 0,
      reactionsReceived: reactionsReceived ?? 0,
      swipesReceived: swipesReceived ?? 0,
    }

    if (dryRun) {
      console.log(`[WeeklyDigest][dryRun] ${profile.username}`, userStats)
      sent += 1
      continue
    }

    try {
      const { error: invokeError } = await supabase.functions.invoke('send-user-email', {
        body: {
          userId,
          templateName: 'weekly-digest',
          templateData: {
            pseudo: profile.username ?? undefined,
            weekLabel,
            ...userStats,
            ...globalStats,
          },
        },
      })
      if (invokeError) {
        failed += 1
        console.error(`[WeeklyDigest] invoke failed for ${userId}:`, invokeError.message)
      } else {
        sent += 1
      }
    } catch (e) {
      failed += 1
      console.error(`[WeeklyDigest] exception for ${userId}:`, e)
    }

    // Small spacing to ease downstream throttle (resend-sender already throttles)
    await new Promise((r) => setTimeout(r, 60))
  }

  const elapsedMs = Date.now() - startedAt
  const summary = {
    success: true,
    elapsedMs,
    weekLabel,
    eligibleCount: eligible.length,
    sent,
    skipped,
    failed,
    globalStats,
    dryRun,
  }
  console.log('[WeeklyDigest] Done:', summary)

  return new Response(JSON.stringify(summary), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
