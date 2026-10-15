import Stripe from "stripe";
import { NextResponse } from "next/server";
import { adminClient, configured } from "../../../../lib/supabase";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (
    !configured() ||
    !process.env.STRIPE_SECRET_KEY ||
    !process.env.STRIPE_WEBHOOK_SECRET
  )
    return NextResponse.json({ error: "Webhook unavailable" }, { status: 503 });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      request.headers.get("stripe-signature") || "",
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  const db = adminClient();
  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "paid") {
        if (
          session.currency !== "usd" ||
          !session.metadata?.attempt_id ||
          typeof session.payment_intent !== "string"
        )
          throw Error("Invalid payment metadata");
        const { error } = await db.rpc("record_payment", {
          p_event: event.id,
          p_attempt: session.metadata.attempt_id,
          p_session: session.id,
          p_intent: session.payment_intent,
          p_amount: session.amount_total,
        });
        if (error) throw error;
      }
    }
    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const intent =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (!intent) throw Error("Missing payment intent");
      const { error } = await db.rpc("record_refund", {
        p_event: event.id,
        p_intent: intent,
        p_refunded: charge.amount_refunded,
      });
      if (error) throw error;
    }
    return NextResponse.json({ received: true });
  } catch {
    console.error("stripe_webhook_reconciliation_failed", event.id, event.type);
    return NextResponse.json(
      { error: "Reconciliation failed; retry required" },
      { status: 500 },
    );
  }
}
