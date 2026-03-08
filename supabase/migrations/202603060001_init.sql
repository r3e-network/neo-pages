create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'project_status') then
    create type public.project_status as enum ('draft', 'queued', 'building', 'uploading', 'deployed', 'failed');
  end if;

  if not exists (select 1 from pg_type where typname = 'deployment_status') then
    create type public.deployment_status as enum ('queued', 'building', 'uploading', 'deployed', 'failed', 'cancelled');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  github_login text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  repo_full_name text not null,
  repo_url text,
  subdomain text not null unique,
  status public.project_status not null default 'queued',
  framework text,
  root_directory text not null default '.',
  output_directory text,
  install_command text,
  build_command text,
  default_branch text not null default 'main',
  container_id text,
  deployment_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.deployments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  status public.deployment_status not null default 'queued',
  branch text not null,
  commit_sha text,
  commit_message text,
  container_id text,
  deployment_url text,
  logs text,
  created_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz,
  finished_at timestamptz
);

create table if not exists public.domains (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  host text not null unique,
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at
before update on public.projects
for each row
execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, github_login, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'user_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.deployments enable row level security;
alter table public.domains enable row level security;

drop policy if exists "Profiles are readable by owner" on public.profiles;
create policy "Profiles are readable by owner"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "Projects owned by user" on public.projects;
create policy "Projects owned by user"
on public.projects
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Deployments visible to project owner" on public.deployments;
create policy "Deployments visible to project owner"
on public.deployments
for all
using (
  exists (
    select 1
    from public.projects p
    where p.id = deployments.project_id
      and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = deployments.project_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists "Domains visible to project owner" on public.domains;
create policy "Domains visible to project owner"
on public.domains
for all
using (
  exists (
    select 1
    from public.projects p
    where p.id = domains.project_id
      and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = domains.project_id
      and p.owner_id = auth.uid()
  )
);

create or replace view public.gateway_routes as
select
  p.id as project_id,
  p.subdomain as host,
  p.container_id,
  p.deployment_url,
  p.status
from public.projects p
where p.container_id is not null
union all
select
  d.project_id,
  d.host,
  p.container_id,
  p.deployment_url,
  p.status
from public.domains d
join public.projects p on p.id = d.project_id
where p.container_id is not null;

grant select on public.gateway_routes to anon, authenticated;

