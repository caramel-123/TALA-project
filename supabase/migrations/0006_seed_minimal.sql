-- 0006_seed_minimal.sql
-- Deterministic seed data for demo and local testing.

insert into public.regions (psgc_code, region_name)
values
  ('130000000', 'NCR'),
  ('040000000', 'Region IV-A'),
  ('120000000', 'Region XII'),
  ('190000000', 'BARMM')
on conflict (psgc_code) do update
set region_name = excluded.region_name;

insert into public.divisions (division_code, division_name, region_id)
select v.division_code, v.division_name, r.id
from (
  values
    ('NCR-D1', 'Manila City', '130000000'),
    ('NCR-D2', 'Quezon City', '130000000'),
    ('R4A-D1', 'Cavite', '040000000'),
    ('R4A-D2', 'Laguna', '040000000'),
    ('R12-D1', 'South Cotabato', '120000000'),
    ('R12-D2', 'General Santos', '120000000'),
    ('BAR-D1', 'Maguindanao I', '190000000'),
    ('BAR-D2', 'Lanao del Sur I', '190000000')
) as v(division_code, division_name, region_psgc)
join public.regions r on r.psgc_code = v.region_psgc
on conflict (division_code) do update
set
  division_name = excluded.division_name,
  region_id = excluded.region_id;

insert into public.schools (school_id_code, school_name, division_id, is_remote)
select
  format('SCH-%s', lpad(gs::text, 4, '0')) as school_id_code,
  format('Demo School %s', gs) as school_name,
  d.id as division_id,
  (gs % 5 = 0) as is_remote
from generate_series(1, 20) gs
join public.divisions d on d.division_code = (
  array['NCR-D1','NCR-D2','R4A-D1','R4A-D2','R12-D1','R12-D2','BAR-D1','BAR-D2']
)[((gs - 1) % 8) + 1]
on conflict (school_id_code) do update
set
  school_name = excluded.school_name,
  division_id = excluded.division_id,
  is_remote = excluded.is_remote;

insert into public.data_sources (
  source_name,
  source_type,
  region_id,
  coverage_label,
  records_count,
  completeness_pct,
  status,
  last_updated_at
)
select * from (
  select
    'DepEd Teacher Master List Q1 2026'::text,
    'teacher_records'::public.source_type,
    null::uuid,
    'National'::text,
    428950,
    94.00,
    'validated'::public.dataset_status,
    now() - interval '7 days'
  union all
  select
    'STAR Training Attendance - Region IV-A',
    'training_data'::public.source_type,
    r.id,
    null,
    8240,
    89.00,
    'validated'::public.dataset_status,
    now() - interval '4 days'
  from public.regions r where r.psgc_code = '040000000'
  union all
  select
    'School Infrastructure Survey',
    'infrastructure'::public.source_type,
    null,
    'Multi-region',
    12450,
    76.00,
    'pending_review'::public.dataset_status,
    now() - interval '5 days'
  union all
  select
    'Remote Area Classification',
    'geographic_data'::public.source_type,
    null,
    'National',
    3280,
    68.00,
    'flagged'::public.dataset_status,
    now() - interval '20 days'
) s(
  source_name,
  source_type,
  region_id,
  coverage_label,
  records_count,
  completeness_pct,
  status,
  last_updated_at
)
on conflict (source_name, source_type) do update
set
  region_id = excluded.region_id,
  coverage_label = excluded.coverage_label,
  records_count = excluded.records_count,
  completeness_pct = excluded.completeness_pct,
  status = excluded.status,
  last_updated_at = excluded.last_updated_at;

insert into public.upload_batches (
  data_source_id,
  file_name,
  file_type,
  file_size_bytes,
  storage_path,
  upload_status,
  row_count,
  started_at,
  completed_at
)
select
  ds.id,
  v.file_name,
  v.file_type,
  v.file_size_bytes,
  v.storage_path,
  v.upload_status,
  v.row_count,
  now() - v.started_offset,
  now() - v.completed_offset
from (
  values
    ('DepEd Teacher Master List Q1 2026', 'teacher_records.csv', 'text/csv', 3480000::bigint, 'uploads/teacher_records.csv', 'validated'::public.dataset_status, 100, interval '3 days', interval '3 days'),
    ('STAR Training Attendance - Region IV-A', 'training_attendance.csv', 'text/csv', 980000::bigint, 'uploads/training_attendance.csv', 'validated'::public.dataset_status, 50, interval '2 days', interval '2 days'),
    ('School Infrastructure Survey', 'school_infrastructure.csv', 'text/csv', 640000::bigint, 'uploads/school_infrastructure.csv', 'pending_review'::public.dataset_status, 35, interval '1 day', interval '1 day')
) as v(source_name, file_name, file_type, file_size_bytes, storage_path, upload_status, row_count, started_offset, completed_offset)
join public.data_sources ds on ds.source_name = v.source_name
where not exists (
  select 1 from public.upload_batches ub where ub.file_name = v.file_name
);

