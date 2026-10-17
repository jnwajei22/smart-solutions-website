import { redirect } from "next/navigation";
import { currentUser, businessRole } from "../../lib/supabase";
import { WorkspaceNav } from "../../components/workspace-nav";
export default async function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/admin");
  const role = await businessRole(user);
  if (!role) redirect("/portal");
  return (
    <>
      <WorkspaceNav role={role} />
      {children}
    </>
  );
}
