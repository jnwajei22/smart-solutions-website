import Link from "next/link";
import { Brand } from "./brand";
import { money, date, type Invoice, type Job } from "../lib/catalog";
import { statusLabel } from "../lib/presentation";
import { PrintButton } from "./print-button";
export function InvoiceDocument({
  invoice: i,
  job,
}: {
  invoice: Invoice;
  job: Pick<
    Job,
    "name" | "business_name" | "email" | "address" | "city"
  > | null;
}) {
  return (
    <main className="invoice-document container narrow">
      <div className="print-tools">
        <Link href="/portal">← Back to portal</Link>
        <PrintButton />
      </div>
      <div className="row-between">
        <Brand />
        <span className="eyebrow">PROJECT QUOTE / INVOICE</span>
      </div>
      <h1>{i.number}</h1>
      <h2>{i.title}</h2>
      <div className="request-meta">
        <span>
          Prepared for<strong>{job?.business_name || job?.name}</strong>
          {job?.business_name && (
            <>
              Contact: {job.name}
              <br />
            </>
          )}
          {job?.email}
          <br />
          {job?.address}, {job?.city}
        </span>
        <span>
          Issued<strong>{date(i.created_at)}</strong>
        </span>
        <span>
          Due<strong>{date(i.due_date)}</strong>
        </span>
      </div>
      <table className="invoice-items">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit price</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {i.items.map((item, n) => (
            <tr key={n}>
              <td>{item.description}</td>
              <td>{item.quantity}</td>
              <td>{money(item.unit_cents)}</td>
              <td>{money(item.quantity * item.unit_cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="invoice-mobile-items" aria-label="Invoice line items">
        {i.items.map((item, n) => (
          <section key={n}>
            <strong>{item.description}</strong>
            <dl>
              <div>
                <dt>Qty</dt>
                <dd>{item.quantity}</dd>
              </div>
              <div>
                <dt>Unit Price</dt>
                <dd>{money(item.unit_cents)}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>{money(item.quantity * item.unit_cents)}</dd>
              </div>
            </dl>
          </section>
        ))}
      </div>
      <div className="invoice-totals">
        <div>
          <span>Total</span>
          <strong>{money(i.total_cents)}</strong>
        </div>
        <div>
          <span>Deposit requested</span>
          <span>{money(i.deposit_cents)}</span>
        </div>
        <div>
          <span>Paid to date</span>
          <span>{money(i.paid_cents)}</span>
        </div>
        <div>
          <span>Balance remaining</span>
          <strong>{money(i.total_cents - i.paid_cents)}</strong>
        </div>
      </div>
      <h2>Project terms</h2>
      <p className="quote-terms">{i.terms}</p>
      <p>
        Status: {statusLabel(i.status)} ·{" "}
        {i.accepted_at
          ? `Approved ${date(i.accepted_at)}`
          : "Awaiting customer approval"}
      </p>
      <p className="fine-print">
        Scope is limited to the items above. Additional work requires written
        agreement. A requested date is not a confirmed appointment. Deposit and
        cancellation terms must be agreed before payment. Payments are managed
        through your client portal.
      </p>
      <footer className="portal-footer">
        DFW Smart Solutions LLC · Dallas–Fort Worth, Texas
      </footer>
    </main>
  );
}
