-- 0014_prototype_data_manager_write_access.sql
-- Prototype-only write access for Data Manager upload flow.

grant insert on table public.data_sources to anon, authenticated;
grant insert on table public.upload_batches to anon, authenticated;
grant insert on table public.teacher_records_staging to anon, authenticated;
grant insert on table public.validation_issues to anon, authenticated;

-- Keep write scope limited to insert-only for prototype ingestion.
drop policy if exists data_sources_insert_anon on public.data_sources;
create policy data_sources_insert_anon on public.data_sources
for insert to anon, authenticated
with check (true);

drop policy if exists upload_batches_insert_anon on public.upload_batches;
create policy upload_batches_insert_anon on public.upload_batches
for insert to anon, authenticated
with check (true);

drop policy if exists teacher_records_staging_insert_anon on public.teacher_records_staging;
create policy teacher_records_staging_insert_anon on public.teacher_records_staging
for insert to anon, authenticated
with check (true);

drop policy if exists validation_issues_insert_anon on public.validation_issues;
create policy validation_issues_insert_anon on public.validation_issues
for insert to anon, authenticated
with check (true);
