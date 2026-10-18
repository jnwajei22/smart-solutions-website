import { inquiryOnly } from "../../lib/launch";
import { LaunchInformation } from "../../components/public-launch";
import Link from "next/link";
import { Header, Footer } from "../../components/brand";
import { SupportContact } from "../../components/support-contact";
export const metadata = { title: "Client help" };
export default function Help() {
  if (inquiryOnly()) return <LaunchInformation privacy={false} />;
  return (
    <>
      <Header />
      <main className="container narrow section legal">
        <div className="eyebrow">A LITTLE GUIDANCE</div>
        <h1>Let’s keep things moving.</h1>
        <p>
          Your portal keeps project details, quotes, messages, and payment
          records together.
        </p>
        <div className="help-grid">
          <section>
            <h2>Starting a project</h2>
            <p>
              Choose a service and send your contact details, location,
              preferred date, and a short description. We review the request
              before agreeing on scope, pricing, and an appointment. A requested
              date is not a booking.
            </p>
            <Link className="text-link" href="/request">
              Request a Service →
            </Link>
          </section>
          <section>
            <h2>Account access</h2>
            <p>
              Confirm your signup email before signing in. For password resets,
              request one link, then open the newest email in the same browser.
              Links are single-use. If sending is temporarily limited, wait
              before requesting another.
            </p>
            <Link className="text-link" href="/login?flow=recovery">
              Reset Your Password →
            </Link>
          </section>
          <section>
            <h2>Quotes and payments</h2>
            <p>
              Check the scope, itemized price, requested deposit, and project
              terms before approving. A deposit counts toward the total. Payment
              is recorded after confirmation from Stripe; a return from checkout
              alone is not a receipt.
            </p>
            <p>
              If checkout is cancelled or a card is declined, check your portal
              before retrying. If your bank shows a payment but the portal has
              not updated, contact us with the invoice number before paying
              again.
            </p>
            <Link className="text-link" href="/portal">
              Open Your Portal →
            </Link>
          </section>
          <section>
            <h2>Changes, scheduling, or cancellation</h2>
            <p>
              Open My Services in your portal and send an update on the relevant
              project. Scheduling changes and refunds require review under the
              written terms of your approved quote. A message alone does not
              confirm a changed appointment or refund.
            </p>
          </section>
          <section>
            <h2>Need more help?</h2>
            <SupportContact />
            <p>
              Project messages are for routine service coordination. Do not
              include Wi-Fi passwords, access codes, sensitive documents, or
              full payment details.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
