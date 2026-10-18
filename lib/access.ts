export type BusinessRole = "admin" | "manager" | "viewer";
export const canManageProjects = (role?: BusinessRole | null) =>
  role === "admin" || role === "manager";
export const roleLabel = (role: BusinessRole) =>
  ({ admin: "Administrator", manager: "Project Manager", viewer: "Viewer" })[
    role
  ];
