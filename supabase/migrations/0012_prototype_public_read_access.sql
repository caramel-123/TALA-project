-- 0012_prototype_public_read_access.sql
-- Prototype-only read access for dashboard data when no authenticated session is present.

-- Grant select privileges used by feature APIs.
grant select on table public.regions to anon, authenticated;
grant select on table public.divisions to anon, authenticated;
grant select on table public.schools to anon, authenticated;
grant select on table public.star_programs to anon, authenticated;
grant select on table public.teachers to anon, authenticated;
grant select on table public.training_participation to anon, authenticated;
grant select on table public.school_context to anon, authenticated;
grant select on table public.regional_context to anon, authenticated;
grant select on table public.recommendations to anon, authenticated;
grant select on table public.data_sources to anon, authenticated;
grant select on table public.upload_batches to anon, authenticated;
grant select on table public.validation_issues to anon, authenticated;
grant select on table public.validation_actions to anon, authenticated;
grant select on table public.data_quality_snapshots to anon, authenticated;

grant select on public.ingestion_batches to anon, authenticated;
grant select on public.data_quality_issues to anon, authenticated;
grant select on public.v_data_source_registry to anon, authenticated;
grant select on public.v_validation_issue_summary to anon, authenticated;
grant select on public.v_region_data_quality_latest to anon, authenticated;
grant select on public.division_priority_metrics to anon, authenticated;

-- RLS-backed tables need explicit anon read policies.
drop policy if exists regions_select_anon on public.regions;
create policy regions_select_anon on public.regions
for select to anon
using (true);

drop policy if exists divisions_select_anon on public.divisions;
create policy divisions_select_anon on public.divisions
for select to anon
using (true);

drop policy if exists schools_select_anon on public.schools;
create policy schools_select_anon on public.schools
for select to anon
using (true);

drop policy if exists data_sources_select_anon on public.data_sources;
create policy data_sources_select_anon on public.data_sources
for select to anon
using (true);

drop policy if exists upload_batches_select_anon on public.upload_batches;
create policy upload_batches_select_anon on public.upload_batches
for select to anon
using (true);

drop policy if exists validation_issues_select_anon on public.validation_issues;
create policy validation_issues_select_anon on public.validation_issues
for select to anon
using (true);

drop policy if exists validation_actions_select_anon on public.validation_actions;
create policy validation_actions_select_anon on public.validation_actions
for select to anon
using (true);

drop policy if exists data_quality_snapshots_select_anon on public.data_quality_snapshots;
create policy data_quality_snapshots_select_anon on public.data_quality_snapshots
for select to anon
using (true);
