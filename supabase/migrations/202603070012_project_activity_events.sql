create table if not exists public.project_activity_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists project_activity_events_project_idx on public.project_activity_events (project_id, created_at desc);
create index if not exists project_activity_events_owner_idx on public.project_activity_events (owner_id, created_at desc);

alter table public.project_activity_events enable row level security;

drop policy if exists "Project activity visible to owner" on public.project_activity_events;
create policy "Project activity visible to owner"
on public.project_activity_events
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
