import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, businessRole, adminClient } from "../../../lib/supabase";
import { notificationConfig } from "../../../lib/notifications";
import { NotificationControls } from "../../../components/notification-controls";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Email Notifications",
  robots: { index: false, follow: false },
};
export default async function Notifications() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!(await businessRole(user))) redirect("/portal");
  const db = adminClient();
  const counts = await Promise.all(
    ["pending", "sending", "sent", "failed"].map(async (status) => {
      const r = await db
        .from("notification_outbox")
        .select("id", { head: true, count: "exact" })
        .eq("status", status);
      if (r.error) throw Error("Unable to load notification queue");
      return { status, count: r.count || 0 };
    }),
  );
  const ready = notificationConfig().ready;
  const canProcess = (await businessRole(user)) === "admin";
  return (
    <main className="container workspace-settings">
      <Link href="/admin" className="text-link">
        ← Business Workspace
      </Link>
      <header className="settings-heading">
        <div className="eyebrow">WORKSPACE SETTINGS</div>
        <h1>Email Notifications.</h1>
        <p>Track service emails and check delivery readiness.</p>
      </header>
      <section className="settings-card">
        <div className="settings-card-heading">
          <h2>Delivery Status</h2>
          <span className={`delivery-badge ${ready ? "enabled" : ""}`}>
            {ready ? "Enabled" : "Not Activated"}
          </span>
        </div>
        <p>
          {ready
            ? "Delivery is enabled. Activity queues service emails for the delivery worker."
            : "Emails are not being sent yet. New activity is safely queued until business email is configured."}
        </p>
        <dl className="notification-metrics">
          {counts.map((c) => (
            <div key={c.status}>
              <dt>{c.status.charAt(0).toUpperCase() + c.status.slice(1)}</dt>
              <dd>{c.count}</dd>
            </div>
          ))}
        </dl>
        {canProcess ? (
          <NotificationControls ready={ready} />
        ) : (
          <p className="fine-print">
            An administrator can process queued emails.
          </p>
        )}
      </section>
      <div className="settings-grid">
        <section className="settings-card">
          <h2>What Gets Sent</h2>
          <ul className="coverage-list">
            <li>
              <strong>Business Alerts</strong>
              <span>New requests, client messages, payments, and refunds.</span>
            </li>
            <li>
              <strong>Client Updates</strong>
              <span>
                Request confirmations, team replies, quotes, project status,
                cancellations, and payment or refund notices.
              </span>
            </li>
            <li>
              <strong>Private Details Stay Here</strong>
              <span>
                Emails include a short update and a portal link. Project
                messages, addresses, and payment details stay in the portal.
              </span>
            </li>
          </ul>
        </section>
        <section className="settings-card">
          <h2>Before Activation</h2>
          <p>
            Set up the business email address and verified sender after
            purchasing your domain.
          </p>
          <p>
            Delivery credentials and recurring retries must be configured before
            unattended sending is ready.
          </p>
          <p className="fine-print">
            Sent means accepted by the mail server. Inbox delivery and bounces
            are tracked with the email provider.
          </p>
        </section>
      </div>
    </main>
  );
}
