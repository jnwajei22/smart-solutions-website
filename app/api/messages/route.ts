import { logFailure } from "../../../lib/observability";
import { NextResponse } from "next/server";
import { currentUser, adminClient, configured } from "../../../lib/supabase";
import { bodyJSON, fail, sameOrigin } from "../../../lib/http";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Request origin not allowed.", 403);
  if (!configured()) return fail("Account services unavailable.", 503);
  const user = await currentUser();
  if (!user) return fail("Please sign in.", 401);
  try {
    const b = await bodyJSON(request);
    if (
      typeof b.body !== "string" ||
      b.body.trim().length < 3 ||
      b.body.length > 2000
    )
      return fail("Write an update between 3 and 2,000 characters.");
    const db = adminClient();
    const { data: job } = await db
      .from("requests")
      .select("id")
      .eq("id", b.request_id)
      .eq("customer_id", user.id)
      .single();
    if (!job) return fail("Project not found.", 404);
    const { count, error: limitError } = await db
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("author_id", user.id)
      .gte("created_at", new Date(Date.now() - 86400000).toISOString());
    if (limitError) throw limitError;
    if ((count || 0) >= 50)
      return fail("Message limit reached. Please try again tomorrow.", 429);
    const { error } = await db
      .from("messages")
      .insert({ request_id: job.id, author_id: user.id, body: b.body.trim() });
    if (error) throw error;
    return NextResponse.json({ saved: true });
  } catch (error) {
    logFailure("message_save_failed", error);
    return fail("Unable to save your message. Please try again.", 500);
  }
}
