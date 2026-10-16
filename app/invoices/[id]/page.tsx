import { notFound, redirect } from "next/navigation";
import { currentUser, configured, serverClient } from "../../../lib/supabase";
import type { Invoice } from "../../../lib/catalog";
import { InvoiceDocument } from "../../../components/invoice-document";
export const dynamic = "force-dynamic";
export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!configured() || !(await currentUser())) redirect("/login");
  const { id } = await params;
  const db = await serverClient();
  const { data, error } = await db
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) notFound();
  const i = data as Invoice;
  const { data: job } = await db
    .from("requests")
    .select("name,business_name,email,address,city")
    .eq("id", i.request_id)
    .single();
  return <InvoiceDocument invoice={i} job={job} />;
}
