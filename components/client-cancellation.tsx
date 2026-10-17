"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Invoice } from "../lib/catalog";
export function ClientCancellation({
  invoice,
  demo,
}: {
  invoice: Invoice;
  demo: boolean;
}) {
  const [reason, setReason] = useState(
    invoice.client_cancellation_reason || "",
  );
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  return (
    <section className="client-cancellation">
      {invoice.client_cancellation_reason && (
        <div className="cancellation-summary">
          <strong>Your Cancellation Reason</strong>
          <p>{invoice.client_cancellation_reason}</p>
          <small>
            {invoice.status === "void"
              ? "Cancellation completed."
              : "Requested. The team will review payments and any refund before completing cancellation."}
          </small>
        </div>
      )}
      {invoice.status !== "void" &&
        (editing ? (
          <form
            className="cancellation-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const r = await fetch("/api/cancellations", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ invoice_id: invoice.id, reason }),
                });
                const d = await r.json();
                if (!r.ok) throw Error(d.error);
                setEditing(false);
                setSaved(true);
                router.refresh();
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Unable to save cancellation.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Cancellation Reason
              <textarea
                required
                minLength={3}
                maxLength={500}
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <p className="fine-print">
              Requesting cancellation pauses new payments. Refunds are reviewed
              separately under your project terms.
            </p>
            <div className="form-actions">
              <button className="button small" disabled={busy || demo}>
                {busy ? "Saving…" : "Save Cancellation Request"}
              </button>
              <button
                className="text-link"
                type="button"
                disabled={busy}
                onClick={() => setEditing(false)}
              >
                Keep Editing Later
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="text-link"
            disabled={demo}
            onClick={() => {
              setReason(invoice.client_cancellation_reason || "");
              setSaved(false);
              setEditing(true);
            }}
          >
            {invoice.client_cancellation_reason
              ? "Edit Your Cancellation Reason"
              : "Request Cancellation"}
          </button>
        ))}
      {error && (
        <p role="alert" className="alert error">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="fine-print">
          Cancellation request saved. New payments are paused.
        </p>
      )}
    </section>
  );
}
