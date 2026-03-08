alter table public.github_app_installations
add column if not exists repositories_synced_at timestamptz;
