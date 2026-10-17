import { cancelInvoice } from "../../../lib/cancellation";
import { scheduleNotifications } from "../../../lib/notifications";
import { NextResponse } from "next/server";
import {
  adminClient,
  currentUser,
  businessRole,
  configured,
} from "../../../lib/supabase";
import { bodyJSON, fail, sameOrigin } from "../../../lib/http";
import { calculateTotal } from "../../../lib/billing";
import { validPreferredDate } from "../../../lib/presentation";
import { canManageProjects } from "../../../lib/access";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Request origin not allowed.", 403);
  if (!configured()) return fail("Account services are not configured.", 503);
  const user = await currentUser();
  if (!user || !canManageProjects(await businessRole(user)))
    return fail("Project management access required.", 403);
  try {
    const b = await bodyJSON(request);
    const db = adminClient();
    const { data: job, error } = await db
      .from("requests")
      .select("id,customer_id")
      .eq("id", b.request_id)
      .single();
    if (error || !job) return fail("Request not found.", 404);
    if (b.action === "cancel_invoice") {
      if (
        typeof b.invoice_id !== "string" ||
        "reason" in b ||
        "cancel_project" in b
      )
        return fail(
          "Only the client can enter or change a cancellation reason.",
        );
      const { data: invoice, error } = await db
        .from("invoices")
        .select("id,client_cancellation_reason")
        .eq("id", b.invoice_id)
        .eq("request_id", job.id)
        .single();
      if (error || !invoice) return fail("Invoice not found.", 404);
      if (!invoice.client_cancellation_reason)
        return fail(
          "The client must request cancellation in their portal first.",
          409,
        );
      try {
        await cancelInvoice(
          invoice.id,
          user.id,
          invoice.client_cancellation_reason,
          true,
        );
      } catch (error) {
        return fail(
          error instanceof Error &&
            (error.message.startsWith("Collection is paused.") ||
              error.message ===
                "Unable to pause this invoice for cancellation.")
            ? error.message
            : "Cancellation requires review. Refresh the workspace before collecting payment.",
          409,
        );
      }
      scheduleNotifications();
      return NextResponse.json({ saved: true });
    }
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
        sender_type: "business",
        body: b.body.trim(),
      });
      if (error) throw error;
      scheduleNotifications();
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
      const { error } = await db.rpc("set_project_status", {
        p_request: job.id,
        p_status: b.status,
      });
      if (error)
        return fail(
          "Unable to change status. Cancel or void the active invoice before cancelling the project.",
          409,
        );
      scheduleNotifications();
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
    if (!validPreferredDate(b.due_date))
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
    scheduleNotifications();
    return NextResponse.json({ id: data }, { status: 201 });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Unable to save this change.");
  }
}
