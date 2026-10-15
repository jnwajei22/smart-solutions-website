import { Suspense } from "react";
import { Header, Footer } from "../../components/brand";
import { RequestForm } from "../../components/request-form";
export const metadata = { title: "Request a service" };
export default function RequestPage() {
  return (
    <>
      <Header />
      <main className="container form-page">
        <div className="form-intro">
          <div className="eyebrow">LET’S BUILD A BETTER CONNECTION</div>
          <h1>
            What can we
            <br />
            <em>help with?</em>
          </h1>
          <p>A few details now. A thoughtful plan next.</p>
          <div className="intro-note">
            <strong>Here’s what happens next</strong>
            <ol>
              <li>We review your request.</li>
              <li>We clarify access, scope, and timing.</li>
              <li>You receive a quote to review in your portal.</li>
            </ol>
            <p>
              No payment is required to submit a request. A visit is confirmed
              after scope and scheduling are agreed.
            </p>
          </div>
        </div>
        <Suspense fallback={<p>Loading request form…</p>}>
          <RequestForm />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
