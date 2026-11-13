import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  Cable,
  ClipboardCheck,
  House,
  MapPin,
  MessageSquare,
  Network,
  Store,
  Wifi,
  Building2,
} from "lucide-react";
import { Header, Footer } from "./brand";
import { SolutionSelector } from "./solution-selector";
import { InquiryForm } from "./inquiry-form";
import { inquiryEmail } from "../lib/launch";

const standards = [
  {
    icon: Cable,
    title: "Clean installation",
    text: "Thoughtful routing, neat terminations, and a space left tidy. The details behind the scenes matter.",
  },
  {
    icon: CheckCheck,
    title: "Tested connections",
    text: "Check the agreed work before handoff, explain the results, and identify anything that still needs attention.",
  },
  {
    icon: ClipboardCheck,
    title: "Useful documentation",
    text: "Clear labels and practical setup notes, so future troubleshooting and upgrades start with answers.",
  },
  {
    icon: MessageSquare,
    title: "Clear communication",
    text: "A written scope, itemized pricing, and approval before additional work. You know what to expect.",
  },
];
const industries = [
  {
    name: "Residential",
    icon: House,
    label: "AT HOME",
    text: "Better Wi-Fi, a cleaner entertainment setup, and connected devices that fit your everyday routines.",
    service: "wifi",
    property: "Residential",
    detail: "HOME OFFICE / CONNECTED LIVING",
  },
  {
    name: "Small business",
    icon: Building2,
    label: "AT WORK",
    text: "Practical networks, organized racks, and data and AV prewire for office buildouts.",
    service: "racks",
    property: "Commercial",
    detail: "WORKSPACES / NETWORK ORGANIZATION",
  },
  {
    name: "Retail",
    icon: Store,
    label: "ON THE FLOOR",
    text: "Data drops for checkout and back offices, plus speaker wiring and paging for the sales floor.",
    service: "cabling",
    property: "Commercial",
    detail: "CHECKOUT / BACK OFFICE",
  },
];

function ConnectedSpace() {
  return (
    <div
      className="connected-space"
      role="img"
      aria-label="Concept illustration of a home and workplace connected through a central network"
    >
      <div className="connected-space-label">
        <span>THOUGHTFULLY CONNECTED</span>
        <span>DFW / TX</span>
      </div>
      <svg
        className="connection-paths"
        viewBox="0 0 520 460"
        fill="none"
        aria-hidden="true"
      >
        <path d="M114 150H260V230M406 175H330V230M145 339H260V260M390 338H330V260" />
        <circle cx="280" cy="235" r="145" />
        <circle cx="280" cy="235" r="194" />
      </svg>
      <div className="space-hub" aria-hidden="true">
        <span className="hub-indicator" />
        <Network size={48} strokeWidth={1.2} />
        <span>ONE CONNECTED SPACE</span>
        <div>
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
      <div className="space-device space-wifi" aria-hidden="true">
        <Wifi size={25} />
        <span>Wi-Fi that reaches.</span>
        <i />
      </div>
      <div className="space-device space-home" aria-hidden="true">
        <House size={25} />
        <span>Everyday, simplified.</span>
        <i />
      </div>
      <div className="space-device space-office" aria-hidden="true">
        <Cable size={25} />
        <span>Order behind the scenes.</span>
        <i />
      </div>
      <div className="space-annotation">
        <span>01</span> YOUR HOME. YOUR BUSINESS.
        <br />
        <strong>BUILT AROUND HOW YOU USE IT.</strong>
      </div>
      <div className="connected-space-bottom">
        <span className="dot" />
        CLEAN INSTALLS. CLEAR CONNECTIONS.<span>CONCEPT VIEW</span>
      </div>
    </div>
  );
}

