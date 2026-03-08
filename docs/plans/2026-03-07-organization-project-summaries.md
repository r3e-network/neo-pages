# Organization Project Summaries Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show org-owned projects with drill-down links and latest health directly inside each organization card.

**Architecture:** Reuse the dashboard’s existing project summaries, add a tiny grouping helper keyed by `organization_id`, and render a compact org project list component inside each organization card. Keep this read-only and avoid extra queries by using data already loaded on the dashboard.

**Tech Stack:** Next.js App Router, React client components, Vitest, TypeScript

### Task 1: Add failing org project summary tests

**Files:**
- Create: `apps/web/src/lib/organization-projects.test.ts`
- Modify: `apps/web/src/components/organizations-manager.test.ts`

**Step 1: Write failing tests**
Add a helper test that groups project summaries by org id and a UI test showing the org card renders a projects section with status and links.

**Step 2: Run targeted tests to verify failure**
Run: `npm test -- apps/web/src/lib/organization-projects.test.ts apps/web/src/components/organizations-manager.test.ts`
Expected: FAIL because org project grouping and UI do not exist yet.

### Task 2: Implement grouping helper and UI

**Files:**
- Create: `apps/web/src/lib/organization-projects.ts`
- Create: `apps/web/src/components/organization-projects-list.tsx`
- Modify: `apps/web/src/components/organizations-manager.tsx`
- Modify: `apps/web/src/app/dashboard/page.tsx`

**Step 1: Build the minimal grouping and render path**
Group already-loaded dashboard projects by org id and render a compact project list inside each org card.

**Step 2: Re-run targeted tests**
Run: `npm test -- apps/web/src/lib/organization-projects.test.ts apps/web/src/components/organizations-manager.test.ts`
Expected: PASS

### Task 3: Document and verify

**Files:**
- Modify: `README.md`

**Step 1: Document org project drill-down visibility**
Explain that org cards now show org-owned projects and current health.

**Step 2: Run full verification**
Run: `npm test && npm run typecheck && npm run build && docker compose config`
Expected: All commands pass.
