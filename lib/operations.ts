import type { Job, PortalData } from "./catalog";
export function requestAttention(
  job: Job,
  data: Pick<PortalData, "messages" | "invoices">,
) {
  const latest = data.messages
    .filter((m) => m.request_id === job.id)
    .reduce<(typeof data.messages)[number] | null>(
      (last, m) =>
        !last || Date.parse(m.created_at) >= Date.parse(last.created_at)
          ? m
          : last,
      null,
    );
  const invoice = data.invoices.find(
    (i) => i.request_id === job.id && i.status !== "void",
  );
  const active = !["completed", "cancelled"].includes(job.status);
  return {
    needsReply: latest?.sender_type
      ? latest.sender_type === "client"
      : latest?.author_id === job.customer_id,
    needsReview:
      active && ["requested", "reviewing"].includes(job.status) && !invoice,
    awaitingApproval:
      active &&
      Boolean(invoice && !invoice.collection_paused_at && !invoice.accepted_at),
    readyToSchedule:
      active &&
      ["requested", "reviewing", "quoted"].includes(job.status) &&
      Boolean(
        invoice?.accepted_at &&
        !invoice.collection_paused_at &&
        invoice.paid_cents >= invoice.deposit_cents,
      ),
  };
}
export function matchesRequest(job: Job, query: string) {
  const search = query.trim().toLocaleLowerCase();
  return (
    !search ||
    [job.name, job.business_name, job.email, job.city, job.id].some((value) =>
      value?.toLocaleLowerCase().includes(search),
    )
  );
}
