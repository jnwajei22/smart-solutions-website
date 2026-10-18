// Production starts in inquiry-only mode. Enable the full platform only after launch setup.
export function inquiryOnly() {
  return (
    process.env.PUBLIC_INQUIRY_ONLY === "true" ||
    (process.env.VERCEL_ENV === "production" &&
      process.env.PUBLIC_INQUIRY_ONLY !== "false")
  );
}
export const inquiryEmail = "dfwsmartsol@gmail.com";
export function launchRoute(path: string) {
  if (path.startsWith("/api/")) return path === "/api/health" ? null : "api";
  return [
    "/portal",
    "/admin",
    "/invoices",
    "/account",
    "/login",
    "/reset-password",
    "/auth",
    "/preview",
  ].some((prefix) => path === prefix || path.startsWith(prefix + "/"))
    ? "page"
    : null;
}
