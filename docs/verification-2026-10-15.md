# Verification — October 15, 2026

Target: `feature/customer-platform`, stable Vercel preview. Stripe account DFW SS, test mode only. No live payment activity.

## Verified against connected services

- Existing $25 deposit and $75 final payment were paid and complete in Stripe, matched to the same invoice; customer screenshots showed $100 paid and $0 outstanding.
- Independently created a $10 partial deposit refund, then a $15 refund completing the deposit refund, then a $75 refund completing the balance refund. All three succeeded in Stripe. Their `charge.refunded` events had zero pending deliveries. Database totals followed the events without manual balance edits.
- Final DFW-1001 state: $100 original invoice, $100 refunded, $0 net paid, $100 outstanding, `issued`. This is an intentionally reopened test invoice, not a new customer debt.
- Replayed an existing refund event and an older cumulative refund inside a rolled-back database transaction: totals stayed at $0 net paid; no stale refund overwrote the larger cumulative amount.
- With an unrelated authenticated identity, deployed RLS exposed zero invoices, requests, and payments. Authenticated users lack execution privileges on payment/refund recording functions.
- All eight application tables have RLS enabled. Three server-only tables intentionally have no customer policies.
- Deployed public routes `/`, `/request`, `/login`, `/preview`, `/privacy`, `/terms` return 200. Signed-out `/portal`, `/admin`, and the test invoice redirect to login.
- Deployed write APIs reject signed-out access and reject foreign origins. The webhook rejects unsigned requests with 400 after passing Vercel protection through the authorized automation credential.

## Automated handler and database checks

`npm test`: 47 passing tests. `npm run build`: passes. `npm run lint`: passes after repairing the existing Next.js flat ESLint configuration. The request form retains its existing browser-only draft hydration, with a narrowly documented lint exception.

`tests/payment-routes.test.ts` executes the actual checkout/webhook handlers with isolated database and checkout-provider boundaries. It covers identity checks, invoice ownership, required approval, paid invoices, quote acceptance, client price tampering, trusted checkout return URLs, idempotency keys, reuse after cancellation, checkout expiration, paid/unpaid retries, provider outages, real Stripe signature verification, delayed paid events, currency/metadata rejection, cumulative refunds, and database failures that must trigger Stripe retries.

The database suite covers cross-customer access, privilege escalation, quote totals, double payments/events, ambiguous checkout timeouts, full balance settlement, stale refunds, message ownership, and rate limits.

## Remaining limits

- Authenticated hosted browser testing completed on October 16: Stripe Checkout Back/Cancel returned to the portal with $0 paid and $100 outstanding; reopening reused the same open session. Stripe's generic-decline test card displayed the expected declined-card alert. The session remained unpaid/open and the deployed database balance stayed unchanged.
- Desktop browser visual checks completed. Mobile-width visual QA remains unverified because the available browser control surface does not expose viewport sizing. A fresh account creation was not submitted; the deployed signup form's required Full Name, name autocomplete, and 2–100 character bounds were verified. Prior user-assisted sign-up, request, quote, and successful payment checks remain separate evidence.
- Supabase's security advisor reports leaked-password protection disabled. Review availability/configuration before customer rollout: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Production environment, domain, live Stripe credentials, and live webhook remain outside this preview test. This report is not production launch approval.

No bypass credentials, signing secrets, or payment credentials are stored in this report or source.


## Follow-up: account and form polish

- Signup now requires Full Name and saves it as display-only Supabase user metadata. Portal greetings prefer this name, fall back to the customer's own existing service-request name, then use “Client”; email handles are no longer used as names. Authorization remains based on the protected database role.
- Preferred Date is now required for new requests on both the form and API, with impossible calendar dates rejected. Existing saved requests remain intact.
- Form labels and project/invoice status displays use consistent capitalization in both customer and business portals. Status storage values and customer-entered names remain unchanged.
- Password-reset email delivery independently verified: the API accepted the recovery request and a new “Reset your password” email from Supabase Auth arrived in the owner's Gmail inbox on October 16 at 01:28 UTC. The password was not changed and the recovery token was not opened or inspected.
- Current validation: 47 tests pass, lint passes, production build passes. A React review checked hook order, controlled fields, accessible labels, metadata display versus authorization, and preservation of customer spelling.
- Authenticated client and business portals were inspected in the hosted browser: the client greeting uses Justin; Project Status options display Requested, Reviewing, Quoted, Scheduled, In Progress, Completed, and Cancelled. Preferred Date is required with no optional caption. Signup displays the required Full Name field. Email delivery is verified; completing the password change itself requires the account owner's participation.
- Hosted testing exposed fully refunded activity incorrectly labeled as a zero-dollar payment received. Recent Activity now explicitly identifies full and partial refunds and preserves original/refunded details. A regression test covers all three payment activity states.


## Business-client signup — October 15 follow-up

- Signup offers Personal and Business account types. Personal requires Full Name; Business requires Business Name (2–160 characters) and Contact Full Name (2–100 characters), plus email and password. Personal submissions discard any previously entered company name.
- Contact and company names are stored separately as customer-supplied display metadata. Business clients remain ordinary customers; admin authorization still comes exclusively from the protected profiles role.
- Business portal greetings use the company name. New service requests snapshot the company from the authenticated account, not from request-body overrides. Business names appear alongside the contact on admin requests and printable invoices. Existing requests remain unchanged.
- Applied the additive business_client_request_names migration to the connected preview database. A request-name snapshot write was verified inside a rolled-back transaction. Existing RLS and role permissions are unchanged. Security advisor findings remain the previously documented server-only tables and disabled leaked-password protection.
- Automated validation: 51 tests pass; lint and production build pass. Added cases for business/contact separation, switching to Personal, malformed display metadata, name bounds, unknown account types, and account-derived request company snapshots.
- New business test identity selected by owner: Gmail plus alias ending +dfw-business-test. Browser signup submission, email confirmation, and password change/reset remain pending the new credential handoff; no new account is reported as created yet.


## Fresh business account and recovery retry

- Owner submitted the new business signup. Confirmation email delivered October 15 at 9:54 p.m. Central. Supabase confirms account_type=business, company DFW QA Business, contact Justin Nwajei, confirmed email, and protected customer role. Hosted portal showed the company greeting and empty account.
- RLS tested using the actual new account identity: no admin privileges and zero visible requests, invoices, payments, or messages from the existing customer.
- Recovery email delivered at 9:59:42 p.m. Central, with the correct callback and reset-password destination. User's screenshot showed provider otp_expired and the generic login screen. Provider logs show rejection at 9:59:49 p.m.; reason for the early token rejection is not established. No password change is reported as successful.
- Fixed callback error feedback: failed recovery returns to the reset request form with an actionable expired/used-link explanation. Normal signup failures also display an explanation. Reset instructions specify newest email and same browser. Callback preserves recovery intent from the SDK result and forwards a validated concurrent PKCE flow identifier. Failed callbacks do not leak codes or raw provider errors; responses disable caching and referrers.
- Added actual callback-handler tests for successful recovery, provider recovery type without next, concurrent PKCE matching, invalid flow identifiers, expired tokens, upstream errors, missing tokens, token-hash signup/recovery, external redirect rejection, and unavailable configuration. 60 tests, lint, and production build pass. A fresh hosted recovery retry remains necessary to establish successful password change.
