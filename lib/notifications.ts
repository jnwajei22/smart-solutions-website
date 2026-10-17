import "server-only";
import { after } from "next/server";
import nodemailer from "nodemailer";
import { adminClient } from "./supabase";
import { emailAddress, notificationContent } from "./notification-content";
export function notificationConfig() {
  let origin: string | null = null;
  try {
    const u = new URL(process.env.NOTIFICATION_SITE_URL || "");
    if (
      u.protocol === "https:" &&
      u.username === "" &&
      u.password === "" &&
      u.pathname === "/" &&
      !u.search &&
      !u.hash
    )
      origin = u.origin;
  } catch {}
  const port = Number(process.env.SMTP_PORT || 587);
  const ready =
    process.env.NOTIFICATIONS_ENABLED === "true" &&
    !!origin &&
    !!emailAddress(process.env.EMAIL_FROM) &&
    !!emailAddress(process.env.NOTIFY_EMAIL) &&
    !!process.env.SMTP_HOST &&
    !!process.env.SMTP_USER &&
    !!process.env.SMTP_PASSWORD &&
    [465, 587].includes(port);
  return { ready, origin, port };
}
export function scheduleNotifications() {
  if (notificationConfig().ready)
    after(async () => {
      try {
        await deliverNotifications();
      } catch {
        console.error("notification_worker_failed");
      }
    });
}
export async function deliverNotifications() {
  const config = notificationConfig();
  if (!config.ready) return { configured: false, sent: 0, failed: 0 };
  const db = adminClient();
  const { data: rows, error } = await db.rpc("claim_notifications", {
    p_limit: 2,
  });
  if (error) throw Error("Unable to claim notifications");
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: config.port,
    secure: config.port === 465,
    requireTLS: true,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
  });
  let sent = 0,
    failed = 0;
  for (const row of rows || []) {
    try {
      let to = emailAddress(process.env.NOTIFY_EMAIL);
      if (row.audience === "customer") {
        const { data, error } = await db.auth.admin.getUserById(
          row.customer_id,
        );
        if (error || !data.user?.email_confirmed_at)
          throw Error("Recipient unavailable");
        to = emailAddress(data.user.email);
      }
      if (!to) throw Error("Recipient unavailable");
      const content = notificationContent(
        row.kind,
        row.audience,
        config.origin!,
      );
      const result = await transport.sendMail({
        from: process.env.EMAIL_FROM!,
        to,
        ...content,
        messageId: `<${row.id}@${new URL(config.origin!).hostname}>`,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      if (!result.accepted?.length) throw Error("Delivery rejected");
      const { error } = await db
        .from("notification_outbox")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          claimed_until: null,
          last_error: null,
        })
        .eq("id", row.id)
        .eq("claim_token", row.claim_token);
      if (error) throw Error("Delivery acknowledgement failed");
      sent++;
    } catch {
      failed++;
      // Keep provider messages, recipient addresses, credentials and content out of logs.
      console.error("notification_delivery_failed");
      await db
        .from("notification_outbox")
        .update({
          status: row.attempts >= 8 ? "failed" : "pending",
          claimed_until: null,
          last_error: "Delivery failed; check SMTP or recipient configuration.",
          next_attempt_at: new Date(
            Date.now() + Math.min(3600000, 60000 * 2 ** row.attempts),
          ).toISOString(),
        })
        .eq("id", row.id)
        .eq("claim_token", row.claim_token);
    }
  }
  return { configured: true, sent, failed };
}
