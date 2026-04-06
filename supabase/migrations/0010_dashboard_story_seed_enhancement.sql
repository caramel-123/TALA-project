-- 0010_dashboard_story_seed_enhancement.sql
-- Enhanced deterministic seed data for realistic national dashboard storytelling.

-- Add one additional division per region to improve geographic spread.
insert into public.divisions (division_code, division_name, region_id)
select v.division_code, v.division_name, r.id
from (
  values
    ('R01-D2', 'Ilocos Norte', '010000000'),
    ('R02-D2', 'Isabela', '020000000'),
    ('R03-D2', 'Bulacan', '030000000'),
    ('R4A-D3', 'Rizal', '040000000'),
    ('R05-D2', 'Albay', '050000000'),
    ('R06-D2', 'Iloilo', '060000000'),
    ('R07-D2', 'Cebu Province', '070000000'),
    ('R08-D2', 'Northern Samar', '080000000'),
    ('R09-D2', 'Zamboanga del Sur', '090000000'),
    ('R10-D2', 'Bukidnon', '100000000'),
    ('R11-D2', 'Davao del Norte', '110000000'),
    ('R12-D3', 'Sarangani', '120000000'),
    ('NCR-D4', 'Pasig', '130000000'),
    ('CAR-D2', 'Ifugao', '140000000'),
    ('R13-D2', 'Surigao del Sur', '160000000'),
    ('R4B-D2', 'Palawan', '170000000'),
    ('BAR-D4', 'Basilan', '190000000')
) as v(division_code, division_name, region_psgc)
join public.regions r on r.psgc_code = v.region_psgc
on conflict (division_code) do update
set
  division_name = excluded.division_name,
  region_id = excluded.region_id;

-- Add schools for the newly seeded divisions.
insert into public.schools (school_id_code, school_name, division_id, is_remote)
select
  format('TLA-%s-%s', replace(v.division_code, '-', ''), lpad(gs::text, 2, '0')),
  format('TALA %s Demonstration School %s', v.division_name, gs),
  d.id,
  case
    when v.region_psgc in ('080000000', '140000000', '160000000', '170000000', '190000000') then gs >= 2
    when v.region_psgc in ('130000000', '030000000') then false
    else gs = 3
  end
from (
  values
    ('R01-D2', 'Ilocos Norte', '010000000'),
    ('R02-D2', 'Isabela', '020000000'),
    ('R03-D2', 'Bulacan', '030000000'),
    ('R4A-D3', 'Rizal', '040000000'),
    ('R05-D2', 'Albay', '050000000'),
    ('R06-D2', 'Iloilo', '060000000'),
    ('R07-D2', 'Cebu Province', '070000000'),
    ('R08-D2', 'Northern Samar', '080000000'),
    ('R09-D2', 'Zamboanga del Sur', '090000000'),
    ('R10-D2', 'Bukidnon', '100000000'),
    ('R11-D2', 'Davao del Norte', '110000000'),
    ('R12-D3', 'Sarangani', '120000000'),
    ('NCR-D4', 'Pasig', '130000000'),
    ('CAR-D2', 'Ifugao', '140000000'),
    ('R13-D2', 'Surigao del Sur', '160000000'),
    ('R4B-D2', 'Palawan', '170000000'),
    ('BAR-D4', 'Basilan', '190000000')
) as v(division_code, division_name, region_psgc)
join public.divisions d on d.division_code = v.division_code
cross join generate_series(1, 3) gs
on conflict (school_id_code) do update
set
  school_name = excluded.school_name,
  division_id = excluded.division_id,
  is_remote = excluded.is_remote;

-- Region-specific data sources that better support dashboard storytelling.
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
select
  v.source_name,
  v.source_type::public.source_type,
  r.id,
  null,
  v.records_count,
  v.completeness_pct,
  v.status::public.dataset_status,
  now() - (v.days_old || ' days')::interval
