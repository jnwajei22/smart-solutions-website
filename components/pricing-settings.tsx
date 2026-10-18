"use client";
import { useEffect, useState } from "react";
import { validatePriceBook, type PriceBook } from "@/lib/pricing";

const fields = [
  ["loadedLaborCentsPerHour", "Loaded Labor Cost per Person-Hour ($)", 100],
  [
    "additionalLaborCentsPerHour",
    "Additional Labor Selling Rate per Person-Hour ($)",
    100,
  ],
  ["vehicleCentsPerMile", "Vehicle Cost per Mile ($)", 100],
  ["overheadCents", "Allocated Overhead per Job ($)", 100],
  ["adminMinutes", "Preparation and Admin Minutes per Job", 1],
  ["cardReserveBps", "Payment Processing Reserve (%)", 100],
  ["callbackReserveBps", "Callback Reserve (%)", 100],
  ["targetMarginBps", "Contribution Margin Floor (%)", 100],
  ["regionalTravelCents", "31–60 Minute Travel Price ($)", 100],
  ["regionalMinimumCents", "31–60 Minute Service Minimum ($)", 100],
  ["distantTravelCents", "61–90 Minute Travel Price ($)", 100],
  ["distantMinimumCents", "61–90 Minute Service Minimum ($)", 100],
] as const;
export function PricingSettings() {
  const [book, setBook] = useState<PriceBook | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/pricing", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Unable to load price book.");
        setBook(validatePriceBook(data.priceBook));
      })
      .catch((error) => {
        if (error.name !== "AbortError") setNotice(error.message);
      });
    return () => controller.abort();
  }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!book || busy) return;
    setBusy(true);
    setNotice("");
    try {
      const priceBook = validatePriceBook({
        ...book,
        version: `pricebook-${Date.now()}`,
      });
      const response = await fetch("/api/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceBook, expectedVersion: book.version }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          response.status === 409
            ? "Shared pricing changed elsewhere. Reload this page before editing again; your changes were not saved."
            : data.error || "Unable to save pricing.",
        );
      setBook(validatePriceBook(data.priceBook || priceBook));
      setNotice(
        "Shared pricing saved. Existing issued quotes are unchanged; open drafts must review the new version.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to save pricing.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="pricing-calculator">
      <h2>Shared Price Book</h2>
      <p>
        Internal planning assumptions, not verified market rates. Package prices
        cover labor only; equipment and materials are itemized separately. Tax
        must be reviewed per quote.
      </p>
      {notice && <p role="status">{notice}</p>}
      {book && (
        <form onSubmit={save}>
          <fieldset disabled={busy}>
            <legend>Packages</legend>
            {book.packages.map((p, index) => (
              <div className="pricing-row" key={p.id}>
                <h3>{p.name}</h3>
                <label>
                  Labor Price ($)
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={p.laborCents / 100}
                    onChange={(e) =>
                      setBook({
                        ...book,
                        packages: book.packages.map((v, i) =>
                          i === index
                            ? {
                                ...v,
                                laborCents: Math.round(
                                  e.target.valueAsNumber * 100,
                                ),
                              }
                            : v,
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  Included Onsite Minutes
                  <input
                    type="number"
                    min="15"
                    max="1440"
                    required
                    value={p.onsiteMinutes}
                    onChange={(e) =>
                      setBook({
                        ...book,
                        packages: book.packages.map((v, i) =>
                          i === index
                            ? { ...v, onsiteMinutes: e.target.valueAsNumber }
                            : v,
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  Technicians
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={p.crew}
                    onChange={(e) =>
                      setBook({
                        ...book,
                        packages: book.packages.map((v, i) =>
                          i === index
                            ? { ...v, crew: e.target.valueAsNumber }
                            : v,
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  Included Scope
                  <textarea
                    required
                    maxLength={2000}
                    value={p.scope}
                    onChange={(e) =>
                      setBook({
                        ...book,
                        packages: book.packages.map((v, i) =>
                          i === index ? { ...v, scope: e.target.value } : v,
                        ),
                      })
                    }
                  />
                </label>
              </div>
            ))}
          </fieldset>
          <fieldset disabled={busy}>
            <legend>Private Costs, Selling Rules and Travel</legend>
            <div className="form-grid">
              {fields.map(([key, title, divisor]) => (
                <label key={key}>
                  {title}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={book[key] / divisor}
                    onChange={(e) =>
                      setBook({
                        ...book,
                        [key]: Math.round(e.target.valueAsNumber * divisor),
                      })
                    }
                  />
                </label>
              ))}
            </div>
            <p>
              0–30 minutes: travel included. Travel-zone minimums exclude travel
              and tax and apply after discounts. Over 90 minutes requires manual
              review; no automatic price is assumed. Dispatch location is
              confirmed on each quote.
            </p>
            <button className="button" disabled={busy} type="submit">
              {busy ? "Saving…" : "Save Shared Pricing"}
            </button>
          </fieldset>
        </form>
      )}
    </section>
  );
}
export default PricingSettings;
