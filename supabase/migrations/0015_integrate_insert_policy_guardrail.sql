-- 0015_integrate_insert_policy_guardrail.sql
-- Guardrail migration to ensure Integrate upload inserts work in prototype/hackathon mode.
-- This intentionally allows INSERT for anon/authenticated only on ingestion tables.

grant insert on table public.data_sources to anon, authenticated;
grant insert on table public.upload_batches to anon, authenticated;
grant insert on table public.teacher_records_staging to anon, authenticated;
grant insert on table public.validation_issues to anon, authenticated;

alter table public.data_sources enable row level security;
alter table public.upload_batches enable row level security;
alter table public.teacher_records_staging enable row level security;
alter table public.validation_issues enable row level security;

drop policy if exists data_sources_insert_anon on public.data_sources;
create policy data_sources_insert_anon on public.data_sources
for insert to anon, authenticated
with check (
  source_name is not null
  and btrim(source_name) <> ''
  and source_type in (
    'teacher_records'::public.source_type,
    'training_data'::public.source_type,
    'infrastructure'::public.source_type,
    'geographic_data'::public.source_type
  )
);

drop policy if exists upload_batches_insert_anon on public.upload_batches;
create policy upload_batches_insert_anon on public.upload_batches
for insert to anon, authenticated
with check (
  data_source_id is not null
  and file_name is not null
  and btrim(file_name) <> ''
  and file_type is not null
  and btrim(file_type) <> ''
  and row_count >= 0
  and file_size_bytes >= 0
);

drop policy if exists teacher_records_staging_insert_anon on public.teacher_records_staging;
create policy teacher_records_staging_insert_anon on public.teacher_records_staging
for insert to anon, authenticated
with check (
  batch_id is not null
  and teacher_external_id is not null
  and btrim(teacher_external_id) <> ''
);

drop policy if exists validation_issues_insert_anon on public.validation_issues;
create policy validation_issues_insert_anon on public.validation_issues
for insert to anon, authenticated
with check (
  batch_id is not null
  and issue_type is not null
  and severity is not null
  and issue_message is not null
  and btrim(issue_message) <> ''
);