from (
  values
    ('Teacher Deployment Snapshot - NCR', 'teacher_records', '130000000', 16250, 96.0, 'validated', 3),
    ('Teacher Deployment Snapshot - Central Luzon', 'teacher_records', '030000000', 14100, 93.0, 'validated', 4),
    ('STAR Participation Ledger - BARMM', 'training_data', '190000000', 6280, 68.0, 'flagged', 8),
    ('STAR Participation Ledger - Caraga', 'training_data', '160000000', 5940, 72.0, 'pending_review', 6),
    ('STAR Participation Ledger - MIMAROPA', 'training_data', '170000000', 5580, 70.0, 'pending_review', 7),
    ('School Infrastructure Index - Eastern Visayas', 'infrastructure', '080000000', 3890, 66.0, 'flagged', 11),
    ('School Infrastructure Index - CAR', 'infrastructure', '140000000', 3310, 69.0, 'pending_review', 10),
    ('Connectivity Constraint Survey - BARMM', 'geographic_data', '190000000', 2140, 62.0, 'flagged', 14),
    ('Connectivity Constraint Survey - MIMAROPA', 'geographic_data', '170000000', 2310, 65.0, 'pending_review', 12),
    ('Regional QA Packet - SOCCSKSARGEN', 'teacher_records', '120000000', 7240, 81.0, 'pending_review', 5),
    ('Regional QA Packet - Bicol', 'teacher_records', '050000000', 6950, 79.0, 'pending_review', 7),
    ('Regional QA Packet - Eastern Visayas', 'teacher_records', '080000000', 6820, 74.0, 'pending_review', 9)
) as v(source_name, source_type, region_psgc, records_count, completeness_pct, status, days_old)
join public.regions r on r.psgc_code = v.region_psgc
on conflict (source_name, source_type) do update
set
  region_id = excluded.region_id,
  coverage_label = excluded.coverage_label,
  records_count = excluded.records_count,
  completeness_pct = excluded.completeness_pct,
  status = excluded.status,
  last_updated_at = excluded.last_updated_at;

-- Additional upload batches for data manager and ingestion dashboard views.
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
  'text/csv',
  v.file_size_bytes,
  format('uploads/%s', v.file_name),
  v.upload_status::public.dataset_status,
  v.row_count,
  now() - (v.started_days || ' days')::interval,
  now() - (v.completed_days || ' days')::interval
from (
  values
    ('Teacher Deployment Snapshot - NCR', 'tala-seed-ncr-teachers.csv', 1580000::bigint, 'validated', 4200, 3, 3),
    ('Teacher Deployment Snapshot - Central Luzon', 'tala-seed-r3-teachers.csv', 1490000::bigint, 'validated', 3960, 4, 4),
    ('STAR Participation Ledger - BARMM', 'tala-seed-barmm-star.csv', 1120000::bigint, 'flagged', 1870, 8, 8),
    ('STAR Participation Ledger - Caraga', 'tala-seed-caraga-star.csv', 1050000::bigint, 'pending_review', 1650, 6, 6),
    ('STAR Participation Ledger - MIMAROPA', 'tala-seed-mimaropa-star.csv', 1010000::bigint, 'pending_review', 1610, 7, 7),
    ('School Infrastructure Index - Eastern Visayas', 'tala-seed-r8-infra.csv', 980000::bigint, 'flagged', 1420, 11, 11),
    ('School Infrastructure Index - CAR', 'tala-seed-car-infra.csv', 930000::bigint, 'pending_review', 1310, 10, 10),
    ('Connectivity Constraint Survey - BARMM', 'tala-seed-barmm-connectivity.csv', 760000::bigint, 'flagged', 980, 14, 14),
    ('Connectivity Constraint Survey - MIMAROPA', 'tala-seed-mimaropa-connectivity.csv', 740000::bigint, 'pending_review', 920, 12, 12),
    ('Regional QA Packet - SOCCSKSARGEN', 'tala-seed-r12-qa.csv', 880000::bigint, 'pending_review', 1500, 5, 5),
    ('Regional QA Packet - Bicol', 'tala-seed-r5-qa.csv', 860000::bigint, 'pending_review', 1450, 7, 7),
    ('Regional QA Packet - Eastern Visayas', 'tala-seed-r8-qa.csv', 855000::bigint, 'pending_review', 1410, 9, 9)
) as v(source_name, file_name, file_size_bytes, upload_status, row_count, started_days, completed_days)
join public.data_sources ds on ds.source_name = v.source_name
where not exists (
  select 1
  from public.upload_batches ub
  where ub.file_name = v.file_name
);

