do $$
begin
  if not exists (select 1 from pg_type where typname = 'deployment_environment') then
    create type public.deployment_environment as enum ('production', 'preview');
  end if;
end $$;

alter table public.deployments
add column if not exists environment public.deployment_environment not null default 'production',
add column if not exists preview_alias text;

create index if not exists deployments_preview_alias_created_at_idx on public.deployments (preview_alias, created_at desc);

drop view if exists public.gateway_routes;

create or replace view public.gateway_routes as
select
  p.id as project_id,
  p.subdomain as host,
  p.container_id,
  p.deployment_url,
  p.status::text as status
from public.projects p
where p.container_id is not null
union all
select
  d.project_id,
  d.host,
  p.container_id,
  p.deployment_url,
  p.status::text as status
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
  previews.status::text as status
from (
  select distinct on (d.preview_alias)
    d.project_id,
    d.preview_alias,
    d.container_id,
    d.deployment_url,
    d.status,
    d.created_at
  from public.deployments d
  where d.environment = 'preview'
    and d.preview_alias is not null
    and d.container_id is not null
  order by d.preview_alias, d.created_at desc
) previews;

grant select on public.gateway_routes to anon, authenticated;
