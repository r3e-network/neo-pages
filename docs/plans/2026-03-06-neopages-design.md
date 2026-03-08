# NeoPages MVP Design

> Goal: ship a single-repo MVP that proves the full control-plane → builder → storage → edge-routing loop.

## Recommended approach

I’m taking the “one repo, three runtimes” route instead of over-splitting the codebase. The dashboard is a Next.js app, the builder is a standalone Node service, and the gateway is a Cloudflare Worker. They share typed schemas and hostname helpers through a small core package. This keeps the MVP cohesive while still matching the production architecture the platform will eventually scale into.

The critical product decision is to support **two storage modes** from day one. `local` storage makes the repo runnable for demos and local testing. `neofs` storage keeps the real production path intact via a dedicated adapter seam. That means the whole product can be exercised end to end before the final NeoFS signing and wallet details are wired for a specific infra environment.

## Data flow

The dashboard owns user-facing state. Creating a project inserts a `projects` row and immediately creates a queued `deployments` row. GitHub push webhooks map repository events back to a project and create more queued deployments. The builder either polls queued deployments or runs a specific deployment on demand. It clones the repo, chooses a package manager, executes the build inside a local shell or Docker sandbox, and uploads the output directory through a storage provider.

On success, the builder writes the resulting `container_id`, deployment URL, and status back to Supabase. The Cloudflare Worker performs host lookup through a public gateway view and rewrites requests to the upstream gateway origin. In production that origin is NeoFS HTTP gateway. In local development it can be the builder’s local artifact route so the routing layer behaves the same way.

## Error handling and safety

Every deployment keeps an append-only log blob plus explicit timestamps for queued, started, and finished states. Builder failures are pushed back into Supabase with `failed` status so the dashboard remains the source of truth. Webhook signature validation is isolated in the dashboard API. The builder supports Docker sandbox commands to keep untrusted repo builds away from the host when desired.

## Testing scope

The MVP test suite covers the most failure-prone pure logic: subdomain generation, framework/output detection, sandbox command construction, and edge host rewriting. The runtime integrations stay thin and configurable so they can be exercised manually with real credentials after the static test suite passes.

