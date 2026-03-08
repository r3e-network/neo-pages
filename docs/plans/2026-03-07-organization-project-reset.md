# Organization Project Reset Filters Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a one-click reset action for organization project filters.

**Architecture:** Reuse the existing default filter helper and active preset logic to derive whether the current state is dirty, then expose a reset button that restores the default preset and writes that state back through the existing localStorage flow.

**Tech Stack:** Next.js React client components, Vitest, TypeScript

### Task 1: Add failing reset tests

**Files:**
- Modify: `apps/web/src/lib/organization-projects.test.ts`
- Modify: `apps/web/src/components/organizations-manager.test.ts`

**Step 1: Write failing tests**
Add helper coverage for detecting non-default filter state and a UI assertion proving the reset button renders.

**Step 2: Run targeted tests to verify failure**
Run: `npm test -- apps/web/src/lib/organization-projects.test.ts apps/web/src/components/organizations-manager.test.ts`
Expected: FAIL because the dirty-state helper and reset action do not exist yet.

### Task 2: Implement reset helper and button

**Files:**
- Modify: `apps/web/src/lib/organization-projects.ts`
- Modify: `apps/web/src/components/organization-projects-list.tsx`

**Step 1: Add the smallest reset model**
Detect whether current filters differ from defaults and allow a single button to restore defaults.

**Step 2: Re-run targeted tests**
Run: `npm test -- apps/web/src/lib/organization-projects.test.ts apps/web/src/components/organizations-manager.test.ts`
Expected: PASS

### Task 3: Document and verify

**Files:**
- Modify: `README.md`

**Step 1: Document reset behavior**
Mention that org project list filters can be reset to the default preset in one click.

**Step 2: Run full verification**
Run: `npm test && npm run typecheck && npm run build && docker compose config`
Expected: All commands pass.
