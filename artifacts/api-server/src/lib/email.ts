import { logger } from "./logger.js";

const STAFF_NOTIFICATION_EMAIL = "kevin@kartpathmedia.com";
const FROM_ADDRESS = "Life Around Senoia <noreply@kartpathmedia.com>";

export interface NotificationPayload {
  subject: string;
  html: string;
}

/**
 * Send a staff notification email via Resend.
 *
 * Gracefully no-ops when RESEND_API_KEY is not set — the submission record is
 * still saved to the drafts queue; only this email step is skipped.
 * Once Kevin adds RESEND_API_KEY to Replit Secrets, emails activate immediately
 * with no code changes required.
 */
export async function sendStaffNotification(payload: NotificationPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn({ subject: payload.subject }, "RESEND_API_KEY not set — staff notification skipped");
    return;
  }
  try {
    // Dynamic import keeps resend out of the startup critical path and makes
    // it trivial to stub in tests via vi.mock("../lib/email.js").
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: STAFF_NOTIFICATION_EMAIL,
      subject: payload.subject,
      html: payload.html,
    });
    logger.info({ subject: payload.subject }, "Staff notification email sent");
  } catch (err) {
    // Non-fatal: log and continue so the HTTP response always succeeds.
    logger.error({ err, subject: payload.subject }, "Failed to send staff notification email");
  }
}
