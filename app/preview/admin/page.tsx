import { notFound } from "next/navigation";
import { AdminDashboard } from "../../../components/admin";
import { demoData } from "../../../lib/demo";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Sample business workspace",
  robots: { index: false, follow: false },
};
export default async function SampleAdmin({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  if (
    process.env.VERCEL_ENV !== "preview" &&
    process.env.NODE_ENV !== "development"
  )
    notFound();
  return (
    <AdminDashboard
      demo
      data={{
        ...demoData,
        name: "Sample Operator",
        businessRole: state === "viewer" ? "viewer" : "admin",
        invoices: demoData.invoices.map((i, n) =>
          n === 0 && state === "cancelled"
            ? {
                ...i,
                status: "void",
                voided_at: "2026-10-16T17:00:00Z",
                client_cancellation_reason:
                  "Sample client requested cancellation.",
              }
            : n === 0 && state === "paused"
              ? {
                  ...i,
                  collection_paused_at: "2026-10-16T17:00:00Z",
                  client_cancellation_reason:
                    "Sample client requested cancellation.",
                }
              : i,
        ),
        admin: true,
        jobs: demoData.jobs.map((j, n) => ({
          ...j,
          status: state === "cancelled" ? "cancelled" : j.status,
          business_name:
            n === 1 ? "Example Business with a Long Company Name LLC" : null,
        })),
        messages:
          state === "conversation"
            ? Array.from({ length: 24 }, (_, n) => ({
                id: `thread-${n}`,
                request_id: "sample-1",
                author_id: n % 2 ? "sample-operator" : "sample",
                body: `Sample message ${n + 1}. We are reviewing the project scope and installation details together.`,
                created_at: new Date(
                  Date.UTC(2026, 9, 16, 14, n),
                ).toISOString(),
              }))
            : [
                {
                  id: "sample-client-one",
                  request_id: "sample-1",
                  author_id: "sample",
                  body: "Could we confirm the cable route before the installation?",
                  created_at: "2026-10-16T14:00:00Z",
                },
                {
                  id: "sample-business-one",
                  request_id: "sample-1",
                  author_id: "sample-operator",
                  body: "Absolutely. We’ll review the route and wall plate locations with you before starting.",
                  created_at: "2026-10-16T14:15:00Z",
                },
                {
                  id: "sample-message",
                  request_id: "sample-2",
                  author_id: "sample",
                  body: "Could we review access point placement before the visit?",
                  created_at: "2026-10-15T14:00:00Z",
                },
              ],
      }}
    />
  );
}
