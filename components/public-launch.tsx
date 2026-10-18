import Link from "next/link";
import { Header, Footer } from "./brand";
import { inquiryEmail } from "../lib/launch";
export function PublicLaunch() {
  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="eyebrow">
                DFW SMART SOLUTIONS · PREPARING TO LAUNCH
              </div>
              <h1>
                Your technology.
                <br />
                <em>A clearer next step.</em>
              </h1>
              <p>
                Planning a small IT project? Tell Justin what you need. We’re
                exploring weekend support for homes, small businesses, and local
                organizations.
              </p>
              <div className="actions">
                <Link href="/request" className="button">
                  Request a Quote →
                </Link>
                <a href="#services" className="text-link">
                  Explore Services →
                </a>
              </div>
              <p className="hero-note">
                Cedar Hill and southern Dallas County · Saturday/Sunday
                availability
              </p>
            </div>
            <div className="form-card">
              <div className="eyebrow">START WITH A CONVERSATION</div>
              <h2>
                Small scope.
                <br />
                Personal attention.
              </h2>
              <p>
                One local point of contact, a written scope, and clear pricing
                before any work is agreed.
              </p>
              <p>
                We’re gathering inquiries while completing launch setup.
                Appointments and payments are not available through this website
                yet.
              </p>
              <a className="text-link" href={`mailto:${inquiryEmail}`}>
                Email Justin →
              </a>
            </div>
          </div>
        </section>
        <section id="services" className="section container">
          <div className="section-heading">
            <div>
              <div className="eyebrow">INITIAL SERVICE FOCUS</div>
              <h2>Practical help for everyday IT.</h2>
            </div>
          </div>
          <div className="service-grid">
            {[
              [
                "Wi-Fi & Connectivity",
                "Discuss router setup, device connections, and basic home or small-office connectivity troubleshooting.",
              ],
              [
                "Workstation & Peripheral Setup",
                "Discuss computer, monitor, printer, and other peripheral setup using equipment already available onsite.",
              ],
              [
                "Onsite IT Assistance",
                "Explore equipment inventory, labeling and documentation, or hands-on assistance guided by your existing IT provider.",
              ],
            ].map(([title, description]) => (
              <article className="service-card" key={title}>
                <h3>{title}</h3>
                <p>{description}</p>
                <Link className="text-link" href="/request">
                  Discuss Your Project →
                </Link>
              </article>
            ))}
          </div>
          <p>
            Each inquiry is reviewed for technical fit, access, equipment,
            location, and availability. Installation, in-wall cabling, TV
            mounting, security systems, and electrical work are outside this
            initial launch scope.
          </p>
        </section>
        <section id="how-it-works" className="process-section">
          <div className="container">
            <h2>A clear path forward.</h2>
            <div className="steps">
              {[
                [
                  "01",
                  "Share the Need",
                  "Tell us about the task, city/ZIP, equipment, and preferred weekend.",
                ],
                [
                  "02",
                  "Review the Fit",
                  "Justin follows up by email to clarify scope and requirements. An inquiry is not a booking.",
                ],
                [
                  "03",
                  "Agree Before Work",
                  "When launch setup is complete, any work requires agreed scope, itemized pricing, and a confirmed appointment.",
                ],
              ].map(([n, t, d]) => (
                <div key={n}>
                  <span className="step-number">{n}</span>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="cta-section">
          <div className="container">
            <div>
              <div className="eyebrow">LET’S CONNECT</div>
              <h2>Tell us what needs working.</h2>
              <p>No account or payment needed to inquire.</p>
            </div>
            <Link className="button gold" href="/request">
              Request a Quote →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
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
              payment information. Contact Justin by email for questions about
              access, corrections, or deletion of inquiry correspondence;
              records may be retained where required by law.
            </p>
          </>
        ) : (
          <>
            <p>
              We’re preparing to launch and gathering inquiries for small, solo
              weekend IT assignments in Cedar Hill and southern Dallas County.
              An inquiry does not book an appointment, authorize work, or
              guarantee service availability.
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
