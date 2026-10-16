"use client";
import { useRef, useState } from "react";
import Link from "next/link";
export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  return (
    <div
      className="mobile-site-menu"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          toggle.current?.focus();
        }
      }}
    >
      <button
        ref={toggle}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-site-links"
        onClick={() => setOpen(!open)}
      >
        Menu {open ? "−" : "+"}
      </button>
      {open && (
        <nav id="mobile-site-links" aria-label="Mobile navigation">
          {[
            ["/#services", "Our Services"],
            ["/#how-it-works", "How It Works"],
            ["/portal", "Client Portal"],
            ["/request", "Request a Service"],
            ["/help", "Client Help"],
          ].map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
