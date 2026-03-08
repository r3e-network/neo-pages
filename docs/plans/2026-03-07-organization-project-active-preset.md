# Organization Project Active Preset Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the active org project preset obvious and surface a `Custom` state when current filters no longer match a preset.

**Architecture:** Add a small pure helper that resolves filters into a preset id or `custom`, then reuse it in the project list component to drive button highlighting and a visible active-state label. Keep the logic local and derive everything from the existing persisted filter state.

**Tech Stack:** Next.js React client components, Vitest, TypeScript

### Task 1: Add failing active-preset tests

**Files:**
- Modify: `apps/web/src/lib/organization-projects.test.ts`
- Modify: `apps/web/src/components/organizations-manager.test.ts`

**Step 1: Write failing tests**
Add helper coverage for preset resolution and a UI assertion for the visible active preset label.

**Step 2: Run targeted tests to verify failure**
Run: `npm test -- apps/web/src/lib/organization-projects.test.ts apps/web/src/components/organizations-manager.test.ts`
Expected: FAIL because active preset helpers and labels do not exist yet.

### Task 2: Implement active preset derivation and UI state

**Files:**
- Modify: `apps/web/src/lib/organization-projects.ts`
- Modify: `apps/web/src/components/organization-projects-list.tsx`

**Step 1: Add the smallest active-state model**
Resolve `all`, `failures`, `live`, `alphabetical`, or `custom` from current filters and use it for button highlight + label.

**Step 2: Re-run targeted tests**
Run: `npm test -- apps/web/src/lib/organization-projects.test.ts apps/web/src/components/organizations-manager.test.ts`
Expected: PASS

### Task 3: Document and verify

**Files:**
- Modify: `README.md`

**Step 1: Document active preset/custom state**
Mention that preset buttons reflect the active view and custom filter combinations are surfaced.

**Step 2: Run full verification**
Run: `npm test && npm run typecheck && npm run build && docker compose config`
Expected: All commands pass.
