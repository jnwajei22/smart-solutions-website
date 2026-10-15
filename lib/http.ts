import "server-only";
import { NextResponse } from "next/server";
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.NEXT_PUBLIC_SITE_URL;
  return Boolean(expected && origin === new URL(expected).origin);
}
export async function bodyJSON(request: Request) {
  const text = await request.text();
  if (text.length > 20000) throw new Error("Submission is too large.");
  return JSON.parse(text);
}
export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
