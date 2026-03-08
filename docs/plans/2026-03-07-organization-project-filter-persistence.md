# Organization Project Filter Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Persist each organization project list’s search/filter/sort state across refreshes.

**Architecture:** Add pure helpers for normalizing and serializing org project list filter state, then hydrate/persist those values from `localStorage` inside the client component using an org-specific storage key. Keep SSR deterministic by rendering defaults first and loading saved state in an effect.

**Tech Stack:** Next.js React client components, localStorage, Vitest, TypeScript

### Task 1: Add failing persistence tests

**Files:**
- Modify: `apps/web/src/lib/organization-projects.test.ts`

**Step 1: Write failing tests**
Add helper coverage for default filters, storage key generation, and raw persisted-state normalization.

**Step 2: Run targeted tests to verify failure**
Run: `npm test -- apps/web/src/lib/organization-projects.test.ts`
Expected: FAIL because persistence helpers do not exist yet.

### Task 2: Implement persistence helpers and component wiring

**Files:**
- Modify: `apps/web/src/lib/organization-projects.ts`
- Modify: `apps/web/src/components/organization-projects-list.tsx`
- Modify: `apps/web/src/components/organizations-manager.tsx`

**Step 1: Add local filter persistence**
Load and save org-specific query/status/sort values via localStorage.

**Step 2: Re-run targeted tests**
Run: `npm test -- apps/web/src/lib/organization-projects.test.ts apps/web/src/components/organizations-manager.test.ts`
Expected: PASS

### Task 3: Document and verify

**Files:**
- Modify: `README.md`

**Step 1: Document persistent org project filters**
Mention that embedded org project list preferences survive refreshes.

**Step 2: Run full verification**
Run: `npm test && npm run typecheck && npm run build && docker compose config`
Expected: All commands pass.
