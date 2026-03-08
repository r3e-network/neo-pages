alter table public.projects
add column if not exists plan_tier text not null default 'free',
add column if not exists monthly_request_limit bigint not null default 100000;

alter table public.projects
add constraint projects_plan_tier_check
check (plan_tier in ('free', 'pro', 'enterprise', 'custom')) not valid;

alter table public.projects validate constraint projects_plan_tier_check;

create or replace view public.gateway_routes as
select
  p.id as project_id,
  p.subdomain as host,
  p.container_id,
  p.deployment_url,
  p.status,
  p.monthly_bandwidth_limit_bytes,
  p.monthly_request_limit
from public.projects p
where p.container_id is not null
union all
select
  d.project_id,
  d.host,
  p.container_id,
  p.deployment_url,
  p.status,
  p.monthly_bandwidth_limit_bytes,
  p.monthly_request_limit
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
  previews.monthly_bandwidth_limit_bytes,
  previews.monthly_request_limit
from (
  select distinct on (d.preview_alias)
    d.project_id,
    d.preview_alias,
    d.container_id,
    d.deployment_url,
    d.status,
    p.monthly_bandwidth_limit_bytes,
    p.monthly_request_limit,
    d.created_at
  from public.deployments d
  join public.projects p on p.id = d.project_id
  where d.environment = 'preview'
    and d.preview_alias is not null
    and d.container_id is not null
  order by d.preview_alias, d.created_at desc
) previews;

grant select on public.gateway_routes to anon, authenticated;
