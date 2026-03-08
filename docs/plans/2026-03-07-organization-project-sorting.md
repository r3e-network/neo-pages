# Organization Project Sorting Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add client-side sorting to each organization’s embedded project list.

**Architecture:** Extend the existing org project helper with a pure sort step and expose a sort selector in the project list component. Keep it fully client-side and based on already-loaded dashboard project summaries, optionally using latest deployment timestamps when available.

**Tech Stack:** Next.js React client components, Vitest, TypeScript

### Task 1: Add failing sort tests

**Files:**
- Modify: `apps/web/src/lib/organization-projects.test.ts`
- Modify: `apps/web/src/components/organizations-manager.test.ts`

**Step 1: Write failing tests**
Add helper tests for recent/name/health sorting and a UI test proving the org project list renders a sort selector.

**Step 2: Run targeted tests to verify failure**
Run: `npm test -- apps/web/src/lib/organization-projects.test.ts apps/web/src/components/organizations-manager.test.ts`
Expected: FAIL because sort helpers and controls do not exist yet.

### Task 2: Implement sorting helper and control

**Files:**
- Modify: `apps/web/src/lib/organization-projects.ts`
- Modify: `apps/web/src/components/organization-projects-list.tsx`
- Modify: `apps/web/src/app/dashboard/page.tsx`

**Step 1: Add minimal sort model**
Support recent, health, and name sorting using latest deployment timestamps when present.

**Step 2: Re-run targeted tests**
Run: `npm test -- apps/web/src/lib/organization-projects.test.ts apps/web/src/components/organizations-manager.test.ts`
Expected: PASS

### Task 3: Document and verify

**Files:**
- Modify: `README.md`

**Step 1: Document org project sorting**
Mention that embedded org project lists now support search, status filtering, and sorting.

**Step 2: Run full verification**
Run: `npm test && npm run typecheck && npm run build && docker compose config`
Expected: All commands pass.
