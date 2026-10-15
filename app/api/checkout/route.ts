import Stripe from "stripe";
import { NextResponse } from "next/server";
import { adminClient, currentUser, configured } from "../../../lib/supabase";
import { bodyJSON, fail, sameOrigin } from "../../../lib/http";
import { amountToCharge } from "../../../lib/billing";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Request origin not allowed.", 403);
  if (!configured()) return fail("Account services are not configured.", 503);
  const user = await currentUser();
  if (!user) return fail("Please sign in.", 401);
  try {
    const b = await bodyJSON(request);
    if (typeof b.invoice_id !== "string") return fail("Choose an invoice.");
    const db = adminClient();
    const { data: invoice, error } = await db
      .from("invoices")
      .select("*")
      .eq("id", b.invoice_id)
      .eq("customer_id", user.id)
      .single();
    if (error || !invoice) return fail("Invoice not found.", 404);
    if (invoice.status !== "issued")
      return fail("This invoice is not open for payment.");
    if (b.kind === "accept") {
      const { error } = await db
        .from("invoices")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invoice.id)
        .is("accepted_at", null);
      if (error) throw error;
      return NextResponse.json({ accepted: true });
    }
    if (!invoice.accepted_at)
      return fail("Please approve the quote before paying.");
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET)
      return fail(
        "Online payments are not enabled yet. Your invoice remains unchanged.",
        503,
      );
    const amount = amountToCharge(invoice, b.kind);
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { data: reservation, error: reserveError } = await db.rpc(
      "reserve_checkout",
      {
        p_invoice: invoice.id,
        p_customer: user.id,
        p_amount: amount,
        p_kind: b.kind,
      },
    );
    if (reserveError)
      return fail(
        "A payment is already in progress. Try again after the current checkout expires.",
        409,
      );
    const attempt = reservation[0];
    if (attempt.session_id) {
      const existing = await stripe.checkout.sessions.retrieve(
        attempt.session_id,
      );
      if (existing.status === "open" && existing.url)
        return NextResponse.json({ url: existing.url });
      if (existing.status === "expired") {
        const { error } = await db
          .from("payment_attempts")
          .update({ completed: true })
          .eq("id", attempt.id);
        if (error) throw error;
        return fail(
          "Your previous checkout expired. Please select payment again.",
          409,
        );
      }
      if (
        existing.payment_status === "paid" &&
        typeof existing.payment_intent === "string"
      ) {
        const { error } = await db.rpc("record_payment", {
          p_event: `reconcile_${existing.id}`,
          p_attempt: attempt.id,
          p_session: existing.id,
          p_intent: existing.payment_intent,
          p_amount: existing.amount_total,
        });
        if (error) throw error;
      }
      return fail(
        "Your payment has been submitted. Refresh your portal for the updated balance.",
        409,
      );
    }
    const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL!).origin;
    let session;
    try {
      session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          customer_email: user.email,
          allowed_payment_method_types: ["card"],
          client_reference_id: invoice.id,
          metadata: {
            invoice_id: invoice.id,
            customer_id: user.id,
            attempt_id: attempt.id,
          },
          payment_intent_data: {
            metadata: { invoice_id: invoice.id, attempt_id: attempt.id },
          },
          line_items: [
            {
              price_data: {
                currency: "usd",
                unit_amount: amount,
                product_data: {
                  name: `${invoice.number} · ${b.kind === "deposit" ? "Project deposit" : "Remaining balance"}`,
                  description: invoice.title,
                },
              },
              quantity: 1,
            },
          ],
          success_url: `${origin}/portal?payment=submitted`,
          cancel_url: `${origin}/portal?payment=cancelled`,
          expires_at: Math.floor(Date.now() / 1000) + 1800,
        },
        { idempotencyKey: attempt.id },
      );
    } catch (error) {
      /* Keep reservation on ambiguous provider failures to prevent duplicate checkouts. */ console.error(
        "checkout_provider_failure",
        error instanceof Error ? error.name : "Unknown",
      );
      return fail(
        "Unable to open checkout. Please retry in a few minutes.",
        502,
      );
    }
    const { error: saveError } = await db
      .from("payment_attempts")
      .update({ session_id: session.id })
      .eq("id", attempt.id);
    if (saveError) throw saveError;
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return fail(
      e instanceof Error && e.message.startsWith("There is no")
        ? e.message
        : "Unable to start this payment. Please try again.",
      400,
    );
  }
}