insert into public.teacher_records_staging (
  batch_id,
  teacher_external_id,
  teacher_name,
  anonymized_teacher_hash,
  specialization,
  school_id,
  region_id,
  years_experience,
  training_hours_last_12m,
  submitted_at
)
select
  b.id,
  format('TCH-%s', lpad(gs::text, 6, '0')),
  format('Teacher %s', gs),
  encode(digest(format('teacher-%s', gs), 'sha256'), 'hex'),
  (array['Mathematics', 'Science', 'Languages', 'General Education'])[((gs - 1) % 4) + 1],
  s.id,
  r.id,
  (gs % 31),
  (gs * 3) % 121,
  now() - (gs || ' hours')::interval
from generate_series(1, 100) gs
join public.upload_batches b on b.file_name = 'teacher_records.csv'
join public.schools s on s.school_id_code = format('SCH-%s', lpad((((gs - 1) % 20) + 1)::text, 4, '0'))
join public.divisions d on d.id = s.division_id
join public.regions r on r.id = d.region_id
where not exists (
  select 1
  from public.teacher_records_staging trs
  where trs.batch_id = b.id
    and trs.teacher_external_id = format('TCH-%s', lpad(gs::text, 6, '0'))
);

insert into public.validation_issues (
  batch_id,
  staging_record_id,
  issue_type,
  severity,
  field_name,
  issue_message,
  is_resolved
)
select
  b.id,
  trs.id,
  (array[
    'missing_required_field'::public.issue_type,
    'duplicate_record'::public.issue_type,
    'format_mismatch'::public.issue_type,
    'out_of_range_value'::public.issue_type,
    'provenance_conflict'::public.issue_type
  ])[((gs - 1) % 5) + 1],
  (array[
    'high'::public.issue_severity,
    'moderate'::public.issue_severity,
    'moderate'::public.issue_severity,
    'high'::public.issue_severity,
    'low'::public.issue_severity
  ])[((gs - 1) % 5) + 1],
  (array['teacher_name', 'teacher_external_id', 'years_experience', 'training_hours_last_12m', 'region_code'])[((gs - 1) % 5) + 1],
  format('Synthetic validation issue %s', gs),
  (gs % 4 = 0)
from generate_series(1, 40) gs
join public.upload_batches b on b.file_name = 'teacher_records.csv'
join public.teacher_records_staging trs on trs.batch_id = b.id and trs.teacher_external_id = format('TCH-%s', lpad((((gs - 1) % 100) + 1)::text, 6, '0'))
where not exists (
  select 1
  from public.validation_issues vi
  where vi.batch_id = b.id
    and vi.issue_message = format('Synthetic validation issue %s', gs)
);

insert into public.data_quality_snapshots (
  region_id,
  snapshot_date,
  quality_score,
  completeness_pct,
  recency,
  validation_status,
  conflict_flags
)
select
  r.id,
  current_date,
  v.quality_score,
  v.completeness_pct,
  v.recency,
  v.validation_status,
  v.conflict_flags
from (
  values
    ('130000000', 96.00::numeric, 98.00::numeric, 'Current'::public.recency_label, 'validated'::public.dataset_status, 1),
    ('040000000', 89.00::numeric, 92.00::numeric, 'Current'::public.recency_label, 'validated'::public.dataset_status, 2),
    ('120000000', 84.00::numeric, 86.00::numeric, 'Recent'::public.recency_label, 'pending_review'::public.dataset_status, 4),
    ('190000000', 72.00::numeric, 74.00::numeric, 'Outdated'::public.recency_label, 'flagged'::public.dataset_status, 6)
) as v(region_psgc, quality_score, completeness_pct, recency, validation_status, conflict_flags)
join public.regions r on r.psgc_code = v.region_psgc
on conflict (region_id, snapshot_date) do update
set
  quality_score = excluded.quality_score,
  completeness_pct = excluded.completeness_pct,
  recency = excluded.recency,
  validation_status = excluded.validation_status,
  conflict_flags = excluded.conflict_flags;
