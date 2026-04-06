-- 0003_ingestion_and_registry.sql
-- Data source registry, upload batches, and staging records.

create table if not exists public.data_sources (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_type public.source_type not null,
  region_id uuid references public.regions(id) on delete set null,
  coverage_label text,
  records_count integer not null default 0 check (records_count >= 0),
  completeness_pct numeric(5,2) not null default 0 check (completeness_pct between 0 and 100),
  status public.dataset_status not null default 'pending_review',
  last_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_name, source_type)
);

comment on table public.data_sources is 'Top-level registry for datasets displayed by Data Manager.';
comment on column public.data_sources.coverage_label is 'Optional display label such as National or Multi-region.';

create index if not exists idx_data_sources_region_id on public.data_sources(region_id);
create index if not exists idx_data_sources_status on public.data_sources(status);

create trigger trg_data_sources_updated_at
before update on public.data_sources
for each row
execute function public.set_updated_at();

create table if not exists public.upload_batches (
  id uuid primary key default gen_random_uuid(),
  data_source_id uuid not null references public.data_sources(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  file_name text not null,
  file_type text not null,
  file_size_bytes bigint not null check (file_size_bytes >= 0),
  storage_path text,
  upload_status public.dataset_status not null default 'pending_review',
  row_count integer not null default 0 check (row_count >= 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.upload_batches is 'Represents one upload event and validation lifecycle.';
comment on column public.upload_batches.storage_path is 'Storage path in Supabase bucket for raw upload files.';

create index if not exists idx_upload_batches_source_id on public.upload_batches(data_source_id);
create index if not exists idx_upload_batches_status on public.upload_batches(upload_status);

create trigger trg_upload_batches_updated_at
before update on public.upload_batches
for each row
execute function public.set_updated_at();

create table if not exists public.teacher_records_staging (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.upload_batches(id) on delete cascade,
  teacher_external_id text not null,
  teacher_name text,
  anonymized_teacher_hash text,
  specialization text,
  school_id uuid references public.schools(id) on delete set null,
  region_id uuid references public.regions(id) on delete set null,
  years_experience integer,
  training_hours_last_12m integer,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, teacher_external_id)
);

comment on table public.teacher_records_staging is 'Raw teacher records after upload and before curated modeling.';
comment on column public.teacher_records_staging.anonymized_teacher_hash is 'Optional irreversible identifier for privacy-preserving workflows.';

create index if not exists idx_teacher_records_staging_batch_id on public.teacher_records_staging(batch_id);
create index if not exists idx_teacher_records_staging_region_id on public.teacher_records_staging(region_id);
create index if not exists idx_teacher_records_staging_school_id on public.teacher_records_staging(school_id);

create trigger trg_teacher_records_staging_updated_at
before update on public.teacher_records_staging
for each row
execute function public.set_updated_at();
