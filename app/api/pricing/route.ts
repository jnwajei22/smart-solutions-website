import { NextResponse } from "next/server";
import {
  currentUser,
  businessRole,
  configured,
  adminClient,
  isAdmin,
} from "../../../lib/supabase";
import { canManageProjects } from "../../../lib/access";
import { bodyJSON, fail, sameOrigin } from "../../../lib/http";
import { loadPriceBook } from "../../../lib/price-book-server";
import { validatePriceBook } from "../../../lib/pricing";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!configured()) return fail("Pricing is unavailable.", 503);
  const user = await currentUser();
  if (!user?.email_confirmed_at || !canManageProjects(await businessRole(user)))
    return fail("Project management access required.", 403);
  try {
    const invoice = new URL(request.url).searchParams.get("invoice");
    if (invoice) {
      if (!/^[0-9a-f-]{36}$/i.test(invoice)) return fail("Invalid invoice.");
      const { data, error } = await adminClient()
        .from("quote_pricing_audits")
        .select("price_book_version,audit,created_at")
        .eq("invoice_id", invoice)
        .maybeSingle();
      if (error) return fail("Unable to load the pricing record.", 503);
      return NextResponse.json(
        { record: data },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
    return NextResponse.json(
      { priceBook: await loadPriceBook() },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return fail("Unable to load shared pricing.", 503);
  }
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return fail("Request origin not allowed.", 403);
  if (!configured()) return fail("Pricing is unavailable.", 503);
  const user = await currentUser();
  if (!user?.email_confirmed_at || !(await isAdmin(user.id)))
    return fail("Administrator access required.", 403);
  try {
    const b = await bodyJSON(request);
    const book = validatePriceBook(b.priceBook);
    if (typeof b.expectedVersion !== "string" || b.expectedVersion.length > 80)
      return fail("Reload pricing before saving.");
    const next = { ...book, version: crypto.randomUUID() };
    const { error } = await adminClient().rpc("save_price_book", {
      p_expected: b.expectedVersion,
      p_book: next,
      p_actor: user.id,
    });
    if (error)
      return fail(
        "Pricing changed in another session. Reload and review before saving.",
        409,
      );
    return NextResponse.json({ priceBook: next });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Unable to save pricing.",
    );
  }
}
