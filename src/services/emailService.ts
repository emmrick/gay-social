import { supabase } from "@/integrations/supabase/client";

/**
 * Send a transactional email to a specific user by userId.
 * Uses the send-user-email edge function which fetches the user's email
 * from auth.users (requires admin/moderator role).
 * Fire-and-forget: errors are logged but do not propagate.
 */
const sendUserEmail = async (
  userId: string,
  templateName: string,
  templateData?: Record<string, any>
) => {
  try {
    await supabase.functions.invoke("send-user-email", {
      body: { userId, templateName, templateData },
    });
  } catch (error) {
    console.error(`[EmailService] Failed to send ${templateName} to ${userId}:`, error);
  }
};

/**
 * Send a transactional email directly to an email address.
 */
const sendDirectEmail = async (
  templateName: string,
  recipientEmail: string,
  idempotencyKey: string,
  templateData?: Record<string, any>
) => {
  try {
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName,
        recipientEmail,
        idempotencyKey,
        ...(templateData ? { templateData } : {}),
      },
    });
  } catch (error) {
    console.error(`[EmailService] Failed to send ${templateName}:`, error);
  }
};

/** Send verification confirmed email (admin context) */
export const sendVerificationConfirmedEmail = async (userId: string) => {
  await sendUserEmail(userId, "verification-confirmed");
};

/** Send verification rejected email (admin context) */
export const sendVerificationRejectedEmail = async (userId: string, reason: string) => {
  await sendUserEmail(userId, "verification-rejected", { rejectionReason: reason });
};

/** Send welcome email after signup (user knows their own email) */
export const sendWelcomeEmail = async (email: string, username: string) => {
  await sendDirectEmail("welcome", email, `welcome-${email}`, { pseudo: username });
};
