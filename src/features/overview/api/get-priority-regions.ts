import { supabase } from '../../../lib/supabase/client';
import { queryWithFallback } from '../../shared/api/query-with-fallback';
import { devSeed } from '../../shared/dev-seed';
import type { PriorityRegionVm } from '../../shared/types/view-models';

export async function fetchPriorityRegionsFromSupabase(): Promise<PriorityRegionVm[]> {
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

export async function getPriorityRegions() {
  return queryWithFallback(
    fetchPriorityRegionsFromSupabase,
    devSeed.overview.priorityRegions,
    'priority regions',
  );
}
