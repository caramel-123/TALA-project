import { supabase } from '../../../lib/supabase/client';
import { devSeed } from '../../shared/dev-seed';
import { formatDateLabel } from '../../shared/mappers/formatters';
import { queryWithFallback } from '../../shared/api/query-with-fallback';
import type { OverviewDashboardVm, ParticipationTrendVm, PriorityRegionVm, SpecializationVm, TrainingReachVm } from '../../shared/types/view-models';

const specializationColors: Record<string, string> = {
  Science: '#2E6DA4',
  Mathematics: '#A8C8E8',
  Languages: '#E8C94F',
  Other: '#D8D8D8',
};

function normalizeSpecialization(raw: string | null) {
  if (!raw) {
    return 'Other';
  }

  const value = raw.toLowerCase();
  if (value.includes('sci')) {
    return 'Science';
  }
  if (value.includes('math')) {
    return 'Mathematics';
  }
  if (value.includes('language') || value.includes('english')) {
    return 'Languages';
  }
  return 'Other';
}

function monthLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-US', { month: 'short' });
}

async function fetchPriorityRegionsFromSupabase(): Promise<PriorityRegionVm[]> {
  if (!supabase) {
    throw new Error('Supabase client is not available.');
  }

  const [recommendationsResponse, regionsResponse, programsResponse] = await Promise.all([
    supabase
      .from('recommendations')
      .select('id, region_id, score, gap, primary_program_id, confidence')
      .order('score', { ascending: false })
      .limit(5),
    supabase.from('regions').select('id, region_name'),
    supabase.from('star_programs').select('id, name'),
  ]);

  if (recommendationsResponse.error) {
    throw recommendationsResponse.error;
  }
  if (regionsResponse.error) {
    throw regionsResponse.error;
  }
  if (programsResponse.error) {
    throw programsResponse.error;
  }

  const recommendationRows = (recommendationsResponse.data || []) as Array<Record<string, any>>;
  const regionRows = (regionsResponse.data || []) as Array<Record<string, any>>;
  const programRows = (programsResponse.data || []) as Array<Record<string, any>>;

  const regionsMap = new Map(regionRows.map((row) => [row.id as string, row.region_name as string]));
  const programsMap = new Map(programRows.map((row) => [row.id as string, row.name as string]));

  return recommendationRows.map((row) => ({
    region: regionsMap.get(row.region_id) || 'Unknown Region',
    score: Number(row.score || 0),
    gap: row.gap || 'Data gap',
    intervention: row.primary_program_id ? programsMap.get(row.primary_program_id) || 'Intervention TBD' : 'Intervention TBD',
    confidence: row.confidence === 'high' ? 'high' : 'moderate',
  }));
}

