import { supabase } from '@/integrations/supabase/client';

/**
 * Screenshot Notification Service
 * When a screenshot is detected:
 * 1. Sends a system message in the private chat visible to both users
 * 2. Auto-reports the user to the moderation team
 */

export const notifyScreenshotInChat = async ({
  screenshotterUserId,
  screenshotterUsername,
  otherUserId,
  context,
}: {
  screenshotterUserId: string;
  screenshotterUsername: string;
  otherUserId: string;
  context: 'chat' | 'ephemeral_media' | 'album' | 'photo' | 'video';
}) => {
  try {
    const contextLabels: Record<string, string> = {
      chat: 'la conversation',
      ephemeral_media: 'un média éphémère',
      album: 'un album',
      photo: 'une photo',
      video: 'une vidéo',
    };

    const contextLabel = contextLabels[context] || 'du contenu';

    // 1. Send system message in the private chat
    const systemMessage = `⚠️ **Capture d'écran détectée** — ${screenshotterUsername} a effectué une capture d'écran de ${contextLabel}.\n\n🚨 Un **avertissement automatique** a été envoyé et l'utilisateur a été **signalé auprès d'un membre de l'équipe** qui prendra contact avec lui.`;

    const { error: msgError } = await supabase
      .from('messages')
      .insert({
        sender_id: screenshotterUserId,
        recipient_id: otherUserId,
        content: systemMessage,
        message_type: 'system_screenshot',
        is_private: true,
      });

    if (msgError) {
      console.error('[ScreenshotNotification] Error sending system message:', msgError);
    }

    // 2. Auto-report the user
    const { error: reportError } = await supabase
      .from('reports')
      .insert({
        reporter_id: screenshotterUserId,
        reported_user_id: screenshotterUserId,
        reason: 'inappropriate_content' as any,
        description: `Capture d'écran automatiquement détectée de ${contextLabel} dans une conversation privée avec un autre utilisateur. Avertissement automatique envoyé.`,
        report_type: 'screenshot_violation',
      });

    if (reportError) {
      console.error('[ScreenshotNotification] Error creating report:', reportError);
    }

    // 3. Create notification for the other user
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: otherUserId,
        title: '📸 Capture d\'écran détectée',
        message: `${screenshotterUsername} a effectué une capture d'écran de ${contextLabel}. Un avertissement lui a été envoyé.`,
        type: 'screenshot_warning',
      });

    if (notifError) {
      console.error('[ScreenshotNotification] Error creating notification:', notifError);
    }

    // 4. Create notification for the screenshotter
    const { error: notifError2 } = await supabase
      .from('notifications')
      .insert({
        user_id: screenshotterUserId,
        title: '⚠️ Avertissement : Capture d\'écran',
        message: `Votre capture d'écran a été détectée et signalée. Un membre de l'équipe prendra contact avec vous. Les captures d'écran répétées peuvent entraîner une suspension de votre compte.`,
        type: 'screenshot_warning',
      });

    if (notifError2) {
      console.error('[ScreenshotNotification] Error creating warning notification:', notifError2);
    }

    console.log('[ScreenshotNotification] Screenshot notification sent successfully');
    return true;
  } catch (error) {
    console.error('[ScreenshotNotification] Unexpected error:', error);
    return false;
  }
};

/**
 * Report a screenshot detection globally (outside of a specific chat context).
 * Creates a report + security event + warning notification + moderation task + violation tracking.
 */
