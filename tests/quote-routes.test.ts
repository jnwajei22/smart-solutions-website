import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import {
  defaultPriceBook,
  calculateQuote,
  createPricingPlan,
  validatePriceBook,
} from "../lib/pricing.ts";
import { calculateTotal } from "../lib/billing.ts";
import { normalizeQualification } from "../lib/qualification.ts";
import { canManageProjects } from "../lib/access.ts";
import { validPreferredDate } from "../lib/presentation.ts";
const registry = new Map<string, unknown>();
Object.assign(globalThis, { __dfwPricingRouteModules: registry });
let sequence = 0;
async function load(
  path: string,
  deps: Record<string, Record<string, unknown>>,
) {
  let source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  for (const [name, exports] of Object.entries(deps)) {
    const key = String(sequence++);
    registry.set(key, exports);
    const code = Object.keys(exports)
      .map(
        (k) =>
          `export const ${k}=globalThis.__dfwPricingRouteModules.get('${key}').${k};`,
      )
      .join("\n");
    source = source.replaceAll(
      JSON.stringify(name),
      JSON.stringify(
        `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`,
      ),
    );
  }
  return import(
    `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString("base64")}`
  );
}
const response = (error: string, status = 400) =>
  Response.json({ error }, { status });
const request = (body: unknown, method = "POST") =>
  new Request("https://example.invalid/api/pricing", {
    method,
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });

