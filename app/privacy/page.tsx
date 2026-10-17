import { Header, Footer } from "../../components/brand";
import { SupportContact } from "../../components/support-contact";
export const metadata = { title: "Privacy notice" };
export default function Privacy() {
  return (
    <>
      <Header />
      <main className="container narrow section legal">
        <div className="eyebrow">YOUR INFORMATION</div>
        <h1>Privacy notice.</h1>
        <p>
          DFW Smart Solutions LLC uses the information you provide to respond to
          service requests, prepare quotes, coordinate work, and maintain
          customer and payment records.
        </p>
        <h2>What we collect</h2>
        <p>
          Your account email, account type, contact name, business name when
          supplied, phone number, service address, project details, and records
          of quotes, approvals, and payments. Avoid including passwords, alarm
          codes, or sensitive documents in project descriptions.
        </p>
        <h2>Accounts and payments</h2>
        <p>
          This website is hosted on Vercel. Account and project records are
          hosted using Supabase. Payments are processed on Stripe’s hosted
          checkout; we do not collect or store your full card number. We retain
          payment references and amounts to reconcile invoices.
        </p>
        <h2>Cookies</h2>
        <p>
          Authentication cookies keep you signed in. The request form
          temporarily saves your draft in this browser tab so you can sign in
          without losing it. This site does not currently include advertising
          trackers.
        </p>
        <h2>Access and retention</h2>
        <p>
          Project information is available to authorized business administrators
          and the associated customer account. We retain records for service
          continuity and applicable accounting requirements. For access,
          correction, or deletion requests, use the contact instructions below.
          Information that must be retained for accounting or legal obligations
          may not be deleted immediately.
        </p>
        <h2>Contact</h2>
        <SupportContact />
      </main>
      <Footer />
    </>
  );
}
