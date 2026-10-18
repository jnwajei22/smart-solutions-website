import { redirect } from "next/navigation";
import { currentUser, isAdmin } from "../../../lib/supabase";
import { PricingSettings } from "../../../components/pricing-settings";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Pricing Settings",
  robots: { index: false, follow: false },
};
export default async function PricingPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/admin/pricing");
  if (!user.email_confirmed_at || !(await isAdmin(user.id))) redirect("/admin");
  return (
    <main className="container workspace-settings">
      <header className="settings-heading">
        <div className="eyebrow">BUSINESS SETTINGS</div>
        <h1>Pricing.</h1>
        <p>
          Shared package prices and estimating assumptions. Review launch
          defaults before issuing real quotes. Saving changes affects new
          calculations; issued quotes stay locked.
        </p>
      </header>
      <PricingSettings />
    </main>
  );
}
