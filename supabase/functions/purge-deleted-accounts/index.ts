import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logCronRun } from "../_shared/cron-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  const __cronStart = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find all pending deletion requests that have passed the 30-day grace period
    const { data: expiredRequests, error: fetchError } = await supabase
      .from('account_deletion_requests')
      .select('id, user_id')
      .eq('status', 'pending')
      .lte('scheduled_deletion_at', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching expired requests:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!expiredRequests || expiredRequests.length === 0) {
      return new Response(JSON.stringify({ message: 'No accounts to purge', count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let purgedCount = 0;
    const errors: string[] = [];

    for (const request of expiredRequests) {
      try {
        const userId = request.user_id;

        // Delete user data from all tables (order matters for foreign keys)
        const tablesToClean = [
          { table: 'message_reactions', column: 'user_id' },
          { table: 'group_message_reads', column: 'user_id' },
          { table: 'group_event_rsvps', column: 'user_id' },
          { table: 'message_read_status', column: 'user_id' },
          { table: 'private_conversation_status', column: 'user_id' },
          { table: 'conversation_mute_preferences', column: 'user_id' },
          { table: 'group_mute_preferences', column: 'user_id' },
          { table: 'notification_preferences', column: 'user_id' },
          { table: 'notifications', column: 'user_id' },
          { table: 'credit_transactions', column: 'user_id' },
          { table: 'user_credits', column: 'user_id' },
          { table: 'credit_purchase_requests', column: 'user_id' },
          { table: 'favorite_regions', column: 'user_id' },
          { table: 'user_favorites', column: 'user_id' },
          { table: 'user_favorites', column: 'favorite_user_id' },
          { table: 'profile_reactions', column: 'reactor_id' },
          { table: 'profile_reactions', column: 'target_user_id' },
          { table: 'album_shares', column: 'shared_by_user_id' },
          { table: 'album_media', column: 'album_id', subquery: true, parentTable: 'user_albums', parentColumn: 'user_id' },
          { table: 'user_albums', column: 'user_id' },
          { table: 'profile_photos', column: 'user_id' },
          { table: 'ephemeral_media', column: 'message_id', subquery: true, parentTable: 'messages', parentColumn: 'sender_id' },
          { table: 'chat_room_members', column: 'user_id' },
          { table: 'identity_verifications', column: 'user_id' },
          { table: 'user_personal_blocks', column: 'blocker_id' },
          { table: 'user_personal_blocks', column: 'blocked_id' },
          { table: 'reports', column: 'reporter_id' },
          { table: 'user_blocks', column: 'user_id' },
          { table: 'user_roles', column: 'user_id' },
          { table: 'referral_codes', column: 'user_id' },
          { table: 'stories', column: 'user_id' },
          { table: 'swipe_actions', column: 'swiper_id' },
          { table: 'swipe_actions', column: 'target_id' },
          { table: 'push_subscriptions', column: 'user_id' },
          { table: 'nearby_profiles_unlock', column: 'user_id' },
          { table: 'saved_messages', column: 'user_id' },
          { table: 'chatbot_conversations', column: 'visitor_user_id' },
        ];

        for (const item of tablesToClean) {
          try {
            if (item.subquery && item.parentTable && item.parentColumn) {
              // For nested deletes, we need to get IDs first
              const { data: parentIds } = await supabase
                .from(item.parentTable)
                .select('id')
                .eq(item.parentColumn, userId);
              
              if (parentIds && parentIds.length > 0) {
                const ids = parentIds.map((p: any) => p.id);
                await supabase.from(item.table).delete().in(item.column, ids);
              }
            } else {
              await supabase.from(item.table).delete().eq(item.column, userId);
            }
            await logCronRun("purge-deleted-accounts", "success", { durationMs: Date.now() - __cronStart });
          } catch (e) {
    await logCronRun("purge-deleted-accounts", "error", { durationMs: Date.now() - __cronStart, errorMessage: __errMsg });
            // Continue with other tables even if one fails
            console.warn(`Warning cleaning ${item.table}: ${e}`);
          }
        }

        // Delete messages (soft delete first, then hard delete)
        await supabase.from('messages').delete().eq('sender_id', userId);

        // Delete private conversations
        await supabase.from('private_conversations').delete().or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

        // Delete profile
        await supabase.from('profiles').delete().eq('user_id', userId);

        // Mark deletion request as completed
        await supabase
          .from('account_deletion_requests')
          .update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', request.id);

        // Finally, delete the auth user
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
        if (authDeleteError) {
          console.error(`Error deleting auth user ${userId}:`, authDeleteError);
          errors.push(`Auth delete failed for ${userId}: ${authDeleteError.message}`);
        }

        purgedCount++;
        console.log(`Successfully purged account: ${userId}`);
      } catch (e) {
        console.error(`Error purging account ${request.user_id}:`, e);
        errors.push(`${request.user_id}: ${e}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Purged ${purgedCount} accounts`, 
        count: purgedCount,
        errors: errors.length > 0 ? errors : undefined 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    await logCronRun("purge-deleted-accounts", "success", { durationMs: Date.now() - __cronStart });

  } catch (e) {
    const __errMsg = (e instanceof Error) ? e.message : String(e);
    await logCronRun("purge-deleted-accounts", "error", { durationMs: Date.now() - __cronStart, errorMessage: __errMsg });
    console.error('Purge error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
