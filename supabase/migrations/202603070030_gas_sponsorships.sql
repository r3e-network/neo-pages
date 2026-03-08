create table if not exists public.project_gas_sponsorships (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade unique,
  is_enabled boolean not null default false,
  balance numeric not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.project_gas_sponsorships enable row level security;

drop trigger if exists project_gas_sponsorships_touch_updated_at on public.project_gas_sponsorships;
create trigger project_gas_sponsorships_touch_updated_at
before update on public.project_gas_sponsorships
for each row
execute function public.touch_updated_at();

drop policy if exists "Project gas sponsorships visible to project owner" on public.project_gas_sponsorships;
create policy "Project gas sponsorships visible to project owner"
on public.project_gas_sponsorships
for select
using (
  exists (
    select 1 from public.projects
    where id = project_gas_sponsorships.project_id
    and owner_id = auth.uid()
  )
);

drop policy if exists "Project gas sponsorships insertable by project owner" on public.project_gas_sponsorships;
create policy "Project gas sponsorships insertable by project owner"
on public.project_gas_sponsorships
for insert
with check (
  exists (
    select 1 from public.projects
    where id = project_gas_sponsorships.project_id
    and owner_id = auth.uid()
  )
);

drop policy if exists "Project gas sponsorships updateable by project owner" on public.project_gas_sponsorships;
create policy "Project gas sponsorships updateable by project owner"
on public.project_gas_sponsorships
for update
using (
  exists (
    select 1 from public.projects
    where id = project_gas_sponsorships.project_id
    and owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.projects
    where id = project_gas_sponsorships.project_id
    and owner_id = auth.uid()
  )
);
