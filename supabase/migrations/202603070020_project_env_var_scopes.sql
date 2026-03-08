alter table public.project_env_vars
add column if not exists environment text not null default 'all';

update public.project_env_vars
set environment = 'all'
where environment is null;

alter table public.project_env_vars
add constraint project_env_vars_environment_check
check (environment in ('all', 'production', 'preview')) not valid;

alter table public.project_env_vars validate constraint project_env_vars_environment_check;

drop index if exists project_env_vars_project_idx;
drop index if exists project_env_vars_owner_idx;

create index if not exists project_env_vars_project_idx on public.project_env_vars (project_id);
create index if not exists project_env_vars_owner_idx on public.project_env_vars (owner_id);
create unique index if not exists project_env_vars_project_key_environment_idx on public.project_env_vars (project_id, key, environment);
