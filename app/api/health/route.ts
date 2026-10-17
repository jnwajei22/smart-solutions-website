import { NextResponse } from "next/server";
/** Application liveness only; no database or payment data is exposed. */
export function GET() {
  return NextResponse.json(
    { status: "ok", service: "dfw-web" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
