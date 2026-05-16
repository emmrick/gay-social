import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { logCronRun } from "../_shared/cron-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ACCOUNT_MAX_AGE_YEARS = 5
const DATA_RETENTION_YEARS = 2
const WARNING_DAYS = [90, 30, 7]

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

    // === PART 1: Warn users approaching 5-year inactivity (based on last_seen) ===
    let warningsSent = 0
    for (const daysBefore of WARNING_DAYS) {
      // Find users whose last_seen is (5 years - daysBefore days) ago
      const targetDate = new Date(now)
      targetDate.setFullYear(targetDate.getFullYear() - ACCOUNT_MAX_AGE_YEARS)
      targetDate.setDate(targetDate.getDate() + daysBefore)

      const dayStart = new Date(targetDate)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(targetDate)
      dayEnd.setHours(23, 59, 59, 999)

      const { data: warningUsers } = await supabase
        .from('profiles')
        .select('user_id, username')
        .gte('last_seen', dayStart.toISOString())
        .lte('last_seen', dayEnd.toISOString())

      if (warningUsers?.length) {
        for (const user of warningUsers) {
          const tag = `account_age_warning_${daysBefore}d`
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.user_id)
            .eq('type', tag)
            .limit(1)

          if (!existing?.length) {
            await supabase.from('notifications').insert({
              user_id: user.user_id,
              type: tag,
              title: '⚠️ Suppression programmée',
              message: `Conformément à notre politique de conservation, ton compte sera supprimé dans ${daysBefore} jour${daysBefore > 1 ? 's' : ''} faute de connexion. Connecte-toi pour repousser cette échéance.`,
              is_read: false,
            })
            warningsSent++
          }
        }
      }
    }

    // === PART 2: Delete accounts inactive for 5+ years (based on last_seen) ===
    const maxAgeDate = new Date(now)
    maxAgeDate.setFullYear(maxAgeDate.getFullYear() - ACCOUNT_MAX_AGE_YEARS)

    const { data: oldAccounts, error: fetchErr } = await supabase
      .from('profiles')
      .select('user_id, username')
      .lt('last_seen', maxAgeDate.toISOString())

    let purgedCount = 0
    const errors: string[] = []

    if (oldAccounts?.length) {
      for (const user of oldAccounts) {
        try {
          const userId = user.user_id

          // Delete storage
          const buckets = ['avatars', 'chat-media', 'verification-documents', 'albums', 'ephemeral-media', 'stories']
          for (const bucket of buckets) {
            try {
              const { data: files } = await supabase.storage.from(bucket).list(userId)
              if (files?.length) {
                await supabase.storage.from(bucket).remove(files.map(f => `${userId}/${f.name}`))
              }
            } catch {}
          }

          // Delete profile (cascades handle related data)
          await supabase.from('profiles').delete().eq('user_id', userId)

          // Delete auth user
          const { error: authErr } = await supabase.auth.admin.deleteUser(userId)
          if (authErr) {
            errors.push(`Auth delete ${userId}: ${authErr.message}`)
          } else {
            purgedCount++
          }
        } catch (e) {
          errors.push(`${user.user_id}: ${e.message}`)
        }
      }
    }

    // === PART 3: Clean data older than 2 years for all users ===
    const retentionDate = new Date(now)
    retentionDate.setFullYear(retentionDate.getFullYear() - DATA_RETENTION_YEARS)
    const retentionISO = retentionDate.toISOString()

    let dataCleanedTables = 0

    const tablesToClean = [
      { table: 'messages', column: 'created_at' },
      { table: 'credit_transactions', column: 'created_at' },
      { table: 'notifications', column: 'created_at' },
      { table: 'security_events', column: 'created_at' },
      { table: 'error_logs', column: 'created_at' },
      { table: 'moderation_actions', column: 'created_at' },
      { table: 'moderator_earnings', column: 'created_at' },
    ]

    for (const { table, column } of tablesToClean) {
      try {
        const { count } = await supabase
          .from(table)
          .delete({ count: 'exact' })
          .lt(column, retentionISO)
        if (count && count > 0) dataCleanedTables++
      } catch {}
    }

    console.log(`[PURGE-OLD] Warnings: ${warningsSent}, Purged: ${purgedCount}, Data cleaned tables: ${dataCleanedTables}`)

    return new Response(JSON.stringify({
      success: true,
      warnings_sent: warningsSent,
      accounts_purged: purgedCount,
      data_cleaned_tables: dataCleanedTables,
      errors: errors.length ? errors : undefined,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })


    await logCronRun("purge-old-accounts", "success", { durationMs: Date.now() - __cronStart });

  } catch (error) {
    const __errMsg = (error instanceof Error) ? error.message : String(error);
    await logCronRun("purge-old-accounts", "error", { durationMs: Date.now() - __cronStart, errorMessage: __errMsg });
    console.error('[PURGE-OLD] Fatal:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
