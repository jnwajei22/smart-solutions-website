import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { currentUser, configured, serverClient } from "../../../lib/supabase";
import { Brand } from "../../../components/brand";
import { money, date, type Invoice } from "../../../lib/catalog";
import { PrintButton } from "../../../components/print-button";
export const dynamic = "force-dynamic";
export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!configured() || !(await currentUser())) redirect("/login");
  const { id } = await params;
  const db = await serverClient();
  const { data, error } = await db
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) notFound();
  const i = data as Invoice;
  const { data: job } = await db
    .from("requests")
    .select("name,email,address,city")
    .eq("id", i.request_id)
    .single();
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
          Prepared for<strong>{job?.name}</strong>
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
      <table>
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
        Status: {i.status} ·{" "}
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