export const reportScreenshotGlobal = async ({
  userId,
  username,
  pageUrl,
}: {
  userId: string;
  username: string;
  pageUrl?: string;
}) => {
  try {
    // 1. Upsert screenshot_violations to track repeat offenders
    const { data: existingViolation } = await supabase
      .from('screenshot_violations')
      .select('id, violation_count')
      .eq('user_id', userId)
      .maybeSingle();

    let violationCount = 1;

    if (existingViolation) {
      violationCount = existingViolation.violation_count + 1;

      // Calculate suspension based on violation count
      let suspendedUntil: string | null = null;
      if (violationCount >= 5) {
        // 5+ violations: 7 days suspension
        suspendedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (violationCount >= 3) {
        // 3-4 violations: 24h suspension
        suspendedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      } else if (violationCount >= 2) {
        // 2 violations: 1h suspension
        suspendedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      }

      await supabase
        .from('screenshot_violations')
        .update({
          violation_count: violationCount,
          last_violation_at: new Date().toISOString(),
          suspended_until: suspendedUntil,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingViolation.id);
    } else {
      await supabase
        .from('screenshot_violations')
        .insert({
          user_id: userId,
          violation_count: 1,
          last_violation_at: new Date().toISOString(),
        });
    }

    // 2. Create a report for moderation
    const { error: reportError } = await supabase
      .from('reports')
      .insert({
        reporter_id: userId,
        reported_user_id: userId,
        reason: 'inappropriate_content' as any,
        description: `[Auto] Capture d'écran #${violationCount} détectée pour ${username} sur ${pageUrl || 'page inconnue'}. ${violationCount > 1 ? `⚠️ Récidiviste (${violationCount} infractions).` : ''}`,
        report_type: 'screenshot_violation',
      });

    if (reportError) {
      console.error('[ScreenshotGlobal] Error creating report:', reportError);
    }

    // 3. Log security event
    const { error: secError } = await supabase
      .from('security_events')
      .insert({
        event_type: 'screenshot_detected',
        severity: violationCount >= 3 ? 'critical' : 'high',
        user_id: userId,
        page_url: pageUrl || null,
        description: `Capture d'écran #${violationCount} détectée pour ${username}.${violationCount >= 3 ? ' RÉCIDIVISTE — enquête approfondie recommandée.' : ''}`,
        user_agent: navigator.userAgent,
        metadata: { violation_count: violationCount, username },
      });

    if (secError) {
      console.error('[ScreenshotGlobal] Error logging security event:', secError);
    }

    // 4. Create moderation task for investigation
    const { error: taskError } = await supabase
      .from('moderation_tasks')
      .insert({
        task_type: 'screenshot_investigation',
        status: 'pending',
        target_user_id: userId,
        description: `📸 Enquête capture d'écran — ${username} (infraction #${violationCount})${violationCount >= 3 ? ' ⚠️ RÉCIDIVISTE' : ''}`,
        reward_cents: violationCount >= 3 ? 30 : 15,
        metadata: {
          violation_count: violationCount,
          username,
          page_url: pageUrl || null,
          detected_at: new Date().toISOString(),
          is_repeat_offender: violationCount > 1,
        },
      });

    if (taskError) {
      console.error('[ScreenshotGlobal] Error creating moderation task:', taskError);
    }

    // 5. Warning notification to the user
    const warningMessage = violationCount >= 3
      ? `Votre capture d'écran a été détectée (infraction #${violationCount}). Votre compte est sous surveillance renforcée. Un membre de l'équipe va enquêter sur votre activité.`
      : violationCount >= 2
      ? `Votre capture d'écran a été détectée (infraction #${violationCount}). Vous êtes désormais sous surveillance. Des sanctions seront appliquées en cas de récidive.`
      : `Votre capture d'écran a été détectée et signalée. Les captures répétées entraîneront une suspension de votre compte.`;

    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: violationCount >= 3 ? '🚨 Alerte : Surveillance renforcée' : '⚠️ Avertissement : Capture d\'écran',
        message: warningMessage,
        type: 'screenshot_warning',
      });

    if (notifError) {
      console.error('[ScreenshotGlobal] Error creating notification:', notifError);
    }

    console.log(`[ScreenshotGlobal] Screenshot #${violationCount} reported for ${username}`);
    return true;
  } catch (error) {
    console.error('[ScreenshotGlobal] Unexpected error:', error);
    return false;
  }
};
