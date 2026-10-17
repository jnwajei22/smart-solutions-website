import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { currentUser, isAdmin, configured } from "../../../lib/supabase";
import { sameOrigin, fail } from "../../../lib/http";
import { deliverNotifications } from "../../../lib/notifications";
export const runtime = "nodejs";
export const maxDuration = 60;
async function run() {
  if (!configured()) return fail("Account services unavailable.", 503);
  try {
    const result = await deliverNotifications();
    return NextResponse.json(result, {
      status: result.configured ? 200 : 503,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return fail("Notification processing failed.", 500);
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Request origin not allowed.", 403);
  const user = await currentUser();
  if (!user || !(await isAdmin(user.id)))
    return fail("Administrator access required.", 403);
  return run();
}
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret || ""}`);
  if (
    !secret ||
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  )
    return fail("Unauthorized.", 401);
  return run();
}
