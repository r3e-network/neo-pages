# NeoPages

NeoPages is a Web3 hosting control plane that lets developers deploy frontend apps to NeoFS with a Vercel-style workflow.

## What is included

- `apps/web`: Next.js dashboard, Supabase-auth session flow, and GitHub App endpoints
- `apps/builder`: Node.js build runner with local and NeoFS storage adapters
- `apps/gateway`: Cloudflare Worker logic plus a Node dev server for local orchestration
- `packages/core`: shared schemas, deployment models, hostname helpers, and demo seed generation
- `supabase`: SQL schema for projects, deployments, domains, gateway lookups, and GitHub App installations
- `scripts/seed-demo.ts`: repeatable Supabase + local artifact seeding for demos

## Deploying to Vercel (Dashboard)

The `apps/web` application is the primary control panel and is designed to run seamlessly on Vercel.

1. Import your GitHub repository to Vercel.
2. Set the **Root Directory** to `apps/web`.
3. Ensure the Framework Preset is set to **Next.js**.
4. Ensure you set your Supabase environment variables (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel project settings.

Vercel will automatically detect the Next.js app in the `apps/web` directory, install all workspace dependencies, and build it using the configuration provided in `vercel.json`.


## Quick start

1. Copy `.env.example` to `.env` and fill the Supabase values you want to use.
2. Install dependencies with `npm install`.
3. Start the dashboard with `npm run dev:web`.
4. Start the builder with `npm run dev:builder`.
5. Start the gateway locally with `npm run dev:gateway`.

## GitHub App setup

To use the GitHub App flow, configure these values in `.env` or your deployment secrets:

- `GITHUB_APP_ID`
- `GITHUB_APP_SLUG`
- `GITHUB_APP_CLIENT_ID`
- `GITHUB_APP_CLIENT_SECRET`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_APP_WEBHOOK_SECRET`

Recommended GitHub App settings:

- **Supabase sign-in callback URL:** `http://localhost:3000/auth/callback` locally, or your production `/auth/callback` URL
- **GitHub App callback URL:** `http://localhost:3000/api/github/callback` locally, or your production `/api/github/callback` URL
- **GitHub App webhook URL:** `http://localhost:3000/api/github/webhook` locally through a tunnel, or your production `/api/github/webhook` URL
- **Request user authorization (OAuth) during installation:** enabled, so NeoPages can sync installations after install

Runtime behavior:

- Users sign in to NeoPages through Supabase GitHub OAuth and get a real cookie-backed session.
- The dashboard redirects signed-in users to the GitHub App install page.
- The GitHub App callback syncs installations into Supabase under the current user.
- The project form auto-suggests repos from the signed-in user's synced installations.
- Installation repositories are cached in Supabase and refreshed on install sync or installation webhooks, so the dashboard does not need to call GitHub on every repo-list request.
- You can proactively refresh stale caches for all users with `npm run github:refresh-cache`, or force a full refresh with `npm run github:refresh-cache -- --force`.
- The builder mints installation access tokens to clone private repos without a long-lived personal token.

## Local Supabase

NeoPages now includes a checked-in `supabase/config.toml` for the local CLI flow.

Recommended workflow:

1. Run `npm run supabase:bootstrap` for the one-shot happy path, or do the manual steps below.
2. Run `npm run supabase:start`.
3. Run `npm run supabase:env` to write `.env.local.supabase`.
4. Source that file or copy the values into `.env.local`.
5. Run `npm run seed:demo` to create the demo user, rows, and local artifacts.
6. Reset the local database with `npm run supabase:reset` when you want a clean schema.

Notes:

- `supabase/seed.sql` is intentionally a placeholder because NeoPages demo seeding needs Auth user creation, which is handled by `scripts/seed-demo.ts`.
- The local auth redirect allow-list already includes the dashboard and local edge gateway URLs.
- `NEOPAGES_BOOTSTRAP_OWNER_ID` is only used by demo/bootstrap tooling now, not by the live multi-user dashboard flow.

## Docker orchestration

Use the local stack when you want the dashboard, builder, and gateway up together:

1. Copy `.env.example` to `.env`.
2. Run `npm run docker:up` or `docker compose up --build`.
3. Preview the seed payload with `npm run seed:demo -- --dry-run`, then seed real data with `npm run seed:demo` on the host, or `npm run seed:demo:docker` from the running stack.
4. Open the dashboard at `http://localhost:3000`.
5. Open the builder health check at `http://localhost:4000/healthz`.
6. Open the seeded site at `http://neo-arcade.localhost:8787` or the seeded custom domain at `http://arcade-demo.localhost:8787`.

Notes:

- The Compose stack sets `NEOPAGES_ROOT_DOMAIN=localhost` and `EDGE_PUBLIC_ORIGIN=http://localhost:8787` so local deployment URLs point back through the gateway.
- The gateway proxies to the builder's local artifact route by setting `NEOFS_GATEWAY_ORIGIN=http://builder:4000/local-gateway`.
- `compose.yaml` bind-mounts `./data/storage` so the host seed script and the builder container share the same artifact directory.
- GitHub webhooks against a local stack still need a tunnel such as Cloudflare Tunnel or ngrok if you want GitHub to reach your machine.

## Demo seeding

`npm run seed:demo` does four things, while `npm run seed:demo -- --dry-run` prints the generated payload without touching Supabase:

1. Creates or reuses a demo auth user in Supabase.
2. Upserts deterministic demo projects, deployments, and one custom-domain mapping.
3. Writes local static artifacts into `data/storage/local-demo-neo-arcade`.
4. Makes the dashboard and gateway immediately explorable without waiting for a real build.

Environment variables for seeding:

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are required.
- `NEOPAGES_ROOT_DOMAIN` and `EDGE_PUBLIC_ORIGIN` control generated deployment URLs.
- `DEMO_SEED_EMAIL` and `DEMO_SEED_PASSWORD` control the seeded demo user.

## Repository cache

- The repo picker reads cached installation repositories from Supabase.
- Users can manually refresh caches from the dashboard form.
- Operators can refresh all stale caches with `npm run github:refresh-cache`.
- `GITHUB_INSTALLATION_CACHE_TTL_MS` controls when a cache is considered stale.

## Preview deployments

- Deployments triggered from the default branch are treated as `production`.
- Deployments triggered from any other branch are treated as `preview`.
- Preview hosts are derived as `<branch-slug>--<project-subdomain>.<root-domain>`.
- The gateway routes the latest successful container for each preview alias, so repeated pushes to the same branch update the same preview URL.

## Release controls

- Successful preview deployments can be promoted to production from the project detail page.
- Older successful production deployments can be re-promoted, which works as a rollback mechanism.
- Promotions create a new production deployment record instead of mutating history in place.

## Project environment variables

- Add per-project environment variables from the project detail page.
- Values are masked in the dashboard and injected into the build sandbox at deploy time.
- Variables can now target `all`, `production`, or `preview`, with environment-specific values overriding the shared defaults.
- This supports both public keys like `NEXT_PUBLIC_*` and private build-time secrets.

## Environment groups

- Owners and editors can define reusable environment variable groups and attach them to multiple projects.
- Group variables are merged before project-specific variables, so project-level settings always win.
- Group variables also support `all`, `production`, and `preview` scopes.

## Deployment webhooks

- Add per-project outgoing webhook endpoints from the project detail page.
- Supported events are `deployment.started`, `deployment.succeeded`, `deployment.failed`, and `deployment.promoted`.
- Endpoints can now choose either generic JSON payloads or Slack-compatible `text` payloads.
- If a signing secret is set, NeoPages sends `x-neopages-signature-256` with an HMAC-SHA256 signature of the raw request body.
- Builder-triggered lifecycle events are dispatched automatically, and production promotions send `deployment.promoted`.
- Delivery attempts are recorded, transient failures are retried with backoff, and exhausted failures are dead-lettered for operator review.
- Operators can process due retries with `npm run webhooks:retry`.

## Plan tiers and quotas

- Each project now has a `plan_tier`, monthly bandwidth limit, and monthly request limit.
- The project detail page can update these quota settings directly.
- Org-owned projects can either keep inheriting quota defaults from the organization or switch to project-specific overrides from the project page.
- Gateway routing enforces both request and bandwidth quotas and returns `429` when a project exceeds either limit.

## Organizations

- Users can create organizations as shared ownership namespaces.
- Org-owned projects inherit quota and release defaults from the organization.
- Project owners can explicitly keep those inherited defaults or disable inheritance and save project-local quota/release overrides.
- Organization owners see org projects as owners; organization members get editor-level access to org projects.
- Organization owners can add or remove members by GitHub login directly from the dashboard.
- Organization owners can also send email invites, and recipients accept them after signing in with the matching email address.
- Organization governance, membership, invite, and org env-group changes now appear in an organization activity feed on the dashboard.
- Organization owners can subscribe activity webhooks in JSON or Slack format and operators can retry pending org deliveries with `npm run webhooks:retry:organizations`.
- Each organization card now includes a portfolio summary with org-owned project count plus aggregate current-month requests and bandwidth.
- Organization cards also list org-owned projects with current health and direct drill-down links into each project.
- Embedded org project lists now support client-side search, status filtering, sorting, saved preferences across refreshes, one-click preset views, visible active/custom preset state, and a one-click reset action for larger teams.
- Organization owners can define organization-scoped environment groups from the dashboard and attach them from any org-owned project.
- Project env vars still win over attached environment-group values, so organization defaults stay safely overrideable per project.

## Collaborators

- Projects can now be shared with collaborators by GitHub login.
- `viewer` can inspect project state, while `editor` can collaborate operationally.
- Only the project owner can manage collaborators.
- Email invites are also supported: owners can create invite links, and recipients accept them after signing in with the matching email address.

## Project API tokens

- Project owners can mint machine tokens for automation and CI/CD.
- Tokens are revealed once, stored hashed, and carry explicit scopes such as `project:read`, `deployments:read`, and `deployments:write`.
- Deployment listing and manual deploy triggers now accept these tokens via `Authorization: Bearer <token>` or `x-neopages-project-token`.

## Deploy hooks

- Project owners can also create signed deploy hooks for external CI systems.
- Each hook has a unique URL plus a secret used to sign request bodies with `x-neopages-signature-256`.
- Deploy hooks queue deployments without exposing a long-lived API token to the CI provider.

## Manual redeploys

- Owners and editors can queue manual deployments directly from the project page.
- Using the default branch queues a production deployment, while other branches queue previews.

## Deploy schedules

- Projects can define cron-based deploy schedules in UTC or another IANA timezone.
- Schedules queue the configured branch automatically and can be processed with `npm run schedules:run`.
- Scheduled triggers are recorded in the project activity feed.

## Deployment artifacts

- Successful deployments now persist an artifact manifest with file paths, sizes, and content types.
- The project detail page can browse artifact lists and open/download individual outputs via the deployment URL.

## Deployment timeline

- The project detail page now supports environment/status filters for deployment history.
- Timeline rows show duration metadata for started/finished deployments.
- Active deployments continue to poll live logs while terminal deployments remain filterable for audit and rollback workflows.

## Deployment cancellation

- Queued, building, and uploading deployments can now be cancelled from the project detail page.
- The builder exposes an internal cancel endpoint and aborts active build processes with `SIGTERM`.
- Cancelled production deployments fall back to the previously live production state when possible.

## Project activity

- NeoPages records a project activity stream for key actions such as project creation, deployment lifecycle changes, domain changes, env var updates, webhook changes, and release approvals.
- The project detail page renders the most recent activity entries so operators can understand what changed without leaving the dashboard.

## Promotion approvals

- Each project can define a release policy with an allow-list of promotable branches.
- Projects can optionally require approval before a preview deployment is promoted to production.
- Promotion requests can be approved or rejected from the project detail page.

## Live deployment logs

- The builder now flushes deployment logs incrementally while builds are running.
- The project detail page polls `/api/projects/[id]/deployments` every 2 seconds while any deployment is active.
- This keeps the UI updated for `queued`, `building`, and `uploading` states without a full page refresh.

## Custom domains

- Add custom domains from the project detail page.
- NeoPages generates a TXT challenge at `_neopages.<your-host>` plus a routing target at `cname.<root-domain>`.
- A domain becomes gateway-routable only after `verified_at` is set, and the `gateway_routes` view now filters out unverified domains.
- Verification checks TXT ownership and also surfaces a routing hint if the CNAME still points elsewhere.

## Environment model

- Dashboard reads `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Dashboard auth uses `@supabase/ssr` cookies plus middleware-driven session refresh.
- Builder reads `SUPABASE_URL` or falls back to `NEXT_PUBLIC_SUPABASE_URL`, then polls queued deployments or runs them on demand.
- Builder can also read `EDGE_PUBLIC_ORIGIN` to publish local gateway URLs instead of raw builder preview URLs.
- Gateway reads `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ROOT_DOMAIN`, `DASHBOARD_ORIGIN`, and `NEOFS_GATEWAY_ORIGIN`.

## Storage backends

- `local`: copies build artifacts to `data/storage/<container-id>` and exposes them through the builder for local preview.
- `neofs`: shells out through the NeoFS adapter. The upload seam is isolated in `apps/builder/src/storage/neofs.ts` so you can swap CLI details for your target environment.

## Validation

- `npm test`
- `npm run typecheck`
- `npm run build`
- `docker compose config`
