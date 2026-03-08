# NeoPages Demo Seed Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a repeatable seed flow that creates demo data in Supabase and writes matching local artifacts for the builder gateway.

**Architecture:** Put deterministic demo data generation in `packages/core`, then consume it from a Node seed script. The script creates or reuses a demo auth user, upserts projects and deployments, writes local artifact files, and leaves the dashboard immediately explorable.

**Tech Stack:** TypeScript, Supabase Admin API, Node.js filesystem APIs, tsx.

### Task 1: Shared seed bundle

**Files:**
- Create: `packages/core/src/demo-seed.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/src/demo-seed.test.ts`

**Step 1:** Write failing tests for deterministic projects, domains, URLs, and artifacts.

**Step 2:** Implement `createDemoSeedBundle` and export it from the core package.

### Task 2: Runtime seed script

**Files:**
- Create: `scripts/seed-demo.ts`
- Modify: `package.json`
- Modify: `tsconfig.json`

**Step 1:** Add a Node script that loads env vars, ensures a demo auth user exists, writes artifacts, and upserts rows.

**Step 2:** Add npm scripts for host and Docker execution.

### Task 3: Local stack integration

**Files:**
- Modify: `apps/web/src/lib/demo-store.ts`
- Modify: `compose.yaml`
- Modify: `.env.example`
- Modify: `README.md`

**Step 1:** Reuse the shared demo seed bundle for in-memory fallback data.

**Step 2:** Bind local storage into Compose so the seed script and builder see the same artifacts.

**Step 3:** Document `npm run seed:demo` and `npm run seed:demo:docker`.
