create table if not exists public.project_env_vars (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  key text not null,
  value text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, key)
);

create index if not exists project_env_vars_project_idx on public.project_env_vars (project_id);
create index if not exists project_env_vars_owner_idx on public.project_env_vars (owner_id);

alter table public.project_env_vars enable row level security;

drop trigger if exists project_env_vars_touch_updated_at on public.project_env_vars;
create trigger project_env_vars_touch_updated_at
before update on public.project_env_vars
for each row
execute function public.touch_updated_at();

drop policy if exists "Project env vars visible to owner" on public.project_env_vars;
create policy "Project env vars visible to owner"
on public.project_env_vars
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
