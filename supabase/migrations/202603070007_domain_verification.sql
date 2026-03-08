alter table public.domains
add column if not exists verification_token text,
add column if not exists last_checked_at timestamptz,
add column if not exists verification_error text;

update public.domains
set verification_token = coalesce(verification_token, encode(gen_random_bytes(12), 'hex'))
where verification_token is null;

alter table public.domains
alter column verification_token set not null;

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
where p.container_id is not null
  and d.verified_at is not null;

grant select on public.gateway_routes to anon, authenticated;
