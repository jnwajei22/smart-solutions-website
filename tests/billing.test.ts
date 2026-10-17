import assert from "node:assert/strict";
import { test } from "node:test";
import { date } from "../lib/catalog.ts";
import { calculateTotal, amountToCharge } from "../lib/billing.ts";
test("itemized labor and material totals remain in integer cents", () => {
  assert.equal(
    calculateTotal([
      { description: "Labor", quantity: 2, unit_cents: 12500 },
      { description: "Materials", quantity: 1, unit_cents: 1999 },
    ]),
    26999,
  );
});
test("rejects client-controlled invalid pricing and quantities", () => {
  for (const item of [
    { description: "Item", quantity: -1, unit_cents: 20000 },
    { description: "Item", quantity: 1.5, unit_cents: 100 },
    { description: "Item", quantity: 1, unit_cents: NaN },
    { description: "Item", quantity: 1, unit_cents: 0 },
    { description: "Item", quantity: 10000, unit_cents: 10000000 },
  ])
    assert.throws(() => calculateTotal([item]));
  assert.throws(() => calculateTotal([]));
});
test("deposit is credited to balance rather than added to total", () => {
  const invoice = { total_cents: 55000, deposit_cents: 20000, paid_cents: 0 };
  assert.equal(amountToCharge(invoice, "deposit"), 20000);
  assert.equal(
    amountToCharge({ ...invoice, paid_cents: 20000 }, "balance"),
    35000,
  );
  assert.throws(() =>
    amountToCharge({ ...invoice, paid_cents: 20000 }, "deposit"),
  );
});
test("partial deposit and full payment boundaries", () => {
  assert.equal(
    amountToCharge(
      { total_cents: 55000, deposit_cents: 20000, paid_cents: 5000 },
      "deposit",
    ),
    15000,
  );
  assert.throws(() =>
    amountToCharge(
      { total_cents: 55000, deposit_cents: 20000, paid_cents: 55000 },
      "balance",
    ),
  );
  assert.throws(() =>
    amountToCharge(
      { total_cents: 55000, deposit_cents: 20000, paid_cents: 0 },
      "unknown",
    ),
  );
});

test("date-only due dates are preserved in Central time", () => {
  assert.equal(date("2026-10-24"), "Oct 24, 2026");
});
