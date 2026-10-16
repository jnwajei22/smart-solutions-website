import { test } from "node:test";
import assert from "node:assert/strict";
import {
  customerName,
  accountName,
  businessName,
  signupMetadata,
  paymentActivity,
  statusLabel,
  validPreferredDate,
} from "../lib/presentation.ts";
test("greetings prefer signup name, retain personal spelling, and support existing request names", () => {
  assert.equal(
    customerName("  Justin   Nwajei ", "Other Person"),
    "Justin Nwajei",
  );
  assert.equal(customerName(undefined, "Justin Nwajei"), "Justin Nwajei");
  assert.equal(customerName("Élodie de la Cruz"), "Élodie de la Cruz");
  assert.equal(customerName({ role: "admin" }, "A Customer"), "A Customer");
  assert.equal(customerName(" ", null), "Client");
});
test("client and business statuses have readable capitalization without changing stored values", () => {
  assert.equal(statusLabel("in_progress"), "In Progress");
  assert.equal(statusLabel("requested"), "Requested");
  assert.equal(statusLabel("paid"), "Paid");
});
test("preferred date is required and must be a real calendar date", () => {
  for (const value of [
    undefined,
    null,
    "",
    123,
    "2026-02-30",
    "2026-13-01",
    "2026-1-01",
    "2026-10-16T00:00:00Z",
  ])
    assert.equal(validPreferredDate(value), false);
  for (const value of ["2028-02-29", "2026-10-20"])
    assert.equal(validPreferredDate(value), true);
});

test("refunded activity is identified as a refund instead of a zero-dollar payment received", () => {
  assert.deepEqual(paymentActivity(7500, 7500), {
    label: "Payment Refunded",
    cents: -7500,
  });
  assert.deepEqual(paymentActivity(2500, 1000), {
    label: "Payment Partially Refunded",
    cents: 1500,
  });
  assert.deepEqual(paymentActivity(2500, 0), {
    label: "Payment Received",
    cents: 2500,
  });
});

test("business signup preserves separate company and contact names", () => {
  const data = signupMetadata(
    "business",
    "  Justin   Nwajei  ",
    "  DFW   Test & Co.  ",
  );
  assert.deepEqual(data, {
    account_type: "business",
    full_name: "Justin Nwajei",
    business_name: "DFW Test & Co.",
  });
  assert.equal(accountName(data), "DFW Test & Co.");
  assert.equal(
    accountName({ full_name: "Existing Client" }),
    "Existing Client",
  );
  assert.equal(
    accountName({
      account_type: "business",
      business_name: {},
      full_name: "Contact Name",
    }),
    "Contact Name",
  );
});
test("personal signup clears stale company input and business metadata grants no role", () => {
  const data = signupMetadata(
    "personal",
    "Élodie de la Cruz",
    "Previous Company",
  );
  assert.equal(data.business_name, null);
  assert.equal(accountName(data), "Élodie de la Cruz");
  assert.equal(
    businessName({
      account_type: "personal",
      business_name: "Ignored Company",
    }),
    null,
  );
  assert.equal(
    businessName({ account_type: "business", business_name: "x".repeat(161) }),
    null,
  );
  assert.equal("role" in data, false);
});
test("signup rejects blank and overlong names and unknown account types", () => {
  for (const name of [" ", "x", "x".repeat(101)])
    assert.throws(() => signupMetadata("personal", name, ""), /full name/);
  for (const company of [" ", "x", "x".repeat(161)])
    assert.throws(
      () => signupMetadata("business", "Contact Name", company),
      /business name/,
    );
  assert.throws(
    () => signupMetadata("admin" as never, "Contact Name", "Company"),
    /Personal or Business/,
  );
});
