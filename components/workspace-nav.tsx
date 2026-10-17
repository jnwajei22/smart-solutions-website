"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./brand";
import { roleLabel, type BusinessRole } from "../lib/access";
export function WorkspaceNav({
  role,
  demo = false,
}: {
  role: BusinessRole;
  demo?: boolean;
}) {
  const path = usePathname();
  const links = [
    [demo ? "/preview/admin" : "/admin", "Projects"],
    ["/admin/notifications", "Notifications"],
    ...(role === "admin" ? [["/admin/team", "Team Access"]] : []),
    ["/admin/account", "Account"],
    ["/admin/operations", "Operating Guide"],
  ];
  return (
    <header className="workspace-header">
      <div className="container workspace-brand-row">
        <Brand />
        <span className="workspace-role-pill">{roleLabel(role)}</span>
        <Link href="/portal" className="text-link">
          Client Portal ↗
        </Link>
      </div>
      <nav
        className="container workspace-navigation"
        aria-label="Business Workspace"
      >
        {links.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            aria-current={path === href ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
