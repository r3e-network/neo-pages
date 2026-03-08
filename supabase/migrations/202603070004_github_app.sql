create table if not exists public.github_app_installations (
  installation_id bigint primary key,
  owner_id uuid references public.profiles (id) on delete cascade,
  account_login text not null,
  account_id bigint,
  account_type text,
  target_type text,
  app_slug text,
  repository_selection text,
  permissions jsonb not null default '{}'::jsonb,
  suspended_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists github_app_installations_owner_idx on public.github_app_installations (owner_id);
create index if not exists github_app_installations_account_login_idx on public.github_app_installations (account_login);

alter table public.projects add column if not exists github_installation_id bigint references public.github_app_installations (installation_id) on delete set null;
alter table public.projects add column if not exists github_repository_id bigint;

alter table public.github_app_installations enable row level security;

drop trigger if exists github_app_installations_touch_updated_at on public.github_app_installations;
create trigger github_app_installations_touch_updated_at
before update on public.github_app_installations
for each row
execute function public.touch_updated_at();

drop policy if exists "GitHub App installations visible to owner" on public.github_app_installations;
create policy "GitHub App installations visible to owner"
on public.github_app_installations
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
