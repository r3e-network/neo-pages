alter table public.project_webhook_endpoints
add column if not exists payload_format text not null default 'json';

alter table public.project_webhook_endpoints
add constraint project_webhook_endpoints_payload_format_check
check (payload_format in ('json', 'slack')) not valid;

alter table public.project_webhook_endpoints validate constraint project_webhook_endpoints_payload_format_check;
