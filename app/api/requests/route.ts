import { NextResponse } from "next/server";
import { currentUser, adminClient, configured } from "../../../lib/supabase";
import { bodyJSON, fail, sameOrigin } from "../../../lib/http";
import { services } from "../../../lib/catalog";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Request origin not allowed.", 403);
  if (!configured())
    return fail(
      "Online requests are not available yet. Please check back shortly.",
      503,
    );
  const user = await currentUser();
  if (!user?.email_confirmed_at)
    return fail(
      "Please sign in with a verified email to submit your request.",
      401,
    );
  try {
    const b = await bodyJSON(request);
    for (const [key, min, max] of [
      ["name", 2, 100],
      ["phone", 7, 30],
      ["address", 3, 250],
      ["city", 2, 80],
      ["details", 15, 4000],
    ] as const) {
      if (
        typeof b[key] !== "string" ||
        b[key].trim().length < min ||
        b[key].length > max
      )
        return fail(`Please check ${key.replace("_", " ")}.`);
    }
    if (
      !services.some((s) => s.id === b.service) ||
      !["Residential", "Commercial"].includes(b.property_type)
    )
      return fail("Choose a valid service and property type.");
    if (
      b.preferred_date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(b.preferred_date) ||
        Number.isNaN(Date.parse(b.preferred_date)))
    )
      return fail("Choose a valid preferred date.");
    const db = adminClient();
    const { data: allowed, error: limitError } = await db.rpc(
      "consume_request_limit",
      { p_user: user!.id },
    );
    if (limitError) throw limitError;
    if (!allowed)
      return fail(
        "You’ve reached the request limit. Please try again tomorrow.",
        429,
      );
    const { data, error } = await db
      .from("requests")
      .insert({
        customer_id: user!.id,
        email: user!.email,
        name: b.name.trim(),
        phone: b.phone.trim(),
        service: b.service,
        property_type: b.property_type,
        address: b.address.trim(),
        city: b.city.trim(),
        details: b.details.trim(),
        preferred_date: b.preferred_date || null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch {
    return fail("We couldn’t save your request. Please try again.", 500);
  }
}
