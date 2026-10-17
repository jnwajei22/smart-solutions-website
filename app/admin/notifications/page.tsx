import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, isAdmin, adminClient } from "../../../lib/supabase";
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
  if (!(await isAdmin(user.id))) redirect("/portal");
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
  return (
    <main className="container narrow section legal">
      <Link href="/admin">← Business Workspace</Link>
      <h1>Email Notifications.</h1>
      <p>
        {ready
          ? "SMTP delivery is enabled. Saved activity queues service emails; delivery is retried when the worker runs."
          : "Email delivery is not activated. Events are safely queued; clients are not receiving these emails yet."}
      </p>
      <dl>
        {counts.map((c) => (
          <div key={c.status}>
            <dt>{c.status.charAt(0).toUpperCase() + c.status.slice(1)}</dt>
            <dd>{c.count}</dd>
          </div>
        ))}
      </dl>
      <NotificationControls ready={ready} />
      <h2>Delivery Coverage</h2>
      <p>
        New requests and client messages alert the business. Clients receive
        request acknowledgements, business replies, quotes, project status
        updates, invoice cancellations, and payment/refund notices. Payment
        notices also alert the business.
      </p>
      <p>
        Emails contain a sign-in link and a short event description. Project
        messages, addresses and payment details stay in the portal.
      </p>
      <h2>Activation</h2>
      <p>
        Configure the business alert address, verified sender, SMTP credentials
        and canonical website URL. Run the authenticated worker on a recurring
        schedule for unattended retries. A mail server accepting an email does
        not guarantee inbox delivery; check provider delivery/bounce reports.
      </p>
    </main>
  );
}
