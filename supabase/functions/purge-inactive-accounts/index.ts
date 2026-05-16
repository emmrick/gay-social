import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { logCronRun } from "../_shared/cron-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const INACTIVITY_YEARS = 2
const WARNING_DAYS = [90, 30, 7] // Days before purge to send warnings

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  const __cronStart = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const now = new Date()
    const purgeDate = new Date(now)
    purgeDate.setFullYear(purgeDate.getFullYear() - INACTIVITY_YEARS)

    console.log(`[PURGE-INACTIVE] Purging accounts with last_seen before ${purgeDate.toISOString()}`)

    // 1. SEND WARNING NOTIFICATIONS for accounts approaching inactivity deadline
    let warningsSent = 0
    for (const daysBefore of WARNING_DAYS) {
      // Calculate the date that corresponds to (2 years - daysBefore days) of inactivity
      const warningThreshold = new Date(now)
      warningThreshold.setFullYear(warningThreshold.getFullYear() - INACTIVITY_YEARS)
      warningThreshold.setDate(warningThreshold.getDate() + daysBefore)

      const warningStart = new Date(warningThreshold)
      warningStart.setHours(0, 0, 0, 0)
      const warningEnd = new Date(warningThreshold)
      warningEnd.setHours(23, 59, 59, 999)

      // Find users whose last_seen falls on this specific day
      const { data: warningUsers } = await supabase
        .from('profiles')
        .select('user_id, username')
        .gte('last_seen', warningStart.toISOString())
        .lte('last_seen', warningEnd.toISOString())

      if (warningUsers && warningUsers.length > 0) {
        // Check if they already received this warning
        for (const user of warningUsers) {
          const warningTag = `inactivity_warning_${daysBefore}d`
          const { data: existingNotif } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.user_id)
            .eq('type', warningTag)
            .limit(1)

          if (!existingNotif || existingNotif.length === 0) {
            await supabase.from('notifications').insert({
              user_id: user.user_id,
              type: warningTag,
              title: '⚠️ Compte inactif',
              message: daysBefore >= 30
                ? `Ton compte sera supprimé dans ${daysBefore} jours pour cause d'inactivité. Connecte-toi pour éviter la suppression de toutes tes données.`
                : `⏳ Attention ! Ton compte et toutes tes données seront définitivement supprimés dans ${daysBefore} jour${daysBefore > 1 ? 's' : ''} si tu ne te reconnectes pas.`,
              is_read: false,
            })
            warningsSent++
          }
        }
      }
    }

    console.log(`[PURGE-INACTIVE] ${warningsSent} warning notifications sent`)

    // 2. FIND ACCOUNTS TO PURGE (last_seen older than 2 years)
    const { data: inactiveUsers, error: fetchError } = await supabase
      .from('profiles')
      .select('user_id, username')
      .lt('last_seen', purgeDate.toISOString())

    if (fetchError) {
      throw new Error(`Error fetching inactive users: ${fetchError.message}`)
    }

    if (!inactiveUsers || inactiveUsers.length === 0) {
      console.log('[PURGE-INACTIVE] No inactive accounts to purge')
      return new Response(JSON.stringify({
        success: true,
        purged: 0,
        warnings_sent: warningsSent,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    console.log(`[PURGE-INACTIVE] Found ${inactiveUsers.length} inactive accounts to purge`)

    let purgedCount = 0
    let errors: string[] = []

    for (const user of inactiveUsers) {
      try {
        const userId = user.user_id
        console.log(`[PURGE-INACTIVE] Purging user ${userId} (${user.username || 'no username'})`)

        // Delete all user storage files
        const storageBuckets = ['avatars', 'chat-media', 'verification-documents', 'albums', 'ephemeral-media', 'stories']
        for (const bucket of storageBuckets) {
          try {
            const { data: files } = await supabase.storage
              .from(bucket)
              .list(userId)
            
            if (files && files.length > 0) {
              const filePaths = files.map(f => `${userId}/${f.name}`)
              await supabase.storage.from(bucket).remove(filePaths)
            }
          } catch (e) {
            // Bucket might not exist or no files, continue
          }
        }

        // Delete from all related tables (cascade should handle most, but be thorough)
        const tablesToClean = [
          'messages',
          'private_conversation_status',
          'message_read_status',
          'conversation_mute_preferences',
          'group_mute_preferences',
          'chat_room_members',
          'message_reactions',
          'group_message_reads',
          'pinned_messages',
          'notifications',
          'notification_preferences',
          'push_subscriptions',
          'user_favorites',
          'profile_reactions',
          'user_albums',
          'album_shares',
          'ephemeral_media',
          'stories',
          'user_credits',
          'credit_transactions',
          'credit_purchase_requests',
          'identity_verifications',
          'reports',
          'moderation_actions',
          'moderation_tasks',
          'moderator_earnings',
          'moderator_wallets',
          'moderator_permissions',
          'moderator_action_cooldowns',
          'moderator_saved_replies',
          'premium_subscriptions',
          'swipe_actions',
          'user_blocks',
          'referral_codes',
          'referrals',
          'chatbot_conversations',
          'chatbot_configs',
          'nearby_profiles_unlock',
          'favorite_regions',
          'support_tickets',
          'support_messages',
          'security_events',
          'error_logs',
          'user_roles',
          'profile_photos',
          'user_usage',
        ]

        for (const table of tablesToClean) {
          try {
            await supabase.from(table).delete().eq('user_id', userId)
          } catch (e) {
            // Some tables might not have user_id column, skip
          }
        }

        // Also clean tables where user might be referenced differently
        try {
          await supabase.from('messages').delete().eq('sender_id', userId)
          await supabase.from('messages').delete().eq('recipient_id', userId)
          await supabase.from('reports').delete().eq('reporter_id', userId)
          await supabase.from('reports').delete().eq('reported_user_id', userId)
          await supabase.from('album_shares').delete().eq('shared_by_user_id', userId)
          await supabase.from('album_shares').delete().eq('shared_with_user_id', userId)
          await supabase.from('user_favorites').delete().eq('favorite_user_id', userId)
        } catch (e) {
          // Continue
        }

        // Delete the profile
        await supabase.from('profiles').delete().eq('user_id', userId)

        // Delete the auth user (permanent)
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId)
        if (deleteAuthError) {
          console.error(`[PURGE-INACTIVE] Error deleting auth user ${userId}: ${deleteAuthError.message}`)
          errors.push(`Auth delete failed for ${userId}: ${deleteAuthError.message}`)
        } else {
          purgedCount++
          console.log(`[PURGE-INACTIVE] Successfully purged user ${userId}`)
        }
      } catch (e) {
        console.error(`[PURGE-INACTIVE] Error purging user ${user.user_id}: ${e.message}`)
        errors.push(`${user.user_id}: ${e.message}`)
      }
    }

    console.log(`[PURGE-INACTIVE] Complete. Purged: ${purgedCount}, Errors: ${errors.length}`)

    return new Response(JSON.stringify({
      success: true,
      purged: purgedCount,
      warnings_sent: warningsSent,
      errors: errors.length > 0 ? errors : undefined,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })


    await logCronRun("purge-inactive-accounts", "success", { durationMs: Date.now() - __cronStart });

  } catch (error) {
    const __errMsg = (error instanceof Error) ? error.message : String(error);
    await logCronRun("purge-inactive-accounts", "error", { durationMs: Date.now() - __cronStart, errorMessage: __errMsg });
    console.error('[PURGE-INACTIVE] Fatal error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
