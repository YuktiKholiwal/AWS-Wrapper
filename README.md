# Plot

Deploy static sites to your own AWS account. You own everything — we just set it up.

## Prerequisites

- **Node.js 20 LTS** (`nvm use` will pick up the `.nvmrc`)
- **pnpm** (`npm install -g pnpm`)
- **AWS account** (needed later for deploying sites, not required for local dev)

## Local setup

1. Clone the repo:

   ```bash
   git clone https://github.com/YuktiKholiwal/AWS-Wrapper.git
   cd AWS-Wrapper
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Copy the example env file and fill in your values:

   ```bash
   cp .env.example .env.local
   ```

   Required environment variables:

   | Variable                            | Description                                    |
   | ----------------------------------- | ---------------------------------------------- |
   | `DATABASE_URL`                      | Neon Postgres connection string                |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (starts with `pk_test_`) |
   | `CLERK_SECRET_KEY`                  | Clerk secret key (starts with `sk_test_`)      |

4. Push the database schema:

   ```bash
   pnpm db:push
   ```

5. Start the dev server:

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command          | Description                     |
| ---------------- | ------------------------------- |
| `pnpm dev`       | Start development server        |
| `pnpm build`     | Production build                |
| `pnpm start`     | Start production server         |
| `pnpm lint`      | ESLint (zero warnings policy)   |
| `pnpm typecheck` | TypeScript type checking        |
| `pnpm test`      | Vitest unit tests               |
| `pnpm test:e2e`  | Playwright E2E tests            |
| `pnpm format`    | Format with Prettier            |
| `pnpm db:push`   | Push Drizzle schema to database |
| `pnpm db:studio` | Open Drizzle Studio             |

## Deploying to Vercel

1. Import the repo in the [Vercel dashboard](https://vercel.com/new)
2. Set the environment variables (`DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) in Vercel project settings
3. Deploy — Vercel auto-detects Next.js

## CI

GitHub Actions runs on every push and PR to `main`:

- Install, lint, typecheck, unit tests, build, E2E tests

To enable CI, add the three environment variables as repository secrets in GitHub Settings > Secrets and variables > Actions.

## Demo

<!-- Placeholder: 60-second demo video will go here -->
