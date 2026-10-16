import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import Stripe from "stripe";
import { services } from "../lib/catalog.ts";
import { validPreferredDate } from "../lib/presentation.ts";
import { amountToCharge } from "../lib/billing.ts";
import { trustedRequestOrigin } from "../lib/origin.ts";

// Execute the real route handlers with isolated provider boundaries. No network or secrets.
const registry = new Map<string, Record<string, unknown>>();
Object.assign(globalThis, { __dfwRouteTestModules: registry });
let moduleNumber = 0;
async function route(
  path: string,
  dependencies: Record<string, Record<string, unknown>>,
) {
  let source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  for (const [specifier, exports] of Object.entries(dependencies)) {
    const key = `module-${moduleNumber++}`;
    registry.set(key, exports);
    const code = Object.keys(exports)
      .map((name) =>
        name === "default"
          ? `export default globalThis.__dfwRouteTestModules.get(${JSON.stringify(key)}).default;`
          : `export const ${name} = globalThis.__dfwRouteTestModules.get(${JSON.stringify(key)}).${name};`,
      )
      .join("\n");
    const url = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
    source = source.replaceAll(JSON.stringify(specifier), JSON.stringify(url));
  }
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(
    `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`
  );
}
const origin = "https://branch.example";
const originEnv = { NEXT_PUBLIC_SITE_URL: origin, NODE_ENV: "production" };
const json = (value: unknown, init?: ResponseInit) =>
  Response.json(value, init);
