# Inquiry-only production release

Production defaults to inquiry-only through VERCEL_ENV=production. PUBLIC_INQUIRY_ONLY=true can enable the same mode for local/preview QA. Do not set PUBLIC_INQUIRY_ONLY=false in production until the full launch is authorized and ready; rebuild after changing this build-time setting.

Public pages advertise solo weekend IT inquiries in Cedar Hill and southern Dallas County, while explaining launch preparation and unconfirmed scheduling. No mounting/cabling installation is advertised in this initial service menu. Existing preview workspaces remain available for development.

The inquiry form prepares a mailto to jnwajei22@gmail.com. It does not send automatically, save a project or claim receipt. Visitors must send from their email app; a visible direct email link is the fallback. This intentionally avoids requiring unconfigured SMTP or a new customer account. Check that mailbox manually; website notification automation remains off.

Production proxy redirects direct portal, admin, invoice, signup/login, account, auth and preview page requests to /request. All application API endpoints except /api/health return 503 before auth/database/payment side effects, including checkout and Stripe webhooks. The existing preview payment system is unchanged. A future payment launch must explicitly enable the platform, configure production Stripe + signed webhook + canonical auth URLs, activate verified email delivery, and verify business readiness. There are no schema changes in this release.

Before accepting paid work: verify restored Texas status, registered-office record, insurance/tools and actual availability. This website release is for inquiries, not bookings or paid operation.
