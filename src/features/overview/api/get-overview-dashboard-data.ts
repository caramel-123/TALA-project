import { supabase } from '../../../lib/supabase/client';
import { queryWithFallback } from '../../shared/api/query-with-fallback';
import { devSeed } from '../../shared/dev-seed';
import type {
  OverviewDashboardVm,
  ParticipationTrendVm,
  SpecializationVm,
  TrainingReachVm,
} from '../../shared/types/view-models';
import { mapOverviewVmToKpiCards } from '../mappers';
import { fetchOverviewKpisFromSupabase } from './get-overview-kpis';
import { fetchPriorityRegionsFromSupabase } from './get-priority-regions';

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

async function fetchTrainingReachSummaryFromSupabase(): Promise<TrainingReachVm[]> {
  if (!supabase) {
    throw new Error('Supabase client is not available.');
  }

  const [trainingResponse, programsResponse] = await Promise.all([
    supabase
      .from('training_participation')
      .select('program_id, participants_count'),
    supabase
      .from('star_programs')
      .select('id, name'),
  ]);

  if (trainingResponse.error) {
    throw trainingResponse.error;
  }

  if (programsResponse.error) {
    throw programsResponse.error;
  }

  const trainingRows = (trainingResponse.data || []) as Array<Record<string, any>>;
  const programRows = (programsResponse.data || []) as Array<Record<string, any>>;

  const programsMap = new Map(programRows.map((row) => [row.id as string, row.name as string]));
  const trainingAccumulator = new Map<string, number>();

  trainingRows.forEach((row) => {
    const programName = programsMap.get(row.program_id) || 'Unknown Program';
    const currentCount = trainingAccumulator.get(programName) || 0;
    trainingAccumulator.set(programName, currentCount + Number(row.participants_count || 0));
  });

  return Array.from(trainingAccumulator.entries())
    .map(([program, reach], index) => ({ id: `program-${index}`, program, reach }))
    .sort((a, b) => b.reach - a.reach)
    .slice(0, 5);
}

async function fetchSpecializationDistributionFromSupabase(): Promise<SpecializationVm[]> {
  if (!supabase) {
    throw new Error('Supabase client is not available.');
  }

  const teachersResponse = await supabase
    .from('teachers')
    .select('specialization');

  if (teachersResponse.error) {
    throw teachersResponse.error;
  }

  const teacherRows = (teachersResponse.data || []) as Array<Record<string, any>>;

  const specializationAccumulator = new Map<string, number>();
  teacherRows.forEach((row) => {
    const key = normalizeSpecialization((row.specialization as string) || null);
    specializationAccumulator.set(key, (specializationAccumulator.get(key) || 0) + 1);
  });

  const total = Array.from(specializationAccumulator.values()).reduce((sum, count) => sum + count, 0);

  return Array.from(specializationAccumulator.entries()).map(([name, count], index) => {
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return {
      id: `specialization-${index}`,
      name,
      value: percentage,
      color: specializationColors[name] || specializationColors.Other,
    };
  });
}

async function fetchParticipationTrendFromSupabase(): Promise<ParticipationTrendVm[]> {
  if (!supabase) {
    throw new Error('Supabase client is not available.');
  }

  const trainingResponse = await supabase
    .from('training_participation')
    .select('participation_date, participants_count')
    .order('participation_date', { ascending: true });

  if (trainingResponse.error) {
    throw trainingResponse.error;
  }

  const trainingRows = (trainingResponse.data || []) as Array<Record<string, any>>;
  const trendAccumulator = new Map<string, number>();

  trainingRows.forEach((row) => {
    const month = monthLabel(String(row.participation_date || ''));
    const current = trendAccumulator.get(month) || 0;
    trendAccumulator.set(month, current + Number(row.participants_count || 0));
  });

  return Array.from(trendAccumulator.entries())
    .map(([month, teachers], index) => ({ id: `month-${index}`, month, teachers }))
    .slice(-6);
}

export async function fetchOverviewDashboardDataFromSupabase(): Promise<OverviewDashboardVm> {
  const [kpis, priorityRegions, trainingReachData, specializationData, participationTrend] = await Promise.all([
    fetchOverviewKpisFromSupabase(),
    fetchPriorityRegionsFromSupabase(),
    fetchTrainingReachSummaryFromSupabase(),
    fetchSpecializationDistributionFromSupabase(),
    fetchParticipationTrendFromSupabase(),
  ]);

  return {
    lastUpdated: kpis.lastUpdatedText,
    dataQuality: Number.parseInt(kpis.dataQualityText.replace('%', ''), 10) || 0,
    kpiData: mapOverviewVmToKpiCards(kpis),
    priorityRegions: priorityRegions.length > 0 ? priorityRegions : devSeed.overview.priorityRegions,
    trainingReachData: trainingReachData.length > 0 ? trainingReachData : devSeed.overview.trainingReachData,
    specializationData: specializationData.length > 0 ? specializationData : devSeed.overview.specializationData,
    participationTrend: participationTrend.length > 0 ? participationTrend : devSeed.overview.participationTrend,
  };
}

export async function getTrainingReachSummary() {
  return queryWithFallback(
    fetchTrainingReachSummaryFromSupabase,
    devSeed.overview.trainingReachData,
    'training reach summary',
  );
}

export async function getOverviewDashboardData() {
  return queryWithFallback(
    fetchOverviewDashboardDataFromSupabase,
    devSeed.overview,
    'overview dashboard',
  );
}
