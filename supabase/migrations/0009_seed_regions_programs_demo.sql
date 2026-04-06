-- 0009_seed_regions_programs_demo.sql
-- Seed and reference data for Overview, Diagnose, Advise, and Data Manager demos.

insert into public.regions (psgc_code, region_name)
values
  ('010000000', 'Region I - Ilocos Region'),
  ('020000000', 'Region II - Cagayan Valley'),
  ('030000000', 'Region III - Central Luzon'),
  ('040000000', 'Region IV-A - CALABARZON'),
  ('050000000', 'Region V - Bicol Region'),
  ('060000000', 'Region VI - Western Visayas'),
  ('070000000', 'Region VII - Central Visayas'),
  ('080000000', 'Region VIII - Eastern Visayas'),
  ('090000000', 'Region IX - Zamboanga Peninsula'),
  ('100000000', 'Region X - Northern Mindanao'),
  ('110000000', 'Region XI - Davao Region'),
  ('120000000', 'Region XII - SOCCSKSARGEN'),
  ('130000000', 'NCR'),
  ('140000000', 'CAR'),
  ('160000000', 'Region XIII - Caraga'),
  ('170000000', 'MIMAROPA'),
  ('190000000', 'BARMM')
on conflict (psgc_code) do update
set region_name = excluded.region_name;

insert into public.star_programs (name, category, is_active)
values
  ('Inquiry-Based Science (7E Model)', 'Science', true),
  ('Teaching Mathematics through Problem Solving', 'Mathematics', true),
  ('Interdisciplinary Contextualization', 'Integrated', true),
  ('Language Strategies', 'Language', true),
  ('Design Thinking', 'Innovation', true),
  ('Assessment for Blended Learning', 'Assessment', true),
  ('Science & Math Improvisation', 'STEM', true)
on conflict (name) do update
set
  category = excluded.category,
  is_active = excluded.is_active;

insert into public.divisions (division_code, division_name, region_id)
select v.division_code, v.division_name, r.id
from (
  values
    ('CAR-D1', 'Benguet', '140000000'),
    ('R4B-D1', 'Occidental Mindoro', '170000000'),
    ('R8-D1', 'Leyte', '080000000'),
    ('R13-D1', 'Agusan del Sur', '160000000'),
    ('BAR-D3', 'Maguindanao II', '190000000'),
    ('R5-D1', 'Camarines Sur', '050000000'),
    ('R3-D1', 'Pampanga', '030000000'),
    ('NCR-D3', 'Taguig', '130000000')
) as v(division_code, division_name, region_psgc)
join public.regions r on r.psgc_code = v.region_psgc
on conflict (division_code) do update
set
  division_name = excluded.division_name,
  region_id = excluded.region_id;

insert into public.schools (school_id_code, school_name, division_id, is_remote)
select
  format('TLA-%s', lpad(gs::text, 4, '0')),
  format('TALA Demo School %s', gs),
  d.id,
  (gs % 4 = 0)
from generate_series(1, 24) gs
join public.divisions d on d.division_code = (
  array['CAR-D1', 'R4B-D1', 'R8-D1', 'R13-D1', 'BAR-D3', 'R5-D1', 'R3-D1', 'NCR-D3']
)[((gs - 1) % 8) + 1]
on conflict (school_id_code) do update
set
  school_name = excluded.school_name,
  division_id = excluded.division_id,
  is_remote = excluded.is_remote;

