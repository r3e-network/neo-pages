create table if not exists public.project_webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  endpoint_id uuid references public.project_webhook_endpoints (id) on delete set null,
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
  constraint project_webhook_deliveries_status_check check (status in ('pending', 'retrying', 'succeeded', 'dead_lettered'))
);

create index if not exists project_webhook_deliveries_project_idx on public.project_webhook_deliveries (project_id, created_at desc);
create index if not exists project_webhook_deliveries_retry_idx on public.project_webhook_deliveries (status, next_retry_at);

alter table public.project_webhook_deliveries enable row level security;

drop trigger if exists project_webhook_deliveries_touch_updated_at on public.project_webhook_deliveries;
create trigger project_webhook_deliveries_touch_updated_at
before update on public.project_webhook_deliveries
for each row
execute function public.touch_updated_at();

drop policy if exists "Project webhook deliveries visible to owner" on public.project_webhook_deliveries;
create policy "Project webhook deliveries visible to owner"
on public.project_webhook_deliveries
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
