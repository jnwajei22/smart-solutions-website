import test from "node:test";
import assert from "node:assert/strict";
import { inquiryOnly, launchRoute } from "../lib/launch.ts";
test("production defaults to inquiry-only and previews retain the platform", () => {
  const before = {
    v: process.env.VERCEL_ENV,
    flag: process.env.PUBLIC_INQUIRY_ONLY,
  };
  try {
    delete process.env.PUBLIC_INQUIRY_ONLY;
    process.env.VERCEL_ENV = "production";
    assert.equal(inquiryOnly(), true);
    process.env.VERCEL_ENV = "preview";
    assert.equal(inquiryOnly(), false);
    process.env.PUBLIC_INQUIRY_ONLY = "true";
    assert.equal(inquiryOnly(), true);
    process.env.PUBLIC_INQUIRY_ONLY = "false";
    process.env.VERCEL_ENV = "production";
    assert.equal(inquiryOnly(), false);
  } finally {
    if (before.v === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = before.v;
    if (before.flag === undefined) delete process.env.PUBLIC_INQUIRY_ONLY;
    else process.env.PUBLIC_INQUIRY_ONLY = before.flag;
  }
});
test("launch blocks account and payment endpoints including direct and nested links", () => {
  for (const path of [
    "/login",
    "/portal",
    "/admin/team",
    "/account",
    "/reset-password",
    "/invoices/example",
    "/auth/callback",
    "/preview/admin",
  ])
    assert.equal(launchRoute(path), "page");
  for (const path of [
    "/api/checkout",
    "/api/requests",
    "/api/admin",
    "/api/stripe/webhook",
  ])
    assert.equal(launchRoute(path), "api");
  for (const path of [
    "/",
    "/request",
    "/privacy",
    "/help",
    "/terms",
    "/api/health",
  ])
    assert.equal(launchRoute(path), null);
});
