import { notFound } from "next/navigation";
import { AdminDashboard } from "../../../components/admin";
import { demoData } from "../../../lib/demo";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Sample business workspace",
  robots: { index: false, follow: false },
};
export default function SampleAdmin() {
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
        admin: true,
        jobs: demoData.jobs.map((j, n) => ({
          ...j,
          business_name:
            n === 1 ? "Example Business with a Long Company Name LLC" : null,
        })),
        messages: [
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
