import { NextResponse } from "next/server";
import { adminClient, configured, currentUser } from "../../../lib/supabase";
import { bodyJSON, fail, sameOrigin } from "../../../lib/http";
import { scheduleNotifications } from "../../../lib/notifications";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Request origin not allowed.", 403);
  if (!configured()) return fail("Account services unavailable.", 503);
  const user = await currentUser();
  if (!user?.email_confirmed_at)
    return fail("Please sign in with a verified email.", 401);
  try {
    const body = await bodyJSON(request);
    if (
      typeof body.invoice_id !== "string" ||
      typeof body.reason !== "string" ||
      body.reason.trim().length < 3 ||
      body.reason.length > 500
    )
      return fail("Write a cancellation reason between 3 and 500 characters.");
    const { error } = await adminClient().rpc("request_invoice_cancellation", {
      p_invoice: body.invoice_id,
      p_customer: user.id,
      p_reason: body.reason.trim(),
    });
    if (error)
      return fail(
        "Unable to update this cancellation. Refresh your invoices and try again.",
        409,
      );
    scheduleNotifications();
    return NextResponse.json({ saved: true });
  } catch {
    return fail("Unable to save cancellation request.", 400);
  }
}
