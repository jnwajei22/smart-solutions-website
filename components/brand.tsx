import { inquiryOnly } from "../lib/launch";
import Link from "next/link";
import { MobileNavigation } from "./mobile-navigation";
import {
  ArrowUpRight,
  Cable,
  Wifi,
  Server,
  Tv,
  House,
  MoveUpRight,
} from "lucide-react";
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand ${light ? "light" : ""}`}
      aria-label="DFW Smart Solutions home"
    >
      <span className="brand-mark">
        <span />
        <span />
        <span />
      </span>
      <span>
        DFW SMART<span className="brand-sub">SOLUTIONS</span>
      </span>
    </Link>
  );
}
export function Header() {
  return (
    <header className="site-header">
      <div className="container nav">
        <Brand />
        <nav aria-label="Main navigation">
          <Link href="/#services">Our services</Link>
          <Link href="/#how-it-works">How it works</Link>
          {!inquiryOnly() && (
            <Link href="/portal">
              Client portal <ArrowUpRight size={14} />
            </Link>
          )}
        </nav>
        <Link href="/request" className="button small desktop-cta">
          Let’s connect <ArrowUpRight size={16} />
        </Link>
        <MobileNavigation inquiryOnly={inquiryOnly()} />
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <Brand light />
          <p>
            Smarten up your space.
            <br />
            Dallas–Fort Worth, Texas.
          </p>
          <Link href="/request" className="footer-cta">
            Let’s make it work. <MoveUpRight />
          </Link>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} DFW Smart Solutions LLC</span>
          <div>
            {!inquiryOnly() && <Link href="/portal">Client portal</Link>}
            <Link href="/help">
              {inquiryOnly() ? "Inquiry Help" : "Client Help"}
            </Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Service terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
export function ServiceIcon({
  kind,
  size = 24,
}: {
  kind: string;
  size?: number;
}) {
  const Icon =
    { cable: Cable, wifi: Wifi, server: Server, tv: Tv, home: House }[kind] ||
    Cable;
  return <Icon size={size} strokeWidth={1.5} />;
}
