create table if not exists public.organization_webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  target_url text not null,
  secret text,
  payload_format text not null default 'json',
  events text[] not null default array['organization.member.invited']::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint organization_webhook_endpoints_payload_format_check check (payload_format in ('json', 'slack'))
);

create table if not exists public.organization_webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  endpoint_id uuid references public.organization_webhook_endpoints (id) on delete set null,
  target_url text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  last_response_status integer,
  last_response_body text,
  last_error text,
  next_retry_at timestamptz,
  delivered_at timestamptz,
  dead_lettered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint organization_webhook_deliveries_status_check check (status in ('pending', 'retrying', 'succeeded', 'dead_lettered'))
);

create index if not exists organization_webhook_endpoints_org_idx on public.organization_webhook_endpoints (organization_id);
create index if not exists organization_webhook_endpoints_owner_idx on public.organization_webhook_endpoints (owner_id);
create index if not exists organization_webhook_deliveries_org_idx on public.organization_webhook_deliveries (organization_id, created_at desc);
create index if not exists organization_webhook_deliveries_retry_idx on public.organization_webhook_deliveries (status, next_retry_at);

alter table public.organization_webhook_endpoints enable row level security;
alter table public.organization_webhook_deliveries enable row level security;

drop trigger if exists organization_webhook_endpoints_touch_updated_at on public.organization_webhook_endpoints;
create trigger organization_webhook_endpoints_touch_updated_at
before update on public.organization_webhook_endpoints
for each row
execute function public.touch_updated_at();

drop trigger if exists organization_webhook_deliveries_touch_updated_at on public.organization_webhook_deliveries;
create trigger organization_webhook_deliveries_touch_updated_at
before update on public.organization_webhook_deliveries
for each row
execute function public.touch_updated_at();

drop policy if exists "Organization webhook endpoints visible to owner" on public.organization_webhook_endpoints;
create policy "Organization webhook endpoints visible to owner"
on public.organization_webhook_endpoints
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Organization webhook deliveries visible to owner" on public.organization_webhook_deliveries;
create policy "Organization webhook deliveries visible to owner"
on public.organization_webhook_deliveries
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