insert into public.regional_context (
  region_id,
  snapshot_date,
  teacher_population,
  star_coverage_pct,
  underserved_score,
  data_quality_score,
  data_completeness_pct,
  high_priority_divisions,
  gap_factors,
  cluster_map,
  score_factors,
  data_confidence
)
select
  r.id,
  current_date,
  v.teacher_population,
  v.star_coverage_pct,
  v.underserved_score,
  v.data_quality_score,
  v.data_completeness_pct,
  v.high_priority_divisions,
  jsonb_build_array(
    jsonb_build_object('id', 'remote-access', 'factor', 'Remote/Island Access', 'contribution', v.gap_remote, 'confidence', 'high'),
    jsonb_build_object('id', 'specialization', 'factor', 'Teacher Specialization Gap', 'contribution', v.gap_specialization, 'confidence', 'high'),
    jsonb_build_object('id', 'resources', 'factor', 'Resource Availability', 'contribution', v.gap_resources, 'confidence', 'moderate')
  ),
  jsonb_build_array(
    jsonb_build_object('name', 'Cluster A - Urban Central', 'schools', 12, 'teachers', 520, 'coverage', greatest(35, v.star_coverage_pct + 8), 'priority', 'moderate'),
    jsonb_build_object('name', 'Cluster B - Rural North', 'schools', 14, 'teachers', 610, 'coverage', greatest(25, v.star_coverage_pct - 6), 'priority', case when v.underserved_score >= 8 then 'critical' else 'high' end)
  ),
  jsonb_build_array(
    jsonb_build_object('factor', 'Geographic Remoteness', 'weight', 25, 'score', round(v.underserved_score::numeric, 1), 'impact', 'high'),
    jsonb_build_object('factor', 'Infrastructure Quality', 'weight', 20, 'score', round((10 - (v.star_coverage_pct / 10))::numeric, 1), 'impact', 'moderate'),
    jsonb_build_object('factor', 'Teacher Availability', 'weight', 20, 'score', round((v.underserved_score - 0.4)::numeric, 1), 'impact', 'high')
  ),
  jsonb_build_array(
    jsonb_build_object('source', 'Teacher Registry', 'completeness', least(100, v.data_completeness_pct + 4), 'accuracy', v.data_quality_score, 'timeliness', least(100, v.data_quality_score + 2), 'confidence', case when v.data_quality_score >= 80 then 'high' else 'moderate' end),
    jsonb_build_object('source', 'Training Records', 'completeness', v.data_completeness_pct, 'accuracy', v.data_quality_score - 3, 'timeliness', v.data_quality_score - 5, 'confidence', case when v.data_quality_score >= 78 then 'high' else 'moderate' end)
  )
from (
  values
    ('010000000', 18500, 71.0, 6.7, 82.0, 84.0, 2, 74, 70, 62),
    ('020000000', 17200, 69.0, 6.9, 81.0, 83.0, 2, 75, 71, 63),
    ('030000000', 22100, 78.0, 5.8, 88.0, 89.0, 1, 58, 54, 48),
    ('040000000', 28450, 72.0, 6.8, 89.0, 92.0, 3, 85, 72, 68),
    ('050000000', 19600, 66.0, 7.5, 78.0, 80.0, 4, 79, 74, 66),
    ('060000000', 18800, 70.0, 6.4, 84.0, 86.0, 2, 70, 66, 58),
    ('070000000', 17900, 73.0, 6.2, 85.0, 87.0, 2, 68, 64, 56),
    ('080000000', 20700, 60.0, 7.9, 73.0, 75.0, 5, 86, 80, 75),
    ('090000000', 16800, 63.0, 7.3, 75.0, 77.0, 4, 80, 74, 68),
    ('100000000', 17400, 67.0, 7.1, 79.0, 81.0, 3, 77, 72, 66),
    ('110000000', 18200, 68.0, 7.0, 80.0, 82.0, 3, 76, 70, 65),
    ('120000000', 19800, 64.0, 7.8, 76.0, 78.0, 4, 84, 78, 70),
    ('130000000', 30100, 82.0, 5.1, 92.0, 94.0, 1, 50, 46, 40),
    ('140000000', 14900, 62.0, 7.7, 72.0, 74.0, 4, 83, 77, 71),
    ('160000000', 16100, 58.0, 8.1, 70.0, 72.0, 5, 88, 82, 76),
    ('170000000', 15300, 57.0, 8.0, 71.0, 73.0, 5, 87, 81, 75),
    ('190000000', 16700, 54.0, 8.8, 68.0, 70.0, 7, 91, 85, 80)
) as v(region_psgc, teacher_population, star_coverage_pct, underserved_score, data_quality_score, data_completeness_pct, high_priority_divisions, gap_remote, gap_specialization, gap_resources)
join public.regions r on r.psgc_code = v.region_psgc
on conflict (region_id, snapshot_date) do update
set
  teacher_population = excluded.teacher_population,
  star_coverage_pct = excluded.star_coverage_pct,
  underserved_score = excluded.underserved_score,
  data_quality_score = excluded.data_quality_score,
  data_completeness_pct = excluded.data_completeness_pct,
  high_priority_divisions = excluded.high_priority_divisions,
  gap_factors = excluded.gap_factors,
  cluster_map = excluded.cluster_map,
  score_factors = excluded.score_factors,
  data_confidence = excluded.data_confidence;

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
    ('120000000', 8.7::numeric, 'Specialization Gap', 'Inquiry-Based Science (7E Model)', 'Teaching Mathematics through Problem Solving', 'high', 'Blended', 'Medium'),
    ('050000000', 8.4::numeric, 'Remote Access', 'Assessment for Blended Learning', 'Science & Math Improvisation', 'high', 'Alternative', 'High'),
    ('190000000', 8.8::numeric, 'Teacher Coverage', 'Language Strategies', 'Interdisciplinary Contextualization', 'high', 'Face-to-face', 'High'),
    ('160000000', 8.1::numeric, 'Resource Access', 'Science & Math Improvisation', 'Design Thinking', 'moderate', 'Blended', 'High'),
    ('080000000', 7.9::numeric, 'Early Career Support', 'Teaching Mathematics through Problem Solving', 'Language Strategies', 'moderate', 'Blended', 'Medium'),
    ('170000000', 8.0::numeric, 'Geographic Isolation', 'Interdisciplinary Contextualization', 'Assessment for Blended Learning', 'moderate', 'Alternative', 'High'),
    ('140000000', 7.7::numeric, 'Training Access', 'Design Thinking', 'Inquiry-Based Science (7E Model)', 'moderate', 'Blended', 'Medium')
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
  format('TALA-TCH-%s', lpad(gs::text, 5, '0')),
  r.id,
  d.id,
  s.id,
  (array['Science', 'Mathematics', 'Languages', 'General Education'])[((gs - 1) % 4) + 1],
  (array['Early Career', 'Mid Career', 'Senior', 'Near Retirement'])[((gs - 1) % 4) + 1],
  (gs % 31)
