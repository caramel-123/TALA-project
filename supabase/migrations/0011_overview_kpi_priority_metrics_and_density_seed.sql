-- 0011_overview_kpi_priority_metrics_and_density_seed.sql
-- Ensures robust Overview KPI computation inputs and non-sparse development metrics.

do $$
begin
  if not exists (
    select 1
    from public.regions
    where psgc_code = '040000000'
  ) then
    insert into public.regions (psgc_code, region_name)
    values (
      '040000000',
      case
        when exists (select 1 from public.regions where region_name = 'Region IV-A (CALABARZON)') then 'Region IV-A CALABARZON'
        else 'Region IV-A (CALABARZON)'
      end
    );
  end if;
end;
$$;

insert into public.divisions (division_code, division_name, region_id)
select
  'R4A-DX',
  'CALABARZON Demonstration Division',
  r.id
from public.regions r
where r.psgc_code = '040000000'
  and not exists (
    select 1
    from public.divisions d
    where d.division_code = 'R4A-DX'
  );

insert into public.schools (school_id_code, school_name, division_id, is_remote)
select
  'R4A-SX-001',
  'CALABARZON Demonstration School',
  d.id,
  false
from public.divisions d
where d.division_code = 'R4A-DX'
  and not exists (
    select 1
    from public.schools s
    where s.school_id_code = 'R4A-SX-001'
  );

insert into public.star_programs (name, category)
values
  ('Inquiry-Based Science (7E Model)', 'Pedagogy'),
  ('Teaching Mathematics through Problem Solving', 'Pedagogy'),
  ('Interdisciplinary Contextualization', 'Curriculum'),
  ('Language Strategies', 'Literacy'),
  ('Assessment for Blended Learning', 'Assessment'),
  ('Design Thinking', 'Innovation'),
  ('Science & Math Improvisation', 'Pedagogy')
on conflict (name) do nothing;

create or replace view public.division_priority_metrics as
with latest_regional_context as (
  select distinct on (rc.region_id)
    rc.region_id,
    rc.snapshot_date,
    rc.star_coverage_pct,
    rc.underserved_score
  from public.regional_context rc
  order by rc.region_id, rc.snapshot_date desc
),
latest_school_context as (
  select distinct on (sc.school_id)
    sc.school_id,
    sc.coverage_pct
  from public.school_context sc
  order by sc.school_id, sc.snapshot_date desc
),
school_metrics as (
  select
    d.id as division_id,
    avg(coalesce(lsc.coverage_pct, lrc.star_coverage_pct, 0)) as coverage_avg,
    avg(case when s.is_remote then 100 else 0 end) as remote_pct
  from public.divisions d
  join public.schools s on s.division_id = d.id
  left join latest_school_context lsc on lsc.school_id = s.id
  left join latest_regional_context lrc on lrc.region_id = d.region_id
  group by d.id
),
teacher_metrics as (
  select
    d.id as division_id,
    count(t.id) as teacher_count,
    avg(
      case
        when t.specialization is null or btrim(t.specialization) = '' or lower(t.specialization) like '%general%'
          then 100
        else 0
      end
    ) as specialization_mismatch_pct,
    avg(
      case
        when lower(coalesce(t.career_stage, '')) like '%early%'
          or lower(coalesce(t.career_stage, '')) like '%retire%'
          then 100
        else 0
      end
    ) as staffing_vulnerability_pct
  from public.divisions d
  left join public.teachers t on t.division_id = d.id
  group by d.id
),
scored as (
  select
    d.id as division_id,
    d.region_id,
    coalesce(sm.coverage_avg, lrc.star_coverage_pct, 0) as star_coverage_rate,
    coalesce(tm.specialization_mismatch_pct, 0) as specialization_mismatch_rate,
    greatest(0, least(100, 100 - coalesce(lrc.underserved_score, 0) * 10)) as mentor_access_score,
    greatest(0, least(100, 100 - coalesce(sm.coverage_avg, lrc.star_coverage_pct, 0))) as resource_constraint_score,
    coalesce(sm.remote_pct, 0) as connectivity_constraint_score,
    coalesce(tm.staffing_vulnerability_pct, 0) as staffing_vulnerability_score
  from public.divisions d
  left join school_metrics sm on sm.division_id = d.id
  left join teacher_metrics tm on tm.division_id = d.id
  left join latest_regional_context lrc on lrc.region_id = d.region_id
)
select
  s.division_id,
  s.region_id,
  round((
    (100 - s.star_coverage_rate) * 0.30
    + s.specialization_mismatch_rate * 0.20
    + (100 - s.mentor_access_score) * 0.15
    + s.resource_constraint_score * 0.15
    + s.connectivity_constraint_score * 0.10
    + s.staffing_vulnerability_score * 0.10
  )::numeric, 2) as priority_score,
  round(s.star_coverage_rate::numeric, 2) as star_coverage_rate,
  round(s.specialization_mismatch_rate::numeric, 2) as specialization_mismatch_rate,
  round(s.mentor_access_score::numeric, 2) as mentor_access_score,
  round(s.resource_constraint_score::numeric, 2) as resource_constraint_score,
  round(s.connectivity_constraint_score::numeric, 2) as connectivity_constraint_score,
  round(s.staffing_vulnerability_score::numeric, 2) as staffing_vulnerability_score,
  (
    (100 - s.star_coverage_rate) * 0.30
    + s.specialization_mismatch_rate * 0.20
    + (100 - s.mentor_access_score) * 0.15
    + s.resource_constraint_score * 0.15
    + s.connectivity_constraint_score * 0.10
    + s.staffing_vulnerability_score * 0.10
  ) >= 70 as is_high_priority