-- Validation issues for seeded batches to power summary and issue dashboards.
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
  ub.id,
  null,
  (array[
    'missing_required_field'::public.issue_type,
    'duplicate_record'::public.issue_type,
    'format_mismatch'::public.issue_type,
    'out_of_range_value'::public.issue_type,
    'provenance_conflict'::public.issue_type
  ])[((gs - 1) % 5) + 1],
  case
    when ub.upload_status = 'flagged'::public.dataset_status then
      (array['high'::public.issue_severity, 'high'::public.issue_severity, 'moderate'::public.issue_severity, 'high'::public.issue_severity, 'moderate'::public.issue_severity])[((gs - 1) % 5) + 1]
    when ub.upload_status = 'validated'::public.dataset_status then
      (array['low'::public.issue_severity, 'moderate'::public.issue_severity, 'low'::public.issue_severity, 'moderate'::public.issue_severity, 'low'::public.issue_severity])[((gs - 1) % 5) + 1]
    else
      (array['moderate'::public.issue_severity, 'moderate'::public.issue_severity, 'moderate'::public.issue_severity, 'high'::public.issue_severity, 'low'::public.issue_severity])[((gs - 1) % 5) + 1]
  end,
  (array['teacher_name', 'region_code', 'years_experience', 'training_hours_last_12m', 'source_metadata'])[((gs - 1) % 5) + 1],
  format('Seed issue %s - %s', ub.file_name, gs),
  case
    when ub.upload_status = 'validated'::public.dataset_status then true
    else gs % 4 = 0
  end
from public.upload_batches ub
cross join generate_series(1, 6) gs
where ub.file_name like 'tala-seed-%'
  and not exists (
    select 1
    from public.validation_issues vi
    where vi.batch_id = ub.id
      and vi.issue_message = format('Seed issue %s - %s', ub.file_name, gs)
  );

-- Regional quality snapshots with stronger contrast between high-need and high-performing regions.
with latest_context as (
  select distinct on (rc.region_id)
    rc.region_id,
    rc.data_quality_score,
    rc.data_completeness_pct
  from public.regional_context rc
  order by rc.region_id, rc.snapshot_date desc
),
scored as (
  select
    lc.region_id,
    current_date as snapshot_date,
    greatest(
      55::numeric,
      least(
        98::numeric,
        lc.data_quality_score
          + case
              when r.psgc_code in ('080000000', '140000000', '160000000', '170000000', '190000000') then -3
              when r.psgc_code in ('130000000', '030000000') then 2
              else 0
            end
      )
    )::numeric(5,2) as quality_score,
    greatest(
      58::numeric,
      least(
        99::numeric,
        lc.data_completeness_pct
          + case
              when r.psgc_code in ('080000000', '140000000', '160000000', '170000000', '190000000') then -5
              when r.psgc_code in ('130000000', '030000000') then 2
              else 0
            end
      )
    )::numeric(5,2) as completeness_pct
  from latest_context lc
  join public.regions r on r.id = lc.region_id
)
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
  s.region_id,
  s.snapshot_date,
  s.quality_score,
  s.completeness_pct,
  case
    when s.quality_score >= 88 then 'Current'::public.recency_label
    when s.quality_score >= 76 then 'Recent'::public.recency_label
    else 'Outdated'::public.recency_label
  end,
  case
    when s.quality_score >= 86 then 'validated'::public.dataset_status
    when s.quality_score >= 72 then 'pending_review'::public.dataset_status
    else 'flagged'::public.dataset_status
  end,
  greatest(0, least(12, round((100 - s.completeness_pct) / 4)))::integer
from scored s
on conflict (region_id, snapshot_date) do update
set
  quality_score = excluded.quality_score,
  completeness_pct = excluded.completeness_pct,
  recency = excluded.recency,
  validation_status = excluded.validation_status,
  conflict_flags = excluded.conflict_flags;

