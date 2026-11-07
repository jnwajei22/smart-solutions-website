import assert from "node:assert/strict";
import { test } from "node:test";
import { loginDestination } from "../lib/auth-navigation.ts";
test("sign-in returns to approved local client and staff destinations only", () => {
  for (const path of ["/request", "/account", "/admin", "/portal"])
    assert.equal(loginDestination(path), path);
  for (const path of [
    null,
    "https://example.com",
    "//example.com",
    "/\\example.com",
    "javascript:alert(1)",
    "/admin?next=https://example.com",
  ])
    assert.equal(loginDestination(path), "/portal");
});
