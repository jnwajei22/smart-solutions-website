import type { PortalData } from "./catalog";

export function clientNextStep(data: Pick<PortalData, "jobs" | "invoices">) {
  const issued = data.invoices.filter((invoice) => invoice.status === "issued");
  const paused = issued.find((invoice) => invoice.collection_paused_at);
  if (paused)
    return {
      title: "We’re reviewing your change.",
      detail:
        "Payment collection is paused while we review your cancellation request and any payments already made.",
      action: "View the review",
      tab: "invoices",
      projectId: paused.request_id,
    };
  const approval = issued.find((invoice) => !invoice.accepted_at);
  if (approval)
    return {
      title: "Your quote is ready.",
      detail:
        "Review the proposed work, itemized costs, and terms before approving your project.",
      action: "Review your quote",
      tab: "invoices",
      projectId: approval.request_id,
    };
  const deposit = issued.find(
    (invoice) => invoice.paid_cents < invoice.deposit_cents,
  );
  if (deposit)
    return {
      title: "One step closer to scheduling.",
      detail:
        "Your quote is approved. Review the requested deposit and payment options for this project.",
      action: "Review the deposit",
      tab: "invoices",
      projectId: deposit.request_id,
    };
  const visit = data.jobs.find((job) =>
    ["scheduled", "in_progress"].includes(job.status),
  );
  if (visit)
    return {
      title:
        visit.status === "scheduled"
          ? "Your project is scheduled."
          : "Your project is underway.",
      detail:
        "Find your project details and keep questions or changes in the conversation with our team. Preferred dates are not appointment confirmations.",
      action: "Open your project",
      tab: "services",
      projectId: visit.id,
    };
  const balance = issued.find(
    (invoice) => invoice.paid_cents < invoice.total_cents,
  );
  if (balance)
    return {
      title: "Your project, in progress.",
      detail:
        "Review the recorded payments, remaining balance, and agreed terms for your project.",
      action: "View your invoice",
      tab: "invoices",
      projectId: balance.request_id,
    };
  const active = data.jobs.find(
    (job) => !["completed", "cancelled"].includes(job.status),
  );
  return active
    ? {
        title: "We have your request.",
        detail:
          "Check your project for scope, progress, and scheduling updates. You can ask a question in the conversation.",
        action: "Open your request",
        tab: "services",
        projectId: active.id,
      }
    : {
        title: "What’s next for your space?",
        detail:
          "Start a project request whenever you’re ready. Your previous projects and payment history stay here.",
        action: "Request a new project",
        tab: "request",
        projectId: "",
      };
}
