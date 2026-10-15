import { configured } from "../../lib/supabase";
import { loadPortal } from "../../lib/portal";
import { redirect } from "next/navigation";
import { AdminDashboard } from "../../components/admin";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Business dashboard",
  robots: { index: false, follow: false },
};
export default async function Admin() {
  if (!configured()) redirect("/login");
  return <AdminDashboard data={await loadPortal(true)} />;
}
