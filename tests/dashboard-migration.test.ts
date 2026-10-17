import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("dashboard migration preserves existing invoices and service role processes client-owned cancellation", async () => {
  const migration = await readFile(
    new URL(
      "../supabase/migrations/20261017013419_business_access_client_cancellation.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const schema = await readFile(
    new URL("../supabase/schema.sql", import.meta.url),
    "utf8",
  );
  assert.ok(schema.endsWith(migration));
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz default now());create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$;grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid() to authenticated,service_role;",
    );
    await db.exec(schema.slice(0, -migration.length));
    const client = "00000000-0000-0000-0000-000000000010",
      owner = "00000000-0000-0000-0000-000000000011";
    await db.query(
      "insert into auth.users(id,email) values($1,'client@example.invalid'),($2,'owner@example.invalid')",
      [client, owner],
    );
    await db.query("update public.profiles set role='admin' where id=$1", [
      owner,
    ]);
    const job = (
      await db.query<{ id: string }>(
        "insert into public.requests(customer_id,name,email,phone,service,property_type,address,city,details) values($1,'QA Client','client@example.invalid','1234567890','wifi','Residential','Test site','Dallas','Synthetic upgrade verification') returning id",
        [client],
      )
    ).rows[0].id;
    const invoice = (
      await db.query<{ id: string }>(
        "select public.issue_quote($1,'Migration QA','[{\"description\":\"Labor\",\"quantity\":1,\"unit_cents\":10000}]'::jsonb,10000,0,'2026-12-01','Cancellation subject to these written project terms.') as id",
        [job],
      )
    ).rows[0].id;
    const before = (
      await db.query(
        "select to_jsonb(i) as value from public.invoices i where id=$1",
        [invoice],
      )
    ).rows;
    const notificationsBefore = (
      await db.query("select count(*) from public.notification_outbox")
    ).rows;
    await db.exec(migration);
    assert.deepEqual(
      (
        await db.query(
          "select to_jsonb(i)-array['client_cancellation_reason','client_cancellation_requested_at'] as value from public.invoices i where id=$1",
          [invoice],
        )
      ).rows,
      before,
    );
    assert.deepEqual(
      (await db.query("select count(*) from public.notification_outbox")).rows,
      notificationsBefore,
    );
    await db.exec("set role service_role");
    await db.query(
      "select public.request_invoice_cancellation($1,$2,'Client entered this reason')",
      [invoice, client],
    );
    await db.query(
      "select public.begin_invoice_cancellation($1,$2,'Ignored staff input',false)",
      [invoice, owner],
    );
    await db.query("select public.finish_invoice_cancellation($1)", [invoice]);
    const result = (
      await db.query<{ status: string; cancellation_reason: string }>(
        "select status,cancellation_reason from public.invoices where id=$1",
        [invoice],
      )
    ).rows[0];
    assert.equal(result.status, "void");
    assert.equal(result.cancellation_reason, "Client entered this reason");
  } finally {
    await db.close();
  }
});
