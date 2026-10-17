import { scheduleNotifications } from "../../../lib/notifications";
import { logFailure } from "../../../lib/observability";
import { NextResponse } from "next/server";
import { currentUser, adminClient, configured } from "../../../lib/supabase";
import { bodyJSON, fail, sameOrigin } from "../../../lib/http";
import { businessName, validPreferredDate } from "../../../lib/presentation";
import { services } from "../../../lib/catalog";
import { normalizeQualification } from "../../../lib/qualification";
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
    if (!validPreferredDate(b.preferred_date))
      return fail("Choose a valid Preferred Date.");
    let qualification;
    try {
      qualification = normalizeQualification(b.qualification);
    } catch (error) {
      return fail(
        error instanceof Error
          ? error.message
          : "Please check the project questions.",
      );
    }
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
        business_name: businessName(user.user_metadata),
        phone: b.phone.trim(),
        service: b.service,
        property_type: b.property_type,
        address: b.address.trim(),
        city: b.city.trim(),
        details: b.details.trim(),
        preferred_date: b.preferred_date,
        qualification,
      })
      .select("id")
      .single();
    if (error) throw error;
    scheduleNotifications();
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) {
    logFailure("request_save_failed", error);
    return fail("We couldn’t save your request. Please try again.", 500);
  }
}
