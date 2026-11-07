# Homepage design refresh and rollback

The visual refresh is developed on `preview/design-refresh`. Do not merge it to
`main` or promote it to production until the owner approves the preview.

## Preserved original preview

- Branch: `backup/preview-before-design-refresh`
- Commit: `56807085f77ffe2b660087e1feab9018006a17cd`
- Original branch: `feature/customer-platform`
- Existing preview alias: https://smart-solutions-website-git-feat-d2880a-justin-nwajeis-projects.vercel.app/
- Immutable deployment: https://smart-solutions-website-eavvw1f13-justin-nwajeis-projects.vercel.app/
- Deployment ID: `dpl_9JVRTinZhMsNtyxG65RuB1uMLEQ7`

## Production baseline, including approved color accents

- Branch: `backup/production-before-design-refresh`
- Commit: `5b1105d23a15fbf2e4d4900c8793760ec0c0ff96`
- Immutable deployment: https://smart-solutions-website-oh0vibfmc-justin-nwajeis-projects.vercel.app/
- Deployment ID: `dpl_2XqTHKnRvu4sPvUUCBoUirxptUH3`
- Production: https://smart-solutions-website-nu.vercel.app/

## Review scope

Green and cream remain the foundation; Cat5 Blue, Light Blue, and Gold are accents.
The homepage refresh adds a responsive service selector, concept illustrations,
four installation standards, industry cards, clearer process and inquiry sections,
and simplified contact navigation. Illustrations do not represent completed jobs.
The existing inquiry-only launch gates, authentication, quotes, payments, and database
remain in place. Passwordless authentication is a separate task.

## Returning to the previous design

The original preview alias is deliberately untouched. Use it or the immutable
original-preview deployment to review the previous design immediately.
If the refresh is rejected, close its draft pull request and keep `main` unchanged.
For another iteration based on either baseline, create a new branch from the
corresponding preserved commit. Avoid force-pushing `main` or repointing production
as a way to change a preview. If approved and later released, rollback is a separate
production action: inspect the then-current deployment and revert the design commit
or promote the preserved production deployment after checking configuration.
