export function loginDestination(next: string | null) {
  return ["/request", "/account", "/admin", "/portal"].includes(next || "")
    ? next!
    : "/portal";
}
