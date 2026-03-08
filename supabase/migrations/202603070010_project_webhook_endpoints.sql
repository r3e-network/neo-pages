create table if not exists public.project_webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  target_url text not null,
  secret text,
  events text[] not null default array['deployment.succeeded']::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists project_webhook_endpoints_project_idx on public.project_webhook_endpoints (project_id);
create index if not exists project_webhook_endpoints_owner_idx on public.project_webhook_endpoints (owner_id);

alter table public.project_webhook_endpoints enable row level security;

drop trigger if exists project_webhook_endpoints_touch_updated_at on public.project_webhook_endpoints;
create trigger project_webhook_endpoints_touch_updated_at
before update on public.project_webhook_endpoints
for each row
execute function public.touch_updated_at();

drop policy if exists "Project webhook endpoints visible to owner" on public.project_webhook_endpoints;
create policy "Project webhook endpoints visible to owner"
on public.project_webhook_endpoints
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
