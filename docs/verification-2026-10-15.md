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

`npm test`: 40 passing tests. `npm run build`: passes. `npm run lint`: passes after repairing the existing Next.js flat ESLint configuration. The request form retains its existing browser-only draft hydration, with a narrowly documented lint exception.

`tests/payment-routes.test.ts` executes the actual checkout/webhook handlers with isolated database and checkout-provider boundaries. It covers identity checks, invoice ownership, required approval, paid invoices, quote acceptance, client price tampering, trusted checkout return URLs, idempotency keys, reuse after cancellation, checkout expiration, paid/unpaid retries, provider outages, real Stripe signature verification, delayed paid events, currency/metadata rejection, cumulative refunds, and database failures that must trigger Stripe retries.

The database suite covers cross-customer access, privilege escalation, quote totals, double payments/events, ambiguous checkout timeouts, full balance settlement, stale refunds, message ownership, and rate limits.

## Remaining limits

- A fresh signed-in browser session is unavailable to the agent. Independent browser clicks through a declined card or Checkout's Cancel button were not completed. Those application branches were tested through actual handlers with simulated provider responses; they are not reported as hosted browser end-to-end passes.
- Responsive visual QA, password-reset email delivery, and another fresh user's sign-up are not covered by this pass. Prior user-assisted sign-up, request, quote, and successful payment checks remain separate evidence.
- Supabase's security advisor reports leaked-password protection disabled. Review availability/configuration before customer rollout: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Production environment, domain, live Stripe credentials, and live webhook remain outside this preview test. This report is not production launch approval.

No bypass credentials, signing secrets, or payment credentials are stored in this report or source.
