create table if not exists public.project_deploy_schedules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  branch text not null,
  cron_expression text not null,
  timezone text not null default 'UTC',
  active boolean not null default true,
  next_run_at timestamptz,
  last_run_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists project_deploy_schedules_project_idx on public.project_deploy_schedules (project_id);
create index if not exists project_deploy_schedules_next_run_idx on public.project_deploy_schedules (active, next_run_at);

alter table public.project_deploy_schedules enable row level security;

drop trigger if exists project_deploy_schedules_touch_updated_at on public.project_deploy_schedules;
create trigger project_deploy_schedules_touch_updated_at
before update on public.project_deploy_schedules
for each row
execute function public.touch_updated_at();

drop policy if exists "Project deploy schedules visible to owner" on public.project_deploy_schedules;
create policy "Project deploy schedules visible to owner"
on public.project_deploy_schedules
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
