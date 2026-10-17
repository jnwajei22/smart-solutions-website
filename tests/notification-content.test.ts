import { test } from "node:test";
import assert from "node:assert/strict";
import {
  notificationContent,
  emailAddress,
} from "../lib/notification-content.ts";
test("service notification content uses fixed portal links and no private project content", () => {
  const customer = notificationContent(
    "quote_ready",
    "customer",
    "https://example.invalid",
  );
  assert.match(customer.text, /https:\/\/example.invalid\/portal/);
  assert.doesNotMatch(customer.text, /\/admin/);
  assert.match(
    notificationContent("client_message", "business", "https://example.invalid")
      .text,
    /\/admin/,
  );
  assert.throws(() =>
    notificationContent("<injection>", "customer", "https://example.invalid"),
  );
  assert.equal(
    emailAddress("one@example.invalid\r\nBcc: attacker@example.invalid"),
    null,
  );
  assert.equal(emailAddress("one@example.invalid,two@example.invalid"), null);
  assert.equal(
    emailAddress("alerts@example.invalid"),
    "alerts@example.invalid",
  );
});
