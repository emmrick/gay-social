import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PURGE_AFTER_DAYS = 30
const WARNING_DAYS = [7, 3, 1] // Days before purge to send warnings

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const now = new Date()
    const purgeDate = new Date(now)
    purgeDate.setDate(purgeDate.getDate() - PURGE_AFTER_DAYS)

    console.log(`[PURGE] Starting purge for accounts created before ${purgeDate.toISOString()}`)

    // 1. SEND WARNING NOTIFICATIONS for accounts approaching the deadline
    // ONLY for users who have NEVER been verified (first_verified_at IS NULL)
    let warningsSent = 0
    for (const daysBefore of WARNING_DAYS) {
      const targetDate = new Date(now)
      targetDate.setDate(targetDate.getDate() - (PURGE_AFTER_DAYS - daysBefore))
      const targetStart = new Date(targetDate)
      targetStart.setHours(0, 0, 0, 0)
      const targetEnd = new Date(targetDate)
      targetEnd.setHours(23, 59, 59, 999)

      // Find unverified users created on this target day WHO HAVE NEVER BEEN VERIFIED
      const { data: warningUsers } = await supabase
        .from('profiles')
        .select('user_id, username')
        .eq('is_verified', false)
        .is('first_verified_at', null) // NEVER verified before
        .gte('created_at', targetStart.toISOString())
        .lte('created_at', targetEnd.toISOString())

      if (warningUsers && warningUsers.length > 0) {
        // Filter out users who have a pending/approved verification
        const userIds = warningUsers.map(u => u.user_id)
        const { data: pendingVerifs } = await supabase
          .from('identity_verifications')
          .select('user_id')
          .in('user_id', userIds)
          .in('status', ['approved', 'pending'])

        const exemptUserIds = new Set(pendingVerifs?.map(v => v.user_id) || [])
        const eligibleUsers = warningUsers.filter(u => !exemptUserIds.has(u.user_id))

        for (const user of eligibleUsers) {
          // Check if notification already sent today
          const { data: existingNotif } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.user_id)
            .eq('type', 'purge_warning')
            .gte('created_at', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString())
            .limit(1)

          if (!existingNotif || existingNotif.length === 0) {
            const urgency = daysBefore === 1 ? '🚨 DERNIER JOUR' : daysBefore === 3 ? '⚠️ Attention' : '⏰ Rappel'
            const title = `${urgency} — Suppression dans ${daysBefore} jour${daysBefore > 1 ? 's' : ''} !`
            const message = `Ton compte sera définitivement supprimé dans ${daysBefore} jour${daysBefore > 1 ? 's' : ''} si tu ne vérifies pas ton identité. Toutes tes données, messages, photos et albums seront détruits de nos serveurs sans possibilité de récupération.`

            await supabase.from('notifications').insert({
              user_id: user.user_id,
              type: 'purge_warning',
              title,
              message,
              action_url: '/',
              is_read: false,
            })
            warningsSent++

            // Send push notification for J-3 and J-1
            if (daysBefore <= 3) {
              try {
                await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                  },
                  body: JSON.stringify({
                    userId: user.user_id,
                    title,
                    body: message,
                    url: '/',
                    notificationType: 'system',
                  }),
                })
                console.log(`[PURGE] Push notification sent to ${user.user_id} (J-${daysBefore})`)
              } catch (pushErr) {
                console.warn(`[PURGE] Failed to send push to ${user.user_id}:`, pushErr)
              }
            }
          }
        }
      }
    }

    console.log(`[PURGE] Sent ${warningsSent} warning notifications`)

    // 2. PURGE accounts older than 30 days without verification
    // ONLY users who have NEVER been verified (first_verified_at IS NULL)
    const { data: accountsToPurge } = await supabase
      .from('profiles')
      .select('user_id, username')
      .eq('is_verified', false)
      .is('first_verified_at', null) // NEVER verified before — re-verifications are excluded
      .lt('created_at', purgeDate.toISOString())

    if (!accountsToPurge || accountsToPurge.length === 0) {
      console.log('[PURGE] No accounts to purge')
      return new Response(JSON.stringify({
        success: true,
        purged: 0,
        warningsSent,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Extra safety: filter out users who have any approved verification record
    const purgeUserIds = accountsToPurge.map(u => u.user_id)
    const { data: approvedVerifs } = await supabase
      .from('identity_verifications')
      .select('user_id')
      .in('user_id', purgeUserIds)
      .eq('status', 'approved')

    const approvedSet = new Set(approvedVerifs?.map(v => v.user_id) || [])
    const finalPurgeList = accountsToPurge.filter(u => !approvedSet.has(u.user_id))

    console.log(`[PURGE] Purging ${finalPurgeList.length} never-verified accounts (excluded ${accountsToPurge.length - finalPurgeList.length} previously verified)`)

    let purgedCount = 0
    let errorCount = 0

    for (const account of finalPurgeList) {
      try {
        const uid = account.user_id
        console.log(`[PURGE] Deleting all data for user ${uid} (${account.username})`)

        // Delete in order (respecting foreign keys)
        // Storage files first
        for (const bucket of ['avatars', 'identity-documents', 'ephemeral-media', 'media']) {
          try {
            const { data: files } = await supabase.storage.from(bucket).list(uid)
            if (files && files.length > 0) {
              await supabase.storage.from(bucket).remove(files.map(f => `${uid}/${f.name}`))
            }
          } catch (e) {
            console.warn(`[PURGE] Could not clean bucket ${bucket} for ${uid}:`, e)
          }
        }

        // Delete all related DB records
        const tables = [
          'notifications', 'credit_transactions', 'user_credits',
          'message_reactions', 'group_message_reads', 'message_read_status',
          'ephemeral_media', 'album_shares', 'album_media', 'user_albums',
          'profile_photos', 'profile_reactions', 'user_favorites',
          'favorite_regions', 'chat_room_members', 'typing_indicators',
          'identity_verifications', 'saved_messages', 'user_usage',
          'notification_preferences', 'push_subscriptions',
          'screenshot_violations', 'swipe_actions', 'nearby_profiles_unlock',
          'profile_view_credits', 'chatbot_conversations', 'user_chatbot_config',
          'private_conversation_status', 'user_personal_blocks',
          'referral_codes', 'referrals', 'reports',
          'ai_moderation_reports', 'investigation_notifications',
          'moderation_actions', 'moderator_permissions', 'moderator_earnings',
          'moderator_wallets', 'moderator_action_cooldowns',
          'user_roles', 'user_blocks', 'premium_subscriptions',
          'credit_purchase_requests', 'withdrawal_requests',
          'group_mute_preferences',
        ]

        for (const table of tables) {
          try {
            await supabase.from(table).delete().eq('user_id', uid)
          } catch (e) {
            // Some tables may use different column names
          }
        }

        // Delete messages (sender_id)
        await supabase.from('messages').delete().eq('sender_id', uid)
        // Delete messages received
        await supabase.from('messages').delete().eq('recipient_id', uid)

        // Delete private conversations
        await supabase.from('private_conversations').delete().or(`user1_id.eq.${uid},user2_id.eq.${uid}`)

        // Delete favorites where this user is the favorite
        await supabase.from('user_favorites').delete().eq('favorite_user_id', uid)

        // Delete personal blocks (both directions)
        await supabase.from('user_personal_blocks').delete().or(`blocker_id.eq.${uid},blocked_id.eq.${uid}`)

        // Delete profile
        await supabase.from('profiles').delete().eq('user_id', uid)

        // Finally delete the auth user
        const { error: authError } = await supabase.auth.admin.deleteUser(uid)
        if (authError) {
          console.error(`[PURGE] Error deleting auth user ${uid}:`, authError)
          errorCount++
        } else {
          purgedCount++
          console.log(`[PURGE] Successfully purged user ${uid}`)
        }
      } catch (err) {
        console.error(`[PURGE] Error purging user ${account.user_id}:`, err)
        errorCount++
      }
    }

    const result = {
      success: true,
      purged: purgedCount,
      errors: errorCount,
      warningsSent,
      timestamp: now.toISOString(),
    }

    console.log('[PURGE] Completed:', result)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[PURGE] Fatal error:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
