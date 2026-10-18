import { Resend } from "resend";

export interface SendContactEmailParams {
  name: string;
  email: string;
  subject?: string | null;
  message: string;
}

/**
 * Strips carriage returns, line feeds, and control characters to prevent email header injection attacks.
 */
export function sanitizeHeader(input: string): string {
  return input.replace(/[\r\n\x00-\x1f\x7f]+/g, " ").trim();
}

/**
 * Sends notification email to tvajay0@gmail.com via Resend using RESEND_API_KEY (server-only).
 * Sender: onboarding@resend.dev
 * Fixed Subject: "New portfolio message"
 * Plain text body with Reply-To set to the validated visitor email.
 * If RESEND_API_KEY is unset, the contact form still succeeds and saves to the database.
 */
export async function sendContactNotificationEmail(
  params: SendContactEmailParams
): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    // Non-fatal: form continues to work when API key is unset
    console.info("[RESEND]: RESEND_API_KEY is not configured. Email notification skipped.");
    return { sent: false, error: "RESEND_API_KEY unset" };
  }

  // Header injection defense: sanitize all header fields
  const sanitizedReplyTo = sanitizeHeader(params.email);
  const sanitizedName = sanitizeHeader(params.name);
  const sanitizedSubject = params.subject ? sanitizeHeader(params.subject) : "";

  // Plain-text email body
  const bodyLines = [
    "New portfolio message received from contact form:",
    "",
    `Name: ${sanitizedName}`,
    `Email: ${sanitizedReplyTo}`,
    sanitizedSubject ? `Subject: ${sanitizedSubject}` : null,
    `Received: ${new Date().toUTCString()}`,
    "",
    "Message:",
    "--------------------------------------------------",
    params.message.trim(),
    "--------------------------------------------------",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "tvajay0@gmail.com",
      subject: "New portfolio message",
      text: bodyLines,
      replyTo: sanitizedReplyTo,
    });

    if (result.error) {
      console.error(
        "[RESEND ERROR]: Failed to deliver notification email (non-PII):",
        result.error.name || "DeliveryError"
      );
      return { sent: false, error: result.error.message };
    }

    return { sent: true };
  } catch (err) {
    // Never expose PII in logs
    console.error(
      "[RESEND EXCEPTION]: Error attempting Resend email delivery (non-PII):",
      (err as Error).name || "EmailException"
    );
    return { sent: false, error: (err as Error).message };
  }
}
