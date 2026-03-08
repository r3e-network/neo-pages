alter table public.projects
add column if not exists monthly_bandwidth_limit_bytes bigint not null default 10737418240;

create table if not exists public.project_usage_daily (
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  usage_date date not null,
  request_count bigint not null default 0,
  bandwidth_bytes bigint not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (project_id, usage_date)
);

create index if not exists project_usage_daily_owner_idx on public.project_usage_daily (owner_id, usage_date desc);

alter table public.project_usage_daily enable row level security;

drop trigger if exists project_usage_daily_touch_updated_at on public.project_usage_daily;
create trigger project_usage_daily_touch_updated_at
before update on public.project_usage_daily
for each row
execute function public.touch_updated_at();

drop policy if exists "Project usage visible to owner" on public.project_usage_daily;
create policy "Project usage visible to owner"
on public.project_usage_daily
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create or replace view public.project_usage_current_month as
select
  project_id,
  sum(request_count)::bigint as request_count,
  sum(bandwidth_bytes)::bigint as bandwidth_bytes
from public.project_usage_daily
where usage_date >= date_trunc('month', timezone('utc', now()))::date
group by project_id;

grant select on public.project_usage_current_month to anon, authenticated;

create or replace view public.gateway_routes as
select
  p.id as project_id,
  p.subdomain as host,
  p.container_id,
  p.deployment_url,
  p.status,
  p.monthly_bandwidth_limit_bytes
from public.projects p
where p.container_id is not null
union all
select
  d.project_id,
  d.host,
  p.container_id,
  p.deployment_url,
  p.status,
  p.monthly_bandwidth_limit_bytes
from public.domains d
join public.projects p on p.id = d.project_id
where p.container_id is not null
  and d.verified_at is not null
union all
select
  previews.project_id,
  previews.preview_alias as host,
  previews.container_id,
  previews.deployment_url,
  previews.status,
  previews.monthly_bandwidth_limit_bytes
from (
  select distinct on (d.preview_alias)
    d.project_id,
    d.preview_alias,
    d.container_id,
    d.deployment_url,
    d.status,
    p.monthly_bandwidth_limit_bytes,
    d.created_at
  from public.deployments d
  join public.projects p on p.id = d.project_id
  where d.environment = 'preview'
    and d.preview_alias is not null
    and d.container_id is not null
  order by d.preview_alias, d.created_at desc
) previews;

grant select on public.gateway_routes to anon, authenticated;
