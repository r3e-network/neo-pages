# Organization Project Presets Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add one-click preset views for organization project lists.

**Architecture:** Extend the existing org project filter helper with named presets that resolve to query/status/sort combinations, then render a small preset button row in the client component. Preset clicks reuse the existing local filter state, so persistence continues to work without extra storage design.

**Tech Stack:** Next.js React client components, Vitest, TypeScript

### Task 1: Add failing preset tests

**Files:**
- Modify: `apps/web/src/lib/organization-projects.test.ts`
- Modify: `apps/web/src/components/organizations-manager.test.ts`

**Step 1: Write failing tests**
Add helper coverage for preset mappings and a UI test proving the preset buttons render.

**Step 2: Run targeted tests to verify failure**
Run: `npm test -- apps/web/src/lib/organization-projects.test.ts apps/web/src/components/organizations-manager.test.ts`
Expected: FAIL because preset helpers and buttons do not exist yet.

### Task 2: Implement preset helpers and UI

**Files:**
- Modify: `apps/web/src/lib/organization-projects.ts`
- Modify: `apps/web/src/components/organization-projects-list.tsx`

**Step 1: Add minimal presets**
Support All, Failures, Live, and A-Z presets.

**Step 2: Re-run targeted tests**
Run: `npm test -- apps/web/src/lib/organization-projects.test.ts apps/web/src/components/organizations-manager.test.ts`
Expected: PASS

### Task 3: Document and verify

**Files:**
- Modify: `README.md`

**Step 1: Document org project presets**
Mention that org cards now include common project-list presets.

**Step 2: Run full verification**
Run: `npm test && npm run typecheck && npm run build && docker compose config`
Expected: All commands pass.
