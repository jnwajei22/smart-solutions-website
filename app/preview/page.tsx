import { Portal } from "../../components/portal";
import { demoData } from "../../lib/demo";
export const metadata = {
  title: "Sample client portal",
  robots: { index: false, follow: false },
};
export default async function Preview({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const query = await searchParams;
  const scenario = ["approval", "review", "empty"].includes(query.state || "")
    ? query.state!
    : "standard";
  const data =
    scenario === "empty"
      ? { ...demoData, jobs: [], invoices: [], payments: [], messages: [] }
      : scenario === "approval"
        ? {
            ...demoData,
            jobs: demoData.jobs.map((job, index) =>
              index === 0 ? { ...job, status: "quoted" } : job,
            ),
            invoices: demoData.invoices.map((invoice) => ({
              ...invoice,
              accepted_at: null,
              paid_cents: 0,
            })),
            payments: [],
          }
        : scenario === "review"
          ? {
              ...demoData,
              invoices: demoData.invoices.map((invoice) => ({
                ...invoice,
                collection_paused_at: "2026-11-07T00:00:00Z",
                client_cancellation_reason:
                  "Sample request to change project plans.",
              })),
            }
          : demoData;
  return <Portal data={data} demo scenario={scenario} />;
}