export function MarketingHome({ inquiryOnly }: { inquiryOnly: boolean }) {
  return (
    <>
      <Header />
      <main className="marketing-home">
        <section className="marketing-hero container">
          <div className="marketing-hero-copy">
            <div className="eyebrow">
              <span className="dot" />
              SMARTER SPACES. DALLAS–FORT WORTH.
            </div>
            <h1>
              Your space.
              <br />
              Only <em>smarter.</em>
            </h1>
            <p>
              Reliable networks. Clean installations. Technology that works for
              your home, your business, and the way you live.
            </p>
            <div className="marketing-actions">
              <Link href="/request" className="button">
                Tell us about your project <ArrowUpRight size={18} />
              </Link>
              <a href="#services" className="text-link">
                Explore solutions <ArrowRight size={17} />
              </a>
            </div>
            <div className="marketing-location">
              <MapPin size={15} />
              <span>Local service. Thoughtful solutions. Clear scope.</span>
            </div>
            {inquiryOnly && (
              <p className="launch-status">
                <span />
                Preparing to launch · Project inquiries welcome
              </p>
            )}
          </div>
          <ConnectedSpace />
        </section>
        <div className="marketing-trust">
          <div className="container">
            {[
              "Homes & businesses",
              "Itemized project quotes",
              "Testing & documentation",
              "Built around your space",
            ].map((text) => (
              <span key={text}>
                <Check size={16} />
                {text}
              </span>
            ))}
          </div>
        </div>

        <section id="services" className="marketing-section container">
          <div className="marketing-heading">
            <div>
              <div className="eyebrow">OUR SOLUTIONS</div>
              <h2>
                The right connections.
                <br />A better everyday.
              </h2>
            </div>
            <p>
              Start with your space. Explore the work that brings it together.
            </p>
          </div>
          <SolutionSelector />
        </section>

        <section id="commitment" className="commitment-section">
          <div className="container">
            <div className="marketing-heading">
              <div>
                <div className="eyebrow">OUR COMMITMENT</div>
                <h2>
                  Done with intention.
                  <br />
                  Down to the last detail.
                </h2>
              </div>
              <p>
                Our approach is simple: install thoughtfully, check the work,
                and leave you with a setup you understand.
              </p>
            </div>
            <div className="commitment-grid">
              {standards.map(({ icon: Icon, title, text }, index) => (
                <article key={title}>
                  <div className="commitment-number">
                    <Icon size={25} />
                    <span>0{index + 1}</span>
                  </div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
            <div className="commitment-foot">
              <Check size={17} />
              <span>A clear scope before work. A walkthrough at handoff.</span>
              <span>THE DETAILS MAKE THE DIFFERENCE.</span>
            </div>
          </div>
        </section>

        <section id="industries" className="marketing-section container">
          <div className="marketing-heading">
            <div>
              <div className="eyebrow">SPACES WE SERVE</div>
              <h2>
                Different spaces.
                <br />
                The same care.
              </h2>
            </div>
            <p>
              At home, at work, or behind the counter. Your setup should support
              what happens there.
            </p>
          </div>
          <div className="industry-grid">
            {industries.map(
              ({
                name,
                icon: Icon,
                label,
                text,
                service,
                property,
                detail,
              }) => (
                <article className="industry-card" key={name}>
                  <div className="industry-visual" aria-hidden="true">
                    <span>{label}</span>
                    <div className="industry-orbit" />
                    <Icon size={62} strokeWidth={1} />
                    <small>{detail}</small>
                  </div>
                  <div className="industry-copy">
                    <h3>{name}</h3>
                    <p>{text}</p>
                    <Link
                      href={`/request?service=${service}&property=${property}`}
                    >
                      Discuss your space <ArrowUpRight size={17} />
                    </Link>
                  </div>
                </article>
              ),
            )}
          </div>
        </section>

        <section id="how-it-works" className="marketing-process">
          <div className="container">
            <div className="marketing-heading">
              <div>
                <div className="eyebrow">HOW IT WORKS</div>
                <h2>
                  A clear path.
                  <br />
                  From idea to installation.
                </h2>
              </div>
              <Link href="/request" className="text-link">
                Start a conversation <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="marketing-steps">
              {[
                [
                  "01",
                  "Tell us about your space",
                  "Share your goals, location, equipment, and preferred timing. You don’t need to know the technical fix.",
                ],
                [
                  "02",
                  "Define it together",
                  "We clarify the scope and requirements, then prepare itemized pricing when the project is ready to quote.",
                ],
                [
                  "03",
                  "Connect. Check. Explain.",
                  "After scope and scheduling are agreed, we complete the work, check the result, and walk you through your setup.",
                ],
              ].map(([n, title, text]) => (
                <article key={n}>
                  <span>
                    {n}
                    <ArrowRight size={18} />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
            {inquiryOnly && (
              <p className="process-launch-note">
                We’re gathering inquiries while completing launch setup. An
                inquiry is not a booking; appointments and online payments are
                not available yet.
              </p>
            )}
          </div>
        </section>

        <section id="contact" className="marketing-contact container">
          <div className="contact-intro">
            <div className="eyebrow">LET’S CONNECT</div>
            <h2>
              Smarten up
              <br />
              your space.
            </h2>
            <p>
              A better connection starts with a conversation. Tell us what you
              have in mind, and we’ll help define the next step.
            </p>
            <ul>
              <li>
                <Check size={17} />
                Clear, project-specific scope
              </li>
              <li>
                <Check size={17} />
                Equipment you own or help sourcing it
              </li>
              <li>
                <Check size={17} />
                Scheduling agreed around the project
              </li>
            </ul>
            <div className="contact-email">
              <span>PREFER EMAIL?</span>
              <a href={`mailto:${inquiryEmail}`}>
                {inquiryEmail} <ArrowUpRight size={17} />
              </a>
            </div>
          </div>
          {inquiryOnly ? (
            <InquiryForm />
          ) : (
            <div className="contact-request-card">
              <span className="contact-card-mark">
                <MessageSquare size={28} />
              </span>
              <div className="eyebrow">YOUR NEXT PROJECT STARTS HERE</div>
              <h3>
                Tell us what
                <br />
                needs working.
              </h3>
              <p>
                Share your project details through our request form. Your client
                portal keeps requests, quotes, invoices, and messages together.
              </p>
              <Link href="/request" className="button full">
                Request a project quote <ArrowUpRight size={18} />
              </Link>
              <p className="contact-card-note">
                No payment is required to submit a request. A visit is confirmed
                after scope and scheduling are agreed.
              </p>
              <Link href="/portal" className="text-link">
                Already have a project? Open your portal{" "}
                <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
