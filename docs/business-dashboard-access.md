# Business dashboard access and cancellation

The administrator uses **Team Access** from the business workspace to add each partner’s exact email. Viewer is the default; Project Manager permits project replies, status changes, quotes and completion of client cancellation requests. Only the existing administrator can add, change or remove team access and process queued notification emails. Administrator promotion is deliberately excluded from this screen.

Partners create their own accounts and verify the allowlisted email, then open Business Workspace from their client portal. No invitation emails are sent by saving access. The site uses the current verified email returned by Supabase Auth and database roles; user-editable metadata cannot grant access. The database independently checks verified email and the current allowlist for reads. Revocation affects subsequent requests immediately; already displayed data cannot be recalled.

Viewers can read client contact information, projects, conversations, invoices, payments, and delivery counts. They cannot write project data, view the team allowlist or manage delivery. Project managers cannot change team access. Direct database writes remain unavailable to all authenticated browser clients.

Clients request cancellation from their invoice card and can revise their reason until the invoice is void. Saving a cancellation reason pauses new payment collection immediately and records a project message for the team. Staff see the client’s reason read-only and complete cancellation using the existing checkout reconciliation and retained-funds safeguards. Staff cannot supply an alternate cancellation reason or flag through the API. An already open Stripe checkout is closed by staff processing; requesting cancellation does not itself issue a refund.

Historical internal cancellation reasons remain historical; they are not relabeled as client submissions. Completed cancellation reasons cannot be edited.

## Verification

80 local tests passed, including server authorization boundaries, exact verified email role lookup, immediate revocation under RLS, customer isolation, rejection of direct writes and role escalation, cancellation ownership, and an upgrade of pre-existing invoices with the service-role cancellation lifecycle. Lint and production build passed. The existing production dependency audit remains clean from the prior security update.

Before the connected migration, restricted copies of existing invoices, profiles, cancellation function and affected read policies were saved in private_dashboard_backup_20261017. This is migration recovery within the same database, not a separate disaster-recovery backup. Post-migration checks confirmed existing invoices were preserved and no test team permissions or synthetic test projects/invoices remained. Security advisors reported no new warning or error; deny-all service-only tables produce expected RLS-no-policy info, and the previously documented leaked-password-protection warning remains.

Business email delivery remains off pending domain and sender setup. Partner emails have not been added because none were supplied.

## Hosted verification

Stable preview verified after PRs #4 and #5 merged. Administrator sign-in, Team Access defaults (Viewer) and both role choices, desktop email status cards, client cancellation submission and reason editing, business read-only reason (zero reason textareas), cancellation completion, and client void/zero-due/no-edit state were verified in the browser. Database confirmed DFW-1002 void, paid zero, client reason preserved, and project cancelled. DFW-1002 remains clearly labeled as a synthetic QA invoice; the prior test invoice was left unchanged. No payment was taken and no email was sent. A final business reply retained business attribution even though the operator was also the test client.

375px layout frames verified conversation bubbles and notification cards without horizontal overflow; these are CSS width checks, not physical-device testing. Native date entry did not work through this browser automation, so the isolated QA invoice was seeded with the database quote routine; quote API validation and production build passed.

Sender context is recorded server-side on new messages as client or business, used consistently by conversation labels, reply attention, and email routing. Existing messages use their prior author-identity fallback.