test("quote issue recalculates server-side, enforces exceptions and keeps internal details out of invoices", async () => {
  let role = "manager",
    trusted = true;
  const writes: { method: string; args: Record<string, unknown> }[] = [];
  const handler = await load("app/api/admin/route.ts", {
    "next/server": { NextResponse: { json: Response.json } },
    "../../../lib/supabase": {
      configured: () => true,
      currentUser: async () => ({ id: "actor" }),
      businessRole: async () => role,
      adminClient: () => ({
        from: () => ({
          select() {
            return this;
          },
          eq() {
            return this;
          },
          single: async () => ({
            data: { id: "project", customer_id: "client" },
            error: null,
          }),
        }),
        rpc: async (method: string, args: Record<string, unknown>) => {
          writes.push({ method, args });
          return { data: "invoice", error: null };
        },
      }),
    },
    "../../../lib/http": {
      sameOrigin: () => trusted,
      bodyJSON: (r: Request) => r.json(),
      fail: response,
    },
    "../../../lib/access": { canManageProjects },
    "../../../lib/billing": { calculateTotal },
    "../../../lib/presentation": { validPreferredDate },
    "../../../lib/pricing": { calculateQuote },
    "../../../lib/price-book-server": {
      loadPriceBook: async () => defaultPriceBook,
    },
    "../../../lib/notifications": { scheduleNotifications: () => {} },
    "../../../lib/cancellation": { cancelInvoice: async () => {} },
  });
  const plan = {
    ...createPricingPlan(),
    dispatchLabel: "Cedar Hill",
    equipmentDetails: "Existing router reviewed",
    taxReviewed: true,
  };
  const body = {
    action: "quote",
    request_id: "project",
    title: "Reviewed scope",
    pricing_plan: plan,
    items: calculateQuote(plan).items,
    deposit_cents: 5000,
    due_date: "2026-12-01",
    terms: "Deposit credited to total. Written cancellation terms apply.",
  };
  role = "viewer";
  assert.equal((await handler.POST(request(body))).status, 403);
  role = "manager";
  trusted = false;
  assert.equal((await handler.POST(request(body))).status, 403);
  trusted = true;
  assert.equal(
    (await handler.POST(request({ ...body, pricing_plan: null }))).status,
    400,
  );
  assert.equal(
    (
      await handler.POST(
        request({
          ...body,
          pricing_plan: { ...plan, priceBookVersion: "old" },
        }),
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await handler.POST(
        request({
          ...body,
          items: [{ description: "Forged", quantity: 1, unit_cents: 100 }],
        }),
      )
    ).status,
    409,
  );
  const low = {
    ...plan,
    oneWayMinutes: 61,
    roundTripMinutes: 122,
    overrideReason: "",
  };
  assert.equal(
    (
      await handler.POST(
        request({
          ...body,
          pricing_plan: low,
          items: calculateQuote(low).items,
        }),
      )
    ).status,
    400,
  );
  assert.equal(writes.length, 0);
  const approved = {
    ...low,
    overrideReason: "Intentional route-day exception",
  };
  assert.equal(
    (
      await handler.POST(
        request({
          ...body,
          pricing_plan: approved,
          items: calculateQuote(approved).items,
        }),
      )
    ).status,
    201,
  );
  assert.equal(writes.length, 1);
  assert.equal(writes[0].method, "issue_priced_quote");
  const args = writes[0].args;
  assert(!JSON.stringify(args.p_items).includes("estimatedCost"));
  assert(!String(args.p_terms).includes(approved.overrideReason));
  assert(!String(args.p_terms).includes(approved.dispatchLabel));
  assert(String(args.p_terms).includes("customer supplied"));
  assert.equal(
    (args.p_audit as { plan: { overrideReason: string } }).plan.overrideReason,
    approved.overrideReason,
  );
  assert.equal(args.p_actor, "actor");
});

test("shared pricing API restricts private reads and allows only owner versioned writes", async () => {
  let role = "viewer",
    owner = false,
    trusted = true,
    conflict = false;
  const writes: Record<string, unknown>[] = [];
  let reads = 0;
  const handler = await load("app/api/pricing/route.ts", {
    "next/server": { NextResponse: { json: Response.json } },
    "../../../lib/supabase": {
      configured: () => true,
      currentUser: async () => ({
        id: "actor",
        email_confirmed_at: "verified",
      }),
      businessRole: async () => role,
      isAdmin: async () => owner,
      adminClient: () => ({
        rpc: async (_: string, args: Record<string, unknown>) => {
          writes.push(args);
          return { error: conflict ? {} : null };
        },
      }),
    },
    "../../../lib/http": {
      sameOrigin: () => trusted,
      bodyJSON: (r: Request) => r.json(),
      fail: response,
    },
    "../../../lib/access": { canManageProjects },
    "../../../lib/pricing": { validatePriceBook },
    "../../../lib/price-book-server": {
      loadPriceBook: async () => {
        reads++;
        return defaultPriceBook;
      },
    },
  });
  const get = () =>
    handler.GET(new Request("https://example.invalid/api/pricing"));
  assert.equal((await get()).status, 403);
  assert.equal(reads, 0);
  role = "manager";
  const result = await get();
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("cache-control"), "private, no-store");
  const body = {
    priceBook: defaultPriceBook,
    expectedVersion: defaultPriceBook.version,
  };
  assert.equal((await handler.PATCH(request(body, "PATCH"))).status, 403);
  owner = true;
  trusted = false;
  assert.equal((await handler.PATCH(request(body, "PATCH"))).status, 403);
  trusted = true;
  assert.equal(writes.length, 0);
  const saved = await handler.PATCH(request(body, "PATCH"));
  assert.equal(saved.status, 200);
  const book = (await saved.json()).priceBook;
  assert.notEqual(book.version, defaultPriceBook.version);
  assert.equal(writes[0].p_expected, defaultPriceBook.version);
  conflict = true;
  assert.equal((await handler.PATCH(request(body, "PATCH"))).status, 409);
});

test("RFQ qualification requires owned-equipment detail, validates ZIP and drops unknown fields", () => {
  const base = {
    equipment_supply: "customer",
    equipment_details: "Router model A",
    postal_code: "75104",
    access_notes: "One floor",
    budget_range: "Not Sure Yet",
    schedule_flexible: true,
    lead_source: "Referral",
    referral_details: "A local business",
    internalMargin: 999,
  };
  const result = normalizeQualification(base);
  assert.equal(result.equipment_supply, "customer");
  assert.equal("internalMargin" in result, false);
  assert.throws(
    () => normalizeQualification({ ...base, equipment_details: "" }),
    /equipment/,
  );
  assert.throws(
    () => normalizeQualification({ ...base, postal_code: "7510x" }),
    /ZIP/,
  );
  assert.throws(
    () => normalizeQualification({ ...base, equipment_supply: "unknown" }),
    /supply/,
  );
  assert.throws(
    () => normalizeQualification({ ...base, schedule_flexible: "true" }),
    /flexibility/,
  );
});
