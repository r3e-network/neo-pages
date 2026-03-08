create table if not exists public.deployment_artifacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  deployment_id uuid not null references public.deployments (id) on delete cascade,
  path text not null,
  size_bytes bigint not null default 0,
  content_type text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (deployment_id, path)
);

create index if not exists deployment_artifacts_project_idx on public.deployment_artifacts (project_id, deployment_id);

alter table public.deployment_artifacts enable row level security;

drop policy if exists "Deployment artifacts visible to project participants" on public.deployment_artifacts;
create policy "Deployment artifacts visible to project participants"
on public.deployment_artifacts
for all
using (
  exists (
    select 1 from public.projects p
    where p.id = deployment_artifacts.project_id
      and p.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.project_collaborators c
    where c.project_id = deployment_artifacts.project_id
      and c.collaborator_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.projects p
    where p.id = deployment_artifacts.project_id
      and p.owner_id = auth.uid()
  )
);
