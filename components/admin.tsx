"use client";
import { matchesRequest, requestAttention } from "../lib/operations";
import { useRouter } from "next/navigation";
import { statusLabel } from "../lib/presentation";
import { useRef, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, ArrowUpRight, Save } from "lucide-react";
import { Brand } from "./brand";
import {
  money,
  date,
  services,
  type PortalData,
  type LineItem,
} from "../lib/catalog";
type Draft = {
  items: LineItem[];
  title: string;
  deposit: string;
  due: string;
  terms: string;
  message: string;
};
export function AdminDashboard({
  data,
  demo = false,
}: {
  data: PortalData;
  demo?: boolean;
}) {
  const router = useRouter();
  const drafts = useRef<Record<string, Draft>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState(data.jobs[0]?.id || ""),
    [items, setItems] = useState<LineItem[]>([
      { description: "", quantity: 1, unit_cents: 0 },
    ]),
    [title, setTitle] = useState(""),
    [deposit, setDeposit] = useState(""),
    [due, setDue] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [terms, setTerms] = useState(""),
    [message, setMessage] = useState("");
  const job = data.jobs.find((j) => j.id === selected);
  const total = items.reduce((a, i) => a + i.quantity * i.unit_cents, 0);
  const attention = data.jobs.map((j) => ({
    job: j,
    ...requestAttention(j, data),
  }));
  const visible = attention.filter(
    (a) =>
      matchesRequest(a.job, search) &&
      (filter === "all" ||
        (filter === "review" && a.needsReview) ||
        (filter === "reply" && a.needsReply) ||
        (filter === "approval" && a.awaitingApproval) ||
        (filter === "schedule" && a.readyToSchedule)),
  );
  async function send(body: object) {
    if (demo) {
      setError("Sample workspace: changes are not saved.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setNotice("Saved. Your workspace is updating.");
      setMessage("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className="site-header">
        <div className="container nav">
          <Brand />
          <span className="eyebrow">BUSINESS WORKSPACE</span>
          <Link href="/portal" className="text-link">
            Client view <ArrowUpRight size={16} />
          </Link>
        </div>
      </header>
      <main className="container admin-page">
        <div className="portal-heading">
          <div>
            <div className="eyebrow">DFW SMART SOLUTIONS</div>
            <h1>From lead to connected.</h1>
            <p>Your incoming requests, project scopes, and payment overview.</p>
          </div>
        </div>
        {demo && (
          <p className="alert">
            Sample business workspace · Fictional data. Changes are not saved.
          </p>
        )}
        <div className="ops-summary" aria-label="Work requiring attention">
          <span>
            <strong>{attention.filter((a) => a.needsReview).length}</strong>{" "}
            Need Review
          </span>
          <span>
            <strong>{attention.filter((a) => a.needsReply).length}</strong> Need
            a Reply
          </span>
          <span>
            <strong>
              {attention.filter((a) => a.awaitingApproval).length}
            </strong>{" "}
            Awaiting Approval
          </span>
          <span>
            <strong>{attention.filter((a) => a.readyToSchedule).length}</strong>{" "}
            Ready to Schedule
          </span>
        </div>
        <div className="ops-toolbar">
          <label>
            Search Requests
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, business, email, or city"
            />
          </label>
          <label>
            Show Requests
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All Requests</option>
              <option value="review">Need Review</option>
              <option value="reply">Need a Reply</option>
              <option value="approval">Awaiting Approval</option>
              <option value="schedule">Ready to Schedule</option>
            </select>
          </label>
          <button
            type="button"
            className="button small outline"
            disabled={busy || demo}
            onClick={() => {
              router.refresh();
              setNotice(
                "Checking for new requests and messages. Your unsent drafts are kept.",
              );
            }}
          >
            Refresh Workspace
          </button>
        </div>
        <p className="fine-print">
          New requests and messages appear here. Refresh to check for updates;
          email alerts are not enabled.{" "}
          <Link href="/admin/operations">Operating guide</Link>
        </p>
        {notice && (
          <p role="status" className="fine-print">
            {notice}
          </p>
        )}
        {data.loadedAt && (
          <p className="fine-print">
            Workspace loaded{" "}
            {new Date(data.loadedAt).toLocaleString("en-US", {
              timeZone: "America/Chicago",
            })}{" "}
            Central
          </p>
        )}
        <div className="metrics">
          <div>
            <span>OPEN REQUESTS</span>
            <strong>
              {
                data.jobs.filter(
                  (j) => !["completed", "cancelled"].includes(j.status),
                ).length
              }
            </strong>
          </div>
          <div>
            <span>OUTSTANDING</span>
            <strong>
              {money(
                data.invoices
                  .filter((i) => i.status !== "void")
                  .reduce((a, i) => a + i.total_cents - i.paid_cents, 0),
              )}
            </strong>
          </div>
          <div>
            <span>NET PAYMENTS</span>
            <strong>
              {money(
                data.payments.reduce(
                  (a, p) => a + p.amount_cents - p.refunded_cents,
                  0,
                ),
              )}
            </strong>
          </div>
        </div>
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
        <div className="admin-grid">
          <section className="panel">
            <div className="panel-heading">
              <h2>Service requests</h2>
              <span>{data.jobs.length}</span>
            </div>
            {visible.length ? (
              visible.map(({ job: j, needsReply }) => (
                <button
                  className={`admin-job ${selected === j.id ? "selected" : ""}`}
                  key={j.id}
                  onClick={() => {
                    if (j.id === selected) return;
                    drafts.current[selected] = {
                      items,
                      title,
                      deposit,
                      due,
                      terms,
                      message,
                    };
                    const next = drafts.current[j.id];
                    setSelected(j.id);
                    setItems(
                      next?.items || [
                        { description: "", quantity: 1, unit_cents: 0 },
                      ],
                    );
                    setTitle(next?.title || "");
                    setDeposit(next?.deposit || "");
                    setDue(next?.due || "");
                    setTerms(next?.terms || "");
                    setMessage(next?.message || "");
                    setError("");
                    setNotice("");
                    if (window.matchMedia("(max-width: 700px)").matches)
                      document
                        .getElementById("request-detail")
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                  }}
                >
                  <div>
                    <strong>{j.business_name || j.name}</strong>
                    {needsReply && (
                      <small className="needs-reply">
                        Client Waiting for a Reply
                      </small>
                    )}
                    {j.business_name && <small>Contact: {j.name}</small>}
                    <small>
                      {services.find((s) => s.id === j.service)?.name} ·{" "}
                      {j.city}
                    </small>
                  </div>
                  <span className={`status ${j.status}`}>
                    {statusLabel(j.status)}
                  </span>
                </button>
              ))
            ) : (
              <p className="empty-inline">
                {data.jobs.length
                  ? "No requests match this search or filter."
                  : "No requests yet. New verified customer submissions will appear here."}
              </p>
            )}
          </section>
          <section id="request-detail" className="panel admin-detail">
            {job ? (
              <>
                <div className="eyebrow">REQUEST · {date(job.created_at)}</div>
                <h2>{job.business_name || job.name}</h2>
                {job.business_name && <p>Contact: {job.name}</p>}
                <div className="contact-details">
                  <a href={`mailto:${job.email}`}>{job.email}</a>
                  <a href={`tel:${job.phone}`}>{job.phone}</a>
                  <span>
                    {job.address}, {job.city}
                  </span>
                </div>
                <p className="job-description">{job.details}</p>
                <p className="fine-print">
                  Preferred visit:{" "}
                  {job.preferred_date ? date(job.preferred_date) : "Flexible"} ·{" "}
                  {job.property_type}
                </p>
                <div className="project-messages">
                  <h3>Project conversation</h3>
                  {data.messages
                    .filter((m) => m.request_id === job.id)
                    .map((m) => (
                      <div className="message-bubble" key={m.id}>
                        <small>
                          {m.author_id === job.customer_id
                            ? "Client"
                            : "DFW Smart Solutions"}{" "}
                          · {date(m.created_at)}
                        </small>
                        <p>{m.body}</p>
                      </div>
                    ))}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      send({
                        action: "message",
                        request_id: job.id,
                        body: message,
                      });
                    }}
                  >
                    <label>
                      Reply to Client
                      <textarea
                        required
                        minLength={3}
                        maxLength={2000}
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      />
                    </label>
                    <button className="button small" disabled={busy}>
                      Send reply
                    </button>
                  </form>
                </div>
                <label>
                  Project Status
                  <select
                    value={job.status}
                    disabled={busy}
                    onChange={(e) =>
                      send({
                        action: "status",
                        request_id: job.id,
                        status: e.target.value,
                      })
                    }
                  >
                    {[
                      "requested",
                      "reviewing",
                      "quoted",
                      "scheduled",
                      "in_progress",
                      "completed",
                      "cancelled",
                    ].map((s) => (
                      <option key={s} value={s}>
                        {statusLabel(s)}
                      </option>
                    ))}
                  </select>
                </label>
                {data.invoices.some((i) => i.request_id === job.id) ? (
                  <>
                    <h3>Issued quote</h3>
                    {data.invoices
                      .filter((i) => i.request_id === job.id)
                      .map((i) => (
                        <div className="admin-invoice" key={i.id}>
                          <div>
                            <strong>
                              {i.number} · {i.title}
                            </strong>
                            <p>
                              {money(i.total_cents)} total ·{" "}
                              {money(i.paid_cents)} paid ·{" "}
                              {statusLabel(i.status)}
                            </p>
                          </div>
                          <Link
                            href={`/invoices/${i.id}`}
                            className="text-link"
                          >
                            View / print <ArrowUpRight size={16} />
                          </Link>
                        </div>
                      ))}
                    <p className="fine-print">
                      Issued amounts are locked. Confirm all scope and pricing
                      before issuing a quote.
                    </p>
                  </>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      send({
                        action: "quote",
                        request_id: job.id,
                        title,
                        items,
                        deposit_cents: Math.round(Number(deposit) * 100),
                        due_date: due,
                        terms,
                      });
                    }}
                  >
                    <div className="form-section-title">
                      <span>Q</span>
                      <h2>Build a project quote</h2>
                    </div>
                    <label>
                      Project Title
                      <input
                        value={title}
                        required
                        maxLength={150}
                        placeholder="e.g. Home office Ethernet installation"
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </label>
                    <div className="quote-items">
                      {items.map((item, n) => (
                        <div className="quote-line" key={n}>
                          <label>
                            Description
                            <input
                              required
                              maxLength={200}
                              value={item.description}
                              onChange={(e) =>
                                setItems((a) =>
                                  a.map((x, i) =>
                                    i === n
                                      ? { ...x, description: e.target.value }
                                      : x,
                                  ),
                                )
                              }
                            />
                          </label>
                          <label>
                            Qty
                            <input
                              type="number"
                              required
                              min={1}
                              max={10000}
                              step={1}
                              value={item.quantity}
                              onChange={(e) =>
                                setItems((a) =>
                                  a.map((x, i) =>
                                    i === n
                                      ? {
                                          ...x,
                                          quantity: Number(e.target.value),
                                        }
                                      : x,
                                  ),
                                )
                              }
                            />
                          </label>
                          <label>
                            Unit Price ($)
                            <input
                              type="number"
                              required
                              min={0}
                              max={100000}
                              step="0.01"
                              value={item.unit_cents / 100}
                              onChange={(e) =>
                                setItems((a) =>
                                  a.map((x, i) =>
                                    i === n
                                      ? {
                                          ...x,
                                          unit_cents: Math.round(
                                            Number(e.target.value) * 100,
                                          ),
                                        }
                                      : x,
                                  ),
                                )
                              }
                            />
                          </label>
                          <button
                            type="button"
                            aria-label={`Remove line ${n + 1}`}
                            disabled={items.length === 1}
                            onClick={() =>
                              setItems((a) => a.filter((_, i) => i !== n))
                            }
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="text-link"
                      disabled={items.length >= 30}
                      onClick={() =>
                        setItems((a) => [
                          ...a,
                          { description: "", quantity: 1, unit_cents: 0 },
                        ])
                      }
                    >
                      <Plus size={15} /> Add line item
                    </button>
                    <p className="quote-total">
                      Quote total <strong>{money(total)}</strong>
                    </p>
                    <div className="field-grid">
                      <label>
                        Deposit ($)
                        <input
                          type="number"
                          min={0}
                          max={total / 100}
                          step="0.01"
                          required
                          value={deposit}
                          onChange={(e) => setDeposit(e.target.value)}
                        />
                      </label>
                      <label>
                        Due Date
                        <input
                          type="date"
                          required
                          value={due}
                          onChange={(e) => setDue(e.target.value)}
                        />
                      </label>
                    </div>
                    <label>
                      Project Terms & Deposit Conditions
                      <textarea
                        required
                        minLength={20}
                        maxLength={2000}
                        rows={4}
                        value={terms}
                        onChange={(e) => setTerms(e.target.value)}
                        placeholder="Describe deposit use, cancellation/refund terms, material commitments, timing, and any project-specific exclusions."
                      />
                    </label>
                    <p className="fine-print">
                      Include applicable materials, labor, travel, and any taxes
                      as separate line items. This tool does not determine tax
                      obligations. Issuing makes the quote visible to the
                      customer.
                    </p>
                    <button disabled={busy} className="button">
                      <Save size={17} />
                      {busy ? "Issuing…" : "Issue quote & invoice"}
                    </button>
                  </form>
                )}
              </>
            ) : (
              <div className="empty-state">
                <h2>Select a request.</h2>
                <p>Review the details and build a clear, itemized quote.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
