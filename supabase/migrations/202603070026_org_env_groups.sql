alter table public.project_env_var_groups
add column if not exists organization_id uuid references public.organizations (id) on delete cascade;

alter table public.project_env_var_group_items
add column if not exists organization_id uuid references public.organizations (id) on delete cascade;

create index if not exists project_env_var_groups_org_idx on public.project_env_var_groups (organization_id);
create index if not exists project_env_var_group_items_org_idx on public.project_env_var_group_items (organization_id);
