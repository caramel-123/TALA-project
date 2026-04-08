import { supabase } from '../../../lib/supabase/client';
import { devSeed } from '../../shared/dev-seed';
import { formatDateLabel } from '../../shared/mappers/formatters';
import { queryWithFallback } from '../../shared/api/query-with-fallback';
import {
  normalizeClusters,
  normalizeDataConfidence,
  normalizeGapFactors,
  normalizeScoreFactors,
} from '../lib/normalizers';
import type {
  CohortVm,
  DiagnoseNationalSummaryVm,
  DiagnosePageVm,
  DiagnoseRegionSummaryVm,
  DivisionVm,
  RegionalProfileVm,
} from '../../shared/types/view-models';

type RegionLookupRow = {
  id: string;
  psgc_code: string;
  region_name: string;
};

type RegionalContextRow = {
  region_id: string;
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

function confidenceFromDataQuality(score: number): DiagnoseRegionSummaryVm['confidence'] {
  if (score >= 88) {
    return 'high';
  }
  if (score >= 75) {
    return 'moderate';
  }
  return 'low';
}

function priorityFromScore(score: number): DiagnoseRegionSummaryVm['priority'] {
  if (score >= 8) {
    return 'critical';
  }
  if (score >= 7.3) {
    return 'high';
  }
  if (score >= 6.3) {
    return 'moderate';
  }
  return 'low';
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

function deriveNationalSummary(regions: DiagnoseRegionSummaryVm[], lastUpdated: string): DiagnoseNationalSummaryVm {
  if (regions.length === 0) {
    return devSeed.diagnose.nationalSummary;
  }

  const teacherPopulation = regions.reduce((sum, row) => sum + row.teacherPopulation, 0);
  const totalCoverage = regions.reduce((sum, row) => sum + row.starCoverage, 0);
  const totalQuality = regions.reduce((sum, row) => sum + row.dataQuality, 0);
  const totalScore = regions.reduce((sum, row) => sum + row.underservedScore, 0);

  return {
    regionCount: regions.length,
    teacherPopulation,
    nationalScore: Number((totalScore / regions.length).toFixed(1)),
    averageCoverage: Math.round(totalCoverage / regions.length),
    averageDataQuality: Math.round(totalQuality / regions.length),
    highPriorityRegions: regions.filter((row) => row.priority === 'critical' || row.priority === 'high').length,
    lastUpdated,
  };
}

async function fetchRegionLookup(): Promise<RegionLookupRow[]> {
  if (!supabase) {
    throw new Error('Supabase client is not available.');
  }

  const response = await supabase
    .from('regions')
    .select('id, psgc_code, region_name')
    .order('region_name', { ascending: true });

  if (response.error) {
    throw response.error;
  }

  return (response.data as RegionLookupRow[] | null) || [];
}

async function fetchRegionalContexts(): Promise<RegionalContextRow[]> {
  if (!supabase) {
    throw new Error('Supabase client is not available.');
  }

  const response = await supabase
    .from('regional_context')
    .select('region_id, snapshot_date, teacher_population, star_coverage_pct, underserved_score, data_quality_score, gap_factors, cluster_map, score_factors, data_confidence')
    .order('snapshot_date', { ascending: false });

  if (response.error) {
    throw response.error;
  }

  return (response.data as RegionalContextRow[] | null) || [];
}

function latestContextByRegion(rows: RegionalContextRow[]): Map<string, RegionalContextRow> {
  const byRegion = new Map<string, RegionalContextRow>();

  rows.forEach((row) => {
    if (!byRegion.has(row.region_id)) {
      byRegion.set(row.region_id, row);
    }
  });

  return byRegion;
}

function buildNationalRegions(
  regions: RegionLookupRow[],
  contextByRegion: Map<string, RegionalContextRow>,
): DiagnoseRegionSummaryVm[] {
  if (regions.length === 0) {
    return devSeed.diagnose.regions;
  }

  const seedByCode = new Map(devSeed.diagnose.regions.map((row) => [row.regionCode, row]));

  return regions.map((region) => {
    const context = contextByRegion.get(region.id);
    const seed = seedByCode.get(region.psgc_code);

    const underservedScore = Number(context?.underserved_score ?? seed?.underservedScore ?? 7);
    const dataQuality = Number(context?.data_quality_score ?? seed?.dataQuality ?? 80);
    const starCoverage = Math.round(Number(context?.star_coverage_pct ?? seed?.starCoverage ?? 70));
    const teacherPopulation = Math.round(Number(context?.teacher_population ?? seed?.teacherPopulation ?? 12000));
    const topGap = seed?.topGap || 'Resource Access';

    return {
      regionCode: region.psgc_code,
      regionName: region.region_name,
      teacherPopulation,
      starCoverage,
      underservedScore,
      dataQuality,
      topGap,
      priority: priorityFromScore(underservedScore),
      confidence: confidenceFromDataQuality(dataQuality),
    };
  });
}

async function resolveRegion(regionCodeOrId: string): Promise<RegionLookupRow | null> {
  const regions = await fetchRegionLookup();
  if (regions.length === 0) {
    return null;
  }

  const input = regionCodeOrId.trim();

  const byCode = regions.find((row) => row.psgc_code === input);
  if (byCode) {
    return byCode;
  }

  if (isUuidLike(input)) {
    const byId = regions.find((row) => row.id === input);
    if (byId) {
      return byId;
    }
  }

  return null;
}

function buildSeedRegionDetail(regionSummary: DiagnoseRegionSummaryVm): DiagnosePageVm {
  const regionShortName = regionSummary.regionName.replace(/^Region\s+[IVX0-9-]+\s+-\s+/i, '').trim() || regionSummary.regionName;
  const baseTeachers = Math.max(900, Math.round(regionSummary.teacherPopulation * 0.21));

  const divisions: DivisionVm[] = [
    {
      name: `${regionShortName} North Division`,
      population: Math.round(regionSummary.teacherPopulation * 0.29),
      coverage: Math.max(35, Math.round(regionSummary.starCoverage - 4)),
      gap: regionSummary.topGap,
      score: Number((regionSummary.underservedScore + 0.6).toFixed(1)),
      status: statusFromScore(regionSummary.underservedScore + 0.6),
    },
    {
      name: `${regionShortName} Central Division`,
      population: Math.round(regionSummary.teacherPopulation * 0.35),
      coverage: regionSummary.starCoverage,
      gap: 'Training Throughput',
      score: Number(regionSummary.underservedScore.toFixed(1)),
      status: statusFromScore(regionSummary.underservedScore),
    },
    {
      name: `${regionShortName} South Division`,
      population: Math.round(regionSummary.teacherPopulation * 0.22),
      coverage: Math.min(98, Math.round(regionSummary.starCoverage + 6)),
      gap: 'Technology Access',
      score: Number(Math.max(4.8, regionSummary.underservedScore - 0.7).toFixed(1)),
      status: statusFromScore(regionSummary.underservedScore - 0.7),
    },
    {
      name: `${regionShortName} Island-Rural Division`,
      population: Math.round(regionSummary.teacherPopulation * 0.14),
      coverage: Math.max(25, Math.round(regionSummary.starCoverage - 12)),
      gap: 'Remote Access',
      score: Number((regionSummary.underservedScore + 1).toFixed(1)),
      status: statusFromScore(regionSummary.underservedScore + 1),
    },
  ];

  const clusters = [
    { name: `${divisions[0].name} - Cluster 1`, divisionName: divisions[0].name, schools: 24, teachers: Math.round(baseTeachers * 0.9), coverage: Math.max(35, divisions[0].coverage - 4), priority: statusFromScore(divisions[0].score) },
    { name: `${divisions[1].name} - Cluster 2`, divisionName: divisions[1].name, schools: 20, teachers: Math.round(baseTeachers), coverage: Math.max(35, divisions[1].coverage - 2), priority: statusFromScore(divisions[1].score) },
    { name: `${divisions[2].name} - Cluster 3`, divisionName: divisions[2].name, schools: 16, teachers: Math.round(baseTeachers * 0.78), coverage: Math.max(30, divisions[2].coverage - 3), priority: statusFromScore(divisions[2].score) },
    { name: `${divisions[3].name} - Cluster 4`, divisionName: divisions[3].name, schools: 14, teachers: Math.round(baseTeachers * 0.64), coverage: Math.max(22, divisions[3].coverage - 5), priority: statusFromScore(divisions[3].score) },
  ];

  const gapFactors = [
    {
      id: 'remote-access',
      factor: 'Remote and Last-Mile Access',
      contribution: Math.round(Math.min(92, regionSummary.underservedScore * 10 + 4)),
      confidence: regionSummary.confidence,
      definition: 'Geographic and transport barriers reducing regular teacher support delivery.',
      source: 'Regional mobility and school access datasets',
      recency: '35 days',
    },
    {
      id: 'specialization',
      factor: 'Teacher Specialization Gap',
      contribution: Math.round(Math.min(90, regionSummary.underservedScore * 9.2)),
      confidence: 'high',
      definition: 'Mismatch between teacher specialization and required subject coverage.',
      source: 'Teacher registry and curriculum coverage reports',
      recency: '28 days',
    },
    {
      id: 'infrastructure',
      factor: 'Infrastructure and Learning Resources',
      contribution: Math.round(Math.max(45, 100 - regionSummary.starCoverage + 20)),
      confidence: 'moderate',
      definition: 'Availability and readiness of infrastructure and learning resources.',
      source: 'School infrastructure inventory',
      recency: '52 days',
    },
    {
      id: 'connectivity',
      factor: 'Connectivity Reliability',
      contribution: Math.round(Math.max(35, 95 - regionSummary.dataQuality)),
      confidence: 'moderate',
      definition: 'Reliability of digital access for blended support and reporting.',
      source: 'Connectivity monitoring',
      recency: '40 days',
    },
  ];

  const scoreFactors = [
    { factor: 'Geographic Access Barriers', weight: 26, score: Number(Math.min(9.5, regionSummary.underservedScore + 0.7).toFixed(1)), impact: 'high' as const },
    { factor: 'Teacher Availability and Match', weight: 22, score: Number(Math.min(9.3, regionSummary.underservedScore + 0.3).toFixed(1)), impact: 'high' as const },
    { factor: 'School Infrastructure Readiness', weight: 19, score: Number(Math.max(4.2, regionSummary.underservedScore - 0.6).toFixed(1)), impact: 'moderate' as const },
    { factor: 'Learning Resource Access', weight: 17, score: Number(Math.max(4.2, regionSummary.underservedScore - 0.8).toFixed(1)), impact: 'moderate' as const },
    { factor: 'Digital and Connectivity Context', weight: 16, score: Number(Math.max(4.2, regionSummary.underservedScore - 1.1).toFixed(1)), impact: 'moderate' as const },
  ];

  const cohorts: CohortVm[] = [
    {
      name: 'Early Career',
      count: Math.round(regionSummary.teacherPopulation * 0.29),
      support: 'High',
      intervention: 'Foundational STAR Module Support',
      confidence: 'high',
    },
    {
      name: 'Mid Career',
      count: Math.round(regionSummary.teacherPopulation * 0.44),
      support: 'Moderate',
      intervention: 'Specialization and Coaching Tracks',
      confidence: 'high',
    },
    {
      name: 'Senior',
      count: Math.round(regionSummary.teacherPopulation * 0.21),
      support: 'Low',
      intervention: 'Leadership and Mentor Network',
      confidence: 'moderate',
    },
    {
      name: 'Near Retirement',
      count: Math.round(regionSummary.teacherPopulation * 0.06),
      support: 'Low',
      intervention: 'Transition and Knowledge Transfer',
      confidence: 'moderate',
    },
  ];

  const dataQuality = [
    {
      source: 'Teacher Registry',
      completeness: Math.min(98, regionSummary.dataQuality + 7),
      accuracy: Math.min(97, regionSummary.dataQuality + 5),
      timeliness: Math.max(55, regionSummary.dataQuality - 2),
      confidence: 'high' as const,
    },
    {
      source: 'School Directory',
      completeness: Math.min(96, regionSummary.dataQuality + 4),
      accuracy: Math.min(95, regionSummary.dataQuality + 2),
      timeliness: Math.max(50, regionSummary.dataQuality - 5),
      confidence: regionSummary.confidence,
    },
    {
      source: 'Training and Attendance Records',
      completeness: Math.max(40, regionSummary.dataQuality - 10),
      accuracy: Math.max(45, regionSummary.dataQuality - 6),
      timeliness: Math.max(40, regionSummary.dataQuality - 13),
      confidence: regionSummary.confidence === 'high' ? 'moderate' : regionSummary.confidence,
    },
  ];

  return {
    ...devSeed.diagnose,
    regionData: {
      name: regionSummary.regionName,
      teacherPopulation: regionSummary.teacherPopulation,
      starCoverage: regionSummary.starCoverage,
      underservedScore: regionSummary.underservedScore,
      dataQuality: regionSummary.dataQuality,
      lastUpdated: devSeed.diagnose.nationalSummary.lastUpdated,
    },
    divisions,
    clusters,
    gapFactors,
    scoreFactors,
    cohorts,
    dataQuality,
  };
}

async function fetchRegionDetail(region: RegionLookupRow, nationalRegions: DiagnoseRegionSummaryVm[]): Promise<DiagnosePageVm> {
  if (!supabase) {
    throw new Error('Supabase client is not available.');
  }

  const [contextResponse, divisionsResponse, teachersResponse, schoolContextResponse] = await Promise.all([
    supabase
      .from('regional_context')
      .select('region_id, snapshot_date, teacher_population, star_coverage_pct, underserved_score, data_quality_score, gap_factors, cluster_map, score_factors, data_confidence')
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
      .select('coverage_pct, top_gap, underserved_score')
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

  const context = contextResponse.data as RegionalContextRow | null;
  const divisionsRaw = (divisionsResponse.data as DivisionRow[] | null) || [];
  const teachers = (teachersResponse.data as TeacherRow[] | null) || [];
  const schoolContext = (schoolContextResponse.data as SchoolContextRow[] | null) || [];

  const regionSummary = nationalRegions.find((row) => row.regionCode === region.psgc_code)
    || devSeed.diagnose.regions.find((row) => row.regionCode === region.psgc_code)
    || devSeed.diagnose.regions[0];

  if (!context && divisionsRaw.length === 0 && teachers.length === 0 && schoolContext.length === 0) {
    return buildSeedRegionDetail(regionSummary);
  }

  const teacherCountByDivision = new Map<string, number>();
  teachers.forEach((teacher) => {
    if (!teacher.division_id) {
      return;
    }
    teacherCountByDivision.set(teacher.division_id, (teacherCountByDivision.get(teacher.division_id) || 0) + 1);
  });

  const regionAverageCoverage = schoolContext.length > 0
    ? Math.round(schoolContext.reduce((sum, row) => sum + Number(row.coverage_pct || 0), 0) / schoolContext.length)
    : regionSummary.starCoverage;

  const regionAverageScore = schoolContext.length > 0
    ? Number((schoolContext.reduce((sum, row) => sum + Number(row.underserved_score || 0), 0) / schoolContext.length).toFixed(1))
    : regionSummary.underservedScore;

  const regionTopGap = schoolContext.find((row) => Boolean(row.top_gap))?.top_gap || regionSummary.topGap;

  const divisionData: DivisionVm[] = divisionsRaw.map((division, index) => {
    const baseScore = Number((regionAverageScore + (index === 0 ? 0.6 : index === 1 ? 0.1 : -0.3)).toFixed(1));

    return {
      name: division.division_name,
      population: Math.max(120, teacherCountByDivision.get(division.id) || Math.round(regionSummary.teacherPopulation / Math.max(1, divisionsRaw.length))),
      coverage: Math.max(25, Math.min(98, regionAverageCoverage + (index % 2 === 0 ? -3 : 4))),
      gap: regionTopGap,
      score: baseScore,
      status: statusFromScore(baseScore),
    };
  });

  const cohortsAccumulator = new Map<string, number>();
  teachers.forEach((teacher) => {
    const stage = normalizeCareerStage(teacher.career_stage);
    cohortsAccumulator.set(stage, (cohortsAccumulator.get(stage) || 0) + 1);
  });

  const cohorts: CohortVm[] = Array.from(cohortsAccumulator.entries()).map(([name, count]) => ({
    name,
    count,
    support: getSupportFromStage(name),
    intervention: getInterventionFromStage(name),
    confidence: name === 'Early Career' || name === 'Mid Career' ? 'high' : 'moderate',
  }));

  const fallbackDetail = buildSeedRegionDetail(regionSummary);

  return {
    ...devSeed.diagnose,
    regionData: {
      name: region.region_name,
      teacherPopulation: Number(context?.teacher_population ?? regionSummary.teacherPopulation),
      starCoverage: Math.round(Number(context?.star_coverage_pct ?? regionSummary.starCoverage)),
      underservedScore: Number(context?.underserved_score ?? regionSummary.underservedScore),
      dataQuality: Math.round(Number(context?.data_quality_score ?? regionSummary.dataQuality)),
      lastUpdated: formatDateLabel(context?.snapshot_date || null),
    } as RegionalProfileVm,
    divisions: divisionData.length > 0 ? divisionData : fallbackDetail.divisions,
    cohorts: cohorts.length > 0 ? cohorts : fallbackDetail.cohorts,
    clusters: normalizeClusters(context?.cluster_map, fallbackDetail.clusters),
    gapFactors: normalizeGapFactors(context?.gap_factors, fallbackDetail.gapFactors),
    scoreFactors: normalizeScoreFactors(context?.score_factors, fallbackDetail.scoreFactors),
    dataQuality: normalizeDataConfidence(context?.data_confidence, fallbackDetail.dataQuality),
  };
}

async function fetchDiagnosePageDataFromSupabase(regionCodeOrId?: string): Promise<DiagnosePageVm> {
  if (!supabase) {
    throw new Error('Supabase client is not available.');
  }

  const [regionRows, contexts] = await Promise.all([fetchRegionLookup(), fetchRegionalContexts()]);
  const latestContexts = latestContextByRegion(contexts);
  const nationalRegions = buildNationalRegions(regionRows, latestContexts);

  const newestSnapshot = contexts[0]?.snapshot_date || null;
  const nationalSummary = deriveNationalSummary(nationalRegions, formatDateLabel(newestSnapshot));

  const base: DiagnosePageVm = {
    ...devSeed.diagnose,
    nationalSummary,
    regions: nationalRegions,
    regionData: null,
    divisions: [],
    clusters: [],
    gapFactors: [],
    scoreFactors: [],
    cohorts: [],
    dataQuality: [],
  };

  if (!regionCodeOrId) {
    return base;
  }

  const resolvedRegion = await resolveRegion(regionCodeOrId);
  if (!resolvedRegion) {
    return base;
  }

  const regionDetail = await fetchRegionDetail(resolvedRegion, nationalRegions);

  return {
    ...base,
    regionData: regionDetail.regionData,
    divisions: regionDetail.divisions,
    clusters: regionDetail.clusters,
    gapFactors: regionDetail.gapFactors,
    scoreFactors: regionDetail.scoreFactors,
    cohorts: regionDetail.cohorts,
    dataQuality: regionDetail.dataQuality,
  };
}

export async function getDiagnosePageData(regionIdOrCode?: string) {
  return queryWithFallback<DiagnosePageVm>(
    () => fetchDiagnosePageDataFromSupabase(regionIdOrCode),
    devSeed.diagnose,
    regionIdOrCode ? `diagnose page data (${regionIdOrCode})` : 'diagnose national page data',
  );
}

export async function getRegionalProfile(regionIdOrCode: string) {
  return queryWithFallback<RegionalProfileVm | null>(
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

export async function getDivisionBreakdown(regionIdOrCode: string) {
  return queryWithFallback<DivisionVm[]>(
    async () => {
      const data = await fetchDiagnosePageDataFromSupabase(regionIdOrCode);
      return data.divisions;
    },
    [],
    'division breakdown',
  );
}

export async function getGapFactors(regionIdOrCode: string) {
  return queryWithFallback<DiagnosePageVm['gapFactors']>(
    async () => {
      const data = await fetchDiagnosePageDataFromSupabase(regionIdOrCode);
      return data.gapFactors;
    },
    [],
    'gap factors',
  );
}

export async function getTeacherCohorts(regionIdOrCode: string) {
  return queryWithFallback<CohortVm[]>(
    async () => {
      const data = await fetchDiagnosePageDataFromSupabase(regionIdOrCode);
      return data.cohorts;
    },
    [],
    'teacher cohorts',
  );
}
