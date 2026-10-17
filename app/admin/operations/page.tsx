import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, isAdmin } from "../../../lib/supabase";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Operating guide",
  robots: { index: false, follow: false },
};
export default async function Operations() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!(await isAdmin(user.id))) redirect("/portal");
  return (
    <main className="container narrow section legal">
      <Link className="text-link" href="/admin">
        ← Business Workspace
      </Link>
      <div className="eyebrow">DAILY OPERATIONS</div>
      <h1>From request to handoff.</h1>
      <h2>1. Check the workspace</h2>
      <p>
        Refresh when you start work and check Need Review and Need a Reply.
        Check Email Notifications for configuration and queue status. The
        workspace remains the source for new requests and messages. Search by
        client, company, email, or city.
      </p>
      <h2>2. Confirm the job</h2>
      <p>
        Verify location, authorized site access, equipment, cable routes, scope,
        and preferred date with the client. Move the request to Reviewing. Never
        treat a preferred date as a confirmed appointment.
      </p>
      <h2>3. Issue a complete quote</h2>
      <p>
        List labor, materials, travel, and any applicable tax separately.
        Confirm the total, deposit, due date, exclusions, schedule, and
        project-specific cancellation/refund terms before issuing. Issued
        amounts are locked. If an issued quote is wrong, pause collection and
        resolve the correction before asking the client to pay.
      </p>
      <h2>4. Approval and scheduling</h2>
      <p>
        Awaiting Approval means the client has not approved the issued quote.
        Ready to Schedule means approval and the requested deposit are recorded;
        it does not reserve a time. Confirm the appointment in writing and set
        Scheduled.
      </p>
      <h2>5. Work and closeout</h2>
      <p>
        Use In Progress once work starts. Document agreed changes before extra
        work. Test the installation, hand over equipment and instructions,
        confirm remaining payment in the portal, then mark Completed. Keep the
        scope, approvals, and handoff in the project conversation.
      </p>
      <h2>Payments and refunds</h2>
      <p>
        A checkout redirect is not proof of payment. Check Stripe and the
        invoice if a client reports a mismatch. Do not ask for another payment
        until the first is reconciled. Refunds are performed in Stripe; the
        webhook records cumulative refunds. Use Cancel Invoice to pause
        collection and close open checkouts first. If payments are retained,
        issue the agreed refund in Stripe, wait for it to appear, then retry
        cancellation. A void invoice stays void after refund events. Voiding
        does not itself send money or erase payment history. To correct an
        unpaid quote, void it and issue a replacement. For a paid scope change,
        resolve the refund and new agreement before replacing the invoice.
      </p>
      <h2>Failure response</h2>
      <p>
        If auth email sending is limited, stop retries and check the provider.
        For delayed payments, inspect Stripe event delivery and Vercel function
        logs. Keep customer messages and payment secrets out of screenshots or
        logs shared externally. The repository’s operations guide contains
        recovery and release checks.
      </p>
      <h2>Before accepting live clients</h2>
      <p>
        Finish SMTP, public support contact, production domain/redirects, live
        Stripe webhook verification, provider backups and a restore check, and
        error alert routing. These are launch checks, not completed by this
        guide.
      </p>
    </main>
  );
}
