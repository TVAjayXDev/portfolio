import { createAdminClient } from "./supabase/admin.ts";
import { contactFormSchema } from "./validations/contact.ts";
import { sendContactNotificationEmail } from "./email.ts";
import crypto from "crypto";

export interface ContactSubmissionResult {
  status: number;
  data: {
    success?: boolean;
    message?: string;
    error?: string;
    fieldErrors?: Record<string, string[]>;
  };
}

/**
 * Core processor for contact form submissions.
 * Performs all security defenses:
 * 1. Zod input validation & length checks
 * 2. Hidden honeypot silent trap
 * 3. Minimum fill-time bot protection
 * 4. Salted IP hash rate limiting (service_role RPC)
 * 5. Service-role DB insertion into public.messages
 * 6. Non-blocking Resend notification email
 */
export async function processContactSubmission(
  body: unknown,
  clientIp?: string,
  customAdminClient?: any
): Promise<ContactSubmissionResult> {
  const parseResult = contactFormSchema.safeParse(body);
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]?.message || "Validation failed.";
    return {
      status: 400,
      data: { error: firstError, fieldErrors: parseResult.error.flatten().fieldErrors },
    };
  }

  const data = parseResult.data;

  // Defense 1: Honeypot trap (pretend success, store nothing)
  if (data.honeypot && data.honeypot.trim().length > 0) {
    console.info("[CONTACT SECURITY]: Honeypot triggered. Silent ignore.");
    return {
      status: 200,
      data: {
        success: true,
        message: "Thank you! Your message has been sent.",
      },
    };
  }

  // Defense 2: Minimum fill time check (reject sub-2-second automated submissions)
  if (data._timestamp && typeof data._timestamp === "number") {
    const durationMs = Date.now() - data._timestamp;
    if (durationMs < 2000) {
      console.info("[CONTACT SECURITY]: Sub-2s automated submission detected. Silent ignore.");
      return {
        status: 200,
        data: {
          success: true,
          message: "Thank you! Your message has been sent.",
        },
      };
    }
  }

  // Defense 3: Privacy-preserving rate limiting
  // IP salt must come from env var with NO hard-coded default in production
  const salt = process.env.CONTACT_IP_SALT;
  if (!salt || salt.trim().length === 0) {
    if (process.env.NODE_ENV === "production") {
      console.error("[CONTACT SECURITY ERROR]: Missing CONTACT_IP_SALT environment variable in production.");
      return {
        status: 500,
        data: { error: "Unable to process message at this time. Please try again later." },
      };
    }
  }
  const effectiveSalt = salt || "tv-ajay-dev-salt";

  // If no client IP can be determined, apply only the global daily cap (never share one IP bucket across everyone)
  let saltedIpHash: string | null = null;
  if (clientIp && clientIp.trim().length > 0 && clientIp !== "unknown") {
    saltedIpHash = crypto
      .createHash("sha256")
      .update(`${clientIp.trim()}:${effectiveSalt}`)
      .digest("hex");
  }

  const adminClient = customAdminClient || createAdminClient();
  if (!adminClient) {
    console.error("[CONTACT ERROR]: Server database credentials unconfigured.");
    return {
      status: 500,
      data: { error: "Unable to send message at this time. Please try again later." },
    };
  }

  // Check persistent rate limit via service_role RPC (passes null when client IP is missing)
  const { data: throttleResult, error: throttleError } = await adminClient.rpc(
    "check_contact_rate_limit",
    { p_ip_hash: saltedIpHash }
  );

  if (throttleError) {
    // If table/function not yet applied, log non-PII warning and allow delivery
    console.warn(
      "[CONTACT RATE-LIMIT WARNING]: Rate check RPC call failed:",
      throttleError.code || throttleError.message
    );
  } else if (throttleResult && !throttleResult.allowed) {
    console.info("[CONTACT RATE-LIMIT]: IP threshold exceeded.");
    return {
      status: 429,
      data: {
        error:
          throttleResult.reason ||
          "Message limit reached. Please wait before sending another message.",
      },
    };
  }

  // Step 4: Insert into public.messages table via service_role
  const { error: insertError } = await adminClient.from("messages").insert({
    name: data.name,
    email: data.email,
    subject: data.subject || null,
    message: data.message,
    is_read: false,
    is_archived: false,
  });

  if (insertError) {
    console.error(
      "[CONTACT DATABASE ERROR]: Failed to persist message (non-PII):",
      insertError.code || insertError.message
    );
    return {
      status: 500,
      data: { error: "Unable to process message at this time. Please try again later." },
    };
  }

  // Step 5: Send notification email to admin via Resend
  sendContactNotificationEmail({
    name: data.name,
    email: data.email,
    subject: data.subject,
    message: data.message,
  }).catch((emailErr) => {
    console.error("[CONTACT NOTIFICATION EXCEPTION]:", emailErr?.message || emailErr);
  });

  return {
    status: 200,
    data: {
      success: true,
      message: "Thank you! Your message has been sent successfully.",
    },
  };
}
