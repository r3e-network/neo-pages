create table if not exists public.github_installation_repositories (
  installation_id bigint not null references public.github_app_installations (installation_id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  repository_id bigint not null,
  full_name text not null,
  name text not null,
  default_branch text not null,
  clone_url text not null,
  html_url text not null,
  private boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (installation_id, repository_id)
);

create index if not exists github_installation_repositories_owner_idx on public.github_installation_repositories (owner_id);
create index if not exists github_installation_repositories_owner_full_name_idx on public.github_installation_repositories (owner_id, full_name);

alter table public.github_installation_repositories enable row level security;

drop trigger if exists github_installation_repositories_touch_updated_at on public.github_installation_repositories;
create trigger github_installation_repositories_touch_updated_at
before update on public.github_installation_repositories
for each row
execute function public.touch_updated_at();

drop policy if exists "GitHub installation repositories visible to owner" on public.github_installation_repositories;
create policy "GitHub installation repositories visible to owner"
on public.github_installation_repositories
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
