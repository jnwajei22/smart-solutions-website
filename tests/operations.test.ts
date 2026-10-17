import { test } from "node:test";
import assert from "node:assert/strict";
import { requestAttention, matchesRequest } from "../lib/operations.ts";
import { demoData } from "../lib/demo.ts";
import { logFailure } from "../lib/observability.ts";
test("work queue identifies unquoted requests and the latest unanswered client message", () => {
  const job = { ...demoData.jobs[1], status: "requested" };
  const messages = [
    {
      id: "new",
      request_id: job.id,
      author_id: job.customer_id,
      body: "Client question",
      created_at: "2026-10-16T02:00:00Z",
    },
    {
      id: "old",
      request_id: job.id,
      author_id: "operator",
      body: "Earlier reply",
      created_at: "2026-10-16T01:00:00Z",
    },
  ];
  const a = requestAttention(job, { ...demoData, messages });
  assert.equal(a.needsReview, true);
  assert.equal(a.needsReply, true);
  assert.equal(a.readyToSchedule, false);
  messages.push({
    id: "reply",
    request_id: job.id,
    author_id: "operator",
    body: "Response",
    created_at: "2026-10-16T03:00:00Z",
  });
  assert.equal(
    requestAttention(job, { ...demoData, messages }).needsReply,
    false,
  );
});
test("approval and recorded deposit are required before scheduling attention", () => {
  const job = { ...demoData.jobs[0], status: "quoted" };
  const invoice = { ...demoData.invoices[0] };
  const data = { ...demoData, invoices: [invoice] };
  assert.equal(requestAttention(job, data).readyToSchedule, true);
  invoice.paid_cents = 0;
  assert.equal(requestAttention(job, data).readyToSchedule, false);
  invoice.deposit_cents = 0;
  assert.equal(requestAttention(job, data).readyToSchedule, true);
  invoice.accepted_at = null;
  assert.equal(requestAttention(job, data).awaitingApproval, true);
  assert.equal(requestAttention(job, data).readyToSchedule, false);
  assert.equal(
    requestAttention({ ...job, status: "completed" }, data).awaitingApproval,
    false,
  );
});
test("search matches company/contact/email/city without treating text as code", () => {
  const job = { ...demoData.jobs[0], business_name: "Acme & Sons LLC" };
  for (const query of ["  ACME ", "alex", "SAMPLE@", "dallas", ""])
    assert.equal(matchesRequest(job, query), true);
  assert.equal(matchesRequest(job, "other client"), false);
  assert.equal(matchesRequest(job, "<script>"), false);
});
test("operational failure logs exclude messages, identifiers and secrets", () => {
  const previous = console.error;
  const output: string[] = [];
  console.error = (line: string) => {
    output.push(line);
  };
  try {
    logFailure("request_save_failed", {
      code: "23505",
      message: "private address and secret",
      email: "private@example.invalid",
    });
  } finally {
    console.error = previous;
  }
  assert.deepEqual(JSON.parse(output[0]), {
    event: "request_save_failed",
    code: "23505",
  });
});

test("business replies are not client messages when the operator also owns the request", () => {
  const job = demoData.jobs[0];
  const message = {
    id: "context",
    request_id: job.id,
    author_id: job.customer_id,
    body: "Team reply",
    created_at: "2026-10-17T02:00:00Z",
    sender_type: "business" as const,
  };
  assert.equal(
    requestAttention(job, { ...demoData, messages: [message] }).needsReply,
    false,
  );
  assert.equal(
    requestAttention(job, {
      ...demoData,
      messages: [{ ...message, sender_type: "client" }],
    }).needsReply,
    true,
  );
});
