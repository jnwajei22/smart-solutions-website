# DFW Smart Solutions — operations handoff

This guide covers the current customer platform on `feature/customer-platform`. The branch preview uses Stripe test mode. It is not production launch approval.

## Daily workflow

1. Open `/admin`, refresh, and check **Need Review** and **Need a Reply**. Requests/messages do not currently trigger outbound email alerts. Check the workspace routinely rather than relying on inbox notifications.
2. Review contact/company, location, requested service, authorized access, equipment, photos/documents supplied through approved channels, and preferred date. Change to Reviewing. The date is a preference, not a reservation.
3. Prepare labor/material/travel/tax line items as appropriate. Verify quote total, deposit (credited to total), due date, scope/exclusions, scheduling and cancellation/refund conditions. The app does not determine tax obligations. Supply project-specific terms before collecting payment.
4. Issue the quote only after checking all fields; issued amounts are locked. A client approval records acceptance. **Awaiting Approval** flags outstanding approval. **Ready to Schedule** flags approved quotes with the requested deposit recorded; confirm a time separately before setting Scheduled.
5. Use In Progress when starting work. Record written agreement before changes. Verify connections/equipment, provide a handoff, confirm remaining payment, then mark Completed. Keep project correspondence in the relevant conversation.
6. Check outstanding balances and client questions before ending the day. Drafts stay with their request while switching/refreshing within the workspace, but are not saved to the database and are lost on full reload/tab close.

## Client support

- `/help` explains requests, account confirmation/recovery, payments, changes and cancellations. Terms/privacy pages link to the same support path.
- Configure `SUPPORT_EMAIL` with the owner's approved public business address in Vercel Preview and Production, then redeploy. It is intentionally unset; selecting “provide email” without entering an address is not an address. Do not publish a private login email as fallback.
- Until configured, existing clients are directed to project correspondence or the contact supplied with their quote. Provide that contact when issuing a real quote.
- Auth email transport is separate: custom SMTP is still required. Changing the displayed support address does not fix SMTP.
- Never request passwords, Wi-Fi credentials, property access codes, full card details, or sensitive documents in portal messages.

## Payment mismatch, refunds and quote corrections

- A return from Checkout is not payment confirmation. Match the invoice to Stripe's successful payment and webhook delivery before collecting another payment.
- For a mismatch: note the invoice number, check payment/session and currency/amount in Stripe, review webhook delivery, and inspect Vercel function logs. Retry failed webhook deliveries through Stripe after fixing the endpoint/configuration. Do not manually edit paid totals or create a second charge as a workaround.
- Partial/full refunds are performed in Stripe. The cumulative refund webhook updates net paid, history, activity and outstanding balance. Duplicate/stale deliveries are protected by the ledger.
- **A refund reopens the outstanding balance.** For a cancelled/adjusted job, resolve the invoice treatment before asking the client to pay again. Project cancellation alone does not void the invoice. Safe self-service quote amendments/credit notes/voiding are not implemented; use a reviewed reconciliation procedure, not arbitrary SQL edits. Keep test records clearly separated from real jobs.
- Issue only reviewed quotes. If an issued quote is wrong, pause collection, document the correction and resolve it before proceeding; the dashboard intentionally prevents editing issued amounts.

## Failure response and monitoring

- `/api/health`: application liveness only, no customer data or provider credentials. A 200 response does not certify DB, email or payments. Configure a real external uptime check and alert recipient in the hosting/monitoring provider before launch; none is claimed active here.
- Request/message failures emit fixed event names and optional database error codes, without bodies, email addresses or raw provider messages. Search Vercel runtime logs for `request_save_failed` / `message_save_failed`; webhook reconciliation has its existing event logging.
- If account email is rate limited, stop repeated sends. Check Supabase Auth email logs and SMTP configuration. Send one fresh reset only after service availability is restored. Open the newest email in the same browser; do not keep reusing an already consumed link.
- For a site failure, inspect the deployment/commit and logs. Roll back to a known good compatible deployment if necessary. A code rollback does not undo database changes. Apply migrations additively and verify compatibility before releasing.
- Do not copy tokens, cookies, bypass URLs, signing secrets, full customer records, or payment credentials into logs, support tickets or screenshots shared externally.

## Backups and recovery — still to verify

Backup coverage and a successful restore have not been established by this pass. Before live customer intake:

1. Check the actual Supabase project's backup/PITR availability and retention in its dashboard. Do not assume that RLS, Git history, or a preview deployment is a data backup.
2. Set an appropriate backup schedule/retention and a secure off-project copy where supported. Include required database/auth records and storage objects if storage is introduced. Keep exports encrypted and access restricted; do not commit them to Git.
3. Perform a restore rehearsal into an isolated project/environment. Verify representative request, message, quote and payment ledger relationships and customer RLS. Disable production webhooks/email/charges in the restored environment.
4. Record backup time, restored point, restoration duration and responsible owner. Confirm how provider keys and endpoints would be rotated/reconnected after a disaster without exposing secrets.

## Release checks

- SMTP and approved support address configured; signup, reset and new-password sign-in pass.
- Stable production domain and exact allowed auth redirects/origins configured; public site is reachable without preview protection.
- Production Stripe account/keys/webhook are live and distinct from the sandbox; a controlled authorized payment/refund and invoice reconciliation pass.
- Client policies reviewed by owner: scope, written changes, deposits, cancellation/refunds and support contact. No unapproved fees, warranties or turnaround guarantees have been added.
- Mobile CSS checks pass at 320/375/390/768 widths. Separately check real iOS/Android keyboard, zoom, browser navigation and hosted checkout; narrow iframe tests do not establish these.
- Backups and restore rehearsal recorded; uptime/error alert recipients configured; operator knows how to review requests and messages.
- Retain the current feature branch/draft PR until these checks are complete. Do not treat passing unit tests or the preview as launch authorization.