-- Additional recommendation cards focused on strongest need signals and contrasting delivery plans.
insert into public.recommendations (
  region_id,
  score,
  gap,
  primary_program_id,
  secondary_program_id,
  status,
  confidence,
  delivery_method,
  resource_requirement
)
select
  r.id,
  v.score,
  v.gap,
  p1.id,
  p2.id,
  'pending_review',
  v.confidence,
  v.delivery_method,
  v.resource_requirement
from (
  values
    ('190000000', 9.1::numeric, 'Connectivity Constraint', 'Assessment for Blended Learning', 'Language Strategies', 'high', 'Alternative', 'High'),
    ('170000000', 8.6::numeric, 'Resource Access', 'Science & Math Improvisation', 'Interdisciplinary Contextualization', 'high', 'Blended', 'High'),
    ('160000000', 8.5::numeric, 'Specialization Mismatch', 'Teaching Mathematics through Problem Solving', 'Inquiry-Based Science (7E Model)', 'high', 'Blended', 'Medium'),
    ('080000000', 8.4::numeric, 'Remote Access', 'Assessment for Blended Learning', 'Design Thinking', 'moderate', 'Alternative', 'High'),
    ('140000000', 8.2::numeric, 'Mentor Access', 'Interdisciplinary Contextualization', 'Language Strategies', 'moderate', 'Face-to-face', 'Medium')
) as v(region_psgc, score, gap, primary_program_name, secondary_program_name, confidence, delivery_method, resource_requirement)
join public.regions r on r.psgc_code = v.region_psgc
left join public.star_programs p1 on p1.name = v.primary_program_name
left join public.star_programs p2 on p2.name = v.secondary_program_name
where not exists (
  select 1
  from public.recommendations rec
  where rec.region_id = r.id
    and rec.gap = v.gap
    and rec.score = v.score
);

-- Additional teacher records distributed across all newly seeded regional divisions.
with target_schools as (
  select
    s.id as school_id,
    d.id as division_id,
    d.region_id,
    row_number() over (order by s.school_id_code) as rn
  from public.schools s
  join public.divisions d on d.id = s.division_id
  where d.division_code in (
    'R01-D2', 'R02-D2', 'R03-D2', 'R4A-D3', 'R05-D2', 'R06-D2', 'R07-D2',
    'R08-D2', 'R09-D2', 'R10-D2', 'R11-D2', 'R12-D3', 'NCR-D4', 'CAR-D2',
    'R13-D2', 'R4B-D2', 'BAR-D4'
  )
)
insert into public.teachers (
  teacher_code,
  region_id,
  division_id,
  school_id,
  specialization,
  career_stage,
  years_experience
)
select
  format('TALA2-TCH-%s', lpad(((ts.rn - 1) * 4 + gs)::text, 5, '0')),
  ts.region_id,
  ts.division_id,
  ts.school_id,
  (array['Science', 'Mathematics', 'Languages', 'General Education'])[((ts.rn + gs - 1) % 4) + 1],
  (array['Early Career', 'Mid Career', 'Senior', 'Near Retirement'])[((ts.rn + gs - 1) % 4) + 1],
  ((ts.rn * 2 + gs * 3) % 31)
from target_schools ts
cross join generate_series(1, 4) gs
where not exists (
  select 1
  from public.teachers t
  where t.teacher_code = format('TALA2-TCH-%s', lpad(((ts.rn - 1) * 4 + gs)::text, 5, '0'))
);

