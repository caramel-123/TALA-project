import { supabase } from '../../../lib/supabase/client';
import { devSeed } from '../../shared/dev-seed';
import { formatDateLabel } from '../../shared/mappers/formatters';
import { queryWithFallback } from '../../shared/api/query-with-fallback';
import type {
  CohortVm,
  DiagnosePageVm,
  DivisionVm,
  RegionalProfileVm,
} from '../../shared/types/view-models';

type RegionLookupRow = {
  id: string;
  psgc_code: string;
  region_name: string;
};

type RegionalContextRow = {
  snapshot_date: string;
  teacher_population: number;
  star_coverage_pct: number;
  underserved_score: number;
  data_quality_score: number;
  gap_factors: unknown;
  cluster_map: unknown;
  score_factors: unknown;
  data_confidence: unknown;
};

type DivisionRow = {
  id: string;
  division_name: string;
};

type TeacherRow = {
  division_id: string | null;
  career_stage: string | null;
};

type SchoolContextRow = {
  school_id: string;
  coverage_pct: number;
  top_gap: string | null;
  underserved_score: number;
};

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function statusFromScore(score: number): DivisionVm['status'] {
  if (score >= 8) {
    return 'critical';
  }
  if (score >= 7) {
    return 'high';
  }
  if (score >= 5.5) {
    return 'moderate';
  }
  return 'low';
}

function getSupportFromStage(stage: string): CohortVm['support'] {
  if (stage === 'Early Career') {
    return 'High';
  }
  if (stage === 'Mid Career') {
    return 'Moderate';
  }
  return 'Low';
}

function getInterventionFromStage(stage: string): string {
  if (stage === 'Early Career') {
    return 'Foundational Training';
  }
  if (stage === 'Mid Career') {
    return 'Specialized Upskilling';
  }
  if (stage === 'Senior') {
    return 'Leadership Development';
  }
  return 'Mentorship Programs';
}

function normalizeCareerStage(raw: string | null): string {
  if (!raw) {
    return 'Mid Career';
  }

  const value = raw.toLowerCase();
  if (value.includes('early')) {
    return 'Early Career';
  }
  if (value.includes('near') || value.includes('retire')) {
    return 'Near Retirement';
  }
  if (value.includes('senior')) {
    return 'Senior';
  }
  return 'Mid Career';
}

