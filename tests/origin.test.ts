import assert from "node:assert/strict";
import { test } from "node:test";
import { trustedRequestOrigin } from "../lib/origin.ts";
const env = {
  NODE_ENV: "production",
  VERCEL: "1",
  NEXT_PUBLIC_SITE_URL: "https://site.example",
  VERCEL_URL: "site-new-team.vercel.app",
  VERCEL_BRANCH_URL: "site-git-feature-team.vercel.app",
};
function check(origin?: string, config = env) {
  return trustedRequestOrigin(
    new Request("https://internal.invalid/api/checkout", {
      headers: {
        ...(origin ? { origin } : {}),
        host: "evil.example",
        "x-forwarded-host": "evil.example",
      },
    }),
    config,
  );
}
test("accepts canonical, unique deployment and stable branch origins", () => {
  for (const origin of [
    "https://site.example",
    "https://site-new-team.vercel.app",
    "https://site-git-feature-team.vercel.app",
  ])
    assert.equal(check(origin), origin);
});
test("rejects foreign deployments, forged hosts and malformed origins", () => {
  for (const origin of [
    undefined,
    "null",
    "bad",
    "https://evil.example",
    "https://other.vercel.app",
    "https://site.example.evil.example",
    "http://site.example",
    "https://site.example:444",
    "https://site.example/path",
    "https://user@site.example",
    "https://site.example/",
  ])
    assert.equal(check(origin), null);
});
test("fails closed for invalid config and ignores deployment vars outside Vercel", () => {
  assert.equal(
    check("https://site.example", { ...env, NEXT_PUBLIC_SITE_URL: "bad" }),
    null,
  );
  assert.equal(
    check("https://site-new-team.vercel.app", { ...env, VERCEL: "0" }),
    null,
  );
});
