import { redirect } from "next/navigation";
import { currentUser, businessRole } from "../../../lib/supabase";
import { accountName } from "../../../lib/presentation";
import { roleLabel } from "../../../lib/access";
import { AccountPanel } from "../../../components/account-panel";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Account Settings",
  robots: { index: false, follow: false },
};
export default async function Account() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const role = await businessRole(user);
  if (!role) redirect("/portal");
  return (
    <main className="container workspace-settings">
      <header className="settings-heading">
        <div className="eyebrow">WORKSPACE SETTINGS</div>
        <h1>Account Settings.</h1>
        <p>Manage your sign-in and review your workspace access.</p>
      </header>
      <AccountPanel
        name={accountName(user.user_metadata)}
        email={user.email || ""}
        role={roleLabel(role)}
      />
    </main>
  );
}
