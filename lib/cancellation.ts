import Stripe from "stripe";
import { adminClient } from "./supabase";
/** Pause under the invoice lock before touching Stripe. Uncertain outcomes stay paused. */
export async function cancelInvoice(
  invoiceId: string,
  actor: string,
  reason: string,
  cancelProject: boolean,
) {
  const db = adminClient();
  const { error: startError } = await db.rpc("begin_invoice_cancellation", {
    p_invoice: invoiceId,
    p_actor: actor,
    p_reason: reason,
    p_cancel_project: cancelProject,
  });
  if (startError) throw Error("Unable to pause this invoice for cancellation.");
  const { data: attempts, error } = await db
    .from("payment_attempts")
    .select("id,session_id")
    .eq("invoice_id", invoiceId)
    .eq("completed", false);
  if (error)
    throw Error(
      "Collection is paused. Unable to check payment attempts; retry cancellation.",
    );
  for (const attempt of attempts || []) {
    if (!attempt.session_id)
      throw Error(
        "Collection is paused. A checkout is still being created or has an uncertain result. Retry cancellation after it resolves; do not collect another payment.",
      );
    if (!process.env.STRIPE_SECRET_KEY)
      throw Error(
        "Collection is paused. Stripe access is required to close the existing checkout.",
      );
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    let session = await stripe.checkout.sessions.retrieve(attempt.session_id);
    if (session.status === "open") {
      try {
        session = await stripe.checkout.sessions.expire(session.id);
      } catch {
        session = await stripe.checkout.sessions.retrieve(session.id);
      }
    }
    if (session.status === "expired") {
      const { error } = await db
        .from("payment_attempts")
        .update({ completed: true })
        .eq("id", attempt.id);
      if (error)
        throw Error(
          "Collection is paused. Unable to record checkout closure; retry cancellation.",
        );
    } else if (
      session.payment_status === "paid" &&
      typeof session.payment_intent === "string" &&
      session.currency === "usd"
    ) {
      const { error } = await db.rpc("record_payment", {
        p_event: `cancel_reconcile_${session.id}`,
        p_attempt: attempt.id,
        p_session: session.id,
        p_intent: session.payment_intent,
        p_amount: session.amount_total,
      });
      if (error)
        throw Error(
          "Collection is paused. Payment reconciliation needs review.",
        );
    } else
      throw Error(
        "Collection is paused. A submitted payment is still unresolved. Wait for Stripe reconciliation before voiding.",
      );
  }
  const { error: finishError } = await db.rpc("finish_invoice_cancellation", {
    p_invoice: invoiceId,
  });
  if (finishError)
    throw Error(
      "Collection is paused. Refund any retained payment in Stripe, wait for the refund to appear here, then retry cancellation. No refund was issued by this action.",
    );
}
