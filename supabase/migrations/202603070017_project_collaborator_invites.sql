create table if not exists public.project_collaborator_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  email text not null,
  role text not null default 'viewer',
  invite_token text not null unique,
  status text not null default 'pending',
  invited_by uuid not null references public.profiles (id) on delete cascade,
  accepted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  responded_at timestamptz,
  constraint project_collaborator_invites_role_check check (role in ('viewer', 'editor')),
  constraint project_collaborator_invites_status_check check (status in ('pending', 'accepted', 'revoked'))
);

create index if not exists project_collaborator_invites_project_idx on public.project_collaborator_invites (project_id, created_at desc);
create index if not exists project_collaborator_invites_email_idx on public.project_collaborator_invites (email);

alter table public.project_collaborator_invites enable row level security;

drop policy if exists "Project collaborator invites visible to owner" on public.project_collaborator_invites;
create policy "Project collaborator invites visible to owner"
on public.project_collaborator_invites
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