-- Training participation with stronger program targeting in high-need regions.
with seeded_teachers as (
  select
    t.id,
    t.region_id,
    row_number() over (order by t.teacher_code) as rn
  from public.teachers t
  where t.teacher_code like 'TALA2-TCH-%'
),
enriched as (
  select
    st.id as teacher_id,
    st.region_id,
    st.rn,
    r.psgc_code
  from seeded_teachers st
  join public.regions r on r.id = st.region_id
),
schedule as (
  select
    e.teacher_id,
    e.region_id,
    e.rn,
    e.psgc_code,
    g.seq,
    (date_trunc('month', current_date) - ((g.seq - 1) || ' month')::interval)::date as participation_date
  from enriched e
  cross join generate_series(1, 2) g(seq)
),
assigned as (
  select
    s.teacher_id,
    s.region_id,
    s.rn,
    s.psgc_code,
    s.seq,
    s.participation_date,
    case
      when s.psgc_code in ('080000000', '140000000', '160000000', '170000000', '190000000') and s.seq = 1 then 'Science & Math Improvisation'
      when s.psgc_code in ('080000000', '140000000', '160000000', '170000000', '190000000') and s.seq = 2 then 'Assessment for Blended Learning'
      when ((s.rn + s.seq) % 5) = 0 then 'Inquiry-Based Science (7E Model)'
      when ((s.rn + s.seq) % 5) = 1 then 'Teaching Mathematics through Problem Solving'
      when ((s.rn + s.seq) % 5) = 2 then 'Interdisciplinary Contextualization'
      when ((s.rn + s.seq) % 5) = 3 then 'Language Strategies'
      else 'Design Thinking'
    end as program_name,
    case
      when s.psgc_code in ('080000000', '140000000', '160000000', '170000000', '190000000') then 3 + ((s.rn + s.seq) % 3)
      when s.psgc_code in ('130000000', '030000000') then 1 + ((s.rn + s.seq) % 2)
      else 1 + ((s.rn + s.seq) % 3)
    end as participants_count
  from schedule s
)
insert into public.training_participation (
  teacher_id,
  program_id,
  region_id,
  participation_date,
  participants_count
)
select
  a.teacher_id,
  p.id,
  a.region_id,
  a.participation_date,
  a.participants_count
from assigned a
join public.star_programs p on p.name = a.program_name
where not exists (
  select 1
  from public.training_participation tp
  where tp.teacher_id = a.teacher_id
    and tp.program_id = p.id
    and tp.participation_date = a.participation_date
);

-- Refresh school context to align with expanded school coverage and need signals.
with ranked_schools as (
  select
    s.id as school_id,
    d.region_id,
    row_number() over (partition by d.region_id order by s.school_id_code) as rn
  from public.schools s
  join public.divisions d on d.id = s.division_id
),
latest_context as (
  select distinct on (rc.region_id)
    rc.region_id,
    rc.star_coverage_pct,
    rc.underserved_score
  from public.regional_context rc
  order by rc.region_id, rc.snapshot_date desc
)
insert into public.school_context (
  school_id,
  region_id,
  snapshot_date,
  coverage_pct,
  priority_status,
  top_gap,
  underserved_score,
  cluster_name
)
select
  rs.school_id,
  rs.region_id,
  current_date,
  greatest(30, least(96, lc.star_coverage_pct + ((rs.rn % 7) - 3) * 2))::numeric,
  case
    when lc.underserved_score >= 8 or rs.rn % 6 = 0 then 'critical'
    when lc.underserved_score >= 7 then 'high'
    when lc.underserved_score >= 6 then 'moderate'
    else 'low'
  end,
  case
    when r.psgc_code in ('080000000', '140000000', '160000000', '170000000', '190000000') then (array['Remote Access', 'Resource Access', 'Specialization'])[(rs.rn % 3) + 1]
    else (array['Specialization', 'Infrastructure', 'Training Access'])[(rs.rn % 3) + 1]
  end,
  greatest(4.2, least(9.7, lc.underserved_score + ((rs.rn % 5) - 2) * 0.25))::numeric,
  format('%s Cluster %s', split_part(r.region_name, ' - ', 1), chr((65 + ((rs.rn - 1) % 3))::integer))
from ranked_schools rs
join latest_context lc on lc.region_id = rs.region_id
join public.regions r on r.id = rs.region_id
on conflict (school_id, snapshot_date) do update
set
  region_id = excluded.region_id,
  coverage_pct = excluded.coverage_pct,
  priority_status = excluded.priority_status,
  top_gap = excluded.top_gap,
  underserved_score = excluded.underserved_score,
  cluster_name = excluded.cluster_name;
