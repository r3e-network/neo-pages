# Organization Webhooks Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add organization-scoped outgoing webhooks so org activity can fan out to Slack or custom endpoints.

**Architecture:** Mirror the existing project webhook stack with organization endpoint and delivery tables, organization notification payload builders, demo-mode endpoint/delivery helpers, and dashboard UI inside each organization card. Trigger deliveries directly from org activity recording so every org audit event can be forwarded consistently.

**Tech Stack:** Next.js App Router, React client components, Supabase SQL, Vitest, TypeScript

### Task 1: Add failing webhook tests

**Files:**
- Modify: `packages/core/src/notifications.test.ts`
- Modify: `packages/core/src/notification-formats.test.ts`
- Create: `apps/web/src/lib/organization-webhooks.test.ts`
- Modify: `apps/web/src/components/organizations-manager.test.ts`

**Step 1: Write failing tests**
Add org notification payload/format tests, a demo-mode org delivery test using a local HTTP server, and a UI test proving org webhook sections render.

**Step 2: Run targeted tests to verify failure**
Run: `npm test -- packages/core/src/notifications.test.ts packages/core/src/notification-formats.test.ts apps/web/src/lib/organization-webhooks.test.ts apps/web/src/components/organizations-manager.test.ts`
Expected: FAIL because org webhook utilities and UI do not exist yet.

### Task 2: Implement org notification/webhook core

**Files:**
- Modify: `packages/core/src/notifications.ts`
- Modify: `packages/core/src/models.ts`
- Create: `supabase/migrations/202603070029_organization_webhooks.sql`
- Create: `apps/web/src/lib/organization-webhooks.ts`

**Step 1: Add endpoint, delivery, and payload helpers**
Support list/create/delete/deliver/retry flows and reuse the existing retry classifier.

**Step 2: Re-run targeted service/core tests**
Run: `npm test -- packages/core/src/notifications.test.ts packages/core/src/notification-formats.test.ts apps/web/src/lib/organization-webhooks.test.ts`
Expected: PASS

### Task 3: Add dashboard UI and APIs

**Files:**
- Create: `apps/web/src/components/organization-webhooks-manager.tsx`
- Create: `apps/web/src/components/organization-webhook-deliveries-feed.tsx`
- Create: `apps/web/src/app/api/organizations/[id]/webhooks/route.ts`
- Create: `apps/web/src/app/api/organizations/[id]/webhooks/[endpointId]/route.ts`
- Modify: `apps/web/src/components/organizations-manager.tsx`
- Modify: `apps/web/src/app/dashboard/page.tsx`
- Create: `scripts/retry-organization-webhooks.ts`

**Step 1: Render webhook CRUD and recent deliveries**
Preload org endpoints/deliveries, wire POST/DELETE actions, and expose a retry script for operators.

**Step 2: Re-run targeted UI tests**
Run: `npm test -- apps/web/src/components/organizations-manager.test.ts`
Expected: PASS

### Task 4: Wire delivery from org activity and verify

**Files:**
- Modify: `apps/web/src/lib/organization-activity.ts`
- Modify: `README.md`

**Step 1: Fan out org activity to webhooks**
Deliver every recorded org activity event to subscribed org endpoints.

**Step 2: Run full verification**
Run: `npm test && npm run typecheck && npm run build && docker compose config`
Expected: All commands pass.
