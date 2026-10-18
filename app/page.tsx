import { inquiryOnly } from "../lib/launch";
import { PublicLaunch } from "../components/public-launch";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  ShieldCheck,
  Network,
  MapPin,
  Wifi,
  PlugZap,
} from "lucide-react";
import { Header, Footer, ServiceIcon } from "../components/brand";
import { services } from "../lib/catalog";
export default function Home() {
  if (inquiryOnly()) return <PublicLaunch />;
  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="dot" /> CONNECTING DALLAS–FORT WORTH
              </div>
              <h1>
                Your space.
                <br />
                Only <em>smarter.</em>
              </h1>
              <p>
                Reliable networks. Thoughtful installations. Technology that
                fits your home, your business, and the way you live.
              </p>
              <div className="actions">
                <Link href="/request" className="button">
                  Tell us about your project <ArrowUpRight size={18} />
                </Link>
                <a href="#services" className="text-link">
                  Explore services <ArrowRight size={17} />
                </a>
              </div>
              <div className="hero-note">
                <MapPin size={15} /> Local service. Clear scope. Personal
                attention.
              </div>
            </div>
            <div
              className="connection-scene"
              role="img"
              aria-label="Illustrated connected home and office network"
            >
              <div className="scene-grid" />
              <div className="scene-label">
                A BETTER-CONNECTED SPACE <span>01 / DFW</span>
              </div>
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="network-line line-one" />
              <div className="network-line line-two" />
              <div className="network-line line-three" />
              <div className="hub">
                <span className="hub-light" />
                <Network size={54} strokeWidth={1} />
                <span>SMART CONNECTIONS</span>
                <div className="hub-ports">
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </div>
              <div className="scene-node node-wifi">
                <Wifi size={27} />
                <span>Whole-space Wi-Fi</span>
                <i />
              </div>
              <div className="scene-node node-home">
                <ServiceIcon kind="home" size={27} />
                <span>Connected living</span>
                <i />
              </div>
              <div className="scene-node node-cable">
                <PlugZap size={26} />
                <span>Clean infrastructure</span>
                <i />
              </div>
              <div className="scene-bottom">
                <span className="dot" /> DESIGNED TO WORK TOGETHER{" "}
                <span>32.7767° N / 96.7970° W</span>
              </div>
            </div>
          </div>
        </section>
        <div className="trust-strip">
          <div className="container">
            <span>
              <Check size={16} /> Homes & small businesses
            </span>
            <span>
              <Check size={16} /> Clear, project-specific quotes
            </span>
            <span>
              <Check size={16} /> Tested & explained
            </span>
            <span>
              <Check size={16} /> Built around your space
            </span>
          </div>
        </div>
        <section id="services" className="section container">
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                PRACTICAL TECHNOLOGY. PROPERLY INSTALLED.
              </div>
              <h2>
                Small upgrades.
                <br />A better everyday.
              </h2>
            </div>
            <p>
              From the connection behind your desk to the network behind your
              business, we help make your technology simpler.
            </p>
          </div>
          <div className="service-grid">
            {services.map((s, i) => (
              <article className="service-card" key={s.id}>
                <div className="service-top">
                  <ServiceIcon kind={s.icon} />
                  <span>0{i + 1}</span>
                </div>
                <h3>{s.name}</h3>
                <p>{s.description}</p>
                <ul>
                  {s.details.map((t) => (
                    <li key={t}>
                      <Check size={13} />
                      {t}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/request?service=${s.id}`}
                  className="service-link"
                >
                  Let’s talk{" "}
                  {s.id === "wifi"
                    ? "networks"
                    : s.id === "tv"
                      ? "AV"
                      : s.id === "smart"
                        ? "smart living"
                        : s.id === "racks"
                          ? "organization"
                          : "cabling"}{" "}
                  <ArrowUpRight size={18} />
                </Link>
              </article>
            ))}
            <article className="service-card service-prompt">
              <span className="eyebrow">NOT SURE WHERE TO START?</span>
              <h3>Tell us what isn’t working.</h3>
              <p>
                You don’t need to know the technical fix. Start with the
                problem, and we’ll help define the next step.
              </p>
              <Link href="/request" className="button gold">
                Start a conversation <ArrowUpRight size={18} />
              </Link>
            </article>
          </div>
        </section>
        <section id="how-it-works" className="process-section">
          <div className="container">
            <div className="section-heading">
              <div>
                <div className="eyebrow">NO GUESSWORK REQUIRED</div>
                <h2>
                  A clear path from
                  <br />
                  “what if” to working.
                </h2>
              </div>
              <Link href="/request" className="text-link">
                Start your project <ArrowUpRight size={18} />
              </Link>
            </div>
            <div className="steps">
              {[
                [
                  "01",
                  "Tell us about your space",
                  "Share your goals, location, and a few details. We’ll review the request and follow up to clarify the scope.",
                ],
                [
                  "02",
                  "Review your quote",
                  "See the proposed work, itemized costs, and any required deposit. Approve it in your client portal.",
                ],
                [
                  "03",
                  "We get it connected",
                  "We coordinate the visit, complete the agreed work, test the result, and walk you through your setup.",
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
        <section className="section container portal-pitch">
          <div>
            <div className="eyebrow">YOUR PROJECT, IN ONE PLACE</div>
            <h2>
              Less chasing.
              <br />
              More clarity.
            </h2>
            <p>
              A dedicated client portal keeps your requests, quotes, invoices,
              and payment history together. Check in whenever it suits you.
            </p>
            <Link href="/portal" className="button">
              Go to your portal <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="portal-illustration">
            <div className="mock-heading">
              <span className="mini-mark">D / S</span>
              <span>YOUR CLIENT PORTAL</span>
              <span className="tag">ONE PLACE</span>
            </div>
            <div className="mock-row">
              <div className="icon-box">
                <ServiceIcon kind="cable" />
              </div>
              <div>
                <strong>Your next project</strong>
                <small>A clear view, from request to completion</small>
              </div>
              <ArrowUpRight size={20} />
            </div>
            <div className="mock-tracker">
              <span>Request</span>
              <span>Quote</span>
              <span>Installation</span>
              <span>Handoff</span>
            </div>
            <div className="mock-foot">
              <ShieldCheck size={19} />
              <span>Quotes, payments & history, together.</span>
            </div>
          </div>
        </section>
        <section className="cta-section">
          <div className="container">
            <div>
              <div className="eyebrow">LET’S CONNECT</div>
              <h2>
                Good technology should
                <br />
                make life easier.
              </h2>
              <p>Let’s start with your space.</p>
            </div>
            <Link href="/request" className="button gold">
              Request a project quote <ArrowUpRight size={20} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
