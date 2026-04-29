# Architecture

**Status: stub** — This document will be expanded as the system takes shape.

## High-level overview

Plot is a Next.js web application that lets users deploy static sites to their own AWS account.

- **Frontend + API:** Next.js 15 (App Router) deployed on Vercel
- **Auth:** Clerk handles user authentication and session management
- **Database:** Neon Postgres via Drizzle ORM — stores user accounts, AWS connections, site metadata, and deployment records
- **AWS integration:** Users install a cross-account IAM role in their AWS account via CloudFormation. Plot uses STS AssumeRole to obtain temporary credentials, then provisions S3 + CloudFront resources in the user's account. No AWS credentials are ever stored.

## Key principles

- Resources live in the user's AWS account, not ours
- All AWS resource provisioning goes through CloudFormation
- Temporary credentials only, never stored
- IAM permissions are narrow and explicit
