import assert from "node:assert/strict";
import { test } from "node:test";
import { demoData } from "../lib/demo.ts";
import {
  nextProjectAction,
  invoiceState,
  unreadClientCount,
} from "../lib/workspace.ts";
const job = demoData.jobs[0];
const invoice = demoData.invoices[0];
test("paused collection outranks approval and scheduling actions", () => {
  const data = {
    messages: [],
    invoices: [
      {
        ...invoice,
        collection_paused_at: "2026-10-17T00:00:00Z",
        accepted_at: null,
      },
    ],
  };
  const next = nextProjectAction({ ...job, status: "quoted" }, data);
  assert.equal(next.title, "Cancellation Needs Review");
  assert.equal(next.section, "quote");
  assert.equal(invoiceState(data.invoices[0]), "Cancellation Requested");
});
test("closed projects route to their history rather than quote preparation", () => {
  assert.equal(
    nextProjectAction(
      { ...job, status: "cancelled" },
      { messages: [], invoices: [] },
    ).action,
    "Review Project",
  );
  assert.equal(
    nextProjectAction(
      { ...job, status: "completed" },
      { messages: [], invoices: [] },
    ).section,
    "activity",
  );
  assert.equal(
    invoiceState({
      ...invoice,
      status: "void",
      collection_paused_at: "2026-10-17T00:00:00Z",
    }),
    "Cancelled",
  );
});
test("approval and deposit determine the operational next step", () => {
  assert.equal(
    nextProjectAction(
      { ...job, status: "quoted" },
      { messages: [], invoices: [{ ...invoice, accepted_at: null }] },
    ).title,
    "Awaiting Client Approval",
  );
  assert.equal(
    nextProjectAction(
      { ...job, status: "quoted" },
      {
        messages: [],
        invoices: [
          {
            ...invoice,
            accepted_at: "2026-10-16T12:00:00Z",
            paid_cents: invoice.deposit_cents,
          },
        ],
      },
    ).title,
    "Ready to Schedule",
  );
  assert.equal(
    invoiceState({
      ...invoice,
      accepted_at: "2026-10-16T12:00:00Z",
      paid_cents: 0,
    }),
    "Deposit Due",
  );
});
test("unread client messages honor read time and server-recorded sender context", () => {
  const messages = [
    {
      id: "one",
      request_id: job.id,
      author_id: job.customer_id,
      body: "Client question",
      created_at: "2026-10-16T10:00:00Z",
      sender_type: "client" as const,
    },
    {
      id: "two",
      request_id: job.id,
      author_id: job.customer_id,
      body: "Team reply",
      created_at: "2026-10-16T11:00:00Z",
      sender_type: "business" as const,
    },
  ];
  assert.equal(unreadClientCount(messages, job.customer_id), 1);
  assert.equal(
    unreadClientCount(messages, job.customer_id, "2026-10-16T10:00:00Z"),
    0,
  );
  assert.equal(
    nextProjectAction(job, { messages, invoices: demoData.invoices }).title,
    "Prepare for the Visit",
  );
  assert.equal(
    nextProjectAction(job, {
      messages: messages.slice(0, 1),
      invoices: demoData.invoices,
    }).section,
    "conversation",
  );
});
