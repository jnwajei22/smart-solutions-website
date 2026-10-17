import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, isAdmin, adminClient } from "../../../lib/supabase";
import {
  TeamControls,
  type TeamMember,
} from "../../../components/team-controls";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Team Access",
  robots: { index: false, follow: false },
};
export default async function Team() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/admin/team");
  if (!user.email_confirmed_at || !(await isAdmin(user.id))) redirect("/admin");
  const { data, error } = await adminClient()
    .from("business_access")
    .select("email,role,updated_at")
    .order("email");
  if (error) throw Error("Unable to load team access.");
  return (
    <main className="container workspace-settings">
      <Link href="/admin" className="text-link">
        ← Business Workspace
      </Link>
      <header className="settings-heading">
        <div className="eyebrow">WORKSPACE SETTINGS</div>
        <h1>Team Access.</h1>
        <p>
          Give each partner access using their own verified email and password.
        </p>
      </header>
      <section className="settings-card">
        <h2>Partner Permissions</h2>
        <p>
          Viewers can read projects, conversations, quotes, payments, and
          delivery status. Project managers can also reply, update project
          status, issue quotes, and complete client cancellation requests. Only
          administrators manage team access and process queued emails.
        </p>
        <TeamControls members={(data || []) as TeamMember[]} />
      </section>
      <section className="settings-card">
        <h2>Signing In</h2>
        <p>
          Add their exact email here, then share the website’s sign-in page with
          them. They create an account, verify that same email, and open
          Business Workspace from their portal. Saving access does not send an
          invitation email.
        </p>
      </section>
    </main>
  );
}
