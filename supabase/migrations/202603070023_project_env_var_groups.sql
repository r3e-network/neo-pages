create table if not exists public.project_env_var_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_env_var_group_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.project_env_var_groups (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  key text not null,
  value text not null,
  environment text not null default 'all',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (group_id, key, environment),
  constraint project_env_var_group_items_environment_check check (environment in ('all', 'production', 'preview'))
);

create table if not exists public.project_env_var_group_links (
  project_id uuid not null references public.projects (id) on delete cascade,
  group_id uuid not null references public.project_env_var_groups (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (project_id, group_id)
);

alter table public.project_env_var_groups enable row level security;
alter table public.project_env_var_group_items enable row level security;
alter table public.project_env_var_group_links enable row level security;

drop trigger if exists project_env_var_groups_touch_updated_at on public.project_env_var_groups;
create trigger project_env_var_groups_touch_updated_at
before update on public.project_env_var_groups
for each row
execute function public.touch_updated_at();

drop trigger if exists project_env_var_group_items_touch_updated_at on public.project_env_var_group_items;
create trigger project_env_var_group_items_touch_updated_at
before update on public.project_env_var_group_items
for each row
execute function public.touch_updated_at();

drop policy if exists "Project env var groups visible to owner" on public.project_env_var_groups;
create policy "Project env var groups visible to owner"
on public.project_env_var_groups
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Project env var group items visible to owner" on public.project_env_var_group_items;
create policy "Project env var group items visible to owner"
on public.project_env_var_group_items
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Project env var group links visible to owner" on public.project_env_var_group_links;
create policy "Project env var group links visible to owner"
on public.project_env_var_group_links
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
