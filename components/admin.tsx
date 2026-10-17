"use client";
import { matchesRequest, requestAttention } from "../lib/operations";
import { useRouter } from "next/navigation";
import { statusLabel } from "../lib/presentation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpRight, Save } from "lucide-react";
import { Conversation } from "./conversation";
import { QuoteCalculator } from "./quote-calculator";
import { PricingAudit } from "./pricing-audit";
import { RequestQualificationSummary } from "./request-qualification";
import type { PricingPlan, QuoteCalculation } from "../lib/pricing";
import { canManageProjects, roleLabel } from "../lib/access";
import { WorkspaceNav } from "./workspace-nav";
import { ProjectActivity } from "./project-activity";
import { useMessageReads } from "./message-reads";
import {
  projectSections,
  nextProjectAction,
  invoiceState,
  unreadClientCount,
  type ProjectSection,
} from "../lib/workspace";
import {
  money,
  date,
  services,
  type PortalData,
  type LineItem,
} from "../lib/catalog";
type Draft = {
  pricingPlan: PricingPlan | null;
  calculation: QuoteCalculation | null;
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
  const [pricingPlan, setPricingPlan] = useState<PricingPlan | null>(null);
  const [calculation, setCalculation] = useState<QuoteCalculation | null>(null);
  const [section, setSection] = useState<ProjectSection>("overview");
  const [refreshing, startRefresh] = useTransition();
  const { reads, markRead } = useMessageReads(data.email || "sample-business");
  const drafts = useRef<Record<string, Draft>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const [failedAction, setFailedAction] = useState("");
  const role = data.businessRole || (demo ? "admin" : "viewer");
  const canEdit = canManageProjects(role);
  const [selected, setSelected] = useState(
      data.jobs.find((j) => !["cancelled", "completed"].includes(j.status))
        ?.id ||
        data.jobs[0]?.id ||
        "",
    ),
    [items, setItems] = useState<LineItem[]>([]),
    [title, setTitle] = useState(""),
    [deposit, setDeposit] = useState(""),
    [due, setDue] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(""),
    [terms, setTerms] = useState(""),
    [message, setMessage] = useState("");
  const job = data.jobs.find((j) => j.id === selected);
  const nextAction = job ? nextProjectAction(job, data) : null;
  const projectMessages = data.messages.filter(
    (m) => m.request_id === selected,
  );
  const latestMessageAt = projectMessages.at(-1)?.created_at;
  const onConversationRead = () => {
    if (latestMessageAt) markRead(selected, latestMessageAt);
  };
  const refresh = useCallback(
    () => startRefresh(() => router.refresh()),
    [router],
  );
  useEffect(() => {
    if (demo) return;
    const timer = window.setInterval(() => {
      if (!busy && document.visibilityState === "visible") refresh();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [demo, busy, refresh]);
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
  async function send(body: { action: string; [key: string]: unknown }) {
    if (!canEdit) {
      setError("This dashboard is read only.");
      return;
    }
    if (demo) {
      setError("Sample workspace: changes are not saved.");
      return;
    }
    if (busy) return;
    setBusy(body.action);
    setError("");
    setFailedAction("");
    try {
      const r = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setNotice(
        body.action === "message"
          ? "Reply sent."
          : body.action === "quote"
            ? "Quote issued."
            : body.action === "cancel_invoice"
              ? "Client cancellation completed."
              : "Project status updated.",
      );
      if (body.action === "message") setMessage("");
      router.refresh();
    } catch (e) {
      setFailedAction(body.action);
      setError(e instanceof Error ? e.message : "Unable to save.");
      router.refresh();
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      {demo && <WorkspaceNav role={role} demo />}
      <main className="container admin-page">
        <div className="portal-heading">
          <div>
            <div className="eyebrow">DFW SMART SOLUTIONS</div>
            <h1>Projects.</h1>
            <p>Review requests, respond to clients, and keep work moving.</p>
          </div>
        </div>
        <p className="workspace-role">
          {roleLabel(role)}
          {!canEdit && " · Read-only access"}
        </p>
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
            disabled={!!busy || demo}
            onClick={() => {
              refresh();
              setNotice(
                "Checking for new requests and messages. Your unsent drafts are kept.",
              );
            }}
          >
            {refreshing ? "Checking for Updates…" : "Refresh Workspace"}
          </button>
        </div>
        <p className="fine-print">
          Checks for updates every 30 seconds while this page is visible. Unsent
          drafts stay in this tab.{" "}
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
        {error && failedAction !== "message" && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
        <div className="admin-grid">
          <section
            className="panel request-list-panel"
            aria-label="Service Requests"
          >
            <div className="panel-heading">
              <h2>Service requests</h2>
              <span>{data.jobs.length}</span>
            </div>
            {visible.length ? (
              visible.map(({ job: j, needsReply }) => (
                <button
                  disabled={!!busy}
                  className={`admin-job ${selected === j.id ? "selected" : ""}`}
                  key={j.id}
                  aria-pressed={selected === j.id}
                  onClick={() => {
                    if (j.id === selected) return;
                    drafts.current[selected] = {
                      pricingPlan,
                      calculation,
                      items,
                      title,
                      deposit,
                      due,
                      terms,
                      message,
                    };
                    const next = drafts.current[j.id];
                    setSelected(j.id);
                    setSection("overview");
                    setItems(next?.items || []);
                    setPricingPlan(next?.pricingPlan || null);
                    setCalculation(next?.calculation || null);
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
                    {unreadClientCount(
                      data.messages.filter((m) => m.request_id === j.id),
                      j.customer_id,
                      reads[j.id],
                    ) > 0 && (
                      <small className="unread-indicator">
                        {unreadClientCount(
                          data.messages.filter((m) => m.request_id === j.id),
                          j.customer_id,
                          reads[j.id],
                        )}{" "}
                        Unread
                      </small>
                    )}
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
          <section
            id="request-detail"
            className="panel admin-detail"
            aria-busy={!!busy}
          >
            {job ? (
              <>
                <div className="eyebrow">REQUEST · {date(job.created_at)}</div>
                <h2>{job.business_name || job.name}</h2>
                {job.business_name && <p>Contact: {job.name}</p>}
                <div className="project-heading-status">
                  <span className={`status ${job.status}`}>
                    {statusLabel(job.status)}
                  </span>
                  <span>
                    {services.find((s) => s.id === job.service)?.name}
                  </span>
                </div>
                {nextAction && (
                  <div className="project-next-action">
                    <div>
                      <span className="eyebrow">NEXT STEP</span>
                      <strong>{nextAction.title}</strong>
                      <p>{nextAction.detail}</p>
                    </div>
                    <button
                      type="button"
                      className="button small outline"
                      onClick={() => {
                        setSection(nextAction.section);
                        document
                          .getElementById(`project-tab-${nextAction.section}`)
                          ?.focus();
                      }}
                    >
                      {canEdit ? nextAction.action : "View Details"}
                    </button>
                  </div>
                )}
                <div
                  className="project-tabs"
                  role="tablist"
                  aria-label="Project Sections"
                  onKeyDown={(e) => {
                    const tabs = Array.from(
                      e.currentTarget.querySelectorAll<HTMLButtonElement>(
                        '[role="tab"]',
                      ),
                    );
                    const index = tabs.indexOf(
                      document.activeElement as HTMLButtonElement,
                    );
                    let next = index;
                    if (e.key === "ArrowRight")
                      next = (index + 1) % tabs.length;
                    else if (e.key === "ArrowLeft")
                      next = (index - 1 + tabs.length) % tabs.length;
                    else if (e.key === "Home") next = 0;
                    else if (e.key === "End") next = tabs.length - 1;
                    else return;
                    e.preventDefault();
                    setSection(projectSections[next].id);
                    tabs[next].focus();
                  }}
                >
                  {projectSections.map((t) => (
                    <button
                      type="button"
                      role="tab"
                      id={`project-tab-${t.id}`}
                      aria-controls={`project-panel-${t.id}`}
                      aria-selected={section === t.id}
                      tabIndex={section === t.id ? 0 : -1}
                      key={t.id}
                      onClick={() => setSection(t.id)}
                    >
                      {t.label}
                      {t.id === "conversation" &&
                        job &&
                        unreadClientCount(
                          projectMessages,
                          job.customer_id,
                          reads[job.id],
                        ) > 0 && (
                          <span className="tab-count">
                            {unreadClientCount(
                              projectMessages,
                              job.customer_id,
                              reads[job.id],
                            )}
                          </span>
                        )}
                    </button>
                  ))}
                </div>
                <section
                  id="project-panel-overview"
                  className="project-section"
                  role="tabpanel"
                  aria-labelledby="project-tab-overview"
                  tabIndex={0}
                  hidden={section !== "overview"}
                >
                  <div className="contact-details">
                    <a href={`mailto:${job.email}`}>{job.email}</a>
                    <a href={`tel:${job.phone}`}>{job.phone}</a>
                    <span>
                      {job.address}, {job.city}
                    </span>
                  </div>
                  <p className="job-description">{job.details}</p>
                  <RequestQualificationSummary value={job.qualification} />
                  <p className="fine-print">
                    Preferred visit:{" "}
                    {job.preferred_date ? date(job.preferred_date) : "Flexible"}{" "}
                    · {job.property_type}
                  </p>
                  <label>
                    Project Status
                    <select
                      value={job.status}
                      disabled={!!busy || !canEdit}
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
                        ...(job.status === "cancelled" ? ["cancelled"] : []),
                      ].map((s) => (
                        <option key={s} value={s}>
                          {statusLabel(s)}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!data.invoices.some(
                    (i) => i.request_id === job.id && i.status !== "void",
                  ) &&
                    data.invoices
                      .filter(
                        (i) => i.request_id === job.id && i.status === "void",
                      )
                      .map((i) => (
                        <p key={i.id}>
                          Cancelled Invoice:{" "}
                          <Link href={`/invoices/${i.id}`}>{i.number}</Link> ·{" "}
                          {i.cancellation_reason}
                        </p>
                      ))}
                  {!data.invoices.some(
                    (i) => i.request_id === job.id && i.status !== "void",
                  ) &&
                    job.status !== "cancelled" &&
                    canEdit && (
                      <button
                        className="text-link"
                        disabled={!!busy}
                        onClick={() =>
                          send({
                            action: "status",
                            request_id: job.id,
                            status: "cancelled",
                          })
                        }
                      >
                        Cancel Project
                      </button>
                    )}
                </section>
                <section
                  id="project-panel-conversation"
                  className="project-section"
                  role="tabpanel"
                  aria-labelledby="project-tab-conversation"
                  tabIndex={0}
                  hidden={section !== "conversation"}
                >
                  <div className="project-messages">
                    <div className="conversation-heading">
                      <h3>Project Conversation</h3>
                      <span>{projectMessages.length} Messages</span>
                    </div>
                    <p className="fine-print">
                      Unread markers are saved for this browser. Reading a
                      message does not mark it as replied.
                    </p>
                    <Conversation
                      active={section === "conversation"}
                      onRead={onConversationRead}
                      key={job.id}
                      messages={data.messages.filter(
                        (m) => m.request_id === job.id,
                      )}
                      customerId={job.customer_id}
                      business
                    />
                    {canEdit && (
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
                            disabled={!!busy}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                          />
                        </label>
                        <button className="button small" disabled={!!busy}>
                          {busy === "message"
                            ? "Sending…"
                            : error && failedAction === "message"
                              ? "Retry Reply"
                              : "Send Reply"}
                        </button>
                      </form>
                    )}
                    {error && failedAction === "message" && (
                      <p className="alert error" role="alert">
                        {error} Your draft is kept. Retry when you’re ready.
                      </p>
                    )}
                  </div>
                </section>
                <section
                  id="project-panel-quote"
                  className="project-section"
                  role="tabpanel"
                  aria-labelledby="project-tab-quote"
                  tabIndex={0}
                  hidden={section !== "quote"}
                >
                  {data.invoices.some(
                    (i) => i.request_id === job.id && i.status !== "void",
                  ) ? (
                    <>
                      <h3>Issued Quote</h3>
                      {data.invoices
                        .filter(
                          (i) => i.request_id === job.id && i.status !== "void",
                        )
                        .map((i) => (
                          <div className="admin-invoice" key={i.id}>
                            <span
                              className={`quote-state ${i.collection_paused_at ? "paused" : ""}`}
                            >
                              {invoiceState(i)}
                            </span>
                            <div>
                              <strong>
                                {i.number} · {i.title}
                              </strong>
                              <p>
                                {money(i.total_cents)} total ·{" "}
                                {money(i.paid_cents)} paid · {invoiceState(i)}
                              </p>
                            </div>
                            {i.collection_paused_at && i.status !== "void" && (
                              <p className="alert">
                                Collection Paused. Resolve pending
                                payments/refunds, then retry cancellation.
                              </p>
                            )}
                            <div className="cancellation-summary">
                              <strong>Client Cancellation Reason</strong>
                              <p>
                                {i.client_cancellation_reason ||
                                  "No cancellation requested by the client."}
                              </p>
                              {i.client_cancellation_requested_at && (
                                <small>
                                  Requested{" "}
                                  {date(i.client_cancellation_requested_at)} ·
                                  Only the client can edit this reason.
                                </small>
                              )}
                            </div>
                            {canEdit && (
                              <PricingAudit invoiceId={i.id} demo={demo} />
                            )}
                            {canEdit && i.client_cancellation_reason && (
                              <div className="cancellation-actions">
                                <p className="fine-print">
                                  Close open checkouts and complete cancellation
                                  once any required refunds have cleared. This
                                  does not issue a refund.
                                </p>
                                <button
                                  type="button"
                                  className="button small outline"
                                  disabled={!!busy}
                                  onClick={() =>
                                    send({
                                      action: "cancel_invoice",
                                      request_id: job.id,
                                      invoice_id: i.id,
                                    })
                                  }
                                >
                                  {busy
                                    ? "Processing…"
                                    : "Complete Client Cancellation"}
                                </button>
                              </div>
                            )}
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
                  ) : canEdit &&
                    !["cancelled", "completed"].includes(job.status) ? (
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
                          pricing_plan: pricingPlan,
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
                      <QuoteCalculator
                        key={job.id}
                        value={pricingPlan}
                        demo={demo}
                        service={job.service}
                        equipmentSupply={job.qualification?.equipment_supply}
                        disabled={!!busy}
                        onChange={(plan, result) => {
                          setPricingPlan(plan);
                          setCalculation(result);
                          setItems(result?.items || []);
                          if (result && !title) setTitle(result.title);
                        }}
                      />
                      {calculation && (
                        <section className="customer-quote-preview">
                          <h3>Customer Quote Preview</h3>
                          <p className="fine-print">
                            Only these selling prices and the agreed scope
                            appear on the customer quote.
                          </p>
                          <div className="invoice-lines">
                            {items.map((item, n) => (
                              <div key={n}>
                                <span>
                                  {item.description} × {item.quantity}
                                </span>
                                <strong>
                                  {money(item.quantity * item.unit_cents)}
                                </strong>
                              </div>
                            ))}
                          </div>
                          <p className="quote-terms">
                            {calculation.scopeTerms}
                          </p>
                        </section>
                      )}
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
                          maxLength={1500}
                          rows={4}
                          value={terms}
                          onChange={(e) => setTerms(e.target.value)}
                          placeholder="Describe deposit use, cancellation/refund terms, material commitments, timing, and any project-specific exclusions."
                        />
                      </label>
                      <p className="fine-print">
                        The deposit is credited toward the quote total. Review
                        the scope, equipment, applicable tax and cancellation
                        conditions before issuing. Issuing locks these amounts
                        and makes the quote visible to the customer. Internal
                        costs and pricing exception reasons stay private.
                      </p>
                      <button
                        disabled={
                          !!busy ||
                          !calculation ||
                          (calculation.requiresOverride &&
                            (pricingPlan?.overrideReason.trim().length || 0) <
                              10)
                        }
                        className="button"
                      >
                        <Save size={17} />
                        {busy === "quote"
                          ? "Issuing…"
                          : "Issue Quote & Invoice"}
                      </button>
                    </form>
                  ) : (
                    <p className="empty-inline">
                      {["cancelled", "completed"].includes(job.status)
                        ? "This project is closed. Change its status to Reviewing before preparing a new quote."
                        : "No quote issued yet. A project manager can prepare one."}
                    </p>
                  )}{" "}
                  <div className="project-payment-history">
                    <h3>Payment History</h3>
                    {data.payments.filter((p) =>
                      data.invoices.some(
                        (i) => i.id === p.invoice_id && i.request_id === job.id,
                      ),
                    ).length ? (
                      <ul>
                        {data.payments
                          .filter((p) =>
                            data.invoices.some(
                              (i) =>
                                i.id === p.invoice_id &&
                                i.request_id === job.id,
                            ),
                          )
                          .map((p) => (
                            <li key={p.id}>
                              <span>{date(p.created_at)}</span>
                              <strong>{money(p.amount_cents)}</strong>
                              {p.refunded_cents > 0 && (
                                <span>{money(p.refunded_cents)} Refunded</span>
                              )}
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <p className="empty-inline">
                        No payments recorded for this project.
                      </p>
                    )}
                  </div>
                </section>
                <section
                  id="project-panel-activity"
                  className="project-section"
                  role="tabpanel"
                  aria-labelledby="project-tab-activity"
                  tabIndex={0}
                  hidden={section !== "activity"}
                >
                  <ProjectActivity job={job} data={data} />{" "}
                </section>
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
