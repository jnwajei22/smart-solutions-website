import { NextResponse } from "next/server";
import {
  adminClient,
  currentUser,
  isAdmin,
  configured,
} from "../../../lib/supabase";
import { bodyJSON, fail, sameOrigin } from "../../../lib/http";
import { calculateTotal } from "../../../lib/billing";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Request origin not allowed.", 403);
  if (!configured()) return fail("Account services are not configured.", 503);
  const user = await currentUser();
  if (!user || !(await isAdmin(user.id)))
    return fail("Administrator access required.", 403);
  try {
    const b = await bodyJSON(request);
    const db = adminClient();
    const { data: job, error } = await db
      .from("requests")
      .select("id,customer_id")
      .eq("id", b.request_id)
      .single();
    if (error || !job) return fail("Request not found.", 404);
    if (b.action === "message") {
      if (
        typeof b.body !== "string" ||
        b.body.trim().length < 3 ||
        b.body.length > 2000
      )
        return fail("Write a message between 3 and 2,000 characters.");
      const { error } = await db.from("messages").insert({
        request_id: job.id,
        author_id: user.id,
        body: b.body.trim(),
      });
      if (error) throw error;
      return NextResponse.json({ saved: true });
    }
    if (b.action === "status") {
      if (
        ![
          "requested",
          "reviewing",
          "quoted",
          "scheduled",
          "in_progress",
          "completed",
          "cancelled",
        ].includes(b.status)
      )
        return fail("Invalid project status.");
      const { error } = await db
        .from("requests")
        .update({ status: b.status })
        .eq("id", job.id);
      if (error) throw error;
      return NextResponse.json({ saved: true });
    }
    if (b.action !== "quote") return fail("Unknown action.");
    const total = calculateTotal(b.items);
    if (
      typeof b.terms !== "string" ||
      b.terms.trim().length < 20 ||
      b.terms.length > 2000
    )
      return fail(
        "Add project-specific terms, including deposit and cancellation conditions.",
      );
    if (
      typeof b.title !== "string" ||
      b.title.trim().length < 3 ||
      b.title.length > 150
    )
      return fail("Add a project title.");
    if (
      !Number.isInteger(b.deposit_cents) ||
      b.deposit_cents < 0 ||
      b.deposit_cents > total
    )
      return fail("Deposit must be between zero and the quote total.");
    if (
      typeof b.due_date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(b.due_date) ||
      Number.isNaN(Date.parse(b.due_date))
    )
      return fail("Choose a valid due date.");
    const { data, error: quoteError } = await db.rpc("issue_quote", {
      p_request: job.id,
      p_title: b.title.trim(),
      p_items: b.items,
      p_total: total,
      p_deposit: b.deposit_cents,
      p_due: b.due_date,
      p_terms: b.terms.trim(),
    });
    if (quoteError)
      return fail(
        "Unable to issue quote. This request may already have an invoice.",
        409,
      );
    return NextResponse.json({ id: data }, { status: 201 });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Unable to save this change.");
  }
}
