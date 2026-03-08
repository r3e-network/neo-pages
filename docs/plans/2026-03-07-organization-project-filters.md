# Organization Project Filters Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add text search and status filtering to each organization’s embedded project list.

**Architecture:** Keep filtering client-side and local to the org card by adding a small pure helper for query/status matching, then use component state in the org project list UI. Reuse the already-loaded grouped project summaries so no extra data fetching is required.

**Tech Stack:** Next.js React client components, Vitest, TypeScript

### Task 1: Add failing filter tests

**Files:**
- Modify: `apps/web/src/lib/organization-projects.test.ts`
- Modify: `apps/web/src/components/organizations-manager.test.ts`

**Step 1: Write failing tests**
Add a helper test for text/status filtering and a UI test proving the org project list renders search/filter controls.

**Step 2: Run targeted tests to verify failure**
Run: `npm test -- apps/web/src/lib/organization-projects.test.ts apps/web/src/components/organizations-manager.test.ts`
Expected: FAIL because filtering helpers and control UI do not exist yet.

### Task 2: Implement client-side filters

**Files:**
- Modify: `apps/web/src/lib/organization-projects.ts`
- Modify: `apps/web/src/components/organization-projects-list.tsx`

**Step 1: Add the smallest useful filter model**
Support free-text matching across project name and repo, plus a status selector using latest project health.

**Step 2: Re-run targeted tests**
Run: `npm test -- apps/web/src/lib/organization-projects.test.ts apps/web/src/components/organizations-manager.test.ts`
Expected: PASS

### Task 3: Document and verify

**Files:**
- Modify: `README.md`

**Step 1: Document org project filtering**
Mention that org cards now support client-side search/filter on embedded projects.

**Step 2: Run full verification**
Run: `npm test && npm run typecheck && npm run build && docker compose config`
Expected: All commands pass.
