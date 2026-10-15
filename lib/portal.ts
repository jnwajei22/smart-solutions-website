import "server-only";
import { redirect } from "next/navigation";
import { currentUser, serverClient, isAdmin } from "./supabase";
import type { PortalData } from "./catalog";
export async function loadPortal(admin = false): Promise<PortalData> {
  const user = await currentUser();
  if (!user) redirect(`/login?next=${admin ? "/admin" : "/portal"}`);
  const role = await isAdmin(user.id);
  if (admin && !role) redirect("/portal");
  const db = await serverClient();
  const messagesQuery = db
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true });
  let jobsQuery = db
    .from("requests")
    .select("*")
    .order("created_at", { ascending: false });
  let invoicesQuery = db
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: false });
  let paymentsQuery = db
    .from("payments")
    .select(
      "id,invoice_id,amount_cents,refunded_cents,created_at,stripe_session_id",
    )
    .order("created_at", { ascending: false });
  if (!admin) {
    jobsQuery = jobsQuery.eq("customer_id", user.id);
    invoicesQuery = invoicesQuery.eq("customer_id", user.id);
    paymentsQuery = paymentsQuery.eq("customer_id", user.id);
  }
  const [jobs, invoices, payments, messages] = await Promise.all([
    jobsQuery,
    invoicesQuery,
    paymentsQuery,
    messagesQuery,
  ]);
  if (jobs.error || invoices.error || payments.error || messages.error)
    throw Error("Unable to load account records. Please try again.");
  return {
    jobs: jobs.data || [],
    invoices: invoices.data || [],
    payments: payments.data || [],
    messages: messages.data || [],
    name: user.email?.split("@")[0] || "there",
    email: user.email || "",
    admin: role,
  };
}
