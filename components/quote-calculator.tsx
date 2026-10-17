"use client";
import { useEffect, useState } from "react";
import {
  calculateQuote,
  createPricingPlan,
  defaultPriceBook,
  validatePriceBook,
  type PriceBook,
  type PricingPlan,
  type QuoteCalculation,
} from "@/lib/pricing";

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export function QuoteCalculator({
  value,
  onChange,
  disabled = false,
  service,
  equipmentSupply,
  demo = false,
}: {
  value: PricingPlan | null;
  onChange: (plan: PricingPlan, result: QuoteCalculation | null) => void;
  disabled?: boolean;
  service?: string;
  equipmentSupply?: string;
  demo?: boolean;
}) {
  const [book, setBook] = useState<PriceBook | null>(
    demo ? defaultPriceBook : null,
  );
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    if (demo) return;
    const controller = new AbortController();
    fetch("/api/pricing", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Unable to load pricing.");
        setBook(validatePriceBook(data.priceBook));
      })
      .catch((error) => {
        if (error.name !== "AbortError") setLoadError(error.message);
      });
    return () => controller.abort();
  }, [demo]);
  async function reloadRates() {
    setLoadError("");
    try {
      const response = await fetch("/api/pricing", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to reload pricing.");
      setBook(validatePriceBook(data.priceBook));
      if (value) onChange(value, null);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Unable to reload pricing.",
      );
    }
  }
  if (!book)
    return (
      <section className="pricing-calculator">
        <p role={loadError ? "alert" : "status"}>
          {loadError || "Loading shared price book…"}
        </p>
      </section>
    );
  function start() {
    const selected = book!.packages.find((p) =>
      service === "racks"
        ? p.id === "business"
        : `${service || ""}`.toLowerCase().includes(p.id),
    );
    const next = createPricingPlan(book!, selected?.id);
    if (["customer", "business", "mixed"].includes(equipmentSupply || ""))
      next.equipmentSupply = equipmentSupply as PricingPlan["equipmentSupply"];
    onChange(next, null);
  }
  if (!value)
    return (
      <section className="pricing-calculator">
        <h3>Guided Quote Calculator</h3>
        <p>
          Use shared labor prices, travel rules and private cost estimates.
          Package prices exclude equipment and materials. Review every quote
          before issue.
        </p>
        <button
          type="button"
          className="button"
          disabled={disabled}
          onClick={start}
        >
          Start Calculator
        </button>
      </section>
    );
  const plan = value;
  const update = (patch: Partial<PricingPlan>) => {
    const next = { ...plan, ...patch };
    let calculation: QuoteCalculation | null = null;
    try {
      calculation = calculateQuote(next, book!);
    } catch {}
    onChange(next, calculation);
  };
  let result: ReturnType<typeof calculateQuote> | null = null,
    error = "";
  try {
    result = calculateQuote(plan, book);
  } catch (e) {
    error = e instanceof Error ? e.message : "Check quote inputs.";
  }
  const number = (
    key:
      | "crew"
      | "onsiteMinutes"
      | "oneWayMinutes"
      | "roundTripMinutes"
      | "miles"
      | "customTravelCents"
      | "discountCents"
      | "taxCents",
    title: string,
    cents = false,
  ) => (
    <label>
      {title}
      <input
        type="number"
        min="0"
        step={cents ? "0.01" : "1"}
        value={cents ? plan[key] / 100 : plan[key]}
        onChange={(e) =>
          update({
            [key]: cents
              ? Math.round(e.target.valueAsNumber * 100)
              : e.target.valueAsNumber,
          })
        }
      />
    </label>
  );
  return (
    <section className="pricing-calculator">
      <h3>Guided Quote Calculator</h3>
      <p className="fine-print">
        Internal estimate · Price book {book.version}. Costs and margin remain
        private. Tax is entered after operator review; zero is not an automatic
        tax determination.
      </p>
      <fieldset disabled={disabled}>
        <legend>Scope and Travel</legend>
        <label>
          Labor Package
          <select
            value={plan.packageId}
            onChange={(e) => {
              const p = book.packages.find((p) => p.id === e.target.value)!;
              update({
                packageId: p.id,
                crew: p.crew,
                onsiteMinutes: p.onsiteMinutes,
              });
            }}
          >
            {book.packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {money(p.laborCents)} Labor
              </option>
            ))}
          </select>
        </label>
        <p>{book.packages.find((p) => p.id === plan.packageId)?.scope}</p>
        <div className="form-grid">
          {number("crew", "Technicians")}
          {number("onsiteMinutes", "Estimated Onsite Minutes")}
          <label>
            Dispatch Location
            <input
              value={plan.dispatchLabel}
              maxLength={200}
              placeholder="Dispatch city or ZIP (not a home address)"
              onChange={(e) => update({ dispatchLabel: e.target.value })}
            />
          </label>
          {number("oneWayMinutes", "One-Way Travel Minutes")}
          {number("roundTripMinutes", "Round-Trip Travel Minutes")}
          {number("miles", "Total Vehicle Miles (All Vehicles)")}
        </div>
        <p className="fine-print">
          Additional labor above package person-hours:{" "}
          {money(book.additionalLaborCentsPerHour)} per person-hour. Travel
          estimates are entered by the operator, not calculated from a map.
          Include return travel and every technician’s time. Count the combined
          round-trip miles of all vehicles used.
        </p>
        {plan.oneWayMinutes > 90 && (
          <>
            {number("customTravelCents", "Custom Travel Price ($)", true)}
            <label>
              <input
                type="checkbox"
                checked={plan.manualTravelReviewed}
                onChange={(e) =>
                  update({ manualTravelReviewed: e.target.checked })
                }
              />{" "}
              I reviewed transport, crew travel and the minimum project charge.
            </label>
          </>
        )}
        <label>
          Equipment Supply
          <select
            value={plan.equipmentSupply}
            onChange={(e) =>
              update({
                equipmentSupply: e.target
                  .value as PricingPlan["equipmentSupply"],
              })
            }
          >
            <option value="customer">
              Customer Supplies All Equipment/Materials
            </option>
            <option value="mixed">Mixed Supply</option>
            <option value="business">
              Business Supplies Itemized Equipment/Materials
            </option>
          </select>
        </label>
        <label>
          Equipment and Compatibility Notes
          <textarea
            value={plan.equipmentDetails}
            maxLength={2000}
            onChange={(e) => update({ equipmentDetails: e.target.value })}
            placeholder="Models, accessories, condition and scope limits"
          />
        </label>
        <h4>Materials</h4>
        <p className="fine-print">
          Unit cost is private. Selling price appears on the customer quote.
          Customer-owned parts are not billed again.
        </p>
        {plan.materials.map((m, index) => (
          <div className="pricing-row" key={index}>
            <label>
              Description
              <input
                value={m.description}
                maxLength={200}
                onChange={(e) =>
                  update({
                    materials: plan.materials.map((v, i) =>
                      i === index ? { ...v, description: e.target.value } : v,
                    ),
                  })
                }
              />
            </label>
            {(["quantity", "costCents", "sellCents"] as const).map((key) => (
              <label key={key}>
                {key === "quantity"
                  ? "Quantity"
                  : key === "costCents"
                    ? "Unit Cost ($, Private)"
                    : "Unit Selling Price ($)"}
                <input
                  type="number"
                  min={key === "quantity" ? 1 : 0}
                  step={key === "quantity" ? 1 : 0.01}
                  value={key === "quantity" ? m[key] : m[key] / 100}
                  onChange={(e) =>
                    update({
                      materials: plan.materials.map((v, i) =>
                        i === index
                          ? {
                              ...v,
                              [key]:
                                key === "quantity"
                                  ? e.target.valueAsNumber
                                  : Math.round(e.target.valueAsNumber * 100),
                            }
                          : v,
                      ),
                    })
                  }
                />
              </label>
            ))}
            <button
              type="button"
              onClick={() =>
                update({
                  materials: plan.materials.filter((_, i) => i !== index),
                })
              }
            >
              Remove Material {index + 1}
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={
            plan.equipmentSupply === "customer" || plan.materials.length >= 15
          }
          onClick={() =>
            update({
              materials: [
                ...plan.materials,
                { description: "", quantity: 1, costCents: 0, sellCents: 0 },
              ],
            })
          }
        >
          Add Material
        </button>
        <h4>Scope Additions</h4>
        <p className="fine-print">
          Include any actual extra labor in the onsite time estimate above.
          Addition costs must exclude labor, materials and overhead already
          counted elsewhere.
        </p>
        {plan.adders.map((a, index) => (
          <div className="pricing-row" key={index}>
            <label>
              Explanation
              <input
                value={a.description}
                maxLength={200}
                onChange={(e) =>
                  update({
                    adders: plan.adders.map((v, i) =>
                      i === index ? { ...v, description: e.target.value } : v,
                    ),
                  })
                }
              />
            </label>
            {(["costCents", "sellCents"] as const).map((key) => (
              <label key={key}>
                {key === "costCents"
                  ? "Additional Cost ($, Private)"
                  : "Customer Price ($)"}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={a[key] / 100}
                  onChange={(e) =>
                    update({
                      adders: plan.adders.map((v, i) =>
                        i === index
                          ? {
                              ...v,
                              [key]: Math.round(e.target.valueAsNumber * 100),
                            }
                          : v,
                      ),
                    })
                  }
                />
              </label>
            ))}
            <button
              type="button"
              onClick={() =>
                update({ adders: plan.adders.filter((_, i) => i !== index) })
              }
            >
              Remove Addition {index + 1}
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={plan.adders.length >= 5}
          onClick={() =>
            update({
              adders: [
                ...plan.adders,
                { description: "", costCents: 0, sellCents: 0 },
              ],
            })
          }
        >
          Add Explained Scope Addition
        </button>
        <div className="form-grid">
          {number("discountCents", "Discount ($)", true)}
          <label>
            Discount Reason
            <input
              maxLength={200}
              value={plan.discountReason}
              onChange={(e) => update({ discountReason: e.target.value })}
            />
          </label>
          {number("taxCents", "Applicable Tax ($)", true)}
        </div>
        <label>
          <input
            type="checkbox"
            checked={plan.taxReviewed}
            onChange={(e) => update({ taxReviewed: e.target.checked })}
          />{" "}
          I reviewed applicable tax for this scope and equipment supply,
          including any zero amount.
        </label>
        {!demo && (
          <button type="button" disabled={disabled} onClick={reloadRates}>
            Reload Shared Rates (Keep Draft)
          </button>
        )}
        {loadError && <p role="alert">{loadError}</p>}
        {plan.priceBookVersion !== book.version && (
          <button
            type="button"
            onClick={() => update({ priceBookVersion: book.version })}
          >
            Use Current Price Book and Recalculate
          </button>
        )}
        {error && <p role="status">{error}</p>}
        {result && (
          <>
            <h4>Internal Estimate</h4>
            <dl className="pricing-summary">
              <dt>Customer Total</dt>
              <dd>{money(result.totalCents)}</dd>
              <dt>Estimated Cost and Reserves</dt>
              <dd>{money(result.estimatedCostCents)}</dd>
              <dt>Contribution Before Unallocated Expenses</dt>
              <dd>
                {money(result.contributionCents)} (
                {(result.marginBps / 100).toFixed(1)}%)
              </dd>
            </dl>
            {result.warnings.length > 0 && (
              <ul>
                {result.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
            <h4>Customer Line Items</h4>
            <ul>
              {result.items.map((item, i) => (
                <li key={i}>
                  {item.description} × {item.quantity}:{" "}
                  {money(item.unit_cents * item.quantity)}
                </li>
              ))}
            </ul>
          </>
        )}
        <label>
          Pricing Override Reason {result?.requiresOverride ? "(Required)" : ""}
          <textarea
            maxLength={2000}
            value={plan.overrideReason}
            onChange={(e) => update({ overrideReason: e.target.value })}
            placeholder="Explain any approved margin, travel or scope exception"
          />
        </label>
      </fieldset>
    </section>
  );
}
export default QuoteCalculator;
