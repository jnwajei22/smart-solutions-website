import { Portal } from "../../components/portal";
import { loadPortal } from "../../lib/portal";
import { configured } from "../../lib/supabase";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your client portal" };
export default async function PortalPage() {
  if (!configured()) redirect("/login");
  return <Portal data={await loadPortal()} />;
}
