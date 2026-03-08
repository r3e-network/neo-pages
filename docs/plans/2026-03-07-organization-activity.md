# Organization Activity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an organization activity feed so owners and members can audit org-level governance, membership, invite, and env-group changes from the dashboard.

**Architecture:** Mirror the existing project activity pattern with a dedicated organization activity model, event labels, storage table, service helpers, and dashboard feed. Record activity at the source of each organization-level action instead of trying to infer it later.

**Tech Stack:** Next.js App Router, React server/client components, Supabase SQL, Vitest, TypeScript

### Task 1: Add failing org activity tests

**Files:**
- Create: `apps/web/src/lib/organization-activity.test.ts`
- Modify: `apps/web/src/components/organizations-manager.test.ts`

**Step 1: Write failing tests**
Add tests that prove org activity labels format correctly, demo-mode activity can be recorded/listed, and the dashboard renders an activity section.

**Step 2: Run targeted tests to verify failure**
Run: `npm test -- apps/web/src/lib/organization-activity.test.ts apps/web/src/components/organizations-manager.test.ts`
Expected: FAIL because org activity services and UI do not exist yet.

### Task 2: Implement org activity core and storage

**Files:**
- Modify: `packages/core/src/activity.ts`
- Modify: `packages/core/src/models.ts`
- Create: `supabase/migrations/202603070028_organization_activity.sql`
- Create: `apps/web/src/lib/organization-activity.ts`

**Step 1: Add event definitions and persistence helpers**
Create dedicated org activity event labels and a storage/service layer matching the project activity pattern.

**Step 2: Re-run targeted service tests**
Run: `npm test -- apps/web/src/lib/organization-activity.test.ts packages/core/src/activity.test.ts`
Expected: PASS

### Task 3: Record org activity and render feed

**Files:**
- Modify: `apps/web/src/lib/organizations.ts`
- Modify: `apps/web/src/lib/organization-invites.ts`
- Modify: `apps/web/src/lib/project-env-groups.ts`
- Modify: `apps/web/src/components/organizations-manager.tsx`
- Modify: `apps/web/src/app/dashboard/page.tsx`

**Step 1: Record org actions and show a feed per org**
Capture governance updates, member add/remove, invite create/revoke/accept, and org env-group writes/deletes, then render recent entries inside each org card.

**Step 2: Re-run targeted UI tests**
Run: `npm test -- apps/web/src/components/organizations-manager.test.ts`
Expected: PASS

### Task 4: Document and verify

**Files:**
- Modify: `README.md`

**Step 1: Document org activity auditing**
Explain that org-level actions now appear in the dashboard activity feed.

**Step 2: Run full verification**
Run: `npm test && npm run typecheck && npm run build && docker compose config`
Expected: All commands pass.
