import "server-only";
import { NextResponse } from "next/server";
import { trustedRequestOrigin } from "./origin";
export function sameOrigin(request: Request) {
  return trustedRequestOrigin(request) !== null;
}
export async function bodyJSON(request: Request) {
  const text = await request.text();
  if (text.length > 20000) throw new Error("Submission is too large.");
  return JSON.parse(text);
}
export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
