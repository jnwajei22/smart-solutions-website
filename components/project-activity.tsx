import { date, money, type Job, type PortalData } from "../lib/catalog";
import { isClientMessage } from "../lib/workspace";
export function ProjectActivity({ job, data }: { job: Job; data: PortalData }) {
  const invoices = data.invoices.filter((i) => i.request_id === job.id);
  const invoiceIds = new Set(invoices.map((i) => i.id));
  const events = [
    {
      id: `request-${job.id}`,
      at: job.created_at,
      label: "Service Request Submitted",
      detail: job.details,
    },
    ...data.messages
      .filter((m) => m.request_id === job.id)
      .map((m) => ({
        id: `message-${m.id}`,
        at: m.created_at,
        label: isClientMessage(m, job.customer_id)
          ? "Client Message"
          : "Business Reply",
        detail: m.body,
      })),
    ...invoices.flatMap((i) => [
      {
        id: `issued-${i.id}`,
        at: i.created_at,
        label: `Quote Issued · ${i.number}`,
        detail: `${i.title} · ${money(i.total_cents)}`,
      },
      ...(i.accepted_at
        ? [
            {
              id: `approved-${i.id}`,
              at: i.accepted_at,
              label: `Quote Approved · ${i.number}`,
              detail: "Client approval recorded.",
            },
          ]
        : []),
      ...(i.client_cancellation_requested_at
        ? [
            {
              id: `cancel-${i.id}`,
              at: i.client_cancellation_requested_at,
              label: "Client Requested Cancellation",
              detail: i.client_cancellation_reason || "",
            },
          ]
        : []),
      ...(i.voided_at
        ? [
            {
              id: `void-${i.id}`,
              at: i.voided_at,
              label: `Invoice Cancelled · ${i.number}`,
              detail:
                i.client_cancellation_reason || i.cancellation_reason || "",
            },
          ]
        : []),
    ]),
    ...data.payments
      .filter((p) => invoiceIds.has(p.invoice_id))
      .map((p) => ({
        id: `payment-${p.id}`,
        at: p.created_at,
        label: "Payment Recorded",
        detail: `${money(p.amount_cents)} received${p.refunded_cents ? ` · ${money(p.refunded_cents)} refunded to date` : ""}`,
      })),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return (
    <>
      <h3>Project Activity</h3>
      <p className="fine-print">
        Recorded requests, messages, approvals, and payment activity. Most
        recent first.
      </p>
      <ol className="activity-timeline">
        {events.map((e) => (
          <li key={e.id}>
            <time dateTime={e.at}>
              {date(e.at)} ·{" "}
              {new Date(e.at).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: "America/Chicago",
              })}{" "}
              Central
            </time>
            <strong>{e.label}</strong>
            <p>{e.detail}</p>
          </li>
        ))}
      </ol>
    </>
  );
}
