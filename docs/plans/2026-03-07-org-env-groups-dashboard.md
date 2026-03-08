# Org Env Groups Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add organization-scoped environment group management and make org inheritance explicit in the NeoPages dashboard.

**Architecture:** Extend the existing organization service/API surface to expose org-scoped env-group CRUD from the dashboard, then surface inherited groups and governance on project pages without changing env resolution precedence. Keep project env vars overriding env-group vars, and keep org membership checks centralized in server helpers.

**Tech Stack:** Next.js App Router, React client components, Supabase SSR, Vitest, TypeScript

### Task 1: Inspect current org/env-group wiring

**Files:**
- Modify: `apps/web/src/lib/project-env-groups.ts`
- Modify: `apps/web/src/lib/organizations.ts`
- Modify: `apps/web/src/components/organizations-manager.tsx`
- Modify: `apps/web/src/components/project-env-groups-manager.tsx`

**Step 1: Read current ownership and access helpers**
Run: `sed -n '1,260p' apps/web/src/lib/project-env-groups.ts`
Expected: See org ownership + access checks already present.

**Step 2: Read current org dashboard surface**
Run: `sed -n '1,260p' apps/web/src/components/organizations-manager.tsx`
Expected: See governance editing without direct env-group CRUD.

### Task 2: Add failing tests for org env-group behavior

**Files:**
- Test: `apps/web/src/lib/project-env-groups.test.ts`

**Step 1: Write failing tests**
Add tests that prove org-owned projects can list org env groups and org-scoped groups can be created via shared ownership resolution.

**Step 2: Run the targeted test to verify it fails**
Run: `npm test -- project-env-groups.test.ts`
Expected: FAIL because the new behavior/UI contract is not fully implemented.

**Step 3: Write minimal implementation**
Update server helpers or component props only as needed to satisfy the tests.

**Step 4: Re-run targeted test to verify it passes**
Run: `npm test -- project-env-groups.test.ts`
Expected: PASS

### Task 3: Add org dashboard env-group management UI

**Files:**
- Modify: `apps/web/src/components/organizations-manager.tsx`
- Modify: `apps/web/src/lib/organizations.ts`
- Modify: `apps/web/src/app/dashboard/page.tsx`

**Step 1: Add the smallest UI/API surface**
Render each organization’s env groups inside the org manager and support create/delete flows reusing the existing env-group APIs or thin org wrappers.

**Step 2: Run focused tests**
Run: `npm test -- organizations.test.ts project-env-groups.test.ts`
Expected: PASS

### Task 4: Make project inheritance explicit

**Files:**
- Modify: `apps/web/src/components/project-env-groups-manager.tsx`

**Step 1: Show inherited org context**
Display which groups come from the organization and clarify precedence/inheritance for org-owned projects.

**Step 2: Verify UI compiles**
Run: `npm run typecheck`
Expected: PASS

### Task 5: Document and verify

**Files:**
- Modify: `README.md`

**Step 1: Document env-group inheritance**
Explain organization-scoped env groups and project precedence.

**Step 2: Run full verification**
Run: `npm test && npm run typecheck && npm run build && docker compose config`
Expected: All commands pass.
