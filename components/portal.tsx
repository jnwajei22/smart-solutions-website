"use client";
import { paymentActivity, statusLabel } from "../lib/presentation";
import { useRef, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Layers,
  FileText,
  CreditCard,
  ArrowUpRight,
  Plus,
  LogOut,
  ArrowRight,
  Check,
  Clock,
  ChevronRight,
  Menu,
  Settings2,
} from "lucide-react";
import { Brand, ServiceIcon } from "./brand";
import {
  services,
  money,
  date,
  type PortalData,
  type Invoice,
} from "../lib/catalog";
import { browserClient } from "../lib/browser";
export function Portal({
  data,
  demo = false,
}: {
  data: PortalData;
  demo?: boolean;
}) {
  const menuToggle = useRef<HTMLButtonElement>(null);
  const [tab, setTab] = useState("overview"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(""),
    [mobile, setMobile] = useState(false),
    [message, setMessage] = useState(""),
    [messageJob, setMessageJob] = useState("");
  const outstanding = data.invoices
      .filter((i) => i.status !== "void")
      .reduce((a, i) => a + Math.max(0, i.total_cents - i.paid_cents), 0),
    paid = data.payments.reduce(
      (a, p) => a + p.amount_cents - p.refunded_cents,
      0,
    ),
    active = data.jobs.filter(
      (j) => !["completed", "cancelled"].includes(j.status),
    );
  async function action(invoice: Invoice, kind: string) {
    if (demo) {
      setError(
        "This is a sample account. Payments and approvals are disabled.",
      );
      return;
    }
    setBusy(invoice.id);
    setError("");
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: invoice.id, kind }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      if (d.url) window.location.assign(d.url);
      else window.location.reload();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to complete this action.",
      );
    } finally {
      setBusy("");
    }
  }
  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    setBusy(messageJob);
    setError("");
    try {
      const r = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: messageJob, body: message }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to send update.");
    } finally {
      setBusy("");
    }
  }
  const nav = [
    ["overview", "Overview", LayoutDashboard],
    ["services", "My services", Layers],
    ["invoices", "Quotes & invoices", FileText],
    ["payments", "Payment history", CreditCard],
  ] as const;
  function invoiceCard(i: Invoice) {
    const remaining =
        i.status === "void" ? 0 : Math.max(0, i.total_cents - i.paid_cents),
      deposit = Math.max(0, i.deposit_cents - i.paid_cents);
    return (
      <article key={i.id} className="invoice-card">
        <div className="row-between">
          <div>
            <span className="eyebrow">{i.number}</span>
            <h3>{i.title}</h3>
          </div>
          <span className={`status ${i.status === "paid" ? "completed" : ""}`}>
            {i.status === "paid"
              ? "Paid"
              : i.status === "void"
                ? "Void"
                : !i.accepted_at
                  ? "Awaiting approval"
                  : i.paid_cents
                    ? "Deposit received"
                    : "Payment due"}
          </span>
        </div>
        {i.collection_paused_at && i.status !== "void" && (
          <p className="alert">
            Collection is paused while cancellation and any payments are
            reviewed. Do not make another payment.
          </p>
        )}
        {i.status === "void" && (
          <p className="fine-print">
            This invoice is cancelled. No payment is due.{" "}
            {i.cancellation_reason}
          </p>
        )}
        <div className="invoice-lines">
          {i.items.map((item, n) => (
            <div key={n}>
              <span>
                {item.description} <small>× {item.quantity}</small>
              </span>
              <span>{money(item.quantity * item.unit_cents)}</span>
            </div>
          ))}
        </div>
        <div className="invoice-totals">
          <div>
            <span>Total</span>
            <strong>{money(i.total_cents)}</strong>
          </div>
          <div>
            <span>Paid</span>
            <span>{money(i.paid_cents)}</span>
          </div>
          <div>
            <span>Remaining balance</span>
            <strong>{money(remaining)}</strong>
          </div>
        </div>
        <div className="quote-terms">
          <strong>Project terms</strong>
          <p>{i.terms}</p>
        </div>
        <p className="fine-print">
          Due {date(i.due_date)} · {money(i.deposit_cents)} deposit requested
          {i.accepted_at ? ` · Approved ${date(i.accepted_at)}` : ""}
        </p>
        <div className="actions">
          {i.status === "issued" &&
            !i.collection_paused_at &&
            (!i.accepted_at ? (
              <button
                disabled={busy === i.id || demo}
                className="button small"
                onClick={() => action(i, "accept")}
              >
                Agree & approve quote <Check size={15} />
              </button>
            ) : (
              remaining > 0 && (
                <>
                  {deposit > 0 && (
                    <button
                      disabled={busy === i.id || demo}
                      className="button small"
                      onClick={() => action(i, "deposit")}
                    >
                      Pay deposit · {money(deposit)} <ArrowUpRight size={15} />
                    </button>
                  )}
                  <button
                    disabled={busy === i.id || demo}
                    className="button small outline"
                    onClick={() => action(i, "balance")}
                  >
                    {deposit > 0 ? "Pay in full" : "Pay balance"} ·{" "}
                    {money(remaining)}
                  </button>
                </>
              )
            ))}
          {!demo && (
            <Link href={`/invoices/${i.id}`} className="text-link">
              View / print <ArrowUpRight size={15} />
            </Link>
          )}
        </div>
      </article>
    );
  }
  return (
    <div
      className="portal-layout"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setMobile(false);
          menuToggle.current?.focus();
        }
      }}
    >
      {mobile && (
        <button
          className="portal-menu-backdrop"
          aria-label="Close client menu"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        id="client-navigation"
        className={`sidebar ${mobile ? "mobile-open" : ""}`}
      >
        <Brand />
        <div className="sidebar-label">CLIENT WORKSPACE</div>
        <nav aria-label="Client workspace">
          {nav.map(([id, label, Icon]) => (
            <button
              className={tab === id ? "active" : ""}
              key={id}
              onClick={() => {
                setTab(id);
                setMobile(false);
                setError("");
              }}
            >
              <Icon size={19} />
              {label}
              {id === "invoices" && outstanding > 0 && (
                <span className="nav-count">
                  {data.invoices.filter((i) => i.status === "issued").length}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-help">
          <span className="eyebrow">SOMETHING NEW IN MIND?</span>
          <h3>
            Let’s connect
            <br />
            your next project.
          </h3>
          <Link href="/request">
            Request a service <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="sidebar-bottom">
          {data.admin && !demo && (
            <Link href="/admin">
              <Settings2 size={17} /> Business dashboard
            </Link>
          )}
          <Link href="/help">Client help</Link>
          <Link href="/">
            Back to website <ArrowUpRight size={16} />
          </Link>
          {!demo && (
            <button
              onClick={async () => {
                await browserClient().auth.signOut();
                // Discard every cached authenticated route after sign-out.
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                window.location.assign("/login");
              }}
            >
              <LogOut size={17} /> Sign out
            </button>
          )}
        </div>
      </aside>
      <div className="portal-main">
        <header className="portal-topbar">
          <button
            ref={menuToggle}
            className="mobile-menu"
            aria-label="Toggle menu"
            aria-expanded={mobile}
            aria-controls="client-navigation"
            onClick={() => setMobile(!mobile)}
          >
            <Menu size={22} />
          </button>
          <span>
            Client portal <ChevronRight size={14} />{" "}
            {nav.find((n) => n[0] === tab)?.[1]}
          </span>
          <div className="profile-chip">
            <span>{data.name.slice(0, 1).toUpperCase()}</span>
            <div>
              {data.name}
              <small>{demo ? "Sample account" : data.email}</small>
            </div>
          </div>
        </header>
        <main className="portal-content">
          {demo && (
            <div className="demo-banner">
              <span>
                <strong>Preview workspace</strong> · Fictional sample data. No
                requests or payments are processed.
              </span>
              <Link href="/login">
                Sign in <ArrowRight size={15} />
              </Link>
            </div>
          )}
          <div className="portal-heading">
            <div>
              <div className="eyebrow">YOUR SPACE, CONNECTED</div>
              <h1>
                {tab === "overview"
                  ? `Welcome back, ${data.name}.`
                  : tab === "services"
                    ? "Your service requests."
                    : tab === "invoices"
                      ? "Clear costs. No guesswork."
                      : "Your payment history."}
              </h1>
              <p>
                {tab === "overview"
                  ? "A clear view of your projects and everything that goes with them."
                  : tab === "services"
                    ? "From the first conversation to the final handoff."
                    : tab === "invoices"
                      ? "Review your scope, approve a quote, and manage payments."
                      : "Payments recorded against your invoices, all in one place."}
              </p>
            </div>
            <Link href="/request" className="button small">
              <Plus size={17} /> New request
            </Link>
          </div>
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          {tab === "overview" && (
            <>
              <div className="metrics">
                <div>
                  <span>
                    ACTIVE PROJECTS <Layers size={18} />
                  </span>
                  <strong>{active.length.toString().padStart(2, "0")}</strong>
                  <small>Requests in progress</small>
                </div>
                <div>
                  <span>
                    OUTSTANDING BALANCE <FileText size={18} />
                  </span>
                  <strong>{money(outstanding)}</strong>
                  <small>Across issued invoices</small>
                </div>
                <div>
                  <span>
                    TOTAL PAID <CreditCard size={18} />
                  </span>
                  <strong>{money(paid)}</strong>
                  <small>Net of recorded refunds</small>
                </div>
              </div>
              <div className="dashboard-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Your projects</h2>
                    <button
                      className="text-link"
                      onClick={() => setTab("services")}
                    >
                      View all <ArrowUpRight size={15} />
                    </button>
                  </div>
                  {data.jobs.length ? (
                    data.jobs.slice(0, 3).map((j) => (
                      <div className="project-row" key={j.id}>
                        <div className="icon-box">
                          <ServiceIcon
                            kind={
                              services.find((s) => s.id === j.service)?.icon ||
                              "cable"
                            }
                          />
                        </div>
                        <div>
                          <strong>
                            {services.find((s) => s.id === j.service)?.name ||
                              j.service}
                          </strong>
                          <small>
                            {j.city} · Requested {date(j.created_at)}
                          </small>
                        </div>
                        <span className={`status ${j.status}`}>
                          {statusLabel(j.status)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <Empty
                      title="Your first project starts here."
                      text="Tell us what you need, and we’ll take it from there."
                    />
                  )}
                  <Link href="/request" className="new-project">
                    <Plus size={18} /> Start another project{" "}
                    <ArrowRight size={16} />
                  </Link>
                </section>
                <section className="panel next-step">
                  <div className="eyebrow">YOUR NEXT STEP</div>
                  <div className="icon-box">
                    <Clock size={23} />
                  </div>
                  <h2>
                    {data.invoices.some(
                      (i) => i.status === "issued" && !i.accepted_at,
                    )
                      ? "A quote is ready for you."
                      : outstanding
                        ? "Keep your project moving."
                        : active.length
                          ? "We’re reviewing your project."
                          : "Make room for something smarter."}
                  </h2>
                  <p>
                    {outstanding
                      ? "Review the agreed scope and manage your deposit or remaining balance."
                      : active.length
                        ? "Your request is saved. Check your services for progress and scheduling updates."
                        : "Start a new request whenever you’re ready."}
                  </p>
                  <button
                    className="text-link"
                    onClick={() =>
                      setTab(outstanding ? "invoices" : "services")
                    }
                  >
                    {outstanding ? "Review invoices" : "View services"}{" "}
                    <ArrowRight size={17} />
                  </button>
                </section>
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <h2>Recent activity</h2>
                  <button
                    className="text-link"
                    onClick={() => setTab("payments")}
                  >
                    Payment history <ArrowUpRight size={15} />
                  </button>
                </div>
                {data.payments.length ? (
                  data.payments.slice(0, 3).map((p) => (
                    <div className="activity-row" key={p.id}>
                      <span className="activity-dot" />
                      <div>
                        <strong>
                          {
                            paymentActivity(p.amount_cents, p.refunded_cents)
                              .label
                          }
                        </strong>
                        <small>
                          {
                            data.invoices.find((i) => i.id === p.invoice_id)
                              ?.number
                          }{" "}
                          · {date(p.created_at)}
                          {p.refunded_cents > 0 && (
                            <>
                              {" "}
                              · Originally {money(p.amount_cents)} · Refunded{" "}
                              {money(p.refunded_cents)}
                            </>
                          )}
                        </small>
                      </div>
                      <strong>
                        {money(
                          paymentActivity(p.amount_cents, p.refunded_cents)
                            .cents,
                        )}
                      </strong>
                    </div>
                  ))
                ) : (
                  <p className="empty-inline">
                    Payments will appear here after they’re confirmed.
                  </p>
                )}
              </section>
            </>
          )}
          {tab === "services" && (
            <div className="request-list">
              {data.jobs.length ? (
                data.jobs.map((j) => (
                  <article className="panel request-detail" key={j.id}>
                    <div className="row-between">
                      <div>
                        <div className="eyebrow">
                          {j.property_type} · {j.city}
                        </div>
                        <h2>
                          {services.find((s) => s.id === j.service)?.name ||
                            j.service}
                        </h2>
                      </div>
                      <span className={`status ${j.status}`}>
                        {statusLabel(j.status)}
                      </span>
                    </div>
                    <p>{j.details}</p>
                    <div className="request-meta">
                      <span>
                        Service location
                        <strong>
                          {j.address}, {j.city}
                        </strong>
                      </span>
                      <span>
                        Requested<strong>{date(j.created_at)}</strong>
                      </span>
                      <span>
                        Preferred Date
                        <strong>
                          {j.preferred_date
                            ? date(j.preferred_date)
                            : "Flexible"}
                        </strong>
                      </span>
                    </div>
                    <p className="fine-print">
                      Preferred dates are requests; our team will confirm
                      scheduling with you.
                    </p>
                    {data.invoices.some((i) => i.request_id === j.id) && (
                      <button
                        className="text-link"
                        onClick={() => setTab("invoices")}
                      >
                        View related quote <ArrowUpRight size={16} />
                      </button>
                    )}
                    <div className="project-messages">
                      <h3>Project conversation</h3>
                      {data.messages
                        .filter((m) => m.request_id === j.id)
                        .map((m) => (
                          <div className="message-bubble" key={m.id}>
                            <small>
                              {m.author_id === j.customer_id
                                ? "Client"
                                : "DFW Smart Solutions"}{" "}
                              · {date(m.created_at)}
                            </small>
                            <p>{m.body}</p>
                          </div>
                        ))}
                      {messageJob === j.id ? (
                        <form onSubmit={sendMessage}>
                          <label>
                            Your Update
                            <textarea
                              required
                              maxLength={2000}
                              minLength={3}
                              rows={3}
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              placeholder="Ask a question, request a scheduling change, or discuss cancellation."
                            />
                          </label>
                          <button
                            className="button small"
                            disabled={!!busy || demo}
                          >
                            Send update
                          </button>
                          <button
                            type="button"
                            className="text-link"
                            onClick={() => setMessageJob("")}
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <button
                          className="text-link"
                          disabled={demo}
                          onClick={() => {
                            setMessageJob(j.id);
                            setMessage("");
                          }}
                        >
                          Message us / request a change <ArrowRight size={15} />
                        </button>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <Empty
                  title="No requests yet."
                  text="Let’s get your first project underway."
                />
              )}
            </div>
          )}
          {tab === "invoices" && (
            <div className="invoice-list">
              {data.invoices.length ? (
                data.invoices.map(invoiceCard)
              ) : (
                <Empty
                  title="No quotes or invoices yet."
                  text="After we clarify your request, your project quote will appear here."
                />
              )}
            </div>
          )}
          {tab === "payments" && (
            <section className="panel">
              <div className="panel-heading">
                <h2>Payment ledger</h2>
                <span className="muted">USD</span>
              </div>
              {data.payments.length ? (
                <>
                  <p className="scroll-hint">
                    Swipe the table to see all payment details.
                  </p>
                  <div
                    className="table-scroll"
                    role="region"
                    aria-label="Payment ledger table"
                    tabIndex={0}
                  >
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Invoice</th>
                          <th>Paid</th>
                          <th>Refunded</th>
                          <th>Net payment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.payments.map((p) => (
                          <tr key={p.id}>
                            <td>{date(p.created_at)}</td>
                            <td>
                              {data.invoices.find((i) => i.id === p.invoice_id)
                                ?.number || "Invoice"}
                            </td>
                            <td>{money(p.amount_cents)}</td>
                            <td>{money(p.refunded_cents)}</td>
                            <td>
                              <strong>
                                {money(p.amount_cents - p.refunded_cents)}
                              </strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <Empty
                  title="A clean slate."
                  text="Your confirmed payments and recorded refunds will appear here."
                />
              )}
              <p className="fine-print">
                Payments are confirmed through the payment provider. A
                successful redirect alone does not mark an invoice paid.
              </p>
            </section>
          )}
          <footer className="portal-footer">
            DFW Smart Solutions <span>Smarten up your space.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <Layers size={28} />
      <h3>{title}</h3>
      <p>{text}</p>
      <Link href="/request" className="text-link">
        Request a service <ArrowUpRight size={15} />
      </Link>
    </div>
  );
}
