import { test } from "node:test";
import assert from "node:assert/strict";
import {
  customerName,
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
