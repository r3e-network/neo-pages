# Organization Usage Rollups Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show an organization-level portfolio summary with project counts and aggregate monthly usage on each organization card.

**Architecture:** Add a small org usage service that aggregates org-owned projects plus the current-month usage view, then preload that data on the dashboard and render a compact portfolio section inside the existing organization manager. Keep the first increment read-only and avoid changing quota enforcement semantics.

**Tech Stack:** Next.js App Router, React client components, Supabase SQL views, Vitest, TypeScript

### Task 1: Add failing org usage tests

**Files:**
- Create: `apps/web/src/lib/organization-usage.test.ts`
- Modify: `apps/web/src/components/organizations-manager.test.ts`

**Step 1: Write failing tests**
Add a pure rollup test for aggregate project/live/request/bandwidth totals and a UI test showing the org portfolio section renders.

**Step 2: Run targeted tests to verify failure**
Run: `npm test -- apps/web/src/lib/organization-usage.test.ts apps/web/src/components/organizations-manager.test.ts`
Expected: FAIL because org usage services and UI do not exist yet.

### Task 2: Implement org usage aggregation

**Files:**
- Create: `apps/web/src/lib/organization-usage.ts`

**Step 1: Add minimal aggregation helpers**
Support demo-mode zero/default results and Supabase aggregation across org-owned projects.

**Step 2: Re-run targeted service tests**
Run: `npm test -- apps/web/src/lib/organization-usage.test.ts`
Expected: PASS

### Task 3: Surface org portfolio summary on dashboard cards

**Files:**
- Create: `apps/web/src/components/organization-usage-summary-card.tsx`
- Modify: `apps/web/src/components/organizations-manager.tsx`
- Modify: `apps/web/src/app/dashboard/page.tsx`

**Step 1: Render the org rollup card**
Show total projects, live projects, request count, and bandwidth for the current month.

**Step 2: Re-run targeted UI tests**
Run: `npm test -- apps/web/src/components/organizations-manager.test.ts`
Expected: PASS

### Task 4: Document and verify

**Files:**
- Modify: `README.md`

**Step 1: Document organization portfolio visibility**
Explain that each org card now includes aggregate project usage.

**Step 2: Run full verification**
Run: `npm test && npm run typecheck && npm run build && docker compose config`
Expected: All commands pass.
