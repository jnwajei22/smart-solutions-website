import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const modules = new Map<string, unknown>();
Object.assign(globalThis, { __dfwWorkflows: modules });
let sequence = 0;
async function load(path: string, dependencies: Record<string, unknown>) {
  let source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  source = source.replace('import "server-only";', "");
  for (const [name, values] of Object.entries(dependencies)) {
    const key = String(sequence++);
    modules.set(key, values);
    const code = Object.keys(values as object)
      .map((k) =>
        k === "default"
          ? `export default globalThis.__dfwWorkflows.get('${key}').default;`
          : `export const ${k}=globalThis.__dfwWorkflows.get('${key}').${k};`,
      )
      .join("\n");
    source = source.replaceAll(
      JSON.stringify(name),
      JSON.stringify(
        "data:text/javascript;base64," + Buffer.from(code).toString("base64"),
      ),
    );
  }
  return import(
    "data:text/javascript;base64," +
      Buffer.from(
        ts.transpileModule(source, {
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
          },
        }).outputText,
      ).toString("base64")
  );
}
test("cancellation closes sessions but preserves ambiguous/payment outcomes", async () => {
  const original = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = "test-only";
  const calls: string[] = [];
  let sessionId: string | null = "cs_test";
  let status = "open";
  let paid = false;
  let refuseFinish = false;
  const db = {
    from: () => ({
      select() {
        return this;
      },
      eq() {
        return this;
      },
      update() {
        calls.push("retire");
        return this;
      },
      then(resolve: (x: unknown) => unknown) {
        return Promise.resolve({
          data: [{ id: "attempt", session_id: sessionId }],
          error: null,
        }).then(resolve);
      },
    }),
    rpc: async (method: string) => {
      calls.push(method);
      return {
        error:
          method === "finish_invoice_cancellation" && refuseFinish ? {} : null,
      };
    },
  };
  class Stripe {
    checkout = {
      sessions: {
        retrieve: async () => ({
          id: "cs_test",
          status,
          payment_status: paid ? "paid" : "unpaid",
          payment_intent: "pi_test",
          currency: "usd",
          amount_total: 100,
        }),
        expire: async () => {
          calls.push("expire");
          return { id: "cs_test", status: "expired" };
        },
      },
    };
  }
  const { cancelInvoice } = await load("lib/cancellation.ts", {
    stripe: { default: Stripe },
    "./supabase": { adminClient: () => db },
  });
  try {
    await cancelInvoice("invoice", "admin", "Correction", true);
    assert.deepEqual(calls, [
      "begin_invoice_cancellation",
      "expire",
      "retire",
      "finish_invoice_cancellation",
    ]);
    calls.length = 0;
    sessionId = null;
    await assert.rejects(
      cancelInvoice("invoice", "admin", "Correction", false),
      /uncertain/,
    );
    assert.deepEqual(calls, ["begin_invoice_cancellation"]);
    calls.length = 0;
    sessionId = "cs_test";
    status = "complete";
    paid = true;
    refuseFinish = true;
    await assert.rejects(
      cancelInvoice("invoice", "admin", "Correction", false),
      /Refund/,
    );
    assert.deepEqual(calls, [
      "begin_invoice_cancellation",
      "record_payment",
      "finish_invoice_cancellation",
    ]);
    calls.length = 0;
    paid = false;
    await assert.rejects(
      cancelInvoice("invoice", "admin", "Correction", false),
      /unresolved/,
    );
    assert.deepEqual(calls, ["begin_invoice_cancellation"]);
  } finally {
    if (original === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = original;
  }
});
test("notification worker requires activation, resolves verified account email and retries failed SMTP", async () => {
  const keys = [
    "NOTIFICATIONS_ENABLED",
    "NOTIFICATION_SITE_URL",
    "EMAIL_FROM",
    "NOTIFY_EMAIL",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASSWORD",
  ];
  const original = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  let claims = 0;
  let mailFailure = false;
  const sent: Array<Record<string, unknown>> = [];
  const updates: Array<Record<string, unknown>> = [];
  const db = {
    rpc: async () => {
      claims++;
      return {
        data: [
          {
            id: "outbox-id",
            kind: "quote_ready",
            audience: "customer",
            customer_id: "customer",
            attempts: 1,
            claim_token: "lease",
          },
        ],
        error: null,
      };
    },
    auth: {
      admin: {
        getUserById: async () => ({
          data: {
            user: {
              email: "verified@example.invalid",
              email_confirmed_at: "yes",
            },
          },
          error: null,
        }),
      },
    },
    from: () => ({
      update(data: Record<string, unknown>) {
        updates.push(data);
        return this;
      },
      eq() {
        return this;
      },
      then(resolve: (x: unknown) => unknown) {
        return Promise.resolve({ error: null }).then(resolve);
      },
    }),
  };
  const mailer = {
    createTransport: () => ({
      sendMail: async (message: Record<string, unknown>) => {
        sent.push(message);
        if (mailFailure) throw Error("SECRET SMTP ERROR");
        return { accepted: ["verified@example.invalid"] };
      },
    }),
  };
  const { deliverNotifications } = await load("lib/notifications.ts", {
    "next/server": { after: () => {} },
    nodemailer: { default: mailer },
    "./supabase": { adminClient: () => db },
    "./notification-content": await import("../lib/notification-content.ts"),
  });
  try {
    process.env.NOTIFICATIONS_ENABLED = "false";
    assert.equal((await deliverNotifications()).configured, false);
    assert.equal(claims, 0);
    Object.assign(process.env, {
      NOTIFICATIONS_ENABLED: "true",
      NOTIFICATION_SITE_URL: "https://example.invalid",
      EMAIL_FROM: "sender@example.invalid",
      NOTIFY_EMAIL: "owner@example.invalid",
      SMTP_HOST: "smtp.example.invalid",
      SMTP_PORT: "587",
      SMTP_USER: "test",
      SMTP_PASSWORD: "test",
    });
    assert.equal((await deliverNotifications()).sent, 1);
    assert.equal(sent[0].to, "verified@example.invalid");
    assert.equal(updates[0].status, "sent");
    assert.equal(sent[0].messageId, "<outbox-id@example.invalid>");
    mailFailure = true;
    assert.equal((await deliverNotifications()).failed, 1);
    assert.equal(updates[1].status, "pending");
    assert.ok(!JSON.stringify(updates).includes("SECRET"));
    assert.ok(Date.parse(updates[1].next_attempt_at as string) > Date.now());
  } finally {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});
test("notification worker endpoint rejects public callers and unprivileged clients", async () => {
  const original = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "local-test-cron";
  let runs = 0;
  let admin = false;
  const { GET, POST } = await load("app/api/notifications/route.ts", {
    "next/server": {
      NextResponse: {
        json: (data: unknown, init?: ResponseInit) => Response.json(data, init),
      },
    },
    "../../../lib/supabase": {
      currentUser: async () => ({ id: "customer" }),
      isAdmin: async () => admin,
      configured: () => true,
    },
    "../../../lib/http": {
      sameOrigin: () => true,
      fail: (error: string, status = 400) =>
        Response.json({ error }, { status }),
    },
    "../../../lib/notifications": {
      deliverNotifications: async () => {
        runs++;
        return { configured: true, sent: 0, failed: 0 };
      },
    },
  });
  try {
    assert.equal(
      (await GET(new Request("https://example.invalid/api/notifications")))
        .status,
      401,
    );
    assert.equal(
      (
        await GET(
          new Request("https://example.invalid/api/notifications", {
            headers: { authorization: "Bearer wrong" },
          }),
        )
      ).status,
      401,
    );
    assert.equal(
      (
        await POST(
          new Request("https://example.invalid/api/notifications", {
            method: "POST",
          }),
        )
      ).status,
      403,
    );
    assert.equal(runs, 0);
    assert.equal(
      (
        await GET(
          new Request("https://example.invalid/api/notifications", {
            headers: { authorization: "Bearer local-test-cron" },
          }),
        )
      ).status,
      200,
    );
    admin = true;
    assert.equal(
      (
        await POST(
          new Request("https://example.invalid/api/notifications", {
            method: "POST",
          }),
        )
      ).status,
      200,
    );
    assert.equal(runs, 2);
  } finally {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  }
});
