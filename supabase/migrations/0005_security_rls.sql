-- 0005_security_rls.sql
-- RLS and role/scope helper functions.

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select aup.role
  from public.app_users_profile aup
  where aup.id = auth.uid();
$$;

create or replace function public.current_region_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select aup.region_id
  from public.app_users_profile aup
  where aup.id = auth.uid();
$$;

create or replace function public.has_any_privileged_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('national_admin', 'data_steward');
$$;

create or replace function public.is_region_scoped_reader()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('regional_implementer', 'viewer')
    and public.current_region_id() is not null;
$$;

alter table public.regions enable row level security;
alter table public.divisions enable row level security;
alter table public.schools enable row level security;
alter table public.app_users_profile enable row level security;
alter table public.data_sources enable row level security;
alter table public.upload_batches enable row level security;
alter table public.teacher_records_staging enable row level security;
alter table public.validation_issues enable row level security;
alter table public.validation_actions enable row level security;
alter table public.data_quality_snapshots enable row level security;

-- regions
drop policy if exists regions_select on public.regions;
create policy regions_select on public.regions
for select to authenticated
using (
  public.has_any_privileged_role()
  or (
    public.is_region_scoped_reader()
    and id = public.current_region_id()
  )
);

-- divisions
drop policy if exists divisions_select on public.divisions;
create policy divisions_select on public.divisions
for select to authenticated
using (
  public.has_any_privileged_role()
  or (
    public.is_region_scoped_reader()
    and region_id = public.current_region_id()
  )
);

-- schools
drop policy if exists schools_select on public.schools;
create policy schools_select on public.schools
for select to authenticated
using (
  public.has_any_privileged_role()
  or (
    public.is_region_scoped_reader()
    and exists (
      select 1
      from public.divisions d
      where d.id = schools.division_id
        and d.region_id = public.current_region_id()
    )
  )
);

-- app user profile
drop policy if exists app_users_profile_select_self on public.app_users_profile;
create policy app_users_profile_select_self on public.app_users_profile
for select to authenticated
using (id = auth.uid() or public.current_app_role() = 'national_admin');

drop policy if exists app_users_profile_admin_manage on public.app_users_profile;
create policy app_users_profile_admin_manage on public.app_users_profile
for all to authenticated
using (public.current_app_role() = 'national_admin')
with check (public.current_app_role() = 'national_admin');

-- data sources
drop policy if exists data_sources_select on public.data_sources;
create policy data_sources_select on public.data_sources
for select to authenticated
using (
  public.has_any_privileged_role()
  or (
    public.is_region_scoped_reader()
    and (region_id = public.current_region_id() or region_id is null)
  )
);

drop policy if exists data_sources_manage_privileged on public.data_sources;
create policy data_sources_manage_privileged on public.data_sources
for all to authenticated
using (public.has_any_privileged_role())
with check (public.has_any_privileged_role());

-- upload batches
drop policy if exists upload_batches_select on public.upload_batches;
create policy upload_batches_select on public.upload_batches
for select to authenticated
using (
  public.has_any_privileged_role()
  or (
    public.is_region_scoped_reader()
    and exists (
      select 1
      from public.data_sources ds
      where ds.id = upload_batches.data_source_id
        and (ds.region_id = public.current_region_id() or ds.region_id is null)
    )
  )
);

drop policy if exists upload_batches_manage_privileged on public.upload_batches;
create policy upload_batches_manage_privileged on public.upload_batches
for all to authenticated
using (public.has_any_privileged_role())
with check (public.has_any_privileged_role());

-- teacher staging
drop policy if exists teacher_records_staging_select on public.teacher_records_staging;
create policy teacher_records_staging_select on public.teacher_records_staging
for select to authenticated
using (
  public.has_any_privileged_role()
  or (
    public.is_region_scoped_reader()
    and region_id = public.current_region_id()
  )
);

drop policy if exists teacher_records_staging_manage_privileged on public.teacher_records_staging;
create policy teacher_records_staging_manage_privileged on public.teacher_records_staging
for all to authenticated
using (public.has_any_privileged_role())
with check (public.has_any_privileged_role());

-- validation issues
drop policy if exists validation_issues_select on public.validation_issues;
create policy validation_issues_select on public.validation_issues
for select to authenticated
using (
  public.has_any_privileged_role()
  or (
    public.is_region_scoped_reader()
    and exists (
      select 1
      from public.upload_batches ub
      join public.data_sources ds on ds.id = ub.data_source_id
      where ub.id = validation_issues.batch_id
        and (ds.region_id = public.current_region_id() or ds.region_id is null)
    )
  )
);

drop policy if exists validation_issues_manage_privileged on public.validation_issues;
create policy validation_issues_manage_privileged on public.validation_issues
for all to authenticated
using (public.has_any_privileged_role())
with check (public.has_any_privileged_role());

-- validation actions
drop policy if exists validation_actions_select on public.validation_actions;
create policy validation_actions_select on public.validation_actions
for select to authenticated
using (
  public.has_any_privileged_role()
  or (
    public.is_region_scoped_reader()
    and exists (
      select 1
      from public.validation_issues vi
      join public.upload_batches ub on ub.id = vi.batch_id
      join public.data_sources ds on ds.id = ub.data_source_id
      where vi.id = validation_actions.issue_id
        and (ds.region_id = public.current_region_id() or ds.region_id is null)
    )
  )
);

drop policy if exists validation_actions_manage_privileged on public.validation_actions;
create policy validation_actions_manage_privileged on public.validation_actions
for all to authenticated
using (public.has_any_privileged_role())
with check (public.has_any_privileged_role());

-- quality snapshots
drop policy if exists data_quality_snapshots_select on public.data_quality_snapshots;
create policy data_quality_snapshots_select on public.data_quality_snapshots
for select to authenticated
using (
  public.has_any_privileged_role()
  or (
    public.is_region_scoped_reader()
    and region_id = public.current_region_id()
  )
);

drop policy if exists data_quality_snapshots_manage_privileged on public.data_quality_snapshots;
create policy data_quality_snapshots_manage_privileged on public.data_quality_snapshots
for all to authenticated
using (public.has_any_privileged_role())
with check (public.has_any_privileged_role());
