# Plot

AWS deployment for humans. Users connect their AWS account via cross-account IAM role and deploy static sites without touching the Console. Resources live in their account.

See `docs/ARCHITECTURE.md` for system design.
See `docs/PLAN.md` for the current phased build plan and what to work on next.
See `docs/AWS_SETUP.md` for IAM role and CloudFormation details.

## Tech stack (locked)

Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind v4 · shadcn/ui · Clerk auth · Neon Postgres · Drizzle ORM · AWS SDK v3 · Zod · React Hook Form · Vitest · Playwright · pnpm · Vercel.

Do not add: Redux, tRPC, GraphQL, Prisma, Material UI, Chakra, Storybook, Docker, Sentry, PostHog, Stripe.

## Hard rules

- Never store AWS credentials. STS AssumeRole produces temporary creds; use them in-memory for one operation, discard.
- All user-account resource provisioning goes through CloudFormation. No raw SDK calls for resource creation.
- IAM role permissions are narrow and explicit. Never request `*:*`.
- Every API input is Zod-validated. No exceptions.
- Files are under 300 lines. Split when approaching the limit.
- TypeScript strict. No `any`. No untyped `as` casts.
- Server components by default; `"use client"` only when needed.
- No barrel files.

## Workflow

- Branch per feature. Conventional commits. No direct commits to main.
- A task is done when: code written, unit tests pass, lint passes, typecheck passes, manually verified.
- If a decision is ambiguous, stop and ask. Don't invent. Don't guess at AWS behavior — verify against AWS SDK docs.
- Never write tests that hit real AWS. Mock the SDK with `aws-sdk-client-mock`. Real AWS testing is manual via `docs/MANUAL_TESTING.md`.
- After completing a phase in `docs/PLAN.md`, stop and wait for user approval before the next phase.

## Commands

- `pnpm dev` — local dev server
- `pnpm test` — Vitest unit tests
- `pnpm test:e2e` — Playwright E2E
- `pnpm lint` — ESLint, must be zero warnings
- `pnpm typecheck` — tsc --noEmit
- `pnpm db:push` — Drizzle schema push
- `pnpm db:studio` — Drizzle Studio

## Anti-patterns

- Do not abstract for hypothetical future deploy types. Static site only in v0.
- Do not add features not asked for.
- Do not skip Zod validation.
- Do not store credentials anywhere.
- Do not commit half-done phases.
- Do not request broader IAM permissions than the current phase needs.
