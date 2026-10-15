/** Trust exact configured domains, never arbitrary Host/forwarded headers or *.vercel.app. */
export function trustedRequestOrigin(
  request: Request,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const raw = request.headers.get("origin");
  if (!raw || raw === "null") return null;
  let origin: URL;
  try {
    origin = new URL(raw);
  } catch {
    return null;
  }
  if (origin.origin !== raw || origin.username || origin.password) return null;
  const allowed = [env.NEXT_PUBLIC_SITE_URL];
  if (env.VERCEL === "1") {
    allowed.push(
      ...[env.VERCEL_URL, env.VERCEL_BRANCH_URL]
        .filter((host): host is string => Boolean(host))
        .map((host) => `https://${host}`),
    );
  }
  for (const value of allowed) {
    if (!value) continue;
    try {
      const candidate = new URL(value);
      if (
        candidate.protocol !== "https:" &&
        !(
          env.NODE_ENV !== "production" &&
          candidate.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(candidate.hostname)
        )
      )
        continue;
      if (candidate.origin === raw) return raw;
    } catch {
      /* Invalid configuration must fail closed. */
    }
  }
  return null;
}
