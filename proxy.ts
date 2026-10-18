import { inquiryOnly, launchRoute } from "./lib/launch";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function proxy(request: NextRequest) {
  const held = inquiryOnly() && launchRoute(request.nextUrl.pathname);
  if (held === "api")
    return NextResponse.json(
      {
        error:
          "Online accounts and payments are not available during launch preparation. Please use the inquiry page.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  if (held === "page")
    return NextResponse.redirect(new URL("/request", request.url));
  let response = NextResponse.next({ request });
  if (request.nextUrl.pathname === "/api/stripe/webhook") return response;
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    return response;
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  await supabase.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/portal/:path*",
    "/account/:path*",
    "/login",
    "/reset-password",
    "/preview/:path*",
    "/admin/:path*",
    "/api/:path*",
    "/invoices/:path*",
    "/auth/:path*",
  ],
};
