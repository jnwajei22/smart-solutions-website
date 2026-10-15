import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const alice = "00000000-0000-0000-0000-000000000001",
  bob = "00000000-0000-0000-0000-000000000002",
  admin = "00000000-0000-0000-0000-000000000003";
test("database authorization and payment lifecycle", async (t) => {
  const db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$;grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid() to authenticated,service_role;`,
  );
  await db.exec(
    await readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8"),
  );
  await db.query("insert into auth.users values($1,$2),($3,$4),($5,$6)", [
    alice,
    "alice@example.invalid",
    bob,
    "bob@example.invalid",
    admin,
    "admin@example.invalid",
  ]);
  await db.query("update public.profiles set role='admin' where id=$1", [
    admin,
  ]);
  const jobs = await db.query<{ id: string }>(
    `insert into public.requests(customer_id,name,email,phone,service,property_type,address,city,details) values($1,'Alice','alice@example.invalid','1234567890','cabling','Residential','1 Example','Dallas','Two Ethernet connections'),($2,'Bob','bob@example.invalid','1234567890','wifi','Residential','2 Example','Dallas','Wi-Fi coverage review') returning id`,
    [alice, bob],
  );
  const requestId = jobs.rows[0].id;
  const issued = await db.query<{ id: string }>(
    `select public.issue_quote($1,'Office Ethernet',$2::jsonb,55000,20000,'2026-11-04','Deposit credited to total. Changes and cancellation require written agreement.') as id`,
    [
      requestId,
      JSON.stringify([
        { description: "Connections", quantity: 2, unit_cents: 20000 },
        { description: "Organization", quantity: 1, unit_cents: 15000 },
      ]),
    ],
  );
  const invoiceId = issued.rows[0].id;
  await t.test(
    "customers read only their own records and cannot promote themselves",
    async () => {
      await db.exec(
        `set role authenticated;select set_config('request.jwt.claim.sub','${alice}',false);`,
      );
      assert.equal(
        (await db.query("select * from public.requests")).rows.length,
        1,
      );
      assert.equal(
        (await db.query("select * from public.invoices")).rows.length,
        1,
      );
      await assert.rejects(db.exec("update public.profiles set role='admin'"));
      await assert.rejects(
        db.exec("update public.invoices set paid_cents=55000"),
      );
      await assert.rejects(
        db.query("select public.record_refund($1,$2,$3)", ["fake", "fake", 0]),
      );
      await db.exec(
        `select set_config('request.jwt.claim.sub','${bob}',false);`,
      );
      assert.equal(
        (await db.query("select * from public.invoices")).rows.length,
        0,
      );
      await db.exec("reset role");
    },
  );
  await t.test(
    "unauthenticated users cannot read customer information",
    async () => {
      await db.exec("set role anon");
      await assert.rejects(db.exec("select * from public.requests"));
      await db.exec("reset role");
    },
  );
  await t.test("approved admin reads business records", async () => {
    await db.exec(
      `set role authenticated;select set_config('request.jwt.claim.sub','${admin}',false);`,
    );
    assert.equal(
      (await db.query("select * from public.requests")).rows.length,
      2,
    );
    await db.exec("reset role");
  });
  await t.test(
    "quote creation rejects a mismatched sum and duplicate invoice",
    async () => {
      await assert.rejects(
        db.query(
          `select public.issue_quote($1,'Bad quote',$2::jsonb,20000,10000,'2026-11-04','Deposit credited to total and cancellation by agreement.')`,
          [
            jobs.rows[1].id,
            JSON.stringify([
              { description: "Labor", quantity: 1, unit_cents: 15000 },
            ]),
          ],
        ),
      );
      await assert.rejects(
        db.query(
          `select public.issue_quote($1,'Duplicate',$2::jsonb,10000,0,'2026-11-04','Deposit credited to total and cancellation by agreement.')`,
          [
            requestId,
            JSON.stringify([
              { description: "Labor", quantity: 1, unit_cents: 10000 },
            ]),
          ],
        ),
      );
    },
  );
  await t.test(
    "checkout rejects unapproved quotes and wrong customer",
    async () => {
      await assert.rejects(
        db.query("select * from public.reserve_checkout($1,$2,20000,$3)", [
          invoiceId,
          alice,
          "deposit",
        ]),
      );
      await db.query(
        "update public.invoices set accepted_at=now() where id=$1",
        [invoiceId],
      );
      await assert.rejects(
        db.query("select * from public.reserve_checkout($1,$2,20000,$3)", [
          invoiceId,
          bob,
          "deposit",
        ]),
      );
    },
  );
  let attemptId = "";
  await t.test(
    "checkout reserves one payable deposit and rejects tampering",
    async () => {
      await assert.rejects(
        db.query("select * from public.reserve_checkout($1,$2,1,$3)", [
          invoiceId,
          alice,
          "deposit",
        ]),
      );
      const a = await db.query<{ id: string }>(
        "select * from public.reserve_checkout($1,$2,20000,$3)",
        [invoiceId, alice, "deposit"],
      );
      attemptId = a.rows[0].id;
      await assert.rejects(
        db.query("select * from public.reserve_checkout($1,$2,20000,$3)", [
          invoiceId,
          alice,
          "deposit",
        ]),
      );
      await db.query(
        "update public.payment_attempts set session_id='cs_test_deposit' where id=$1",
        [attemptId],
      );
      const retry = await db.query<{ id: string }>(
        "select * from public.reserve_checkout($1,$2,20000,$3)",
        [invoiceId, alice, "deposit"],
      );
      assert.equal(retry.rows[0].id, attemptId);
    },
  );
  await t.test("mismatched payment does not alter invoice", async () => {
    await assert.rejects(
      db.query("select public.record_payment($1,$2,$3,$4,$5)", [
        "evt_bad",
        attemptId,
        "cs_test_deposit",
        "pi_test_deposit",
        19999,
      ]),
    );
    const inv = await db.query<{ paid_cents: number }>(
      "select paid_cents from public.invoices where id=$1",
      [invoiceId],
    );
    assert.equal(inv.rows[0].paid_cents, 0);
  });
  await t.test(
    "duplicate webhook events and duplicate sessions never double count",
    async () => {
      for (const event of ["evt_1", "evt_1", "evt_2"])
        await db.query("select public.record_payment($1,$2,$3,$4,$5)", [
          event,
          attemptId,
          "cs_test_deposit",
          "pi_test_deposit",
          20000,
        ]);
      const inv = await db.query<{ paid_cents: number }>(
        "select paid_cents from public.invoices where id=$1",
        [invoiceId],
      );
      assert.equal(inv.rows[0].paid_cents, 20000);
      assert.equal(
        (await db.query("select * from public.payments")).rows.length,
        1,
      );
    },
  );
  await t.test(
    "elapsed local checkout timeout never permits a second unknown payment",
    async () => {
      const a = await db.query<{ id: string }>(
        "select * from public.reserve_checkout($1,$2,35000,$3)",
        [invoiceId, alice, "balance"],
      );
      await db.query(
        "update public.payment_attempts set expires_at=now()-interval '1 hour' where id=$1",
        [a.rows[0].id],
      );
      await assert.rejects(
        db.query("select * from public.reserve_checkout($1,$2,35000,$3)", [
          invoiceId,
          alice,
          "balance",
        ]),
      );
      await db.query(
        "update public.payment_attempts set completed=true where id=$1",
        [a.rows[0].id],
      );
    },
  );
  await t.test("remaining balance payment closes invoice", async () => {
    const a = await db.query<{ id: string }>(
      "select * from public.reserve_checkout($1,$2,35000,$3)",
      [invoiceId, alice, "balance"],
    );
    await db.query("select public.record_payment($1,$2,$3,$4,$5)", [
      "evt_3",
      a.rows[0].id,
      "cs_test_balance",
      "pi_test_balance",
      35000,
    ]);
    const inv = await db.query<{ paid_cents: number; status: string }>(
      "select paid_cents,status from public.invoices where id=$1",
      [invoiceId],
    );
    assert.equal(inv.rows[0].paid_cents, 55000);
    assert.equal(inv.rows[0].status, "paid");
  });
  await t.test(
    "refund ledger reconciles and tolerates old partial-refund events",
    async () => {
      for (const [event, amount] of [
        ["evt_refund_1", 10000],
        ["evt_refund_2", 20000],
        ["evt_refund_3", 5000],
      ] as const)
        await db.query("select public.record_refund($1,$2,$3)", [
          event,
          "pi_test_deposit",
          amount,
        ]);
      const inv = await db.query<{ paid_cents: number; status: string }>(
        "select paid_cents,status from public.invoices where id=$1",
        [invoiceId],
      );
      assert.equal(inv.rows[0].paid_cents, 35000);
      assert.equal(inv.rows[0].status, "issued");
    },
  );
  await t.test(
    "project messages are private to the associated customer",
    async () => {
      await db.query(
        "insert into public.messages(request_id,author_id,body) values($1,$2,$3)",
        [requestId, alice, "Please confirm the appointment time."],
      );
      await db.exec(
        `set role authenticated;select set_config('request.jwt.claim.sub','${bob}',false);`,
      );
      assert.equal(
        (await db.query("select * from public.messages")).rows.length,
        0,
      );
      await db.exec(
        `select set_config('request.jwt.claim.sub','${alice}',false);`,
      );
      assert.equal(
        (await db.query("select * from public.messages")).rows.length,
        1,
      );
      await assert.rejects(
        db.query(
          "insert into public.messages(request_id,author_id,body) values($1,$2,$3)",
          [requestId, alice, "Unauthorized direct write"],
        ),
      );
      await db.exec("reset role");
    },
  );
  await t.test("customer request limiter is durable", async () => {
    for (let n = 0; n < 10; n++)
      assert.equal(
        (
          await db.query<{ allowed: boolean }>(
            "select public.consume_request_limit($1) as allowed",
            [bob],
          )
        ).rows[0].allowed,
        true,
      );
    assert.equal(
      (
        await db.query<{ allowed: boolean }>(
          "select public.consume_request_limit($1) as allowed",
          [bob],
        )
      ).rows[0].allowed,
      false,
    );
  });
  await db.close();
});