const calls: Array<{ method: string; data: unknown }> = [];
function fixture() {
  const state = {
    user: { id: "customer-1", email: "test@example.invalid" } as {
      id: string;
      email: string;
    } | null,
    invoice: {
      id: "invoice-1",
      customer_id: "customer-1",
      number: "TEST-1",
      title: "Test only",
      total_cents: 10000,
      deposit_cents: 2500,
      paid_cents: 0,
      status: "issued",
      accepted_at: "2026-10-15" as string | null,
    },
    reservation: { id: "attempt-1", session_id: null as string | null },
    session: {
      id: "cs_test_existing",
      status: "open",
      payment_status: "unpaid",
      url: "https://checkout.stripe.com/test",
      payment_intent: "pi_test",
      amount_total: 2500,
    },
    providerFailure: false,
    rpcFailure: false,
  };
  const db = {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      const chain = {
        select() {
          return chain;
        },
        eq(key: string, value: unknown) {
          filters[key] = value;
          return chain;
        },
        is() {
          return chain;
        },
        update(data: unknown) {
          calls.push({ method: `update:${table}`, data });
          return chain;
        },
        async single() {
          return {
            data:
              filters.customer_id === state.invoice.customer_id
                ? state.invoice
                : null,
            error: null,
          };
        },
        then(resolve: (value: unknown) => unknown) {
          return Promise.resolve({ error: null }).then(resolve);
        },
      };
      return chain;
    },
    async rpc(method: string, data: unknown) {
      calls.push({ method, data });
      return {
        data: method === "reserve_checkout" ? [state.reservation] : null,
        error: state.rpcFailure ? new Error("test database error") : null,
      };
    },
  };
  class Provider {
    checkout = {
      sessions: {
        retrieve: async () => state.session,
        create: async (data: unknown, options: unknown) => {
          calls.push({ method: "create_session", data: { data, options } });
          if (state.providerFailure) throw Error("test provider outage");
          return state.session;
        },
      },
    };
  }
  return {
    state,
    db,
    dependencies: {
      stripe: { default: Provider },
      "next/server": { NextResponse: { json } },
      "../../../lib/supabase": {
        adminClient: () => db,
        currentUser: async () => state.user,
        configured: () => true,
      },
      "../../../lib/http": {
        bodyJSON: async (r: Request) => r.json(),
        fail: (error: string, status = 400) => json({ error }, { status }),
        sameOrigin: (r: Request) => trustedRequestOrigin(r, originEnv) !== null,
      },
      "../../../lib/origin": {
        trustedRequestOrigin: (r: Request) =>
          trustedRequestOrigin(r, originEnv),
      },
      "../../../lib/billing": { amountToCharge },
    },
  };
}
function request(
  body: unknown = { invoice_id: "invoice-1", kind: "deposit" },
  from = origin,
) {
  return new Request(`${origin}/api/checkout`, {
    method: "POST",
    headers: { origin: from, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("checkout route: identity, pricing, cancellation and provider recovery", async (t) => {
  const previous = {
    key: process.env.STRIPE_SECRET_KEY,
    hook: process.env.STRIPE_WEBHOOK_SECRET,
  };
  process.env.STRIPE_SECRET_KEY = "sk_test_fake_local_only";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_fake_local_only";
  try {
    async function run(
      change: (f: ReturnType<typeof fixture>) => void,
      body?: unknown,
      from?: string,
    ) {
      calls.length = 0;
      const f = fixture();
      change(f);
      const handler = await route("app/api/checkout/route.ts", f.dependencies);
      return { f, response: await handler.POST(request(body, from)) };
    }
    await t.test(
      "rejects cross-origin requests before reserving a payment",
      async () => {
        const { response } = await run(
          () => {},
          undefined,
          "https://evil.example",
        );
        assert.equal(response.status, 403);
        assert.equal(calls.length, 0);
      },
    );
    await t.test(
      "requires login and rejects another customer's invoice",
      async () => {
        assert.equal(
          (
            await run((f) => {
              f.state.user = null;
            })
          ).response.status,
          401,
        );
        assert.equal(
          (
            await run((f) => {
              f.state.invoice.customer_id = "someone-else";
            })
          ).response.status,
          404,
        );
        assert.equal(calls.length, 0);
      },
    );
    await t.test(
      "unapproved and fully paid invoices cannot start checkout",
      async () => {
        assert.equal(
          (
            await run((f) => {
              f.state.invoice.accepted_at = null;
            })
          ).response.status,
          400,
        );
        assert.equal(
          (
            await run((f) => {
              f.state.invoice.status = "paid";
              f.state.invoice.paid_cents = 10000;
            })
          ).response.status,
          400,
        );
        assert.equal(calls.length, 0);
      },
    );
    await t.test(
      "approval records acceptance without creating a payment",
      async () => {
        const { response } = await run(() => {}, {
          invoice_id: "invoice-1",
          kind: "accept",
        });
        assert.deepEqual(await response.json(), { accepted: true });
        assert.equal(
          calls.some((c) => c.method === "reserve_checkout"),
          false,
        );
      },
    );
    await t.test(
      "ignores client price; checkout uses $25 and validated return URLs",
      async () => {
        const { response } = await run(() => {}, {
          invoice_id: "invoice-1",
          kind: "deposit",
          amount: 1,
        });
        assert.equal(response.status, 200);
        const c = calls.find((c) => c.method === "create_session")!.data as {
          data: Stripe.Checkout.SessionCreateParams;
          options: { idempotencyKey: string };
        };
        assert.equal(c.data.line_items![0].price_data!.unit_amount, 2500);
        assert.equal(c.data.success_url, `${origin}/portal?payment=submitted`);
        assert.equal(c.data.cancel_url, `${origin}/portal?payment=cancelled`);
        assert.equal(c.options.idempotencyKey, "attempt-1");
        assert.equal(
          calls.some((c) => c.method === "record_payment"),
          false,
        );
      },
    );
    await t.test(
      "retry after cancelled checkout reuses the existing open session",
      async () => {
        const { response } = await run((f) => {
          f.state.reservation.session_id = "cs_test_existing";
        });
        assert.equal(response.status, 200);
        assert.equal(
          calls.some(
            (c) =>
              c.method === "create_session" || c.method === "record_payment",
          ),
          false,
        );
      },
    );
    await t.test(
      "expired checkout is retired without crediting an unpaid invoice",
      async () => {
        const { response } = await run((f) => {
          f.state.reservation.session_id = "cs_test_existing";
          f.state.session.status = "expired";
        });
        assert.equal(response.status, 409);
        assert.deepEqual(
          calls.find((c) => c.method === "update:payment_attempts")!.data,
          { completed: true },
        );
        assert.equal(
          calls.some((c) => c.method === "record_payment"),
          false,
        );
      },
    );
    await t.test(
      "paid retry reconciles once instead of creating another checkout",
      async () => {
        const { response } = await run((f) => {
          f.state.reservation.session_id = "cs_test_existing";
          f.state.session.status = "complete";
          f.state.session.payment_status = "paid";
        });
        assert.equal(response.status, 409);
        assert.equal(
          calls.filter((c) => c.method === "record_payment").length,
          1,
        );
        assert.equal(
          calls.some((c) => c.method === "create_session"),
          false,
        );
      },
    );
    await t.test(
      "completed but unpaid checkout never credits the invoice",
      async () => {
        const { response } = await run((f) => {
          f.state.reservation.session_id = "cs_test_existing";
          f.state.session.status = "complete";
        });
        assert.equal(response.status, 409);
        assert.equal(
          calls.some(
            (c) =>
              c.method === "record_payment" || c.method === "create_session",
          ),
          false,
        );
      },
    );
    await t.test(
      "provider outage preserves reservation and does not credit payment",
      async () => {
        const { response } = await run((f) => {
          f.state.providerFailure = true;
        });
        assert.equal(response.status, 502);
        assert.equal(
          calls.some(
            (c) =>
              c.method.startsWith("update:") || c.method === "record_payment",
          ),
          false,
        );
      },
    );
  } finally {
    if (previous.key === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previous.key;
    if (previous.hook === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previous.hook;
    registry.clear();
  }
});

test("webhook route verifies real Stripe signatures and paid/refund boundaries", async (t) => {
  const previous = {
    key: process.env.STRIPE_SECRET_KEY,
    hook: process.env.STRIPE_WEBHOOK_SECRET,
  };
  const secret = "whsec_fake_local_only";
  process.env.STRIPE_SECRET_KEY = "sk_test_fake_local_only";
  process.env.STRIPE_WEBHOOK_SECRET = secret;
  const f = fixture();
  const handler = await route("app/api/stripe/webhook/route.ts", {
    stripe: { default: Stripe },
    "next/server": { NextResponse: { json } },
    "../../../../lib/supabase": {
      configured: () => true,
      adminClient: () => f.db,
    },
  });
  async function send(type: string, object: unknown, valid = true) {
    calls.length = 0;
    const payload = JSON.stringify({
      id: "evt_test_local",
      type,
      data: { object },
    });
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: valid ? secret : "whsec_wrong",
    });
    return handler.POST(
      new Request(`${origin}/api/stripe/webhook`, {
        method: "POST",
        headers: { "stripe-signature": signature },
        body: payload,
      }),
    );
  }
  const paid = {
    currency: "usd",
    payment_status: "paid",
    id: "cs_test",
    payment_intent: "pi_test",
    amount_total: 2500,
    metadata: { attempt_id: "attempt-1" },
  };
  try {
    await t.test("invalid signatures cannot reach the database", async () => {
      assert.equal(
        (await send("checkout.session.completed", paid, false)).status,
        400,
      );
      assert.equal(calls.length, 0);
    });
    await t.test("signed unpaid event cannot credit an invoice", async () => {
      assert.equal(
        (
          await send("checkout.session.completed", {
            ...paid,
            payment_status: "unpaid",
          })
        ).status,
        200,
      );
      assert.equal(calls.length, 0);
    });
    await t.test(
      "signed paid and delayed-success events reconcile the exact amount",
      async () => {
        for (const type of [
          "checkout.session.completed",
          "checkout.session.async_payment_succeeded",
        ]) {
          assert.equal((await send(type, paid)).status, 200);
          assert.deepEqual(calls[0], {
            method: "record_payment",
            data: {
              p_event: "evt_test_local",
              p_attempt: "attempt-1",
              p_session: "cs_test",
              p_intent: "pi_test",
              p_amount: 2500,
            },
          });
        }
      },
    );
    await t.test(
      "wrong currency or missing metadata fails for provider retry",
      async () => {
        assert.equal(
          (
            await send("checkout.session.completed", {
              ...paid,
              currency: "eur",
            })
          ).status,
          500,
        );
        assert.equal(calls.length, 0);
        assert.equal(
          (await send("checkout.session.completed", { ...paid, metadata: {} }))
            .status,
          500,
        );
        assert.equal(calls.length, 0);
      },
    );
    await t.test(
      "refund events pass the cumulative refund to the ledger",
      async () => {
        assert.equal(
          (
            await send("charge.refunded", {
              payment_intent: "pi_test",
              amount_refunded: 1000,
            })
          ).status,
          200,
        );
        assert.deepEqual(calls[0], {
          method: "record_refund",
          data: {
            p_event: "evt_test_local",
            p_intent: "pi_test",
            p_refunded: 1000,
          },
        });
      },
    );
    await t.test(
      "database failure returns 500 so Stripe can retry",
      async () => {
        f.state.rpcFailure = true;
        assert.equal(
          (await send("checkout.session.completed", paid)).status,
          500,
        );
      },
    );
  } finally {
    if (previous.key === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previous.key;
    if (previous.hook === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previous.hook;
    registry.clear();
  }
});

test("request route requires a real preferred date before saving", async (t) => {
  const f = fixture();
  let inserts = 0;
  const handler = await route("app/api/requests/route.ts", {
    "next/server": { NextResponse: { json } },
    "../../../lib/http": f.dependencies["../../../lib/http"],
    "../../../lib/catalog": { services },
    "../../../lib/presentation": { validPreferredDate },
    "../../../lib/supabase": {
      configured: () => true,
      currentUser: async () => ({
        id: "customer-1",
        email: "test@example.invalid",
        email_confirmed_at: "2026-10-15",
      }),
      adminClient: () => ({
        rpc: async () => ({ data: true, error: null }),
        from: () => ({
          insert: () => {
            inserts++;
            return {
              select: () => ({
                single: async () => ({
                  data: { id: "request-1" },
                  error: null,
                }),
              }),
            };
          },
        }),
      }),
    },
  });
  const body = {
    name: "A Customer",
    phone: "1234567890",
    address: "1 Example Street",
    city: "Dallas",
    details: "Test network installation request",
    service: "wifi",
    property_type: "Residential",
    preferred_date: "",
  };
  await t.test(
    "missing and impossible dates return a customer-facing error",
    async () => {
      for (const date of ["", "2026-02-30"]) {
        const response = await handler.POST(
          request({ ...body, preferred_date: date }),
        );
        assert.equal(response.status, 400);
        assert.match((await response.json()).error, /Preferred Date/);
      }
      assert.equal(inserts, 0);
    },
  );
  await t.test("valid date permits the request to be saved", async () => {
    const response = await handler.POST(
      request({ ...body, preferred_date: "2026-10-20" }),
    );
    assert.equal(response.status, 201);
    assert.equal(inserts, 1);
  });
  registry.clear();
});
