create table if not exists public.organization_activity_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists organization_activity_events_org_idx on public.organization_activity_events (organization_id, created_at desc);
create index if not exists organization_activity_events_owner_idx on public.organization_activity_events (owner_id, created_at desc);

alter table public.organization_activity_events enable row level security;

drop policy if exists "Organization activity visible to owner" on public.organization_activity_events;
create policy "Organization activity visible to owner"
on public.organization_activity_events
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
