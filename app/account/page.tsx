import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "../../lib/supabase";
import { accountName } from "../../lib/presentation";
import { AccountPanel } from "../../components/account-panel";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Account Settings",
  robots: { index: false, follow: false },
};
export default async function Account() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account");
  return (
    <main className="container workspace-settings">
      <Link href="/portal" className="text-link">
        ← Client Portal
      </Link>
      <header className="settings-heading">
        <h1>Account Settings.</h1>
        <p>Manage your individual sign-in.</p>
      </header>
      <AccountPanel
        name={accountName(user.user_metadata)}
        email={user.email || ""}
        role="Client Portal"
      />
    </main>
  );
}
