create table if not exists public.project_deploy_hooks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  secret text not null,
  last_triggered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists project_deploy_hooks_project_idx on public.project_deploy_hooks (project_id);
create index if not exists project_deploy_hooks_owner_idx on public.project_deploy_hooks (owner_id);

alter table public.project_deploy_hooks enable row level security;

drop trigger if exists project_deploy_hooks_touch_updated_at on public.project_deploy_hooks;
create trigger project_deploy_hooks_touch_updated_at
before update on public.project_deploy_hooks
for each row
execute function public.touch_updated_at();

drop policy if exists "Project deploy hooks visible to owner" on public.project_deploy_hooks;
create policy "Project deploy hooks visible to owner"
on public.project_deploy_hooks
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
