# NeoPages Local Orchestration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Docker-based local runtime so the dashboard, builder, and gateway can boot together with one command.

**Architecture:** Use a single Node 24 image for all three services, then specialize commands in `compose.yaml`. The builder advertises edge URLs through `EDGE_PUBLIC_ORIGIN`, while a lightweight Node gateway dev server runs the Worker logic without Wrangler.

**Tech Stack:** Docker, Docker Compose, Next.js, tsx, Express, Cloudflare Worker runtime code.

### Task 1: Local URL generation

**Files:**
- Modify: `packages/core/src/hosting.ts`
- Modify: `packages/core/src/models.test.ts`
- Modify: `apps/builder/src/config.ts`
- Modify: `apps/builder/src/build/run-deployment.ts`

**Step 1:** Add a failing test for deployment URLs that preserve host, protocol, and port.

**Step 2:** Implement shared deployment URL helpers and builder config support for `EDGE_PUBLIC_ORIGIN`.

**Step 3:** Use the computed edge URL as the deployment URL when local orchestration is enabled.

### Task 2: Local gateway runtime

**Files:**
- Create: `apps/gateway/src/dev-server.ts`
- Modify: `package.json`

**Step 1:** Add a Node entrypoint that forwards HTTP requests into the Worker `fetch` handler.

**Step 2:** Add package scripts for container-friendly startup commands.

### Task 3: Docker assets and docs

**Files:**
- Create: `.dockerignore`
- Create: `Dockerfile`
- Create: `compose.yaml`
- Modify: `.env.example`
- Modify: `apps/web/next.config.ts`
- Modify: `README.md`

**Step 1:** Add a shared Node image and Compose services for web, builder, and gateway.

**Step 2:** Document the local URLs, required environment variables, and `docker compose up --build` workflow.

**Step 3:** Verify with targeted tests, `npm run build`, and `docker compose config`.
