"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Network, Wifi } from "lucide-react";
import { ServiceIcon } from "./brand";
import { services } from "../lib/catalog";

// Concept illustrations, rather than photographs of installations we haven't done.
function SolutionIllustration({ id, name }: { id: string; name: string }) {
  return (
    <div
      className={`solution-illustration illustration-${id}`}
      role="img"
      aria-label={`${name} concept illustration`}
    >
      <div className="illustration-caption">
        <span>DFW / SYSTEM STUDY</span>
        <span>ILLUSTRATIVE</span>
      </div>
      {id === "racks" || id === "cabling" ? (
        <div className="rack-study" aria-hidden="true">
          <div className="rack-rail rail-left" />
          <div className="rack-rail rail-right" />
          <div className="rack-unit rack-panel">
            <span>PATCH / 01</span>
            <div>
              {Array.from({ length: 8 }, (_, i) => (
                <i key={i} />
              ))}
            </div>
          </div>
          <div className="patch-leads">
            {Array.from({ length: 5 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
          <div className="rack-unit rack-switch">
            <Network size={23} />
            <span>NETWORK SWITCH</span>
            <i />
          </div>
          <div className="rack-unit rack-label">
            <span>LABELED. ORGANIZED. CONNECTED.</span>
          </div>
        </div>
      ) : id === "tv" ? (
        <div className="av-study" aria-hidden="true">
          <div className="av-screen">
            <div />
            <span>A CLEARER VIEW.</span>
          </div>
          <div className="av-raceway" />
          <div className="av-console">
            <i />
            <i />
          </div>
        </div>
      ) : (
        <div className="home-study" aria-hidden="true">
          <div className="floor-plan">
            <span className="room room-one" />
            <span className="room room-two" />
            <span className="room room-three" />
            <div className="home-signal">
              <Wifi size={36} />
            </div>
            <span className="coverage coverage-one" />
            <span className="coverage coverage-two" />
            <span className="device-point point-one" />
            <span className="device-point point-two" />
            <span className="device-point point-three" />
          </div>
        </div>
      )}
      <div className="illustration-bottom">
        <span className="dot" />
        {id === "cabling"
          ? "EVERY CONNECTION HAS A PLACE"
          : id === "racks"
            ? "ORDER BEHIND THE SCENES"
            : id === "tv"
              ? "LESS CLUTTER. MORE SPACE."
              : id === "smart"
                ? "SMALL ROUTINES. EVERYDAY EASE."
                : "COVERAGE BUILT AROUND YOUR SPACE"}
      </div>
    </div>
  );
}

export function SolutionSelector() {
  const [selected, setSelected] = useState("wifi");
  const panelId = useId();
  const service = services.find((item) => item.id === selected) ?? services[0];
  return (
    <div className="solution-explorer">
      <div
        className="solution-options"
        role="group"
        aria-label="Choose a solution"
      >
        {services.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={selected === item.id}
            aria-controls={panelId}
            onClick={() => setSelected(item.id)}
          >
            <span className="solution-option-number">0{index + 1}</span>
            <ServiceIcon kind={item.icon} size={22} />
            <span>{item.name}</span>
            <ArrowUpRight size={18} />
          </button>
        ))}
        <p>
          Not sure what you need?
          <br />
          <Link href="/request">
            Start with the problem. <ArrowRight size={14} />
          </Link>
        </p>
      </div>
      <section
        className="solution-detail"
        id={panelId}
        aria-label="Selected solution"
      >
        <SolutionIllustration id={service.id} name={service.name} />
        <div
          className="solution-description"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="eyebrow">{service.short}</div>
          <h3>{service.name}</h3>
          <p>{service.description}</p>
          <ul>
            {service.details.map((detail) => (
              <li key={detail}>
                <Check size={16} />
                {detail}
              </li>
            ))}
          </ul>
          <Link href={`/request?service=${service.id}`} className="button">
            Discuss this solution <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
