# DFW Smart Solutions customer platform

Next.js 16 / React 19, designed for the repository's existing Vercel deployment. Green (`#004225`), gold (`#C9A227`), and warm neutral branding. No customer or business credentials are included.

## Included

- Responsive public website and service catalog.
- Service request form with a tab-local draft preserved during sign-in.
- Email/password accounts, verification, sign-out, and password recovery through Supabase Auth.
- Customer workspace: project status, conversations/change requests, quote approval, deposit or balance checkout, printable invoices, account balance, payment/refund ledger.
- Administrator workspace: incoming requests, customer details, messages, status updates, itemized quote builder, project-specific terms and deposit amount.
- Postgres schema with row-level access controls; privileged mutation functions are callable only by the server service role.
- Stripe Checkout; signed webhooks, idempotent payment records, refund reconciliation, and serialized checkout reservation.
- Explicit sample portal at `/preview`. Demo records are fictional and no mutations/payments are enabled there.

## Local work

Node 24 recommended for the TypeScript test runner. `npm ci`, copy `.env.example` to `.env.local`, then `npm run dev`. `npm run build` produces a deployable Next.js application. `npm test` runs money calculations and an isolated PostgreSQL-compatible database integration suite using PGlite. Never point tests at a live database.

Without configured credentials the public pages and sample portal render; account creation, request persistence, and payments remain unavailable. This is intentional, not a simulated backend.

## Live configuration

1. Create a Supabase project. Run `supabase/schema.sql` ONCE against a new database. Do not run it over an existing application schema without reviewing a migration.
2. Set the keys in `.env.example` in Vercel. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public; the service-role, Stripe, and webhook keys must remain server-only. Set `NEXT_PUBLIC_SITE_URL` to the stable canonical origin for each environment. On Vercel, write requests also accept the exact `VERCEL_URL` and `VERCEL_BRANCH_URL` supplied by the platform; arbitrary Vercel domains and forwarded host headers are never trusted. Stripe checkout returns to the validated requesting origin. Use the stable branch alias for Supabase email redirects and the Stripe webhook endpoint so rebuilds do not require reconfiguration. Public environment values require a rebuild.
3. Supabase Auth: enable email/password and email confirmation, set the Site URL and allowed redirect URLs to the deployment's `/auth/confirm` and `/auth/confirm?next=/reset-password`. Set minimum password length to 12. Configure production SMTP before customer rollout. Apply rate limits/CAPTCHA as appropriate in Supabase.
4. Recommended confirmation email link: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`. Recovery link: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`. The callback also accepts Supabase PKCE `code` redirects.
5. Create and verify Justin's account. In Supabase SQL, promote only the verified owner's ID using the commented statement at the end of `schema.sql`. Browser users cannot edit their role. `/admin` is protected on the server, not just hidden by navigation.
6. Connect Stripe in TEST mode first. Set a test secret and register `/api/stripe/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `charge.refunded`. Set the endpoint signing secret. Checkout filters to card payments; no subscription is created and no card data is stored in this app.
7. Complete the test-mode acceptance sequence below. Then activate Stripe using the business's legal and banking details. Live-mode endpoint and keys are separate from test-mode credentials. Do not mix test/live data in a production ledger.
8. Confirm business contact channels, written project terms, deposit/refund policy, service availability, and appropriate coverage before inviting real customers. The site does not claim licensing, reviews, completed jobs, or response-time guarantees.

## Real-account acceptance test (requires configured services)

Create verified accounts A and B. Submit A's project. As admin, issue an itemized quote, project terms, and deposit. As A, approve and pay using a Stripe test card. Confirm the webhook records the deposit once, and that the balance is total minus deposit. Pay the balance, confirm paid status, then issue a test refund from Stripe and confirm reconciliation. Re-send webhook events and confirm no duplicate credit. B must not see A's projects, conversations, or invoices, including direct invoice URLs. Verify confirmation/recovery email links, sign-out, project replies, and print output.

## Operational boundaries

- Requests require a verified account. Quotes are issued manually; prices are not inferred automatically from customer descriptions.
- Scheduling changes/cancellations are conversation requests. Admin changes project status after confirming the arrangement; this is not a calendar booking engine.
- Issued quote amounts/terms are immutable. Cancel Invoice pauses collection and voids only after checkout/payment reconciliation. Void history is retained and a new invoice number can replace a cancelled quote. Partial credit notes and tax automation are not implemented.
- Payments are against issued invoices only. Deposits are credited to invoice totals. Customer-entered amounts are never accepted.
- Refunds are initiated separately in Stripe and reconciled to the portal. Active invoice balances adjust; void invoices stay void. Retained payments must be resolved before an invoice can be voided.
- Transactional email outbox and SMTP worker are implemented. Delivery requires explicit configuration; inspect `/admin/notifications`. Supabase account emails have separate SMTP settings. See `docs/operations.md`.
- No uploads, customer device secrets, recurring billing, or third-party customer import.
- Database selections currently load all accessible records; add pagination as volume grows.
- No real Supabase/Stripe/Vercel credentials were available during implementation. Production-provider end-to-end verification is therefore still required.

## Payment reconciliation

Reservations serialize checkout per invoice. An unconfirmed attempt remains locked even after its local timestamp expires; only a verified expired Stripe session or a completed payment releases it. This avoids permitting a second charge when a paid session's webhook is delayed. An open existing checkout can be resumed. A completed paid session is reconciled from the Stripe API when the customer retries.

If Stripe creation fails ambiguously before a session ID is stored, the attempt stays locked. Do not blindly delete it: inspect Stripe using the attempt UUID (the idempotency key and metadata) and confirm no payable/paid session exists before setting it completed. Webhook failures return 500 so Stripe retries; monitor failed endpoint deliveries and Vercel logs. Keep the signing secret server-only.

## Verification limits

Build/type checking and local database integration checks are automated. This environment does not provide the supported browser QA integration, so responsive visual behavior, keyboard navigation, live auth emails, and Stripe-hosted checkout must also be verified in the Vercel preview before production launch.


## Client help and operating the workspace

- Public client instructions: `/help`. Set `SUPPORT_EMAIL` to the approved public business support address in Vercel Preview and Production, then redeploy. Leave unset until the owner supplies an address; private account email is never used as fallback. This address is display-only and does not configure SMTP.
- Admin work queue: `/admin`, with search and review/reply/approval/scheduling filters. Check it routinely; check `/admin/notifications` for delivery activation and queue status. Refresh Workspace keeps unsent per-request drafts while refreshing server data. Drafts are in-memory only and are lost on a full reload or tab close.
- Protected operator instructions: `/admin/operations`. Full release, refund, backup, and incident steps: `docs/operations.md`.
- `/api/health` is a no-store liveness endpoint only. It exposes no customer/provider data and does not certify database, SMTP, or Stripe health. External uptime and error-alert routing still require provider configuration.
- Preview-only QA tools: `/preview/responsive?width=375&page=request`, `/preview/admin`, and `/preview/invoice`. They return 404 in production and use fictional data. Frame widths exercise responsive CSS, not device/browser emulation.

- Apply `supabase/migrations/20261017001805_invoice_cancellation_notifications.sql` to an existing installation before deploying the cancellation/notification code. Fresh installations run `supabase/schema.sql`, which includes it.
