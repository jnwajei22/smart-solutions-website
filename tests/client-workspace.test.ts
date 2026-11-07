import assert from "node:assert/strict";
import { test } from "node:test";
import { clientNextStep } from "../lib/client-workspace.ts";
import { demoData } from "../lib/demo.ts";

test("a cancellation review never invites a client to make another payment", () => {
  const next = clientNextStep({
    ...demoData,
    invoices: [
      {
        ...demoData.invoices[0],
        collection_paused_at: "2026-11-07T00:00:00Z",
        accepted_at: null,
      },
    ],
  });
  assert.equal(next.action, "View the review");
  assert.equal(next.projectId, demoData.jobs[0].id);
});
test("a scheduled, deposit-paid project opens the visit rather than asking for another deposit", () => {
  const next = clientNextStep(demoData);
  assert.equal(next.title, "Your project is scheduled.");
  assert.equal(next.tab, "services");
});
test("approval precedes payment and targets the correct project", () => {
  const next = clientNextStep({
    ...demoData,
    invoices: [{ ...demoData.invoices[0], accepted_at: null, paid_cents: 0 }],
  });
  assert.equal(next.action, "Review your quote");
  assert.equal(next.tab, "invoices");
});
test("draft and cancelled invoices cannot produce payment prompts", () => {
  for (const status of ["draft", "void"]) {
    const next = clientNextStep({
      jobs: [],
      invoices: [
        { ...demoData.invoices[0], status, paid_cents: 0, accepted_at: null },
      ],
    });
    assert.equal(next.tab, "request");
  }
});
