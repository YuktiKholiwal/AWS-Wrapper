# Plot

Deploy static sites to your own AWS account in 5 minutes. You own everything — S3 bucket, CloudFront distribution, all in your account. We don't store your credentials.

## How it works

1. **Connect your AWS account** — Install a scoped IAM role via CloudFormation (one click). Plot uses temporary credentials to manage resources.
2. **Deploy** — Pick a folder, click deploy. Plot creates an S3 bucket and CloudFront distribution in your account.
3. **Live** — Your site is served over HTTPS via CloudFront. Redeploy anytime. Delete when done — everything is cleaned up.

## Tech stack

Next.js 15 · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Clerk · Neon Postgres · Drizzle ORM · AWS SDK v3

## Prerequisites

- **Node.js 20 LTS** (`nvm use` will pick up the `.nvmrc`)
- **pnpm** (`npm install -g pnpm`)
- **Neon Postgres** database ([neon.tech](https://neon.tech))
- **Clerk** account ([clerk.com](https://clerk.com))
- **AWS account** with an IAM user for the Plot service (see `docs/AWS_SETUP.md`)

## Local setup

1. Clone and install:

   ```bash
   git clone https://github.com/YuktiKholiwal/AWS-Wrapper.git
   cd AWS-Wrapper
   pnpm install
   ```

2. Copy the example env file and fill in your values:

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Description |
   |----------|-------------|
   | `DATABASE_URL` | Neon Postgres connection string |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
   | `CLERK_SECRET_KEY` | Clerk secret key |
   | `AWS_ACCOUNT_ID` | Your 12-digit AWS account ID |
   | `AWS_ACCESS_KEY_ID` | IAM user access key (needs `sts:AssumeRole`) |
   | `AWS_SECRET_ACCESS_KEY` | IAM user secret key |
   | `CFN_TEMPLATE_URL` | S3 URL to the IAM role CloudFormation template |

3. Push the database schema:

   ```bash
   pnpm db:push
   ```

4. Start the dev server:

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint (zero warnings policy) |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright E2E tests |
| `pnpm db:push` | Push Drizzle schema to database |
| `pnpm db:studio` | Open Drizzle Studio |

## Deploying to Vercel

1. Import the repo in the [Vercel dashboard](https://vercel.com/new)
2. Set all environment variables from `.env.example` in Vercel project settings (enable for both Production and Preview)
3. Deploy — Vercel auto-detects Next.js

## CI

GitHub Actions runs on every push and PR to `main`: install, lint, typecheck, unit tests, build, E2E tests. Add the environment variables as repository secrets.

## Project structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── (dashboard)/        # Authenticated pages (sites, connect)
│   ├── api/                # API route handlers
│   └── page.tsx            # Landing page
├── components/             # Shared UI components
├── lib/
│   ├── aws/                # AWS SDK wrappers and CloudFormation templates
│   ├── db/                 # Drizzle schema, client, and query modules
│   └── env.ts              # Zod-validated environment variables
└── middleware.ts            # Clerk auth middleware
```

## Docs

- `docs/ARCHITECTURE.md` — System design overview
- `docs/AWS_SETUP.md` — IAM role and CloudFormation details
- `docs/MANUAL_TESTING.md` — Manual test checklists
- `docs/PLAN.md` — Phased build plan

## Demo

<!-- Placeholder: 60-second demo video will go here -->

## Contributing

1. Branch per feature, conventional commits
2. `pnpm lint && pnpm typecheck && pnpm test` must all pass
3. PR to `main`, CI must be green
