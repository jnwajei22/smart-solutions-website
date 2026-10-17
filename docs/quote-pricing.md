# Guided quotes and equipment qualification

## Operator workflow

1. Review RFQ equipment, location, access, budget and date flexibility. Older requests have no equipment answers and explicitly require follow-up.
2. Open Quote & Payments, start the calculator and select the appropriate labor package. Package prices are labor only. Initial launch rates are planning assumptions, not market-validated promises.
3. Confirm actual crew, onsite time, dispatch city/ZIP, both directions of travel and combined miles for every vehicle. There is no mapping API; the operator supplies travel estimates.
4. Choose equipment supply, review compatibility, and add only company-supplied materials at separate cost and selling prices. Additional scope needs clear descriptions and actual labor included in the time estimate.
5. Enter any discount and explanation. Review tax explicitly; the calculator does not determine taxability or jurisdiction. Review the customer line items and scope.
6. Explain below-margin, travel-minimum, unusual crew/time, missing-material and other review warnings. Server issuance requires an exception reason of at least ten characters where flagged.
7. Enter title, deposit, due date and project-specific deposit/cancellation terms. Deposit is credited to total. Issued pricing is locked.

Administrators edit Pricing settings. Project managers can estimate and issue; viewers cannot read internal pricing through the pricing API. Price changes use a version check so concurrent edits cannot silently overwrite. A stale quote must reload shared rates and explicitly recalculate.

## Records and privacy

The server recomputes the quote and writes the invoice plus private pricing snapshot in one transaction. Internal costs, margin, source price book and exception reason are stored in a service-only audit table. Customers see only selling-price line items, scope and agreed terms. Dispatch origin text is excluded from customer scope. Historical invoices are not repriced or backfilled with invented estimates.

Quote drafts remain in the open workspace and survive section/project switches; they are not a durable shared draft system and do not survive closing/reloading the entire dashboard. RFQ drafts use tab-local session storage and survive ordinary refresh/sign-in navigation when browser storage is available. No RFQ photo upload was added; equipment/access descriptions are text.

## Validation — October 17, 2026

- 103 automated tests passed: actual API handlers with isolated provider boundaries, pricing arithmetic, RFQ validation, private database access, signed discounts, invoice/audit rollback, stale versions, closed projects and prior payment/RBAC tests.
- ESLint, TypeScript and default production build passed. An initial local Turbopack cache failure was resolved by rebuilding with a fresh generated build directory; CI's default build also passed.
- Connected development migration applied successfully. Original two invoices retained fingerprint `f9a7b00a62106d667b4a7d40a3a12457`; no historical amounts changed. Customer roles cannot read pricing/audits or call the issue RPC.
- Browser sample verified labor-only total, explicit discount, below-floor issue-button guard, draft retention across tabs, and calculator/RFQ layouts at 375px and 320px with no horizontal overflow. RFQ equipment and ZIP draft values survived refresh.
- Browser checks use fictional preview data, not physical phones. Authenticated owner save and new real invoice issuance were verified in isolated route/database tests; they were not exercised against real customer records in the browser.
- Final CSS adjustment keeps checkbox labels beside their controls.

This release targets the existing preview branch. Domain/business email, live Stripe, production promotion and partner access grants remain separate launch steps.
