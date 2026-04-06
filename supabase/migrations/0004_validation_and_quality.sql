-- 0004_validation_and_quality.sql
-- Validation issues/actions, quality snapshots, and reporting views.

create table if not exists public.validation_issues (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.upload_batches(id) on delete cascade,
  staging_record_id uuid references public.teacher_records_staging(id) on delete set null,
  issue_type public.issue_type not null,
  severity public.issue_severity not null,
  field_name text,
  issue_message text not null,
  is_resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.validation_issues is 'Field-level validation problems produced by upload checks.';
comment on column public.validation_issues.field_name is 'Source field involved in validation failure.';

create index if not exists idx_validation_issues_batch_id on public.validation_issues(batch_id);
create index if not exists idx_validation_issues_type_severity on public.validation_issues(issue_type, severity);
create index if not exists idx_validation_issues_resolved on public.validation_issues(is_resolved);

drop trigger if exists trg_validation_issues_updated_at on public.validation_issues;
create trigger trg_validation_issues_updated_at
before update on public.validation_issues
for each row
execute function public.set_updated_at();

create table if not exists public.validation_actions (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.validation_issues(id) on delete cascade,
  action public.validation_action_type not null,
  reviewer_id uuid references auth.users(id) on delete set null,
  notes text,
  action_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.validation_actions is 'Audit log of actions taken for each validation issue.';
comment on column public.validation_actions.reviewer_id is 'User that applied the validation action.';

create index if not exists idx_validation_actions_issue_id on public.validation_actions(issue_id);
create index if not exists idx_validation_actions_reviewer_id on public.validation_actions(reviewer_id);

drop trigger if exists trg_validation_actions_updated_at on public.validation_actions;
create trigger trg_validation_actions_updated_at
before update on public.validation_actions
for each row
execute function public.set_updated_at();

create table if not exists public.data_quality_snapshots (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id) on delete cascade,
  snapshot_date date not null,
  quality_score numeric(5,2) not null check (quality_score between 0 and 100),
  completeness_pct numeric(5,2) not null check (completeness_pct between 0 and 100),
  recency public.recency_label not null,
  validation_status public.dataset_status not null,
  conflict_flags integer not null default 0 check (conflict_flags >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (region_id, snapshot_date)
);

comment on table public.data_quality_snapshots is 'Daily/periodic data quality metrics per region for dashboards.';
comment on column public.data_quality_snapshots.validation_status is 'Current overall status for region data health.';

create index if not exists idx_data_quality_snapshots_region_date
  on public.data_quality_snapshots(region_id, snapshot_date desc);

drop trigger if exists trg_data_quality_snapshots_updated_at on public.data_quality_snapshots;
create trigger trg_data_quality_snapshots_updated_at
before update on public.data_quality_snapshots
for each row
execute function public.set_updated_at();

create or replace view public.v_data_source_registry as
select
  ds.id,
  ds.source_name,
  ds.source_type,
  coalesce(r.region_name, ds.coverage_label, 'National') as region_or_coverage,
  ds.records_count,
  ds.last_updated_at,
  ds.completeness_pct,
  ds.status,
  count(distinct ub.id) as total_batches,
  count(distinct vi.id) filter (where vi.is_resolved = false) as open_issues
from public.data_sources ds
left join public.regions r on r.id = ds.region_id
left join public.upload_batches ub on ub.data_source_id = ds.id
left join public.validation_issues vi on vi.batch_id = ub.id
group by ds.id, r.region_name;

comment on view public.v_data_source_registry is 'Registry projection backing Data Manager source table.';

create or replace view public.v_region_data_quality_latest as
with ranked as (
  select
    dqs.*,
    row_number() over (partition by dqs.region_id order by dqs.snapshot_date desc) as rn
  from public.data_quality_snapshots dqs
)
select
  r.id as region_id,
  r.region_name,
  ranked.snapshot_date,
  ranked.quality_score,
  ranked.completeness_pct,
  ranked.recency,
  ranked.validation_status,
  ranked.conflict_flags
from ranked
join public.regions r on r.id = ranked.region_id
where ranked.rn = 1;

comment on view public.v_region_data_quality_latest is 'Latest quality snapshot per region for dashboard cards.';

create or replace view public.v_validation_issue_summary as
select
  ub.id as batch_id,
  ds.id as data_source_id,
  ds.source_name,
  vi.issue_type,
  vi.severity,
  count(*) as issue_count,
  count(*) filter (where vi.is_resolved) as resolved_count,
  count(*) filter (where not vi.is_resolved) as open_count
from public.validation_issues vi
join public.upload_batches ub on ub.id = vi.batch_id
join public.data_sources ds on ds.id = ub.data_source_id
group by ub.id, ds.id, ds.source_name, vi.issue_type, vi.severity;

comment on view public.v_validation_issue_summary is 'Validation issue totals grouped by batch and severity/type.';
