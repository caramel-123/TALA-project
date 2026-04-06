import { supabase } from '../../../lib/supabase/client';
import { queryWithFallback } from '../../shared/api/query-with-fallback';
import { devSeed } from '../../shared/dev-seed';
import type { KpiCardVm } from '../../shared/types/view-models';
import { formatDateLabel } from '../../shared/mappers/formatters';
import { buildOverviewKpis, computeFieldCompleteness, mapOverviewVmToKpiCards } from '../mappers';
import type { OverviewHeaderMetaVm, OverviewKpisVm } from '../types';

type RegionRow = {
  id: string;
};

type DivisionRow = {
  id: string;
  region_id: string;
  division_code: string | null;
  division_name: string | null;
};

type SchoolRow = {
  id: string;
  division_id: string;
  school_id_code: string | null;
  school_name: string | null;
  is_remote: boolean | null;
};

type TeacherRow = {
  id: string;
  teacher_code: string | null;
  region_id: string | null;
  division_id: string | null;
  school_id: string | null;
  specialization: string | null;
  career_stage: string | null;
  years_experience: number | null;
};

type RegionalContextRow = {
  region_id: string;
  snapshot_date: string;
  star_coverage_pct: number | null;
  underserved_score: number | null;
  data_quality_score: number | null;
  data_completeness_pct: number | null;
};

type SchoolContextRow = {
  school_id: string;
  coverage_pct: number | null;
  snapshot_date: string;
};

