create table if not exists public.project_api_tokens (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  token_prefix text not null unique,
  token_hash text not null,
  scopes text[] not null default array['project:read']::text[],
  last_used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists project_api_tokens_project_idx on public.project_api_tokens (project_id);
create index if not exists project_api_tokens_owner_idx on public.project_api_tokens (owner_id);

alter table public.project_api_tokens enable row level security;

drop trigger if exists project_api_tokens_touch_updated_at on public.project_api_tokens;
create trigger project_api_tokens_touch_updated_at
before update on public.project_api_tokens
for each row
execute function public.touch_updated_at();

drop policy if exists "Project API tokens visible to owner" on public.project_api_tokens;
create policy "Project API tokens visible to owner"
on public.project_api_tokens
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
