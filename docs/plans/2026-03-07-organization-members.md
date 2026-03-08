# Organization Members Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add organization member management so owners can add and remove members by GitHub login from the dashboard.

**Architecture:** Extend the organization service layer with list/add/remove member helpers backed by `organization_memberships`, preload those members on the dashboard, and surface a small management UI inside the existing organization cards. Reuse the project-collaborator patterns to keep the feature narrow and predictable.

**Tech Stack:** Next.js App Router, React client components, Supabase SSR, Vitest, TypeScript

### Task 1: Add failing member-management tests

**Files:**
- Modify: `apps/web/src/lib/organizations.test.ts`
- Modify: `apps/web/src/components/organizations-manager.test.ts`

**Step 1: Write failing tests**
Add tests proving owners can add a member in demo mode and that the dashboard renders an organization members section.

**Step 2: Run targeted tests to verify they fail**
Run: `npm test -- apps/web/src/lib/organizations.test.ts apps/web/src/components/organizations-manager.test.ts`
Expected: FAIL because member helpers and member UI do not exist yet.

### Task 2: Implement organization member service helpers

**Files:**
- Modify: `apps/web/src/lib/organizations.ts`

**Step 1: Add list/add/remove member helpers**
Resolve owner permissions, look up profiles by GitHub login in Supabase mode, and support demo-mode memberships.

**Step 2: Re-run targeted service tests**
Run: `npm test -- apps/web/src/lib/organizations.test.ts`
Expected: PASS

### Task 3: Add member APIs and dashboard UI

**Files:**
- Create: `apps/web/src/app/api/organizations/[id]/members/route.ts`
- Create: `apps/web/src/app/api/organizations/[id]/members/[memberId]/route.ts`
- Modify: `apps/web/src/components/organizations-manager.tsx`
- Modify: `apps/web/src/app/dashboard/page.tsx`

**Step 1: Wire members into the org cards**
Render members, add-member form, and remove buttons for owners.

**Step 2: Re-run targeted UI tests**
Run: `npm test -- apps/web/src/components/organizations-manager.test.ts`
Expected: PASS

### Task 4: Document and verify

**Files:**
- Modify: `README.md`

**Step 1: Document org member management**
Explain that org owners can add members by GitHub login.

**Step 2: Run full verification**
Run: `npm test && npm run typecheck && npm run build && docker compose config`
Expected: All commands pass.
