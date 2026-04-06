-- 0008_domain_operational_tables.sql
-- Additional domain tables for Overview, Diagnose, and Advise modules.

create table if not exists public.star_programs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.star_programs is 'Intervention portfolio for STAR programs used in recommendations.';

drop trigger if exists trg_star_programs_updated_at on public.star_programs;
create trigger trg_star_programs_updated_at
before update on public.star_programs
for each row
execute function public.set_updated_at();

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  teacher_code text not null unique,
  region_id uuid not null references public.regions(id) on delete restrict,
  division_id uuid references public.divisions(id) on delete set null,
  school_id uuid references public.schools(id) on delete set null,
  specialization text,
  career_stage text,
  years_experience integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.teachers is 'Teacher master records used by Overview and Diagnose screens.';

create index if not exists idx_teachers_region_id on public.teachers(region_id);
create index if not exists idx_teachers_division_id on public.teachers(division_id);
create index if not exists idx_teachers_school_id on public.teachers(school_id);

drop trigger if exists trg_teachers_updated_at on public.teachers;
create trigger trg_teachers_updated_at
before update on public.teachers
for each row
execute function public.set_updated_at();

create table if not exists public.training_participation (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.teachers(id) on delete set null,
  program_id uuid not null references public.star_programs(id) on delete restrict,
  region_id uuid not null references public.regions(id) on delete restrict,
  participation_date date not null,
  participants_count integer not null default 1 check (participants_count > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.training_participation is 'Participation records for STAR interventions by region and period.';

create index if not exists idx_training_participation_region_date on public.training_participation(region_id, participation_date);
create index if not exists idx_training_participation_program_id on public.training_participation(program_id);

drop trigger if exists trg_training_participation_updated_at on public.training_participation;
create trigger trg_training_participation_updated_at
before update on public.training_participation
for each row
execute function public.set_updated_at();

create table if not exists public.school_context (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  region_id uuid not null references public.regions(id) on delete cascade,
  snapshot_date date not null default current_date,
  coverage_pct numeric(5,2) not null default 0 check (coverage_pct between 0 and 100),
  priority_status text not null default 'moderate' check (priority_status in ('critical', 'high', 'moderate', 'low')),
  top_gap text,
  underserved_score numeric(4,2) not null default 0 check (underserved_score between 0 and 10),
  cluster_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, snapshot_date)
);

comment on table public.school_context is 'School-level context metrics used for Diagnose division and cluster views.';

create index if not exists idx_school_context_region_date on public.school_context(region_id, snapshot_date);
create index if not exists idx_school_context_priority on public.school_context(priority_status);

drop trigger if exists trg_school_context_updated_at on public.school_context;
create trigger trg_school_context_updated_at
before update on public.school_context
for each row
execute function public.set_updated_at();

create table if not exists public.regional_context (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id) on delete cascade,
  snapshot_date date not null default current_date,
  teacher_population integer not null default 0 check (teacher_population >= 0),
  star_coverage_pct numeric(5,2) not null default 0 check (star_coverage_pct between 0 and 100),
  underserved_score numeric(4,2) not null default 0 check (underserved_score between 0 and 10),
  data_quality_score numeric(5,2) not null default 0 check (data_quality_score between 0 and 100),
  data_completeness_pct numeric(5,2) not null default 0 check (data_completeness_pct between 0 and 100),
  high_priority_divisions integer not null default 0 check (high_priority_divisions >= 0),
  gap_factors jsonb,
  cluster_map jsonb,
  score_factors jsonb,
  data_confidence jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (region_id, snapshot_date)
);

comment on table public.regional_context is 'Region-level metrics powering Overview and Diagnose dashboards.';

create index if not exists idx_regional_context_region_date on public.regional_context(region_id, snapshot_date desc);
create index if not exists idx_regional_context_underserved on public.regional_context(underserved_score desc);

drop trigger if exists trg_regional_context_updated_at on public.regional_context;
create trigger trg_regional_context_updated_at
before update on public.regional_context
for each row
execute function public.set_updated_at();

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id) on delete cascade,
  score numeric(4,2) not null check (score between 0 and 10),
  gap text not null,
  primary_program_id uuid references public.star_programs(id) on delete set null,
  secondary_program_id uuid references public.star_programs(id) on delete set null,
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'deferred', 'escalated')),
  confidence text not null default 'moderate' check (confidence in ('high', 'moderate', 'low')),
  delivery_method text not null default 'Blended',
  resource_requirement text not null default 'Medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.recommendations is 'Intervention recommendations generated for planning and advise workflows.';

create index if not exists idx_recommendations_region_id on public.recommendations(region_id);
create index if not exists idx_recommendations_score on public.recommendations(score desc);
create index if not exists idx_recommendations_status on public.recommendations(status);

drop trigger if exists trg_recommendations_updated_at on public.recommendations;
create trigger trg_recommendations_updated_at
before update on public.recommendations
for each row
execute function public.set_updated_at();

create or replace view public.ingestion_batches as
select
  ub.id,
  ds.source_name,
  ub.file_name,
  ub.upload_status,
  ub.row_count,
  ub.started_at,
  ub.completed_at
from public.upload_batches ub
join public.data_sources ds on ds.id = ub.data_source_id;

comment on view public.ingestion_batches is 'Operational upload batches for Data Manager ingestion tracking.';

create or replace view public.data_quality_issues as
select
  vi.id,
  ds.source_name,
  vi.issue_type,
  vi.severity,
  vi.is_resolved,
  vi.created_at
from public.validation_issues vi
join public.upload_batches ub on ub.id = vi.batch_id
join public.data_sources ds on ds.id = ub.data_source_id;

comment on view public.data_quality_issues is 'Data quality issues projected from validation logs for dashboard use.';
