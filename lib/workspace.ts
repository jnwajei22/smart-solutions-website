import type { Invoice, Job, Message, PortalData } from "./catalog";
import { requestAttention } from "./operations.ts";
export type ProjectSection = "overview" | "conversation" | "quote" | "activity";
export const projectSections: { id: ProjectSection; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "conversation", label: "Conversation" },
  { id: "quote", label: "Quote & Payments" },
  { id: "activity", label: "Activity" },
];
export function invoiceState(invoice: Invoice) {
  if (invoice.status === "void") return "Cancelled";
  if (invoice.collection_paused_at) return "Cancellation Requested";
  if (invoice.status === "paid") return "Paid";
  if (!invoice.accepted_at) return "Awaiting Approval";
  if (invoice.paid_cents < invoice.deposit_cents) return "Deposit Due";
  return invoice.paid_cents ? "Balance Due" : "Payment Due";
}
export function nextProjectAction(
  job: Job,
  data: Pick<PortalData, "messages" | "invoices">,
) {
  const invoice = data.invoices.find(
    (i) => i.request_id === job.id && i.status !== "void",
  );
  const attention = requestAttention(job, data);
  if (invoice?.collection_paused_at)
    return {
      title: "Cancellation Needs Review",
      detail:
        "Collection is paused. Review the client’s reason and any payment or refund before completing cancellation.",
      section: "quote" as ProjectSection,
      action: "Review Cancellation",
    };
  if (job.status === "cancelled")
    return {
      title: "Project Cancelled",
      detail:
        "The project history is preserved. Reopen the project as Reviewing before preparing another quote.",
      section: "overview" as ProjectSection,
      action: "Review Project",
    };
  if (attention.needsReply)
    return {
      title: "Client Awaiting a Reply",
      detail:
        "Read the latest client message and respond in the project conversation.",
      section: "conversation" as ProjectSection,
      action: "Open Conversation",
    };
  if (job.status === "completed")
    return {
      title: "Project Completed",
      detail: "Review the project history and any remaining invoice balance.",
      section: "activity" as ProjectSection,
      action: "View Activity",
    };
  if (attention.needsReview || !invoice)
    return {
      title: "Scope Needs Review",
      detail:
        "Confirm the requested work, access, and timing before issuing an itemized quote.",
      section: "quote" as ProjectSection,
      action: "Prepare Quote",
    };
  if (attention.awaitingApproval)
    return {
      title: "Awaiting Client Approval",
      detail:
        "The quote is available in the client portal. Approval is still pending.",
      section: "quote" as ProjectSection,
      action: "View Quote",
    };
  if (attention.readyToSchedule)
    return {
      title: "Ready to Schedule",
      detail:
        "Approval and the requested deposit are recorded. Confirm timing with the client, then update the project status.",
      section: "overview" as ProjectSection,
      action: "Review Scheduling",
    };
  if (job.status === "scheduled" || job.status === "in_progress")
    return {
      title:
        job.status === "scheduled"
          ? "Prepare for the Visit"
          : "Work in Progress",
      detail:
        "Keep scope changes, progress, and handoff details in the conversation.",
      section: "conversation" as ProjectSection,
      action: "Open Conversation",
    };
  return {
    title: "Review Payment Progress",
    detail:
      "Check recorded payments and the remaining balance before the next project step.",
    section: "quote" as ProjectSection,
    action: "View Payments",
  };
}
export function isClientMessage(message: Message, customerId: string) {
  return message.sender_type
    ? message.sender_type === "client"
    : message.author_id === customerId;
}
export function unreadClientCount(
  messages: Message[],
  customerId: string,
  seenAt?: string,
) {
  return messages.filter(
    (m) =>
      isClientMessage(m, customerId) &&
      (!seenAt || Date.parse(m.created_at) > Date.parse(seenAt)),
  ).length;
}
