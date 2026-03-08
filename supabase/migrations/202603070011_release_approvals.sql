create table if not exists public.project_release_policies (
  project_id uuid primary key references public.projects (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  require_promotion_approval boolean not null default false,
  protected_branches text[] not null default array['main']::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.deployment_promotion_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  deployment_id uuid not null references public.deployments (id) on delete cascade,
  target_environment public.deployment_environment not null default 'production',
  status text not null default 'pending',
  request_comment text,
  requested_by uuid not null references public.profiles (id) on delete cascade,
  reviewed_by uuid references public.profiles (id) on delete set null,
  review_comment text,
  created_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  constraint deployment_promotion_requests_status_check check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists deployment_promotion_requests_project_idx on public.deployment_promotion_requests (project_id, created_at desc);
create unique index if not exists deployment_promotion_requests_pending_unique on public.deployment_promotion_requests (deployment_id) where status = 'pending';

alter table public.project_release_policies enable row level security;
alter table public.deployment_promotion_requests enable row level security;

drop trigger if exists project_release_policies_touch_updated_at on public.project_release_policies;
create trigger project_release_policies_touch_updated_at
before update on public.project_release_policies
for each row
execute function public.touch_updated_at();

drop policy if exists "Project release policies visible to owner" on public.project_release_policies;
create policy "Project release policies visible to owner"
on public.project_release_policies
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Promotion requests visible to owner" on public.deployment_promotion_requests;
create policy "Promotion requests visible to owner"
on public.deployment_promotion_requests
for all
using (
  exists (
    select 1 from public.projects p where p.id = deployment_promotion_requests.project_id and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.projects p where p.id = deployment_promotion_requests.project_id and p.owner_id = auth.uid()
  )
);
