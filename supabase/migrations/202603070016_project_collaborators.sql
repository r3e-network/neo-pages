create table if not exists public.project_collaborators (
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  collaborator_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'viewer',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (project_id, collaborator_id),
  constraint project_collaborators_role_check check (role in ('viewer', 'editor'))
);

create index if not exists project_collaborators_owner_idx on public.project_collaborators (owner_id);
create index if not exists project_collaborators_collaborator_idx on public.project_collaborators (collaborator_id);

alter table public.project_collaborators enable row level security;

drop trigger if exists project_collaborators_touch_updated_at on public.project_collaborators;
create trigger project_collaborators_touch_updated_at
before update on public.project_collaborators
for each row
execute function public.touch_updated_at();

drop policy if exists "Project collaborators visible to participants" on public.project_collaborators;
create policy "Project collaborators visible to participants"
on public.project_collaborators
for all
using (auth.uid() = owner_id or auth.uid() = collaborator_id)
with check (auth.uid() = owner_id);
