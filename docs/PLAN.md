# Plot — Build Plan

This file tracks the phased v0 build. Claude Code reads this at the start of every session and works on the **current phase** only. Do not skip ahead. Do not start a new phase without explicit user approval.

When a phase is complete, mark it `[x]`, commit, push, and stop. The user will say "continue" to start the next phase.

---

> **For Claude Code:** Always read this file at the start of every session. Work on the current phase only. Do not skip phases. Do not add tasks not listed here without user approval. When in doubt, stop and ask.

## Status

**Current phase:** Phase 0
**Last updated:** [date]

---

## Phase 0 — Foundation

Goal: a deployable Next.js app with auth, DB, testing, and CI all wired up. No product features yet. Verify the plumbing works end-to-end before building anything on top of it.

### Tasks

- [ ] Initialize repo: pnpm, Next.js 15 App Router, TypeScript strict mode, `.gitignore`, `.editorconfig`, `.nvmrc` (Node 20 LTS), `engines` field in `package.json`
- [ ] Install and configure Tailwind v4 (stable release; if still alpha/beta, fall back to v3.4 and note in README)
- [ ] Install and initialize shadcn/ui (`components.json`, base components: button, input, card, dialog, sonner)
- [ ] Set up ESLint (strict TypeScript rules, zero warnings policy) and Prettier

> **Pause point:** After task 4, stop and ask user for `DATABASE_URL` (Neon), Clerk publishable/secret keys. User will paste them into `.env.local`. Then continue.

- [ ] Add `lib/env.ts` with Zod-validated environment variables; throw at startup if any required var is missing. Create `.env.example` with placeholder values (committed to repo). Ensure `.env.local` is in `.gitignore`.
- [ ] Set up Clerk: middleware, sign-in page, sign-up page, user button in layout
- [ ] Create Neon Postgres database (manual step by user; document in README)
- [ ] Set up Drizzle: `drizzle.config.ts`, `lib/db/client.ts`, `lib/db/schema.ts` with a placeholder table (deleted in Phase 1). Verify migrations run end-to-end.
- [ ] Set up Drizzle migrations and `pnpm db:push` script
- [ ] Set up Vitest: `vitest.config.ts`, one trivial passing unit test in `tests/unit/sanity.test.ts`
- [ ] Set up Playwright: `playwright.config.ts`, one trivial passing E2E test that loads the homepage
- [ ] Create `.github/workflows/ci.yml` running: install, lint, typecheck, unit, build, E2E
- [ ] Add `pnpm` scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e`, `db:push`, `db:studio`
- [ ] Create `docs/ARCHITECTURE.md` stub (Status: stub, high-level description of Next.js app + Postgres + cross-account AWS role pattern)
- [ ] Create `docs/AWS_SETUP.md` stub (Status: stub, placeholder for Phase 1 IAM role and CloudFormation details)
- [ ] Write README with: prerequisites (Node 20 LTS, pnpm, AWS account for later), env var list, local setup steps
- [ ] Verify CI passes on a PR to main
- [ ] Deploy to Vercel; verify production build works

### Definition of done

- All tasks checked
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build` all pass locally
- CI green on main
- Production URL on Vercel loads the homepage
- README is followable by a fresh clone

### Stop condition

Once done, commit, push, and stop. Do not start Phase 1.

---

## Phase 1 — AWS account connection

Goal: a user can sign up, install our IAM role CloudFormation stack in their AWS account, and connect their account to the app. We can verify the connection by calling STS GetCallerIdentity. We do not deploy anything yet.

### Tasks

- [ ] Write the IAM role CloudFormation template at `lib/aws/templates/iam-role.yml`
  - Trust policy: our AWS account ID + per-user external ID condition
  - Permissions: scoped to `cloudformation:*` on stacks named `plot-site-*`, `s3:*` on buckets named `plot-site-*`, `cloudfront:*`, `iam:CreateServiceLinkedRole` for CloudFront
  - Outputs: role ARN
