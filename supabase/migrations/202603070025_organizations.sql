create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  slug text not null unique,
  plan_tier text not null default 'free',
  monthly_bandwidth_limit_bytes bigint not null default 10737418240,
  monthly_request_limit bigint not null default 100000,
  require_promotion_approval boolean not null default false,
  protected_branches text[] not null default array['main']::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint organizations_plan_tier_check check (plan_tier in ('free', 'pro', 'enterprise', 'custom'))
);

create table if not exists public.organization_memberships (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (organization_id, user_id),
  constraint organization_memberships_role_check check (role in ('owner', 'member'))
);

alter table public.projects
add column if not exists organization_id uuid references public.organizations (id) on delete set null,
add column if not exists use_organization_quotas boolean not null default false,
add column if not exists use_organization_release_policy boolean not null default false;

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;

drop trigger if exists organizations_touch_updated_at on public.organizations;
create trigger organizations_touch_updated_at
before update on public.organizations
for each row
execute function public.touch_updated_at();

drop trigger if exists organization_memberships_touch_updated_at on public.organization_memberships;
create trigger organization_memberships_touch_updated_at
before update on public.organization_memberships
for each row
execute function public.touch_updated_at();

drop policy if exists "Organizations visible to members" on public.organizations;
create policy "Organizations visible to members"
on public.organizations
for all
using (
  auth.uid() = owner_id or exists (
    select 1 from public.organization_memberships m
    where m.organization_id = organizations.id and m.user_id = auth.uid()
  )
)
with check (auth.uid() = owner_id);

drop policy if exists "Organization memberships visible to members" on public.organization_memberships;
create policy "Organization memberships visible to members"
on public.organization_memberships
for all
using (
  auth.uid() = user_id or exists (
    select 1 from public.organizations o
    where o.id = organization_memberships.organization_id and o.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.organizations o
    where o.id = organization_memberships.organization_id and o.owner_id = auth.uid()
  )
);