type DivisionPriorityRow = {
  division_id: string;
  is_high_priority: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toDateCandidate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function fallbackOverviewKpisVm(): OverviewKpisVm {
  return {
    activeRegions: Number.parseInt(devSeed.overview.kpiData[0]?.value || '0', 10),
    activeRegionsDeltaText: devSeed.overview.kpiData[0]?.trendValue || 'From fallback seed data',
    dataCompleteness: Number.parseInt((devSeed.overview.kpiData[1]?.value || '0').replace('%', ''), 10),
    dataCompletenessDeltaText: devSeed.overview.kpiData[1]?.trendValue || 'From fallback seed data',
    highPriorityDivisions: Number.parseInt(devSeed.overview.kpiData[2]?.value || '0', 10),
    highPriorityDivisionsDeltaText: devSeed.overview.kpiData[2]?.trendValue || 'From fallback seed data',
    teachersProfiled: Number.parseInt((devSeed.overview.kpiData[3]?.value || '0').replace(/,/g, ''), 10),
    teachersProfiledDeltaText: devSeed.overview.kpiData[3]?.trendValue || 'From fallback seed data',
    lastUpdatedText: devSeed.overview.lastUpdated,
    dataQualityText: `${devSeed.overview.dataQuality}%`,
  };
}

function fallbackOverviewHeaderMetaVm(): OverviewHeaderMetaVm {
  return {
    lastUpdatedText: devSeed.overview.lastUpdated,
    dataQualityText: `${devSeed.overview.dataQuality}%`,
  };
}

async function deriveHighPriorityDivisionCount(
  divisions: DivisionRow[],
  schools: SchoolRow[],
  teachers: TeacherRow[],
  regionalContexts: RegionalContextRow[],
  schoolContexts: SchoolContextRow[],
): Promise<number> {
  const schoolsByDivision = new Map<string, SchoolRow[]>();
  schools.forEach((school) => {
    const list = schoolsByDivision.get(school.division_id) || [];
    list.push(school);
    schoolsByDivision.set(school.division_id, list);
  });

  const teachersByDivision = new Map<string, TeacherRow[]>();
  teachers.forEach((teacher) => {
    if (!teacher.division_id) {
      return;
    }
    const list = teachersByDivision.get(teacher.division_id) || [];
    list.push(teacher);
    teachersByDivision.set(teacher.division_id, list);
  });

  const latestRegionalContextByRegion = new Map<string, RegionalContextRow>();
  regionalContexts
    .slice()
    .sort((a, b) => (a.snapshot_date < b.snapshot_date ? 1 : -1))
    .forEach((row) => {
      if (!latestRegionalContextByRegion.has(row.region_id)) {
        latestRegionalContextByRegion.set(row.region_id, row);
      }
    });

  const latestSchoolContextBySchool = new Map<string, SchoolContextRow>();
  schoolContexts
    .slice()
    .sort((a, b) => (a.snapshot_date < b.snapshot_date ? 1 : -1))
    .forEach((row) => {
      if (!latestSchoolContextBySchool.has(row.school_id)) {
        latestSchoolContextBySchool.set(row.school_id, row);
      }
    });

  let highPriorityCount = 0;

  divisions.forEach((division) => {
    const divisionSchools = schoolsByDivision.get(division.id) || [];
    const divisionTeachers = teachersByDivision.get(division.id) || [];
    const regionContext = latestRegionalContextByRegion.get(division.region_id);

    const schoolCoverages = divisionSchools
      .map((school) => latestSchoolContextBySchool.get(school.id)?.coverage_pct)
      .filter((value): value is number => Number.isFinite(Number(value)))
      .map((value) => Number(value));

    const starCoverageRate = schoolCoverages.length > 0
      ? schoolCoverages.reduce((sum, value) => sum + value, 0) / schoolCoverages.length
      : Number(regionContext?.star_coverage_pct || 0);

    const specializationMismatchRate = divisionTeachers.length > 0
      ? (divisionTeachers.filter((teacher) => {
          const specialization = (teacher.specialization || '').toLowerCase();
          return specialization.length === 0 || specialization.includes('general');
        }).length / divisionTeachers.length) * 100
      : 0;

    const mentorAccessScore = clamp(100 - (Number(regionContext?.underserved_score || 0) * 10), 0, 100);
    const resourceConstraintScore = clamp(100 - starCoverageRate, 0, 100);

    const remoteSchools = divisionSchools.filter((school) => Boolean(school.is_remote)).length;
    const connectivityConstraintScore = divisionSchools.length > 0
      ? (remoteSchools / divisionSchools.length) * 100
      : 0;

    const vulnerableTeachers = divisionTeachers.filter((teacher) => {
      const stage = (teacher.career_stage || '').toLowerCase();
      return stage.includes('early') || stage.includes('retire');
    }).length;

    const staffingVulnerabilityScore = divisionTeachers.length > 0
      ? (vulnerableTeachers / divisionTeachers.length) * 100
      : 0;

    const priorityScore = (
      (100 - starCoverageRate) * 0.3
      + specializationMismatchRate * 0.2
      + (100 - mentorAccessScore) * 0.15
      + resourceConstraintScore * 0.15
      + connectivityConstraintScore * 0.1
      + staffingVulnerabilityScore * 0.1
    );

    if (priorityScore >= 70) {
      highPriorityCount += 1;
    }
  });

  return highPriorityCount;
}

export async function fetchOverviewHeaderMetaFromSupabase(): Promise<OverviewHeaderMetaVm> {
  if (!supabase) {
    throw new Error('Supabase client is not available.');
  }

  const [latestRegionalContext, latestUploadBatch, qualityLatest] = await Promise.all([
    supabase
      .from('regional_context')
      .select('snapshot_date')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('upload_batches')
      .select('started_at')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('v_region_data_quality_latest')
      .select('quality_score'),
  ]);

  if (latestRegionalContext.error) {
    throw latestRegionalContext.error;
  }

  if (latestUploadBatch.error) {
    throw latestUploadBatch.error;
  }

  if (qualityLatest.error) {
    throw qualityLatest.error;
  }

  const timestamps: Date[] = [
    toDateCandidate((latestRegionalContext.data as Record<string, any> | null)?.snapshot_date),
    toDateCandidate((latestUploadBatch.data as Record<string, any> | null)?.started_at),
  ].filter((value): value is Date => value !== null);

  const latestDate = timestamps.length > 0
    ? timestamps.sort((a, b) => b.getTime() - a.getTime())[0]
    : null;

  const qualityRows = (qualityLatest.data || []) as Array<Record<string, any>>;
  const avgQuality = qualityRows.length > 0
    ? qualityRows.reduce((sum, row) => sum + Number(row.quality_score || 0), 0) / qualityRows.length
    : 0;

  return {
    lastUpdatedText: formatDateLabel(latestDate ? latestDate.toISOString() : null),
    dataQualityText: `${Math.round(avgQuality)}%`,
  };
}

export async function fetchOverviewKpisFromSupabase(): Promise<OverviewKpisVm> {
  if (!supabase) {
    throw new Error('Supabase client is not available.');
  }

  const [
    regionsResponse,
    divisionsResponse,
    schoolsResponse,
    teachersResponse,
    regionalContextsResponse,
    schoolContextsResponse,
    priorityViewResponse,
    headerMeta,
  ] = await Promise.all([
    supabase.from('regions').select('id'),
    supabase.from('divisions').select('id, region_id, division_code, division_name'),
    supabase.from('schools').select('id, division_id, school_id_code, school_name, is_remote'),
    supabase.from('teachers').select('id, teacher_code, region_id, division_id, school_id, specialization, career_stage, years_experience'),
    supabase.from('regional_context').select('region_id, snapshot_date, star_coverage_pct, underserved_score, data_quality_score, data_completeness_pct'),
    supabase.from('school_context').select('school_id, coverage_pct, snapshot_date'),
    supabase.from('division_priority_metrics').select('division_id, is_high_priority'),
    fetchOverviewHeaderMetaFromSupabase(),
  ]);

  if (regionsResponse.error) {
    throw regionsResponse.error;
  }
  if (divisionsResponse.error) {
    throw divisionsResponse.error;
  }
  if (schoolsResponse.error) {
    throw schoolsResponse.error;
  }
  if (teachersResponse.error) {
    throw teachersResponse.error;
  }
  if (regionalContextsResponse.error) {
    throw regionalContextsResponse.error;
  }
  if (schoolContextsResponse.error) {
    throw schoolContextsResponse.error;
  }

  const regions = (regionsResponse.data || []) as RegionRow[];
  const divisions = (divisionsResponse.data || []) as DivisionRow[];
  const schools = (schoolsResponse.data || []) as SchoolRow[];
  const teachers = (teachersResponse.data || []) as TeacherRow[];
  const regionalContexts = (regionalContextsResponse.data || []) as RegionalContextRow[];
  const schoolContexts = (schoolContextsResponse.data || []) as SchoolContextRow[];

  const divisionRegionMap = new Map(divisions.map((division) => [division.id, division.region_id]));

  const activeRegionIds = new Set<string>();
  regionalContexts.forEach((row) => activeRegionIds.add(row.region_id));
  divisions.forEach((row) => activeRegionIds.add(row.region_id));
  teachers.forEach((row) => {
    if (row.region_id) {
      activeRegionIds.add(row.region_id);
    }
  });
  schools.forEach((row) => {
    const regionId = divisionRegionMap.get(row.division_id);
    if (regionId) {
      activeRegionIds.add(regionId);
    }
  });

  const teacherCompleteness = computeFieldCompleteness(teachers, [
    'teacher_code',
    'region_id',
    'division_id',
    'school_id',
    'specialization',
    'years_experience',
  ]);

  const schoolCompleteness = computeFieldCompleteness(schools, [
    'school_id_code',
    'school_name',
    'division_id',
  ]);

  const divisionCompleteness = computeFieldCompleteness(divisions, [
    'division_code',
    'division_name',
    'region_id',
  ]);

  const contextCompleteness = computeFieldCompleteness(regionalContexts, [
    'region_id',
    'star_coverage_pct',
    'underserved_score',
    'data_quality_score',
    'data_completeness_pct',
  ]);

  const weightedCompleteness = (
    teacherCompleteness * 0.45
    + schoolCompleteness * 0.2
    + divisionCompleteness * 0.15
    + contextCompleteness * 0.2
  );

  let highPriorityDivisions = 0;
  if (priorityViewResponse.error) {
    highPriorityDivisions = await deriveHighPriorityDivisionCount(
      divisions,
      schools,
      teachers,
      regionalContexts,
      schoolContexts,
    );
  } else {
    const priorityRows = (priorityViewResponse.data || []) as DivisionPriorityRow[];
    highPriorityDivisions = priorityRows.filter((row) => row.is_high_priority).length;
  }

  const teachersProfiled = teachers.filter((teacher) => {
    return Boolean(
      teacher.teacher_code
      && teacher.teacher_code.trim().length > 0
      && teacher.region_id
      && teacher.division_id
      && teacher.school_id,
    );
  }).length;

  const { vm } = buildOverviewKpis({
    activeRegions: activeRegionIds.size,
    totalRegions: regions.length,
    dataCompleteness: weightedCompleteness,
    highPriorityDivisions,
    teachersProfiled,
    totalTeachers: teachers.length,
  });

  return {
    ...vm,
    lastUpdatedText: headerMeta.lastUpdatedText,
    dataQualityText: headerMeta.dataQualityText,
  };
}

export async function getNationalLastUpdated() {
  return queryWithFallback<string>(
    async () => {
      const header = await fetchOverviewHeaderMetaFromSupabase();
      return header.lastUpdatedText;
    },
    fallbackOverviewHeaderMetaVm().lastUpdatedText,
    'overview last updated',
  );
}

export async function getOverviewHeaderMeta() {
  return queryWithFallback<OverviewHeaderMetaVm>(
    fetchOverviewHeaderMetaFromSupabase,
    fallbackOverviewHeaderMetaVm(),
    'overview header metadata',
  );
}

export async function getOverviewKpiSummary() {
  return queryWithFallback<OverviewKpisVm>(
    fetchOverviewKpisFromSupabase,
    fallbackOverviewKpisVm(),
    'overview kpi summary',
  );
}

export async function getOverviewKpis() {
  return queryWithFallback<KpiCardVm[]>(
    async () => {
      const vm = await fetchOverviewKpisFromSupabase();
      return mapOverviewVmToKpiCards(vm);
    },
    devSeed.overview.kpiData,
    'overview kpis',
  );
}

export async function getOverviewKpiCards() {
  return getOverviewKpis();
}
