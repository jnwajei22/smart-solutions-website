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
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz default now());create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$;grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid() to authenticated,service_role;`,
  );
  await db.exec(
    await readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8"),
  );
  await db.query(
    "insert into auth.users(id,email) values($1,$2),($3,$4),($5,$6)",
    [
      alice,
      "alice@example.invalid",
      bob,
      "bob@example.invalid",
      admin,
      "admin@example.invalid",
    ],
  );
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
  await t.test(
    "cancellation blocks collection, requires settled checkouts and zero retained funds",
    async () => {
      // Existing invoice retains funds after the prior partial refund.
      await assert.rejects(
        db.query("select public.begin_invoice_cancellation($1,$2,$3,false)", [
          invoiceId,
          alice,
          "Client requested cancellation",
        ]),
      );
      await db.query("select public.request_invoice_cancellation($1,$2,$3)", [
        invoiceId,
        alice,
        "Client requested cancellation",
      ]);
      await db.query(
        "select public.begin_invoice_cancellation($1,$2,$3,true)",
        [invoiceId, admin, "Client requested cancellation"],
      );
      await assert.rejects(
        db.query("select * from public.reserve_checkout($1,$2,100,$3)", [
          invoiceId,
          alice,
          "balance",
        ]),
      );
      await assert.rejects(
        db.query("select public.finish_invoice_cancellation($1)", [invoiceId]),
      );
      // Refund every retained test payment through the real reconciliation function.
      const payments = await db.query<{
        stripe_intent_id: string;
        amount_cents: number;
      }>(
        "select stripe_intent_id,amount_cents from public.payments where invoice_id=$1",
        [invoiceId],
      );
      for (const payment of payments.rows)
        await db.query("select public.record_refund($1,$2,$3)", [
          "cancel_refund_" + payment.stripe_intent_id,
          payment.stripe_intent_id,
          payment.amount_cents,
        ]);
      await db.query("select public.finish_invoice_cancellation($1)", [
        invoiceId,
      ]);
      await db.query("select public.finish_invoice_cancellation($1)", [
        invoiceId,
      ]);
      const inv = (
        await db.query<{
          status: string;
          paid_cents: number;
          cancellation_reason: string;
        }>("select * from public.invoices where id=$1", [invoiceId])
      ).rows[0];
      assert.equal(inv.status, "void");
      assert.equal(inv.paid_cents, 0);
      assert.equal(inv.cancellation_reason, "Client requested cancellation");
      assert.equal(
        (
          await db.query<{ status: string }>(
            "select status from public.requests where id=$1",
            [requestId],
          )
        ).rows[0].status,
        "cancelled",
      );
      // Late/out-of-order refund webhooks must never reopen a void invoice.
      await db.query("select public.record_refund($1,$2,$3)", [
        "late_refund",
        payments.rows[0].stripe_intent_id,
        1,
      ]);
      assert.equal(
        (
          await db.query<{ status: string }>(
            "select status from public.invoices where id=$1",
            [invoiceId],
          )
        ).rows[0].status,
        "void",
      );
    },
  );
  await t.test(
    "replacement invoices retain history and pending checkout prevents void",
    async () => {
      await db.query("select public.set_project_status($1,'reviewing')", [
        requestId,
      ]);
      const replacement = (
        await db.query<{ id: string }>(
          "select public.issue_quote($1,'Replacement',$2::jsonb,10000,0,'2026-12-01','Replacement scope and cancellation by written agreement.') as id",
          [
            requestId,
            JSON.stringify([
              { description: "Labor", quantity: 1, unit_cents: 10000 },
            ]),
          ],
        )
      ).rows[0].id;
      assert.equal(
        (
          await db.query("select id from public.invoices where request_id=$1", [
            requestId,
          ])
        ).rows.length,
        2,
      );
      await assert.rejects(
        db.query("select public.set_project_status($1,'cancelled')", [
          requestId,
        ]),
      );
      await db.query(
        "update public.invoices set accepted_at=now() where id=$1",
        [replacement],
      );
      await db.query(
        "select * from public.reserve_checkout($1,$2,10000,'balance')",
        [replacement, alice],
      );
      await db.query("select public.request_invoice_cancellation($1,$2,$3)", [
        replacement,
        alice,
        "Client requested scope cancellation",
      ]);
      await db.query(
        "select public.begin_invoice_cancellation($1,$2,'Scope correction',false)",
        [replacement, admin],
      );
      await assert.rejects(
        db.query("select public.finish_invoice_cancellation($1)", [
          replacement,
        ]),
      );
      await assert.rejects(
        db.query(
          "select * from public.reserve_checkout($1,$2,10000,'balance')",
          [replacement, alice],
        ),
      );
    },
  );
  await t.test(
    "outbox is transactional, private, deduplicated and leased",
    async () => {
      const requestNotifications = await db.query(
        "select id from public.notification_outbox where request_id=$1 and kind='request_received'",
        [requestId],
      );
      assert.equal(requestNotifications.rows.length, 2);
      assert.equal(
        (
          await db.query(
            "select id from public.notification_outbox where request_id=$1 and kind='invoice_void'",
            [requestId],
          )
        ).rows.length,
        1,
      );
      await db.exec("set role authenticated");
      await assert.rejects(db.exec("select * from public.notification_outbox"));
      await assert.rejects(
        db.exec("select * from public.claim_notifications(2)"),
      );
      await db.exec("reset role");
      const first = await db.query<{ id: string; claim_token: string }>(
        "select * from public.claim_notifications(2)",
      );
      const second = await db.query<{ id: string }>(
        "select * from public.claim_notifications(2)",
      );
      assert.equal(first.rows.length, 2);
      assert.equal(second.rows.length, 2);
      assert.ok(
        !second.rows.some((row) => first.rows.some((x) => x.id === row.id)),
      );
      await db.query(
        "update public.notification_outbox set claimed_until=now()-interval '1 minute',attempts=8 where id=$1",
        [first.rows[0].id],
      );
      await db.exec("select * from public.claim_notifications(1)");
      assert.equal(
        (
          await db.query<{ status: string }>(
            "select status from public.notification_outbox where id=$1",
            [first.rows[0].id],
          )
        ).rows[0].status,
        "failed",
      );
      const before = (
        await db.query("select id from public.notification_outbox")
      ).rows.length;
      await db.exec("begin");
      await db.query(
        "insert into public.messages(request_id,author_id,body) values($1,$2,'Rolled back message')",
        [requestId, alice],
      );
      await db.exec("rollback");
      assert.equal(
        (await db.query("select id from public.notification_outbox")).rows
          .length,
        before,
      );
    },
  );
  await t.test(
    "team permissions require exact verified email, revoke immediately, and never permit direct writes",
    async () => {
      const before = (
        await db.query<{
          n: number;
          role: string;
          id: string;
          client_cancellation_reason: string;
          cancellation_reason: string;
          collection_paused_at: string;
          cancel_project_requested: boolean;
        }>("select count(*)::int as n from public.requests")
      ).rows[0];
      await db.query<{
        n: number;
        role: string;
        id: string;
        client_cancellation_reason: string;
        cancellation_reason: string;
        collection_paused_at: string;
        cancel_project_requested: boolean;
      }>(
        "insert into public.business_access(email,role,granted_by) values('bob@example.invalid','viewer',$1)",
        [admin],
      );
      await db.exec(
        `set role authenticated;select set_config('request.jwt.claim.sub','${bob}',false);`,
      );
      assert.deepEqual(
        (
          await db.query<{
            n: number;
            role: string;
            id: string;
            client_cancellation_reason: string;
            cancellation_reason: string;
            collection_paused_at: string;
            cancel_project_requested: boolean;
          }>("select count(*)::int as n from public.requests")
        ).rows[0],
        before,
      );
      assert.equal(
        (
          await db.query<{
            n: number;
            role: string;
            id: string;
            client_cancellation_reason: string;
            cancellation_reason: string;
            collection_paused_at: string;
            cancel_project_requested: boolean;
          }>("select private.current_business_role() as role")
        ).rows[0].role,
        "viewer",
      );
      await assert.rejects(db.exec("select * from public.business_access"));
      await assert.rejects(
        db.exec("update public.requests set status='completed'"),
      );
      await assert.rejects(
        db.exec("select private.business_role_for('" + admin + "')"),
      );
      await assert.rejects(
        db.query<{
          n: number;
          role: string;
          id: string;
          client_cancellation_reason: string;
          cancellation_reason: string;
          collection_paused_at: string;
          cancel_project_requested: boolean;
        }>(
          "select public.request_invoice_cancellation($1,$2,'Forged reason')",
          [invoiceId, alice],
        ),
      );
      await db.exec("reset role");
      await assert.rejects(
        db.query<{
          n: number;
          role: string;
          id: string;
          client_cancellation_reason: string;
          cancellation_reason: string;
          collection_paused_at: string;
          cancel_project_requested: boolean;
        }>(
          "select public.begin_invoice_cancellation($1,$2,'Forged reason',true)",
          [invoiceId, bob],
        ),
      );
      await db.query<{
        n: number;
        role: string;
        id: string;
        client_cancellation_reason: string;
        cancellation_reason: string;
        collection_paused_at: string;
        cancel_project_requested: boolean;
      }>("update auth.users set email_confirmed_at=null where id=$1", [bob]);
      await db.exec(
        `set role authenticated;select set_config('request.jwt.claim.sub','${bob}',false);`,
      );
      assert.equal(
        (
          await db.query<{
            n: number;
            role: string;
            id: string;
            client_cancellation_reason: string;
            cancellation_reason: string;
            collection_paused_at: string;
            cancel_project_requested: boolean;
          }>("select count(*)::int as n from public.requests")
        ).rows[0].n,
        1,
      );
      await db.exec("reset role");
      await db.query<{
        n: number;
        role: string;
        id: string;
        client_cancellation_reason: string;
        cancellation_reason: string;
        collection_paused_at: string;
        cancel_project_requested: boolean;
      }>("update auth.users set email_confirmed_at=now() where id=$1", [bob]);
      await db.query<{
        n: number;
        role: string;
        id: string;
        client_cancellation_reason: string;
        cancellation_reason: string;
        collection_paused_at: string;
        cancel_project_requested: boolean;
      }>(
        "update public.business_access set role='manager' where email='bob@example.invalid'",
      );
      assert.equal(
        (
          await db.query<{
            n: number;
            role: string;
            id: string;
            client_cancellation_reason: string;
            cancellation_reason: string;
            collection_paused_at: string;
            cancel_project_requested: boolean;
          }>("select private.business_role_for($1) as role", [bob])
        ).rows[0].role,
        "manager",
      );
      await db.query<{
        n: number;
        role: string;
        id: string;
        client_cancellation_reason: string;
        cancellation_reason: string;
        collection_paused_at: string;
        cancel_project_requested: boolean;
      }>(
        "delete from public.business_access where email='bob@example.invalid'",
      );
      await db.exec(
        `set role authenticated;select set_config('request.jwt.claim.sub','${bob}',false);`,
      );
      assert.equal(
        (
          await db.query<{
            n: number;
            role: string;
            id: string;
            client_cancellation_reason: string;
            cancellation_reason: string;
            collection_paused_at: string;
            cancel_project_requested: boolean;
          }>("select count(*)::int as n from public.requests")
        ).rows[0].n,
        1,
      );
      await db.exec("reset role");
    },
  );
  await t.test(
    "only the associated client can request or edit cancellation, and staff cannot replace their reason",
    async () => {
      const inv = (
        await db.query<{
          n: number;
          role: string;
          id: string;
          client_cancellation_reason: string;
          cancellation_reason: string;
          collection_paused_at: string;
          cancel_project_requested: boolean;
        }>(
          "select id from public.invoices where request_id=$1 and status<>'void'",
          [requestId],
        )
      ).rows[0].id;
      await assert.rejects(
        db.query<{
          n: number;
          role: string;
          id: string;
          client_cancellation_reason: string;
          cancellation_reason: string;
          collection_paused_at: string;
          cancel_project_requested: boolean;
        }>(
          "select public.request_invoice_cancellation($1,$2,'Not my invoice')",
          [inv, bob],
        ),
      );
      await db.query<{
        n: number;
        role: string;
        id: string;
        client_cancellation_reason: string;
        cancellation_reason: string;
        collection_paused_at: string;
        cancel_project_requested: boolean;
      }>(
        "select public.request_invoice_cancellation($1,$2,'My updated client reason')",
        [inv, alice],
      );
      await db.query<{
        n: number;
        role: string;
        id: string;
        client_cancellation_reason: string;
        cancellation_reason: string;
        collection_paused_at: string;
        cancel_project_requested: boolean;
      }>(
        "select public.begin_invoice_cancellation($1,$2,'Business cannot overwrite',false)",
        [inv, admin],
      );
      const row = (
        await db.query<{
          n: number;
          role: string;
          id: string;
          client_cancellation_reason: string;
          cancellation_reason: string;
          collection_paused_at: string;
          cancel_project_requested: boolean;
        }>(
          "select client_cancellation_reason,cancellation_reason,collection_paused_at,cancel_project_requested from public.invoices where id=$1",
          [inv],
        )
      ).rows[0];
      assert.equal(row.client_cancellation_reason, "My updated client reason");
      assert.equal(row.cancellation_reason, "My updated client reason");
      assert.ok(row.collection_paused_at);
      assert.equal(row.cancel_project_requested, true);
      await assert.rejects(
        db.query<{
          n: number;
          role: string;
          id: string;
          client_cancellation_reason: string;
          cancellation_reason: string;
          collection_paused_at: string;
          cancel_project_requested: boolean;
        }>(
          "select public.request_invoice_cancellation($1,$2,'Too late to edit')",
          [invoiceId, alice],
        ),
      );
    },
  );
  await db.close();
});
