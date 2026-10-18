"use client";
import { useEffect, useState } from "react";
import { money } from "../lib/catalog";
type Record = {
  price_book_version: string;
  created_at: string;
  audit: {
    estimatedCostCents: number;
    contributionCents: number;
    marginBps: number;
    warnings: string[];
    plan: { overrideReason: string };
  };
};
export function PricingAudit({
  invoiceId,
  demo = false,
}: {
  invoiceId: string;
  demo?: boolean;
}) {
  const [record, setRecord] = useState<Record | null>(null),
    [notice, setNotice] = useState(
      demo
        ? "Sample invoice predates the calculator."
        : "Loading pricing record…",
    );
  useEffect(() => {
    if (demo) return;
    const controller = new AbortController();
    fetch(`/api/pricing?invoice=${encodeURIComponent(invoiceId)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw Error(data.error);
        setRecord(data.record);
        setNotice(
          data.record
            ? ""
            : "This invoice predates the calculator. Its original amounts remain unchanged.",
        );
      })
      .catch((error) => {
        if (error.name !== "AbortError")
          setNotice("Unable to load the private pricing record.");
      });
    return () => controller.abort();
  }, [invoiceId, demo]);
  return (
    <details className="pricing-record">
      <summary>Internal Pricing Record</summary>
      <p className="fine-print">
        Visible to project managers; excluded from the customer invoice.
      </p>
      {notice && <p>{notice}</p>}
      {record && (
        <>
          <p>Price book: {record.price_book_version}</p>
          <dl className="account-details">
            <div>
              <dt>Estimated Cost & Reserves</dt>
              <dd>{money(record.audit.estimatedCostCents)}</dd>
            </div>
            <div>
              <dt>Estimated Contribution</dt>
              <dd>
                {money(record.audit.contributionCents)} ·{" "}
                {(record.audit.marginBps / 100).toFixed(1)}%
              </dd>
            </div>
            <div>
              <dt>Pricing Exception</dt>
              <dd>{record.audit.plan.overrideReason || "None"}</dd>
            </div>
          </dl>
          {record.audit.warnings.length > 0 && (
            <ul>
              {record.audit.warnings.map((value) => (
                <li key={value}>{value}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </details>
  );
}
