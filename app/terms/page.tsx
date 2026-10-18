import { inquiryOnly } from "../../lib/launch";
import { LaunchInformation } from "../../components/public-launch";
import { Header, Footer } from "../../components/brand";
import Link from "next/link";
import { SupportContact } from "../../components/support-contact";
export const metadata = { title: "Service terms" };
export default function Terms() {
  if (inquiryOnly()) return <LaunchInformation privacy={false} />;
  return (
    <>
      <Header />
      <main className="container narrow section legal">
        <div className="eyebrow">CLEAR EXPECTATIONS</div>
        <h1>Service terms.</h1>
        <h2>Requests and estimates</h2>
        <p>
          Submitting a request does not book an appointment or authorize work.
          We confirm scope, location, access, equipment, pricing, and scheduling
          before proceeding. Quotes cover only the listed work. Changes require
          written agreement.
        </p>
        <h2>Approval and deposits</h2>
        <p>
          Approving a quote records your agreement to its listed scope and
          price. Any requested deposit is shown separately and credited toward
          that invoice. Before collecting a deposit, we will confirm scheduling,
          cancellation, refund, and any special-order material terms with you in
          writing. A deposit is not an additional fee.
        </p>
        <h2>Changes, cancellations, and refunds</h2>
        <p>
          Request changes or cancellation in the project conversation as soon as
          possible. Any applicable material commitments, cancellation charges,
          or refund conditions must be stated in your project’s written terms
          before payment. We review the request and confirm the outcome in
          writing; submitting a message does not automatically cancel work or
          issue a refund.
        </p>
        <h2>Site access and equipment</h2>
        <p>
          Customers must arrange authorized access to the property and identify
          relevant access restrictions. Customer-supplied equipment must be
          suitable for the agreed installation. Structural issues, inaccessible
          routes, or incompatible equipment may require a revised scope.
        </p>
        <h2>Payments and scheduling</h2>
        <p>
          Payment status updates after confirmation by the payment provider.
          Requested dates are subject to availability and are not confirmed
          until agreed with our team. Service availability depends on location,
          scope, and appropriate qualifications.
        </p>
        <h2>Service boundaries</h2>
        <p>
          Our current offerings focus on communications networking, cable
          organization, TV/AV setup, and compatible smart-home devices. Security
          cameras, alarms, access-control systems, and mains electrical work are
          not included in this online service menu.
        </p>
        <h2>Questions about your project</h2>
        <p>
          Use the relevant project conversation for routine updates. Keep
          passwords, property access codes, and full payment details out of
          messages.
        </p>
        <SupportContact />
        <Link className="text-link" href="/help">
          Client Help →
        </Link>
      </main>
      <Footer />
    </>
  );
}
