# Preview release checks — 2026-10-16

## Implemented and checked

- GitHub verification runs on pushes and pull requests: Node 24, clean `npm ci`, production dependency audit (high/critical gate), automated tests, ESLint and a production build. Actions use pinned commit SHAs, a read-only token, no persisted Git credentials, no provider secrets and no `pull_request_target` execution. These are automated checks; branch-protection requirements are not configured by this workflow.
- Updated Next.js and eslint-config-next from 16.2.6 to 16.4.2. `npm audit --omit=dev` reports zero vulnerabilities after installation.
- Reviewed server-side identity checks, customer-scoped invoice/message queries, current-user lookup, admin role checks, exact-origin restrictions, request limits, output escaping, private notification queue access and signed payment webhook handling. The SQL integration tests exercise RLS, private project messages and denial of customer privilege escalation.
- Added route-level tests showing unauthenticated/non-admin/cross-origin callers cannot mutate the admin workspace, and an invoice from a different project cannot reach cancellation. Invalid calendar due dates are rejected before quote creation.
- Fixed quote approval falsely reporting success when cancellation/status changes cause the conditional update to affect zero rows. It now returns a conflict so the client can refresh. Repeated approval of an already-approved open quote remains idempotent.
- Existing invoice cancellation tests cover retained funds, open/ambiguous/submitted checkout outcomes, refund ordering, replacement history and void preservation. Connected service-role transaction smoke checks passed after the approved migration; synthetic records were rolled back.

## Limits and remaining checks

- Full dependency audit still flags a high-severity `braces` advisory through the development-only Next ESLint glob dependency. The published latest braces version is affected; npm's suggested remediation downgrades the Next lint stack across major versions. That downgrade was not applied. The path is used for build/lint file patterns, not customer-supplied patterns, and is absent from the production-only audit. Reassess when an upstream patch is published.
- Hosted authenticated cancellation tests require an admin sign-in in the test browser. Do not equate mocked provider tests or database smoke checks with a completed browser → API → Stripe → database test.
- Supabase leaked-password protection remains disabled in the provider configuration. This was an existing advisor warning; no auth settings were changed during this audit.
- Real iOS/Android keyboard and hosted Checkout behavior, SMTP inbox delivery/bounce checks, external monitoring and provider disaster-recovery restoration remain launch checks. The restricted in-project snapshot covers migration recovery, not a full provider backup.
- Main/production has not been promoted by these changes.