async function fetchOverviewDashboardDataFromSupabase(): Promise<OverviewDashboardVm> {
  if (!supabase) {
    throw new Error('Supabase client is not available.');
  }

  const [regionalContextResponse, trainingResponse, teachersResponse, programsResponse, priorityRegions] = await Promise.all([
    supabase
      .from('regional_context')
      .select('snapshot_date, teacher_population, data_completeness_pct, high_priority_divisions')
      .order('snapshot_date', { ascending: false }),
    supabase
      .from('training_participation')
      .select('program_id, participants_count, participation_date'),
    supabase
      .from('teachers')
      .select('specialization'),
    supabase
      .from('star_programs')
      .select('id, name'),
    fetchPriorityRegionsFromSupabase(),
  ]);

  if (regionalContextResponse.error) {
    throw regionalContextResponse.error;
  }
  if (trainingResponse.error) {
    throw trainingResponse.error;
  }
  if (teachersResponse.error) {
    throw teachersResponse.error;
  }
  if (programsResponse.error) {
    throw programsResponse.error;
  }

  const contextRows = (regionalContextResponse.data || []) as Array<Record<string, any>>;
  const activeRegions = contextRows.length;
  const totalCompleteness = contextRows.reduce((sum, row) => sum + Number(row.data_completeness_pct || 0), 0);
  const avgCompleteness = activeRegions > 0 ? totalCompleteness / activeRegions : 0;
  const totalHighPriorityDivisions = contextRows.reduce((sum, row) => sum + Number(row.high_priority_divisions || 0), 0);
  const totalTeacherPopulation = contextRows.reduce((sum, row) => sum + Number(row.teacher_population || 0), 0);

  const latestSnapshot = contextRows.length > 0 ? contextRows[0].snapshot_date : null;

  const programRows = (programsResponse.data || []) as Array<Record<string, any>>;
  const trainingRows = (trainingResponse.data || []) as Array<Record<string, any>>;
  const teacherRows = (teachersResponse.data || []) as Array<Record<string, any>>;

  const programsMap = new Map(programRows.map((row) => [row.id as string, row.name as string]));
  const trainingAccumulator = new Map<string, number>();
  const trendAccumulator = new Map<string, number>();

  trainingRows.forEach((row) => {
    const programName = programsMap.get(row.program_id) || 'Unknown Program';
    const currentCount = trainingAccumulator.get(programName) || 0;
    trainingAccumulator.set(programName, currentCount + Number(row.participants_count || 0));

    const month = monthLabel(row.participation_date);
    const monthCount = trendAccumulator.get(month) || 0;
    trendAccumulator.set(month, monthCount + Number(row.participants_count || 0));
  });

  const trainingReachData: TrainingReachVm[] = Array.from(trainingAccumulator.entries())
    .map(([program, reach], index) => ({ id: `program-${index}`, program, reach }))
    .sort((a, b) => b.reach - a.reach)
    .slice(0, 5);

  const specializationAccumulator = new Map<string, number>();
  teacherRows.forEach((row) => {
    const key = normalizeSpecialization(row.specialization);
    specializationAccumulator.set(key, (specializationAccumulator.get(key) || 0) + 1);
  });

  const totalSpecializations = Array.from(specializationAccumulator.values()).reduce((sum, count) => sum + count, 0);
  const specializationData: SpecializationVm[] = Array.from(specializationAccumulator.entries()).map(([name, count], index) => {
    const percentage = totalSpecializations > 0 ? Math.round((count / totalSpecializations) * 100) : 0;
    return {
      id: `specialization-${index}`,
      name,
      value: percentage,
      color: specializationColors[name] || specializationColors.Other,
    };
  });

  const participationTrend: ParticipationTrendVm[] = Array.from(trendAccumulator.entries())
    .map(([month, teachers], index) => ({ id: `month-${index}`, month, teachers }))
    .slice(-6);

  return {
    lastUpdated: formatDateLabel(latestSnapshot),
    dataQuality: Math.round(avgCompleteness),
    kpiData: [
      { label: 'Active Regions', value: String(activeRegions || 0), trend: 'up', trendValue: '+0 this quarter', accentColor: '#2E6DA4' },
      { label: 'Data Completeness', value: `${Math.round(avgCompleteness)}%`, trend: 'up', trendValue: '+0%', accentColor: '#E8C94F' },
      { label: 'High-Priority Divisions', value: String(totalHighPriorityDivisions || 0), accentColor: '#B8860B' },
      { label: 'Teachers Profiled', value: totalTeacherPopulation.toLocaleString(), trend: 'up', trendValue: '+0', accentColor: '#1B3A5C' },
    ],
    priorityRegions: priorityRegions.length > 0 ? priorityRegions : devSeed.overview.priorityRegions,
    trainingReachData: trainingReachData.length > 0 ? trainingReachData : devSeed.overview.trainingReachData,
    specializationData: specializationData.length > 0 ? specializationData : devSeed.overview.specializationData,
    participationTrend: participationTrend.length > 0 ? participationTrend : devSeed.overview.participationTrend,
  };
}

export async function getPriorityRegions() {
  return queryWithFallback(fetchPriorityRegionsFromSupabase, devSeed.overview.priorityRegions, 'priority regions');
}

export async function getOverviewDashboardData() {
  return queryWithFallback(fetchOverviewDashboardDataFromSupabase, devSeed.overview, 'overview dashboard');
}
