import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const customer = "00000000-0000-0000-0000-000000000011";
const admin = "00000000-0000-0000-0000-000000000012";
const manager = "00000000-0000-0000-0000-000000000013";
const terms =
  "Deposit is credited toward the total. Additional work requires approval.";
const items = [
  {
    description: "Installation labor",
    quantity: 1,
    unit_cents: 21900,
    kind: "labor",
  },
  {
    description: "Launch discount",
    quantity: 1,
    unit_cents: -1900,
    kind: "discount",
  },
];

test("private pricing, atomic quote issuance and price-book concurrency", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
      create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz default now());
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      grant execute on function auth.uid() to authenticated,service_role;`);
    await db.exec(
      await readFile(
        new URL("../supabase/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.query(
      "insert into auth.users(id,email) values($1,'customer@example.invalid'),($2,'owner@example.invalid'),($3,'manager@example.invalid')",
      [customer, admin, manager],
    );
    await db.query("update public.profiles set role='admin' where id=$1", [
      admin,
    ]);
    await db.query(
      "insert into public.business_access(email,role,granted_by) values('manager@example.invalid','manager',$1)",
      [admin],
    );
    const ids = (
      await db.query<{ id: string }>(
        `insert into public.requests(customer_id,name,email,phone,service,property_type,address,city,details)
      select $1,'Pricing Test','customer@example.invalid','1234567890','wifi','Residential','Synthetic Address','Dallas','Synthetic pricing test ' || n
      from generate_series(1,10) n returning id`,
        [customer],
      )
    ).rows.map((r) => r.id);
    let version = (
      await db.query<{ version: string }>(
        "select book->>'version' as version from public.price_books",
      )
    ).rows[0].version;
    const issue = (
      requestId: string,
      options: {
        itemList?: unknown;
        total?: number;
        expected?: string;
        actor?: string;
        audit?: unknown;
      } = {},
    ) =>
      db.query<{ id: string }>(
        "select public.issue_priced_quote($1,'Reviewed Installation',$2::jsonb,$3,5000,'2026-11-15',$4,$5,$6,$7::jsonb) as id",
        [
          requestId,
          JSON.stringify(options.itemList ?? items),
          options.total ?? 20000,
          terms,
          options.expected ?? version,
          options.actor ?? admin,
          JSON.stringify(
            options.audit ?? {
              estimatedCostCents: 14000,
              overrideReason: "Reviewed launch offer",
            },
          ),
        ],
      );
    const counts = async () =>
      (
        await db.query<{ invoices: number; audits: number }>(
          "select (select count(*)::int from public.invoices) invoices,(select count(*)::int from public.quote_pricing_audits) audits",
        )
      ).rows[0];
    await t.test(
      "anonymous and authenticated users, including business staff, cannot read or mutate private pricing",
      async () => {
        for (const identity of [null, customer, admin, manager]) {
          await db.exec(
            identity
              ? `set role authenticated;select set_config('request.jwt.claim.sub','${identity}',false)`
              : "set role anon",
          );
          for (const table of ["price_books", "quote_pricing_audits"]) {
            await assert.rejects(
              db.exec(`select * from public.${table}`),
              /permission denied/,
            );
            await assert.rejects(
              db.exec(`delete from public.${table}`),
              /permission denied/,
            );
          }
          await assert.rejects(issue(ids[0]), /permission denied/);
          await assert.rejects(
            db.query("select public.save_price_book($1,$2::jsonb,$3)", [
              version,
              JSON.stringify({ version: "untrusted" }),
              admin,
            ]),
            /permission denied/,
          );
          await db.exec("reset role");
        }
        await db.exec("set role service_role");
        assert.deepEqual(await counts(), { invoices: 0, audits: 0 });
      },
    );
    let invoiceId = "";
    await t.test(
      "service issuance preserves signed discount and atomically stores actor, plan and authoritative book snapshot",
      async () => {
        invoiceId = (await issue(ids[0])).rows[0].id;
        const invoice = (
          await db.query<{ total_cents: number; items: typeof items }>(
            "select total_cents,items from public.invoices where id=$1",
            [invoiceId],
          )
        ).rows[0];
        assert.equal(invoice.total_cents, 20000);
        assert.deepEqual(invoice.items, items);
        const audit = (
          await db.query<{
            actor_id: string;
            price_book_version: string;
            audit: {
              estimatedCostCents: number;
              priceBook: { version: string; adminMinutes: number };
            };
          }>(
            "select actor_id,price_book_version,audit from public.quote_pricing_audits where invoice_id=$1",
            [invoiceId],
          )
        ).rows[0];
        assert.equal(audit.actor_id, admin);
        assert.equal(audit.price_book_version, version);
        assert.equal(audit.audit.estimatedCostCents, 14000);
        assert.equal(audit.audit.priceBook.version, version);
        assert.equal(audit.audit.priceBook.adminMinutes, 30);
        assert.deepEqual(await counts(), { invoices: 1, audits: 1 });
      },
    );
    await t.test(
      "invalid negative kinds, discount quantities, positive discounts and sum mismatches create no invoice or audit",
      async () => {
        const badLines = [
          [
            {
              description: "Bad negative labor",
              quantity: 1,
              unit_cents: -1000,
              kind: "labor",
            },
          ],
          [
            {
              description: "Untagged negative",
              quantity: 1,
              unit_cents: -1000,
            },
          ],
          [
            {
              description: "Multiple discount",
              quantity: 2,
              unit_cents: -1000,
              kind: "discount",
            },
          ],
          [
            {
              description: "Positive discount",
              quantity: 1,
              unit_cents: 20000,
              kind: "discount",
            },
          ],
          [
            {
              description: "Unknown kind",
              quantity: 1,
              unit_cents: 20000,
              kind: "fee",
            },
          ],
        ];
        for (const itemList of badLines)
          await assert.rejects(issue(ids[1], { itemList }));
        await assert.rejects(
          issue(ids[1], { total: 20001 }),
          /Invalid quote total/,
        );
        assert.deepEqual(await counts(), { invoices: 1, audits: 1 });
        assert.equal(
          (
            await db.query<{ status: string }>(
              "select status from public.requests where id=$1",
              [ids[1]],
            )
          ).rows[0].status,
          "requested",
        );
      },
    );
    await t.test(
      "failed audit insert rolls back invoice and project mutation",
      async () => {
        await assert.rejects(
          issue(ids[2], { actor: "00000000-0000-0000-0000-000000000099" }),
          /foreign key/,
        );
        assert.deepEqual(await counts(), { invoices: 1, audits: 1 });
        assert.equal(
          (
            await db.query<{ status: string }>(
              "select status from public.requests where id=$1",
              [ids[2]],
            )
          ).rows[0].status,
          "requested",
        );
      },
    );
    await t.test(
      "closed projects and stale book versions cannot produce quotes or audits",
      async () => {
        for (const [i, status] of [
          [3, "completed"],
          [4, "cancelled"],
        ] as const) {
          await db.query("update public.requests set status=$1 where id=$2", [
            status,
            ids[i],
          ]);
          await assert.rejects(issue(ids[i]), /Project closed/);
        }
        await assert.rejects(
          issue(ids[5], { expected: "obsolete" }),
          /Price book changed/,
        );
        await assert.rejects(
          issue(ids[5], { audit: [] }),
          /Invalid pricing audit/,
        );
        assert.deepEqual(await counts(), { invoices: 1, audits: 1 });
      },
    );
    await t.test(
      "compare-and-swap pricing updates reject stale edits and leave issued invoice and audit snapshot unchanged",
      async () => {
        const before = (
          await db.query<{ book: Record<string, unknown> }>(
            "select book from public.price_books",
          )
        ).rows[0].book;
        const updated = {
          ...before,
          version: "reviewed-book-2",
          loadedLaborCentsPerHour: 4200,
        };
        await db.query("select public.save_price_book($1,$2::jsonb,$3)", [
          version,
          JSON.stringify(updated),
          admin,
        ]);
        await assert.rejects(
          db.query("select public.save_price_book($1,$2::jsonb,$3)", [
            version,
            JSON.stringify({ ...updated, version: "stale-overwrite" }),
            admin,
          ]),
          /Price book changed/,
        );
        await assert.rejects(issue(ids[6]), /Price book changed/);
        version = "reviewed-book-2";
        assert.deepEqual(
          (
            await db.query<{ book: unknown }>(
              "select book from public.price_books",
            )
          ).rows[0].book,
          updated,
        );
        const saved = (
          await db.query<{ total_cents: number; items: unknown }>(
            "select total_cents,items from public.invoices where id=$1",
            [invoiceId],
          )
        ).rows[0];
        assert.equal(saved.total_cents, 20000);
        assert.deepEqual(saved.items, items);
        const audit = (
          await db.query<{ audit: { priceBook: unknown } }>(
            "select audit from public.quote_pricing_audits where invoice_id=$1",
            [invoiceId],
          )
        ).rows[0];
        assert.deepEqual(audit.audit.priceBook, before);
        await issue(ids[6]);
        assert.deepEqual(await counts(), { invoices: 2, audits: 2 });
      },
    );
  } finally {
    await db.close();
  }
});
