import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { configured, serverClient } from "../../../lib/supabase";
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!configured()) return NextResponse.redirect(new URL("/login", url));
  const db = await serverClient();
  const hash = url.searchParams.get("token_hash"),
    type = url.searchParams.get("type"),
    code = url.searchParams.get("code");
  let error;
  if (code) ({ error } = await db.auth.exchangeCodeForSession(code));
  else if (hash && ["signup", "email", "recovery"].includes(type || ""))
    ({ error } = await db.auth.verifyOtp({
      token_hash: hash,
      type: type as EmailOtpType,
    }));
  else error = new Error("Missing token");
  const next =
    url.searchParams.get("next") === "/reset-password" || type === "recovery"
      ? "/reset-password"
      : "/portal";
  return NextResponse.redirect(
    new URL(error ? "/login?error=confirmation" : next, url),
  );
}
