import Link from "next/link";
import { Header, Footer } from "./brand";
import { MarketingHome } from "./marketing-home";
import { inquiryEmail } from "../lib/launch";
export function PublicLaunch() {
  return <MarketingHome inquiryOnly />;
}
export function LaunchInformation({ privacy = false }: { privacy?: boolean }) {
  return (
    <>
      <Header />
      <main className="container narrow section legal">
        <div className="eyebrow">DFW SMART SOLUTIONS</div>
        <h1>{privacy ? "Privacy Notice." : "Inquiry Information."}</h1>
        {privacy ? (
          <>
            <p>
              This inquiry-only website is hosted on Vercel. The inquiry form
              prepares an email in your own email application; it does not
              submit or store a request in a website account. Your email
              provider and the recipient’s Gmail process the email when you send
              it.
            </p>
            <p>
              Names, reply addresses, city/ZIP, and project details you choose
              to send are used to respond and evaluate the proposed work.
              Hosting may process routine request and security logs. This launch
              site does not use advertising trackers or require account cookies.
            </p>
            <p>
              Do not include passwords, access codes, sensitive documents, or
              payment information. Contact DFW Smart Solutions by email for
              questions about access, corrections, or deletion of inquiry
              correspondence; records may be retained where required by law.
            </p>
          </>
        ) : (
          <>
            <p>
              We’re preparing to launch and gathering project inquiries for DFW
              Smart Solutions across Dallas–Fort Worth. An inquiry does not book
              an appointment, authorize work, or guarantee service availability.
            </p>
            <p>
              Customer accounts, quote approvals, deposits, and online payments
              are not available in this initial public release. No payment is
              required to inquire. Any future work requires a written scope,
              itemized price, and confirmed scheduling after launch readiness is
              complete.
            </p>
            <p>
              For questions or updates, reply to your email conversation. Avoid
              sending passwords, access codes, or payment information.
            </p>
          </>
        )}
        <p>
          Contact <a href={`mailto:${inquiryEmail}`}>{inquiryEmail}</a>.
        </p>
        <Link className="button" href="/request">
          Discuss a Project →
        </Link>
      </main>
      <Footer />
    </>
  );
}
