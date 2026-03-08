create table if not exists public.organization_member_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  email text not null,
  role text not null default 'member',
  invite_token text not null unique,
  status text not null default 'pending',
  invited_by uuid not null references public.profiles (id) on delete cascade,
  accepted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  responded_at timestamptz,
  constraint organization_member_invites_role_check check (role in ('member')),
  constraint organization_member_invites_status_check check (status in ('pending', 'accepted', 'revoked'))
);

create index if not exists organization_member_invites_org_idx on public.organization_member_invites (organization_id, created_at desc);
create index if not exists organization_member_invites_email_idx on public.organization_member_invites (email);

alter table public.organization_member_invites enable row level security;

drop policy if exists "Organization member invites visible to owner" on public.organization_member_invites;
create policy "Organization member invites visible to owner"
on public.organization_member_invites
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
