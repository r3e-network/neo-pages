# Organization Member Invites Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let organization owners invite members by email and let recipients accept those invites after signing in.

**Architecture:** Mirror the existing project collaborator invite flow with a dedicated organization invite table, a small invite service, API endpoints, and an organization invite acceptance page. Keep role scope narrow to `member` for now and add the invite UI inside the existing organization cards.

**Tech Stack:** Next.js App Router, React client components, Supabase SSR, Vitest, TypeScript, Supabase SQL migrations

### Task 1: Add failing invite tests

**Files:**
- Create: `apps/web/src/lib/organization-invites.test.ts`
- Modify: `apps/web/src/components/organizations-manager.test.ts`

**Step 1: Write failing tests**
Add service tests for creating and accepting org invites in demo mode, and UI tests proving the org dashboard renders an invite section.

**Step 2: Run targeted tests to verify failure**
Run: `npm test -- apps/web/src/lib/organization-invites.test.ts apps/web/src/components/organizations-manager.test.ts`
Expected: FAIL because org invite services and UI do not exist yet.

### Task 2: Implement invite storage and service helpers

**Files:**
- Modify: `packages/core/src/models.ts`
- Create: `apps/web/src/lib/organization-invites.ts`
- Create: `supabase/migrations/202603070027_organization_member_invites.sql`

**Step 1: Add minimal invite model and helpers**
Support list/create/revoke/get-by-token/accept flows with email matching and demo-mode support.

**Step 2: Re-run targeted service tests**
Run: `npm test -- apps/web/src/lib/organization-invites.test.ts`
Expected: PASS

### Task 3: Add API routes and dashboard/acceptance UI

**Files:**
- Create: `apps/web/src/app/api/organizations/[id]/invites/route.ts`
- Create: `apps/web/src/app/api/organizations/[id]/invites/[inviteId]/route.ts`
- Create: `apps/web/src/app/api/organization-invites/[token]/accept/route.ts`
- Create: `apps/web/src/app/organization-invites/[token]/page.tsx`
- Create: `apps/web/src/components/accept-organization-invite-card.tsx`
- Modify: `apps/web/src/components/organizations-manager.tsx`
- Modify: `apps/web/src/app/dashboard/page.tsx`

**Step 1: Wire invites into org cards**
Render invite creation/revoke controls for owners and an acceptance page for recipients.

**Step 2: Re-run targeted UI tests**
Run: `npm test -- apps/web/src/components/organizations-manager.test.ts`
Expected: PASS

### Task 4: Document and verify

**Files:**
- Modify: `README.md`

**Step 1: Document org email invites**
Explain invite creation and acceptance flow.

**Step 2: Run full verification**
Run: `npm test && npm run typecheck && npm run build && docker compose config`
Expected: All commands pass.