- [ ] Validate the template with `aws cloudformation validate-template` in CI (add as CI step)
- [ ] Implement `lib/aws/quick-create-url.ts`: generates a CloudFormation Quick Create URL with our account ID + external ID prefilled
- [ ] Implement `lib/aws/assume-role.ts`: takes role ARN + external ID, returns temp creds. Throws on failure. Full unit tests with `aws-sdk-client-mock`.
- [ ] Add `aws_connections` table to Drizzle schema: `user_id` (PK, FK to Clerk user), `role_arn`, `external_id`, `aws_account_id`, `region`, `connected_at`. Run migration.
- [ ] Implement `lib/db/queries/aws-connections.ts`: get, upsert, delete. Typed.
- [ ] Implement `POST /api/aws/connect`: Zod validates `{ role_arn, region }`. Calls AssumeRole. Calls STS GetCallerIdentity to verify. Stores connection.
- [ ] Implement `GET /api/aws/connection`: returns current user's connection or null.
- [ ] Implement `DELETE /api/aws/connection`: removes the connection (does not delete the role from user's AWS account; document this).
- [ ] Build `/connect` page:
  - If already connected, show account ID, region, "Disconnect" button
  - If not connected, show 3-step instructions: (1) open Quick Create URL [button], (2) finish stack creation in AWS, (3) paste role ARN here [form]
  - Use shadcn `Card`, `Button`, `Input`, `Form`
- [ ] Build `/sites` empty state page (no sites yet)
- [ ] Add app layout with sidebar: links to Sites, Connect AWS, user button
- [ ] Add middleware redirects: signed-out → sign-in; signed-in but no AWS connection → /connect
- [ ] Manual test: install CFN role in a real test AWS account, paste ARN, verify connection succeeds
- [ ] Document the manual test in `docs/MANUAL_TESTING.md`

### Definition of done

- All tasks checked
- Unit tests cover AssumeRole, quick-create-url, all DB queries, all API route handlers
- Manual integration test passes against a real AWS test account
- A new user can sign up and connect their AWS account in under 3 minutes

### Stop condition

Commit, push, stop. Wait for user approval before Phase 2.

---

## Phase 2 — Static site deploy

Goal: a connected user can upload a folder and get a live HTTPS URL. End-to-end deploy works.

### Tasks

- [ ] Write `lib/aws/templates/static-site.yml` CloudFormation template
  - S3 bucket, private, no public access
  - CloudFront distribution with OAC (not OAI — OAI is deprecated)
  - Bucket policy allowing only the OAC
  - Default root object `index.html`
  - Custom error responses: 403/404 → `/index.html` with status 200 (SPA support)
  - HTTPS only, redirect HTTP → HTTPS
  - Outputs: bucket name, distribution ID, distribution domain name
- [ ] Validate the template in CI
- [ ] Add `sites` table to Drizzle schema: `id`, `user_id`, `name`, `stack_name`, `cloudfront_url`, `bucket_name`, `status` (enum: pending/provisioning/live/failed/deleting), `created_at`, `updated_at`
- [ ] Add `deployments` table: `id`, `site_id`, `status`, `started_at`, `finished_at`, `error_message`
- [ ] Implement `lib/db/queries/sites.ts` and `lib/db/queries/deployments.ts`
- [ ] Implement `lib/aws/cloudformation.ts`: `deployStack`, `getStackStatus`, `deleteStack`. Unit tests with `aws-sdk-client-mock`. Handle ROLLBACK_COMPLETE, CREATE_FAILED, etc.
- [ ] Implement `lib/aws/s3-sync.ts`: upload a directory of files to a bucket. Handle content-type detection. Unit tests.
- [ ] Set up our own staging S3 bucket (in our AWS account, not the user's) for upload staging. Document in env vars.
- [ ] Implement `POST /api/sites`: Zod `{ name }`, creates site row with status=pending, returns `{ site_id, upload_urls }` (signed URLs for staging bucket with 1hr TTL)
- [ ] Implement `POST /api/sites/:id/deploy`: triggers CFN deploy, creates deployment row, returns `{ deployment_id }`. Runs deploy in the background (use Vercel's `waitUntil` or a background task pattern).
- [ ] Implement `GET /api/sites/:id/deployments/:deployment_id`: returns current status. Polled by client.
- [ ] Implement `DELETE /api/sites/:id`: deletes the CFN stack from user's account. Empties + deletes bucket. Updates site status.
- [ ] Build `/sites/new` page: file upload (drag-drop folder, fallback to `<input type="file" webkitdirectory>`), site name input, deploy button
- [ ] Build `/sites/[id]` page: site name, status, CloudFront URL, deploy/redeploy button, delete button
- [ ] Build deploy status component with real progress text ("Creating S3 bucket", "Provisioning CloudFront distribution", "Uploading files", "Live")
- [ ] Update `/sites` to list user's sites with status badges
- [ ] Manual test: deploy a real static site to a real AWS account, verify CloudFront URL works, then delete and verify CFN stack is gone
- [ ] Update `docs/MANUAL_TESTING.md` with the full deploy + delete checklist

### Definition of done

- All tasks checked
- Unit tests cover CFN, S3 sync, all queries, all API routes
- Manual integration test passes: deploy works, URL serves content, delete cleans up
- A user can deploy a static site in under 10 minutes from a fresh signup

### Stop condition

Commit, push, stop. Wait for user approval before Phase 3.

---

## Phase 3 — Polish

Goal: ship a v0 that's actually demoable. Error handling, loading states, landing page, README.

### Tasks

- [ ] Error states for every failure mode:
  - AssumeRole fails (role deleted, trust policy wrong, external ID mismatch)
  - CFN deploy fails / rolls back
  - S3 sync partial failure
  - CloudFront propagation timeout
  - Each error page tells the user what went wrong and the next step. No raw stack traces in UI.
- [ ] Loading states for every async UI action
- [ ] Empty states for sites list (no sites yet)
- [ ] Toast notifications via shadcn `sonner` for success/error events
- [ ] Site detail: show resource details (bucket name, distribution ID), copy buttons, link to AWS Console for the resources
- [ ] Build `(marketing)/page.tsx` landing page:
  - Headline: "Deploy static sites to your own AWS account in 5 minutes."
  - Sub: "You own everything. We don't store your credentials. CloudFront + S3, set up in one click."
  - Three feature blurbs
  - "Get started" CTA → sign up
  - Developer-targeted copy. No beginner hand-holding yet.
- [ ] Update README with: what it is, how it works, local setup, deploying to Vercel, contributing
- [ ] Record a 60-second demo video (out of scope for Claude Code, but leave a placeholder section in README)
- [ ] Final pass: every page is mobile-responsive (not perfect, just not broken)
- [ ] Final pass: every form has loading + error + success states
- [ ] Final pass: lint + typecheck + tests all green; no `console.log` left in code

### Definition of done

- v0 is shippable and demoable
- A second developer can clone the repo and run it locally in under 15 minutes following the README
- Manual test: full happy path from signup → connect → deploy → live URL → delete works clean

### Stop condition

v0 is done. Stop. Do not start Phase 2 of the audience strategy (beginner polish). That's a separate engagement.

---

## Out of scope for v0

Do not build any of these without explicit user approval, even if they seem like obvious next steps:

- Custom domains / Route53 integration
- HTTPS with custom ACM certificates
- GitHub integration / push-to-deploy
- Multi-region support
- Multi-site limit increases / pricing tiers
- Beginner-targeted UX (plain language, guided AWS signup, transparency pages)
- Budget alarm auto-provisioning
- Cost tracking and display
- Backend deployments (Lambda, ECS, etc.)
- Database provisioning (RDS)
- Team / org features
- Stripe billing
- Sentry / PostHog / analytics
- Email (SES, Resend, etc.)

These are all real product needs eventually. None of them are v0.