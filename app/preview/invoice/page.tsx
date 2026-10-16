import { notFound } from "next/navigation";
import { InvoiceDocument } from "../../../components/invoice-document";
import { demoData } from "../../../lib/demo";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Sample invoice",
  robots: { index: false, follow: false },
};
export default function SampleInvoice() {
  if (
    process.env.VERCEL_ENV !== "preview" &&
    process.env.NODE_ENV !== "development"
  )
    notFound();
  return (
    <>
      <p className="alert">Fictional sample invoice. No payment is due.</p>
      <InvoiceDocument
        invoice={demoData.invoices[0]}
        job={{
          ...demoData.jobs[0],
          business_name: "Example Business with a Long Company Name LLC",
        }}
      />
    </>
  );
}