from scored s;

comment on view public.division_priority_metrics is
  'Division-level priority score and threshold flag used by Overview KPI computation.';

with teacher_totals as (
  select count(*)::integer as total
  from public.teachers
),
candidate_slots as (
  select
    s.id as school_id,
    d.id as division_id,
    d.region_id,
    row_number() over (
      order by d.region_id, d.division_code, s.school_id_code, gs.seq
    ) as rn
  from public.schools s
  join public.divisions d on d.id = s.division_id
  cross join generate_series(1, 30) gs(seq)
),
needed as (
  select
    cs.school_id,
    cs.division_id,
    cs.region_id,
    cs.rn,
    greatest(0, 520 - tt.total) as needed_count
  from candidate_slots cs
  cross join teacher_totals tt
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
  format('TALA3-TCH-%s', lpad(n.rn::text, 6, '0')),
  n.region_id,
  n.division_id,
  n.school_id,
  (array['Science', 'Mathematics', 'Languages', 'General Education', 'Values Education'])[((n.rn - 1) % 5) + 1],
  (array['Early Career', 'Mid Career', 'Senior', 'Near Retirement'])[((n.rn - 1) % 4) + 1],
  ((n.rn * 3) % 31) + 1
from needed n
where n.needed_count > 0
  and n.rn <= n.needed_count
  and not exists (
    select 1
    from public.teachers t
    where t.teacher_code = format('TALA3-TCH-%s', lpad(n.rn::text, 6, '0'))
  );

with seeded_teachers as (
  select
    t.id,
    t.region_id,
    row_number() over (order by t.teacher_code) as rn
  from public.teachers t
  where t.teacher_code like 'TALA3-TCH-%'
),
schedule as (
  select
    st.id as teacher_id,
    st.region_id,
    st.rn,
    g.seq,
    (date_trunc('month', current_date) - ((g.seq - 1) || ' month')::interval)::date as participation_date
  from seeded_teachers st
  cross join generate_series(1, 2) g(seq)
),
assigned as (
  select
    s.teacher_id,
    s.region_id,
    s.participation_date,
    case ((s.rn + s.seq) % 6)
      when 0 then 'Inquiry-Based Science (7E Model)'
      when 1 then 'Teaching Mathematics through Problem Solving'
      when 2 then 'Interdisciplinary Contextualization'
      when 3 then 'Language Strategies'
      when 4 then 'Assessment for Blended Learning'
      else 'Design Thinking'
    end as program_name,
    2 + ((s.rn + s.seq) % 4) as participants_count
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

with latest_school as (
  select distinct on (sc.school_id)
    sc.school_id,
    sc.region_id,
    sc.coverage_pct,
    sc.underserved_score,
    sc.priority_status
  from public.school_context sc
  order by sc.school_id, sc.snapshot_date desc
),
teacher_counts as (
  select
    t.region_id,
    count(*)::integer as teacher_population
  from public.teachers t
  group by t.region_id
),
coverage_summary as (
  select
    ls.region_id,
    avg(ls.coverage_pct) as coverage_avg,
    avg(ls.underserved_score) as underserved_avg
  from latest_school ls
  group by ls.region_id
),
teacher_completeness as (
  select
    t.region_id,
    (
      avg(case when t.teacher_code is not null and btrim(t.teacher_code) <> '' then 1 else 0 end)
      + avg(case when t.division_id is not null then 1 else 0 end)
      + avg(case when t.school_id is not null then 1 else 0 end)
      + avg(case when t.specialization is not null and btrim(t.specialization) <> '' then 1 else 0 end)
      + avg(case when t.years_experience is not null then 1 else 0 end)
    ) / 5 * 100 as completeness_pct
  from public.teachers t
  group by t.region_id
),
priority_counts as (
  select
    dpm.region_id,
    count(*) filter (where dpm.is_high_priority) as high_priority_divisions
  from public.division_priority_metrics dpm
  group by dpm.region_id
)
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
  coalesce(tc.teacher_population, 0),
  round(coalesce(cs.coverage_avg, 0)::numeric, 2),
  round(coalesce(cs.underserved_avg, 5)::numeric, 2),
  round(greatest(55, least(98, coalesce(cs.coverage_avg, 0) * 0.60 + coalesce(tcmp.completeness_pct, 0) * 0.40))::numeric, 2),
  round(coalesce(tcmp.completeness_pct, 0)::numeric, 2),
  coalesce(pc.high_priority_divisions, 0)::integer,
  jsonb_build_array(
    jsonb_build_object('name', 'Coverage Gap', 'score', round(greatest(0, 100 - coalesce(cs.coverage_avg, 0))::numeric, 1)),
    jsonb_build_object('name', 'Specialization Mismatch', 'score', round(greatest(0, 100 - coalesce(tcmp.completeness_pct, 0))::numeric, 1))
  ),
  jsonb_build_array(
    jsonb_build_object('cluster', 'National Composite', 'schools', coalesce(tc.teacher_population, 0))
  ),
  jsonb_build_array(
    jsonb_build_object('factor', 'Coverage', 'weight', 0.30),
    jsonb_build_object('factor', 'Specialization Mismatch', 'weight', 0.20),
    jsonb_build_object('factor', 'Mentor Access', 'weight', 0.15),
    jsonb_build_object('factor', 'Resource Constraints', 'weight', 0.15),
    jsonb_build_object('factor', 'Connectivity Constraints', 'weight', 0.10),
    jsonb_build_object('factor', 'Staffing Vulnerability', 'weight', 0.10)
  ),
  jsonb_build_array(
    jsonb_build_object(
      'metric',
      'Teacher Records',
      'confidence',
      case when coalesce(tcmp.completeness_pct, 0) >= 85 then 'high' else 'moderate' end
    )
  )
from public.regions r
left join teacher_counts tc on tc.region_id = r.id
left join coverage_summary cs on cs.region_id = r.id
left join teacher_completeness tcmp on tcmp.region_id = r.id
left join priority_counts pc on pc.region_id = r.id
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
