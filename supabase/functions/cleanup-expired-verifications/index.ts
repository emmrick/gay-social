import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// RGPD Compliance: Auto-delete identity documents after 48 hours
const MAX_RETENTION_HOURS = 48

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Calculate the cutoff time (48 hours ago)
    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - MAX_RETENTION_HOURS)
    const cutoffISOString = cutoffTime.toISOString()

    console.log(`[RGPD Cleanup] Starting cleanup for verifications submitted before ${cutoffISOString}`)

    // Find pending verifications that have exceeded the 48-hour limit
    const { data: expiredVerifications, error: fetchError } = await supabase
      .from('identity_verifications')
      .select('id, user_id, selfie_url, id_front_url, id_back_url')
      .eq('status', 'pending')
      .eq('documents_deleted', false)
      .not('submitted_at', 'is', null)
      .lt('submitted_at', cutoffISOString)

    if (fetchError) {
      console.error('[RGPD Cleanup] Error fetching expired verifications:', fetchError)
      throw fetchError
    }

    console.log(`[RGPD Cleanup] Found ${expiredVerifications?.length || 0} expired verifications`)

    let deletedCount = 0
    let errorCount = 0

    for (const verification of expiredVerifications || []) {
      try {
        // Delete files from storage
        const { data: files } = await supabase.storage
          .from('identity-documents')
          .list(verification.user_id)

        if (files && files.length > 0) {
          const filePaths = files.map(f => `${verification.user_id}/${f.name}`)
          const { error: deleteStorageError } = await supabase.storage
            .from('identity-documents')
            .remove(filePaths)

          if (deleteStorageError) {
            console.error(`[RGPD Cleanup] Error deleting storage files for user ${verification.user_id}:`, deleteStorageError)
          } else {
            console.log(`[RGPD Cleanup] Deleted ${filePaths.length} files for user ${verification.user_id}`)
          }
        }

        // Update the verification record - auto-reject due to timeout
        const { error: updateError } = await supabase
          .from('identity_verifications')
          .update({
            status: 'rejected',
            rejection_reason: 'Délai de traitement dépassé (48h). Veuillez soumettre à nouveau votre demande.',
            reviewed_at: new Date().toISOString(),
            documents_deleted: true,
            selfie_url: null,
            id_front_url: null,
            id_back_url: null,
          })
          .eq('id', verification.id)

        if (updateError) {
          console.error(`[RGPD Cleanup] Error updating verification ${verification.id}:`, updateError)
          errorCount++
        } else {
          deletedCount++
          console.log(`[RGPD Cleanup] Successfully cleaned up verification ${verification.id}`)
        }
      } catch (err) {
        console.error(`[RGPD Cleanup] Error processing verification ${verification.id}:`, err)
        errorCount++
      }
    }

    // Also clean up any orphaned storage files for already processed verifications
    const { data: processedVerifications, error: processedError } = await supabase
      .from('identity_verifications')
      .select('user_id')
      .eq('documents_deleted', false)
      .in('status', ['approved', 'rejected'])

    if (!processedError && processedVerifications) {
      for (const verification of processedVerifications) {
        try {
          const { data: files } = await supabase.storage
            .from('identity-documents')
            .list(verification.user_id)

          if (files && files.length > 0) {
            const filePaths = files.map(f => `${verification.user_id}/${f.name}`)
            await supabase.storage
              .from('identity-documents')
              .remove(filePaths)

            // Mark as cleaned
            await supabase
              .from('identity_verifications')
              .update({ 
                documents_deleted: true,
                selfie_url: null,
                id_front_url: null,
                id_back_url: null,
              })
              .eq('user_id', verification.user_id)

            console.log(`[RGPD Cleanup] Cleaned orphaned files for processed user ${verification.user_id}`)
          }
        } catch (err) {
          console.error(`[RGPD Cleanup] Error cleaning orphaned files for user ${verification.user_id}:`, err)
        }
      }
    }

    const result = {
      success: true,
      message: `RGPD cleanup completed`,
      expiredVerificationsFound: expiredVerifications?.length || 0,
      successfullyDeleted: deletedCount,
      errors: errorCount,
      timestamp: new Date().toISOString(),
    }

    console.log('[RGPD Cleanup] Cleanup completed:', result)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[RGPD Cleanup] Fatal error:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
