# Email-code sign-in: implementation and activation

The email-code UI and Supabase SDK flow are implemented. They are not activated
for real accounts by this design change. `/preview/login` is an explicitly labeled
simulation: it never calls Supabase, sends mail, creates an account, or signs in.
The existing password and recovery flows remain available.

## Before activating real code login

1. Verify the Supabase project linked to DFW Smart Solutions. Do not modify a
   different project merely because it is visible through a connector.
2. Configure and verify Auth SMTP/sender-domain delivery. App notification SMTP
   does not configure Supabase Auth's mailer.
3. Set both the Magic Link and Confirm Signup email templates to the reviewed
   `supabase/templates/email-code.html`, which includes `{{ .Token }}`. Leaving
   a link-only template causes the code screen to receive no visible code.
4. Set an appropriate short OTP expiry (recommended starting point: 600 seconds)
   and server-enforced send/verification rate limits in Supabase. The UI resend
   delay is convenience only, not a security boundary. Confirm all redirect URLs.
5. Enable `EMAIL_CODE_LOGIN_ENABLED=true` on the preview environment and redeploy.
   Test an existing client and new personal/business accounts with controlled
   email addresses. Confirm inbox delivery, expiry, reuse rejection, sign-out,
   recovery fallback, return to `/request`, and preserved request drafts.
6. Partner/admin MFA enrollment AND server/database enforcement need their own
   verified rollout before broader account access. Email OTP alone is not MFA.
7. Only after these checks and owner approval, enable the flag in the intended
   production release. The inquiry-only launch gate remains independent.

## Implementation boundaries

Existing-user sign-in uses `shouldCreateUser: false`. Explicit signup uses only
validated client profile metadata; email signup never grants a staff role.
Verification uses `type: email` and the provider's SDK/session cookies. Redirects
allow only fixed local destinations. Codes are never stored in browser storage,
URLs, logs, analytics, or application tables. Each provider verification is
single-use and provider-limited; the application does not implement its own OTP.

The browser simulation does not verify email delivery or real authentication.
No production credentials, customer records, payments, or provider configuration
are changed by this implementation.
