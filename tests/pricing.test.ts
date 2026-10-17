import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateQuote,
  createPricingPlan,
  defaultPriceBook,
  validatePriceBook,
} from "../lib/pricing.ts";
const plan = () => ({
  ...createPricingPlan(),
  dispatchLabel: "Cedar Hill",
  equipmentDetails: "Existing router reviewed",
  taxReviewed: true,
});
test("labor-only quote has deterministic cost, reserves and no equipment charge", () => {
  const p = { ...plan(), roundTripMinutes: 60, oneWayMinutes: 30, miles: 30 };
  const quote = calculateQuote(p);
  assert.equal(quote.totalCents, 21900);
  assert.equal(quote.items.length, 1);
  // 2.5 person-hours + vehicle + overhead + 3% processing + 5% callback.
  assert.equal(
    quote.estimatedCostCents,
    8750 + 2250 + 2000 + 1750 + 657 + 1095,
  );
  assert.equal(quote.contributionCents, 5398);
  assert.equal(quote.requiresOverride, false);
});
test("travel-zone boundaries, minima after discount and two-person travel cost", () => {
  const p = { ...plan(), oneWayMinutes: 31, roundTripMinutes: 62 };
  const quote = calculateQuote(p);
  assert.equal(quote.totalCents, 26800);
  assert.equal(quote.items.at(-1)?.kind, "travel");
  assert(quote.warnings.some((w) => w.includes("minimum")));
  assert.equal(
    calculateQuote({ ...p, oneWayMinutes: 61, roundTripMinutes: 122 })
      .totalCents,
    31800,
  );
  const two = calculateQuote({
    ...plan(),
    packageId: "tv",
    crew: 2,
    onsiteMinutes: 60,
    oneWayMinutes: 30,
    roundTripMinutes: 60,
  });
  assert.equal(two.estimatedCostCents, 14000 + 2000 + 1750 + 897 + 1495);
});
test("materials require company involvement and expose selling price only", () => {
  const material = {
    description: "Cable",
    quantity: 2,
    costCents: 1000,
    sellCents: 1800,
  };
  assert.throws(
    () => calculateQuote({ ...plan(), materials: [material] }),
    /mixed or business/,
  );
  const quote = calculateQuote({
    ...plan(),
    equipmentSupply: "mixed",
    materials: [material],
  });
  assert.equal(quote.totalCents, 25500);
  assert.deepEqual(quote.items[1], {
    description: "Cable",
    quantity: 2,
    unit_cents: 1800,
    kind: "material",
  });
  assert(!JSON.stringify(quote.items).includes("costCents"));
});
test("discount is explicit and tax does not inflate contribution", () => {
  const quote = calculateQuote({
    ...plan(),
    discountCents: 2000,
    discountReason: "Launch offer",
    taxCents: 1000,
  });
  assert.equal(quote.totalCents, 20900);
  assert.equal(quote.items[1].unit_cents, -2000);
  assert.equal(quote.items[1].kind, "discount");
  assert.equal(quote.contributionCents, 19900 - quote.estimatedCostCents);
  assert.throws(
    () => calculateQuote({ ...plan(), discountCents: 2000 }),
    /Explain/,
  );
});
test("extra labor is based on person-minutes above package allowance", () => {
  const quote = calculateQuote({ ...plan(), crew: 2, onsiteMinutes: 90 });
  assert.equal(quote.items[1].unit_cents, 12750);
  assert.equal(quote.totalCents, 34650);
});
test("manual distant review and margin floor demand a documented override", () => {
  assert.throws(
    () =>
      calculateQuote({ ...plan(), oneWayMinutes: 91, roundTripMinutes: 182 }),
    /custom travel/,
  );
  const quote = calculateQuote({
    ...plan(),
    oneWayMinutes: 91,
    roundTripMinutes: 182,
    manualTravelReviewed: true,
    customTravelCents: 10000,
  });
  assert.equal(quote.requiresOverride, true);
  assert(quote.warnings.some((w) => w.includes("manual")));
  assert(
    calculateQuote({
      ...plan(),
      discountCents: 15000,
      discountReason: "Large promotion",
    }).warnings.some((w) => w.includes("margin")),
  );
});
test("stale versions, missing tax review, nonfinite and out-of-range data are rejected", () => {
  assert.throws(
    () => calculateQuote({ ...plan(), priceBookVersion: "old" }),
    /Pricing changed/,
  );
  assert.throws(() => calculateQuote({ ...plan(), taxReviewed: false }), /tax/);
  assert.throws(() => calculateQuote({ ...plan(), miles: NaN }), /miles/);
  assert.throws(() => calculateQuote({ ...plan(), crew: 11 }), /crew/);
  assert.throws(
    () =>
      calculateQuote({ ...plan(), oneWayMinutes: 40, roundTripMinutes: 20 }),
    /both directions/,
  );
  assert.throws(
    () =>
      validatePriceBook({
        ...defaultPriceBook,
        packages: [...defaultPriceBook.packages, defaultPriceBook.packages[0]],
      }),
    /unique/,
  );
});

test("admin time is counted once, dispatch origin stays private and missing equipment costs warn", () => {
  const quote = calculateQuote({
    ...plan(),
    equipmentSupply: "business",
    oneWayMinutes: 31,
    roundTripMinutes: 62,
    dispatchLabel: "PRIVATE ORIGIN",
  });
  assert(quote.warnings.some((w) => w.includes("no itemized materials")));
  assert(!quote.scopeTerms.includes("PRIVATE ORIGIN"));
  assert(!JSON.stringify(quote.items).includes("PRIVATE ORIGIN"));
  const noAdmin = calculateQuote(
    { ...plan(), crew: 2 },
    { ...defaultPriceBook, adminMinutes: 0 },
  );
  const admin = calculateQuote({ ...plan(), crew: 2 });
  assert.equal(admin.estimatedCostCents - noAdmin.estimatedCostCents, 1750);
});

test("customer equipment compatibility needs explicit review and zero-mile travel warns", () => {
  for (const equipmentSupply of ["customer", "mixed"] as const) {
    assert.throws(
      () =>
        calculateQuote({ ...plan(), equipmentSupply, equipmentDetails: "  " }),
      /Review customer-owned equipment/,
    );
  }
  const quote = calculateQuote({
    ...plan(),
    roundTripMinutes: 40,
    oneWayMinutes: 20,
    miles: 0,
  });
  assert(quote.warnings.some((w) => w.includes("mileage is zero")));
  assert.equal(quote.requiresOverride, true);
  assert(
    !calculateQuote({
      ...plan(),
      roundTripMinutes: 40,
      oneWayMinutes: 20,
      miles: 12,
    }).warnings.some((w) => w.includes("mileage is zero")),
  );
});
