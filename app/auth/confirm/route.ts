import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { configured, serverClient } from "../../../lib/supabase";
export async function GET(request: Request) {
  const url = new URL(request.url);
  let recovery =
    url.searchParams.get("next") === "/reset-password" ||
    url.searchParams.get("type") === "recovery";
  function result(failed: boolean) {
    const destination = failed
      ? "/login?error=confirmation" + (recovery ? "&flow=recovery" : "")
      : recovery
        ? "/reset-password"
        : "/portal";
    const response = NextResponse.redirect(new URL(destination, url));
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
  if (!configured() || url.searchParams.has("error")) return result(true);
  try {
    const db = await serverClient();
    const hash = url.searchParams.get("token_hash"),
      type = url.searchParams.get("type"),
      code = url.searchParams.get("code");
    if (code) {
      const flowId = url.searchParams.get("sb_flow_id");
      // A provided flow must never silently borrow another request's verifier.
      if (flowId && !/^[a-zA-Z0-9_-]{8,64}$/.test(flowId)) return result(true);
      const { data, error } = await db.auth.exchangeCodeForSession(
        code,
        flowId ? { flowId } : undefined,
      );
      recovery ||=
        data != null &&
        "redirectType" in data &&
        data.redirectType === "recovery";
      return result(Boolean(error));
    }
    if (hash && ["signup", "email", "recovery"].includes(type || "")) {
      const { error } = await db.auth.verifyOtp({
        token_hash: hash,
        type: type as EmailOtpType,
      });
      return result(Boolean(error));
    }
    return result(true);
  } catch {
    // Do not expose provider errors, tokens or callback parameters to the page.
    return result(true);
  }
}
