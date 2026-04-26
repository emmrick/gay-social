/**
 * Henry — Matching engine.
 * Returns up to N real verified profiles matching collected criteria
 * with a compatibility score (0-100) and shared interests.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

interface MatchRequest {
  exclude_user_ids?: string[]
  limit?: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'NOT_AUTHENTICATED' }, 401)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    // Identify caller from JWT
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: userData } = await userClient.auth.getUser()
    const me = userData?.user
    if (!me) return json({ error: 'NOT_AUTHENTICATED' }, 401)

    const body = (await req.json().catch(() => ({}))) as MatchRequest
    const exclude = new Set(body.exclude_user_ids ?? [])
    exclude.add(me.id)
    const limit = Math.min(Math.max(body.limit ?? 5, 1), 10)

    // Fetch Henry conversation criteria
    const { data: conv } = await supabase
      .from('henry_conversations')
      .select('*')
      .eq('user_id', me.id)
      .maybeSingle()

    const goal: string | null = conv?.relationship_goal ?? null
    const ageMin: number = conv?.age_min ?? 18
    const ageMax: number = conv?.age_max ?? 99
    const region: string | null = conv?.region ?? null
    const tribes: string[] = Array.isArray(conv?.tribes) ? conv!.tribes : []
    const interests: string[] = Array.isArray(conv?.interests) ? conv!.interests : []

    // Fetch blocked users (both directions) to filter them out
    const [{ data: iBlocked }, { data: blockedMe }] = await Promise.all([
      supabase.from('user_personal_blocks').select('blocked_id').eq('blocker_id', me.id),
      supabase.from('user_personal_blocks').select('blocker_id').eq('blocked_id', me.id),
    ])
    ;(iBlocked ?? []).forEach((b: any) => exclude.add(b.blocked_id))
    ;(blockedMe ?? []).forEach((b: any) => exclude.add(b.blocker_id))

    // Pull a candidate pool of VERIFIED profiles only (identité validée),
    // avec photo, âge dans la fourchette. Henry ne propose JAMAIS de profils non vérifiés.
    let q = supabase
      .from('profiles')
      .select(
        'user_id, username, age, region, bio, avatar_url, looking_for, tribes, is_verified, is_online, last_seen, hide_online_status',
      )
      .eq('is_verified', true)
      .not('avatar_url', 'is', null)
      .neq('avatar_url', '')
      .gte('age', ageMin)
      .lte('age', ageMax)
      .limit(80)

    if (region) q = q.eq('region', region)

    const { data: candidates, error } = await q
    if (error) throw error

    // Filtre supplémentaire : exclure les comptes suspendus / bannis globalement
    const baseFiltered = (candidates ?? []).filter((p: any) => !exclude.has(p.user_id) && p.is_verified === true)

    const suspensionChecks = await Promise.all(
      baseFiltered.map(async (p: any) => {
        try {
          const { data: suspended } = await supabase.rpc('is_user_suspended', { _user_id: p.user_id })
          return { user_id: p.user_id, suspended: suspended === true }
        } catch {
          return { user_id: p.user_id, suspended: false }
        }
      }),
    )
    const suspendedSet = new Set(
      suspensionChecks.filter((c) => c.suspended).map((c) => c.user_id),
    )
    const filtered = baseFiltered.filter((p: any) => !suspendedSet.has(p.user_id))

    // Score each candidate
    const interestSet = new Set(interests.map((i) => i.toLowerCase()))
    const tribeSet = new Set(tribes)

    const scored = filtered.map((p: any) => {
      let score = 40 // baseline (verified + photo + age range)
      const reasons: string[] = []
      const shared: string[] = []

      if (goal && Array.isArray(p.looking_for) && p.looking_for.includes(goal)) {
        score += 25
        reasons.push('Recherche le même type de relation')
      }
      if (region && p.region === region) {
        score += 15
        reasons.push('Même région')
      }
      const pTribes: string[] = Array.isArray(p.tribes) ? p.tribes : []
      const sharedTribes = pTribes.filter((t) => tribeSet.has(t))
      if (sharedTribes.length > 0) {
        score += Math.min(15, sharedTribes.length * 5)
        shared.push(...sharedTribes)
      }
      // Bio interest matching (basic keyword overlap)
      if (p.bio && interestSet.size > 0) {
        const bioLower = String(p.bio).toLowerCase()
        let hits = 0
        interestSet.forEach((kw) => {
          if (bioLower.includes(kw)) hits++
        })
        if (hits > 0) {
          score += Math.min(10, hits * 4)
          reasons.push(`${hits} centre${hits > 1 ? 's' : ''} d'intérêt en commun`)
        }
      }
      if (p.is_online && !p.hide_online_status) {
        score += 5
        reasons.push('En ligne maintenant')
      }

      score = Math.min(99, score)
      return {
        user_id: p.user_id,
        username: p.username,
        age: p.age,
        region: p.region,
        bio: p.bio,
        avatar_url: p.avatar_url,
        is_online: p.is_online && !p.hide_online_status,
        compatibility: score,
        shared_tribes: sharedTribes,
        reasons,
      }
    })

    scored.sort((a, b) => b.compatibility - a.compatibility)
    const top = scored.slice(0, limit)

    // Resolve signed avatar URLs (avatars bucket is private)
    const withAvatars = await Promise.all(
      top.map(async (p) => {
        if (!p.avatar_url) return p
        // Already a full URL ?
        if (p.avatar_url.startsWith('http')) return p
        try {
          const { data } = await supabase.storage
            .from('avatars')
            .createSignedUrl(p.avatar_url, 60 * 60)
          return { ...p, avatar_url: data?.signedUrl ?? p.avatar_url }
        } catch {
          return p
        }
      }),
    )

    return json({ profiles: withAvatars, criteria: { goal, ageMin, ageMax, region, tribes, interests } })
  } catch (err) {
    console.error('[henry-match]', err)
    const msg = err instanceof Error ? err.message : 'INTERNAL_ERROR'
    return json({ error: msg }, 500)
  }
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
