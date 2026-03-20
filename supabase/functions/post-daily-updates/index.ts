import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get unpublished updates
    const { data: updates, error: updatesError } = await supabase
      .from('site_updates')
      .select('*')
      .eq('is_published', false)
      .order('category', { ascending: true })
      .order('created_at', { ascending: true });

    if (updatesError) throw updatesError;
    if (!updates || updates.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No updates to publish' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Group by category
    const categoryLabels: Record<string, { emoji: string; label: string }> = {
      feature: { emoji: '✨', label: 'Nouvelles fonctionnalités' },
      improvement: { emoji: '⚡', label: 'Améliorations' },
      bugfix: { emoji: '🐛', label: 'Corrections de bugs' },
      other: { emoji: '📌', label: 'Autres changements' },
    };

    const grouped: Record<string, typeof updates> = {};
    for (const u of updates) {
      if (!grouped[u.category]) grouped[u.category] = [];
      grouped[u.category].push(u);
    }

    // Build message
    const today = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    let message = `📢 𝗠𝗶𝘀𝗲𝘀 𝗮̀ 𝗷𝗼𝘂𝗿 𝗱𝘂 𝘀𝗶𝘁𝗲 — ${today}\n\n`;

    const categoryOrder = ['feature', 'improvement', 'bugfix', 'other'];
    for (const cat of categoryOrder) {
      const items = grouped[cat];
      if (!items || items.length === 0) continue;
      const { emoji, label } = categoryLabels[cat];
      message += `${emoji} 𝗗𝗲́𝘁𝗮𝗶𝗹𝘀 : ${label}\n`;
      for (const item of items) {
        message += `• ${item.title}`;
        if (item.description) message += ` — ${item.description}`;
        message += '\n';
      }
      message += '\n';
    }

    message += `Bonne utilisation ! 💜`;

    // Find announcement channel room
    const { data: announcementRoom } = await supabase
      .from('chat_rooms')
      .select('id')
      .eq('region_code', 'announcement')
      .maybeSingle();

    if (!announcementRoom) {
      return new Response(JSON.stringify({ success: false, error: 'Announcement channel not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get an admin user to be the sender
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle();

    if (!adminRole) {
      return new Response(JSON.stringify({ success: false, error: 'No admin user found' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Post the message to announcement channel
    const { error: msgError } = await supabase.from('messages').insert({
      chat_room_id: announcementRoom.id,
      sender_id: adminRole.user_id,
      content: message,
      message_type: 'text',
      is_private: false,
    });

    if (msgError) throw msgError;

    // Mark all updates as published
    const updateIds = updates.map((u) => u.id);
    await supabase
      .from('site_updates')
      .update({ is_published: true, published_at: new Date().toISOString() })
      .in('id', updateIds);

    // Send push notification to all users
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('user_id')
      .neq('user_id', adminRole.user_id)
      .limit(1000);

    if (allProfiles) {
      // Create in-app notifications
      const notifications = allProfiles.map((p) => ({
        user_id: p.user_id,
        type: 'system',
        title: '📢 Mises à jour du site',
        message: `${updates.length} nouveauté(s) disponible(s) ! Consultez le Canal Informations.`,
        is_read: false,
      }));

      // Batch insert notifications (chunks of 100)
      for (let i = 0; i < notifications.length; i += 100) {
        await supabase.from('notifications').insert(notifications.slice(i, i + 100));
      }
    }

    return new Response(
      JSON.stringify({ success: true, updates_count: updates.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error posting daily updates:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