from generate_series(1, 240) gs
join public.schools s on s.school_id_code = (
  array(
    select school_id_code
    from public.schools
    order by school_id_code
    limit 24
  )
)[((gs - 1) % 24) + 1]
join public.divisions d on d.id = s.division_id
join public.regions r on r.id = d.region_id
where not exists (
  select 1
  from public.teachers t
  where t.teacher_code = format('TALA-TCH-%s', lpad(gs::text, 5, '0'))
);

insert into public.training_participation (
  teacher_id,
  program_id,
  region_id,
  participation_date,
  participants_count
)
select
  t.id,
  p.id,
  t.region_id,
  (date_trunc('month', current_date) - ((gs % 6) || ' month')::interval)::date,
  1 + (gs % 4)
from generate_series(1, 180) gs
join public.teachers t on t.teacher_code = format('TALA-TCH-%s', lpad((((gs - 1) % 240) + 1)::text, 5, '0'))
join public.star_programs p on p.name = (
  array[
    'Inquiry-Based Science (7E Model)',
    'Teaching Mathematics through Problem Solving',
    'Interdisciplinary Contextualization',
    'Language Strategies',
    'Design Thinking',
    'Assessment for Blended Learning',
    'Science & Math Improvisation'
  ]
)[((gs - 1) % 7) + 1]
where not exists (
  select 1
  from public.training_participation tp
  where tp.teacher_id = t.id
    and tp.program_id = p.id
    and tp.participation_date = (date_trunc('month', current_date) - ((gs % 6) || ' month')::interval)::date
);

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
  s.id,
  r.id,
  current_date,
  greatest(35, least(95, rc.star_coverage_pct + ((s.gs % 7) - 3) * 2))::numeric,
  case
    when rc.underserved_score >= 8 then 'critical'
    when rc.underserved_score >= 7 then 'high'
    when rc.underserved_score >= 6 then 'moderate'
    else 'low'
  end,
  (array['Remote Access', 'Specialization', 'Infrastructure', 'Resource Access'])[((s.gs - 1) % 4) + 1],
  greatest(4.5, least(9.5, rc.underserved_score + (((s.gs % 5) - 2) * 0.2)))::numeric,
  (array['Cluster A - Urban Central', 'Cluster B - Rural North', 'Cluster C - Mountain Arc'])[((s.gs - 1) % 3) + 1]
from (
  select s.id, s.division_id, row_number() over(order by s.school_id_code) as gs
  from public.schools s
  order by s.school_id_code
  limit 24
) s
join public.divisions d on d.id = s.division_id
join public.regions r on r.id = d.region_id
join public.regional_context rc on rc.region_id = r.id and rc.snapshot_date = current_date
on conflict (school_id, snapshot_date) do update
set
  region_id = excluded.region_id,
  coverage_pct = excluded.coverage_pct,
  priority_status = excluded.priority_status,
  top_gap = excluded.top_gap,
  underserved_score = excluded.underserved_score,
  cluster_name = excluded.cluster_name;
