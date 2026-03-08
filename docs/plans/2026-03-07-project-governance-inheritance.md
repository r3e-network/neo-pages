# Project Governance Inheritance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make organization quota and release-policy inheritance explicit on project pages, including the ability for org-owned projects to keep inheriting or switch to project-local overrides.

**Architecture:** Reuse existing project quota and release-policy APIs, extend them with inheritance flags, and surface the current source of truth in the client cards. Keep the server as the authority for org membership and inherited defaults so the UI only renders the effective state plus intent toggles.

**Tech Stack:** Next.js App Router, React client components, Supabase SSR, Vitest, TypeScript

### Task 1: Define test coverage for inherited project governance

**Files:**
- Create: `apps/web/src/components/project-governance-inheritance.test.ts`
- Modify: `apps/web/src/lib/usage.test.ts`

**Step 1: Write failing tests**
Add tests that show inherited quota and release-policy cards render org source messaging and hide local editing until override mode is enabled.

**Step 2: Run targeted tests to verify failure**
Run: `npm test -- apps/web/src/components/project-governance-inheritance.test.ts apps/web/src/lib/usage.test.ts`
Expected: FAIL because the cards and service helpers do not yet expose inheritance behavior.

### Task 2: Extend server write paths with inheritance flags

**Files:**
- Modify: `apps/web/src/lib/usage.ts`
- Modify: `apps/web/src/lib/release-policies.ts`
- Modify: `apps/web/src/app/api/projects/[id]/quota/route.ts`
- Modify: `apps/web/src/app/api/projects/[id]/release-policy/route.ts`

**Step 1: Add minimal server-side support**
Allow quota and release-policy writes to explicitly keep org inheritance on, or switch to project-local values.

**Step 2: Re-run targeted tests**
Run: `npm test -- apps/web/src/lib/usage.test.ts`
Expected: PASS

### Task 3: Surface inheritance in project cards

**Files:**
- Modify: `apps/web/src/components/project-quota-manager.tsx`
- Modify: `apps/web/src/components/project-release-policy-manager.tsx`
- Modify: `apps/web/src/app/projects/[id]/page.tsx`
- Modify: `apps/web/src/lib/projects-service.ts`

**Step 1: Render inherited source and override state**
Show org source labels, default/edit modes, and the current effective values.

**Step 2: Re-run UI tests**
Run: `npm test -- apps/web/src/components/project-governance-inheritance.test.ts`
Expected: PASS

### Task 4: Document and verify

**Files:**
- Modify: `README.md`

**Step 1: Document project governance inheritance behavior**
Describe how org inheritance affects quota and release policy editing.

**Step 2: Run full verification**
Run: `npm test && npm run typecheck && npm run build && docker compose config`
Expected: All commands pass.