async function resolveRegion(regionCodeOrId = '040000000'): Promise<RegionLookupRow> {
  if (!supabase) {
    throw new Error('Supabase client is not available.');
  }

  const fallbackRegion = async (): Promise<RegionLookupRow> => {
    const preferred = await supabase
      .from('regions')
      .select('id, psgc_code, region_name')
      .eq('psgc_code', '040000000')
      .maybeSingle();

    if (preferred.error) {
      throw preferred.error;
    }

    const preferredData = preferred.data as RegionLookupRow | null;
    if (preferredData) {
      return preferredData;
    }

    const firstAvailable = await supabase
      .from('regions')
      .select('id, psgc_code, region_name')
      .order('region_name', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (firstAvailable.error) {
      throw firstAvailable.error;
    }

    const firstAvailableData = firstAvailable.data as RegionLookupRow | null;
    if (firstAvailableData) {
      return firstAvailableData;
    }

    throw new Error('No regions are available in Supabase.');
  };

  const regionInput = regionCodeOrId.trim();

  const byCode = await supabase
    .from('regions')
    .select('id, psgc_code, region_name')
    .eq('psgc_code', regionInput)
    .maybeSingle();

  if (byCode.error) {
    throw byCode.error;
  }
  const byCodeData = (byCode.data as RegionLookupRow | null);
  if (byCodeData) {
    return byCodeData;
  }

  if (isUuidLike(regionInput)) {
    const byId = await supabase
      .from('regions')
      .select('id, psgc_code, region_name')
      .eq('id', regionInput)
      .maybeSingle();

    if (byId.error) {
      throw byId.error;
    }

    const byIdData = (byId.data as RegionLookupRow | null);
    if (byIdData) {
      return byIdData;
    }
  }

  return fallbackRegion();
}

async function fetchDiagnosePageDataFromSupabase(regionCodeOrId = '040000000'): Promise<DiagnosePageVm> {
  if (!supabase) {
    throw new Error('Supabase client is not available.');
  }

  const region = await resolveRegion(regionCodeOrId);

  const [contextResponse, divisionsResponse, teachersResponse, schoolContextResponse] = await Promise.all([
    supabase
      .from('regional_context')
      .select('snapshot_date, teacher_population, star_coverage_pct, underserved_score, data_quality_score, gap_factors, cluster_map, score_factors, data_confidence')
      .eq('region_id', region.id)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('divisions')
      .select('id, division_name')
      .eq('region_id', region.id),
    supabase
      .from('teachers')
      .select('division_id, career_stage')
      .eq('region_id', region.id),
    supabase
      .from('school_context')
      .select('school_id, coverage_pct, top_gap, underserved_score')
      .eq('region_id', region.id),
  ]);

  if (contextResponse.error) {
    throw contextResponse.error;
  }
  if (divisionsResponse.error) {
    throw divisionsResponse.error;
  }
  if (teachersResponse.error) {
    throw teachersResponse.error;
  }
  if (schoolContextResponse.error) {
    throw schoolContextResponse.error;
  }

  const context = (contextResponse.data as RegionalContextRow | null);
  const divisions = (divisionsResponse.data as DivisionRow[] | null) || [];
  const teachers = (teachersResponse.data as TeacherRow[] | null) || [];
  const schoolContext = (schoolContextResponse.data as SchoolContextRow[] | null) || [];

  const teacherCountByDivision = new Map<string, number>();
  teachers.forEach((teacher) => {
    if (!teacher.division_id) {
      return;
    }
    teacherCountByDivision.set(teacher.division_id, (teacherCountByDivision.get(teacher.division_id) || 0) + 1);
  });

  const regionAverageCoverage = schoolContext.length > 0
    ? Math.round(schoolContext.reduce((sum, row) => sum + Number(row.coverage_pct || 0), 0) / schoolContext.length)
    : Math.round(Number(context?.star_coverage_pct || 0));

  const regionAverageScore = schoolContext.length > 0
    ? Number((schoolContext.reduce((sum, row) => sum + Number(row.underserved_score || 0), 0) / schoolContext.length).toFixed(1))
    : Number(context?.underserved_score || 0);

  const regionTopGap = schoolContext.find((row) => Boolean(row.top_gap))?.top_gap || 'Resource Access';

  const fallbackByName = new Map(devSeed.diagnose.divisions.map((item) => [item.name.toLowerCase(), item]));

  const divisionData: DivisionVm[] = divisions.map((division) => {
    const fallbackDivision = fallbackByName.get(division.division_name.toLowerCase());
    const population = teacherCountByDivision.get(division.id) || fallbackDivision?.population || 0;
    const coverage = fallbackDivision?.coverage || regionAverageCoverage;
    const score = fallbackDivision?.score || regionAverageScore;
    const gap = fallbackDivision?.gap || regionTopGap;

    return {
      name: division.division_name,
      population,
      coverage,
      gap,
      score,
      status: statusFromScore(score),
    };
  });

  const cohortAccumulator = new Map<string, number>();
  teachers.forEach((teacher) => {
    const stage = normalizeCareerStage(teacher.career_stage);
    cohortAccumulator.set(stage, (cohortAccumulator.get(stage) || 0) + 1);
  });

  const cohorts: CohortVm[] = Array.from(cohortAccumulator.entries()).map(([name, count]) => ({
    name,
    count,
    support: getSupportFromStage(name),
    intervention: getInterventionFromStage(name),
    confidence: name === 'Early Career' || name === 'Mid Career' ? 'high' : 'moderate',
  }));

  return {
    sidebarItems: devSeed.diagnose.sidebarItems,
    regionData: {
      name: region.region_name,
      teacherPopulation: Number(context?.teacher_population || teachers.length),
      starCoverage: Number(context?.star_coverage_pct || 0),
      underservedScore: Number(context?.underserved_score || 0),
      dataQuality: Number(context?.data_quality_score || 0),
      lastUpdated: formatDateLabel(context?.snapshot_date || null),
    } as RegionalProfileVm,
    gapFactors: Array.isArray(context?.gap_factors) && context?.gap_factors.length > 0
      ? (context.gap_factors as DiagnosePageVm['gapFactors'])
      : devSeed.diagnose.gapFactors,
    divisions: divisionData.length > 0 ? divisionData : devSeed.diagnose.divisions,
    cohorts: cohorts.length > 0 ? cohorts : devSeed.diagnose.cohorts,
    clusters: Array.isArray(context?.cluster_map) && context?.cluster_map.length > 0
      ? (context.cluster_map as DiagnosePageVm['clusters'])
      : devSeed.diagnose.clusters,
    scoreFactors: Array.isArray(context?.score_factors) && context?.score_factors.length > 0
      ? (context.score_factors as DiagnosePageVm['scoreFactors'])
      : devSeed.diagnose.scoreFactors,
    dataQuality: Array.isArray(context?.data_confidence) && context?.data_confidence.length > 0
      ? (context.data_confidence as DiagnosePageVm['dataQuality'])
      : devSeed.diagnose.dataQuality,
  };
}

export async function getRegionalProfile(regionIdOrCode = '040000000') {
  return queryWithFallback<RegionalProfileVm>(
    async () => {
      const data = await fetchDiagnosePageDataFromSupabase(regionIdOrCode);
      return data.regionData;
    },
    devSeed.diagnose.regionData,
    'regional profile',
  );
}

export async function getRegionalProfileByCode(regionCode: string) {
  return getRegionalProfile(regionCode);
}

export async function getDivisionBreakdown(regionIdOrCode = '040000000') {
  return queryWithFallback<DivisionVm[]>(
    async () => {
      const data = await fetchDiagnosePageDataFromSupabase(regionIdOrCode);
      return data.divisions;
    },
    devSeed.diagnose.divisions,
    'division breakdown',
  );
}

export async function getGapFactors(regionIdOrCode = '040000000') {
  return queryWithFallback<DiagnosePageVm['gapFactors']>(
    async () => {
      const data = await fetchDiagnosePageDataFromSupabase(regionIdOrCode);
      return data.gapFactors;
    },
    devSeed.diagnose.gapFactors,
    'gap factors',
  );
}

export async function getTeacherCohorts(regionIdOrCode = '040000000') {
  return queryWithFallback<CohortVm[]>(
    async () => {
      const data = await fetchDiagnosePageDataFromSupabase(regionIdOrCode);
      return data.cohorts;
    },
    devSeed.diagnose.cohorts,
    'teacher cohorts',
  );
}

export async function getDiagnosePageData(regionIdOrCode = '040000000') {
  return queryWithFallback<DiagnosePageVm>(
    () => fetchDiagnosePageDataFromSupabase(regionIdOrCode),
    devSeed.diagnose,
    'diagnose page data',
  );
}
