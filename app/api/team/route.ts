import { NextResponse } from "next/server";
import {
  adminClient,
  configured,
  currentUser,
  isAdmin,
} from "../../../lib/supabase";
import { bodyJSON, fail, sameOrigin } from "../../../lib/http";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Request origin not allowed.", 403);
  if (!configured()) return fail("Account services unavailable.", 503);
  const user = await currentUser();
  if (!user?.email_confirmed_at || !(await isAdmin(user.id)))
    return fail("Administrator access required.", 403);
  try {
    const body = await bodyJSON(request);
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return fail("Enter a valid email address.");
    if (email === user.email?.toLowerCase())
      return fail("Your administrator access is managed separately.");
    if (
      !["grant", "revoke"].includes(body.action) ||
      (body.action === "grant" && !["viewer", "manager"].includes(body.role))
    )
      return fail("Choose a valid action and role.");
    const db = adminClient();
    const { error } =
      body.action === "revoke"
        ? await db.from("business_access").delete().eq("email", email)
        : await db
            .from("business_access")
            .upsert(
              {
                email,
                role: body.role,
                granted_by: user.id,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "email" },
            );
    if (error) return fail("Unable to update team access.", 500);
    return NextResponse.json({ saved: true });
  } catch {
    return fail("Unable to update team access.", 400);
  }
}
