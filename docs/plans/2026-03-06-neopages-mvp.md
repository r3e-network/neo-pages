# NeoPages MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an MVP of NeoPages with a dashboard, deployment builder, Supabase schema, and Cloudflare edge gateway.

**Architecture:** One TypeScript repo with a Next.js dashboard, a Node.js builder service, and a Cloudflare Worker. Shared types and hostname helpers live in `packages/core`, while Supabase stores all project and deployment state.

**Tech Stack:** Next.js, React, TypeScript, Express, Supabase, Cloudflare Workers, Vitest, tsup.

### Task 1: Repository scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md`

**Step 1:** Write configuration files for a three-runtime TypeScript repo.

**Step 2:** Add dependency scripts for web, builder, worker, typecheck, tests, and build.

**Step 3:** Verify the config is internally consistent with `npm install`, `npm run typecheck`, and `npm test` once source files exist.

### Task 2: Shared schemas and database contract

**Files:**
- Create: `packages/core/src/index.ts`
- Create: `packages/core/src/models.ts`
- Create: `packages/core/src/hosting.ts`
- Test: `packages/core/src/models.test.ts`
- Create: `supabase/migrations/202603060001_init.sql`

**Step 1:** Write tests for slug generation, host lookup, and output-directory defaults.

**Step 2:** Implement the shared enums, Zod schemas, and helper functions.

**Step 3:** Write the Supabase schema and public gateway view.

### Task 3: Builder service

**Files:**
- Create: `apps/builder/src/server.ts`
- Create: `apps/builder/src/config.ts`
- Create: `apps/builder/src/build/build-plan.ts`
- Create: `apps/builder/src/build/sandbox.ts`
- Create: `apps/builder/src/build/run-deployment.ts`
- Create: `apps/builder/src/storage/local.ts`
- Create: `apps/builder/src/storage/neofs.ts`
- Test: `apps/builder/src/build/build-plan.test.ts`

**Step 1:** Write tests for package-manager detection and sandbox command generation.

**Step 2:** Implement builder config, deployment orchestration, and local preview gateway.

**Step 3:** Add the NeoFS adapter seam for production uploads.

### Task 4: Dashboard

**Files:**
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/dashboard/page.tsx`
- Create: `apps/web/src/app/projects/[id]/page.tsx`
- Create: `apps/web/src/app/api/projects/route.ts`
- Create: `apps/web/src/app/api/github/webhook/route.ts`
- Create: `apps/web/src/components/*.tsx`

**Step 1:** Build the marketing page and dashboard shell.

**Step 2:** Implement project creation and deployment listing against Supabase with a demo fallback.

**Step 3:** Add webhook handling and GitHub OAuth entry point.

### Task 5: Gateway worker and verification

**Files:**
- Create: `apps/gateway/src/index.ts`
- Create: `apps/gateway/src/index.test.ts`
- Create: `apps/gateway/wrangler.toml`

**Step 1:** Write host-rewrite tests.

**Step 2:** Implement the Worker’s Supabase route lookup and proxy behavior.

**Step 3:** Run `npm test`, `npm run typecheck`, and `npm run build`.

