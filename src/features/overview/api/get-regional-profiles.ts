import { supabase } from '../../../lib/supabase/client';
import { queryWithFallback } from '../../shared/api/query-with-fallback';
import type { RegionalProfileSummaryVm } from '../../shared/types/view-models';

async function fetchRegionalProfilesFromSupabase(): Promise<RegionalProfileSummaryVm[]> {
  if (!supabase) {
    throw new Error('Supabase client is not available.');
  }

  const [contextsResponse, regionsResponse] = await Promise.all([
    supabase
      .from('regional_context')
      .select('region_id, teacher_population, star_coverage_pct, underserved_score, data_quality_score, high_priority_divisions, snapshot_date')
      .order('snapshot_date', { ascending: false }),
    supabase
      .from('regions')
      .select('id, psgc_code, region_name'),
  ]);

  if (contextsResponse.error) {
    throw contextsResponse.error;
  }

  if (regionsResponse.error) {
    throw regionsResponse.error;
  }

  const latestByRegion = new Map<string, Record<string, any>>();
  ((contextsResponse.data || []) as Array<Record<string, any>>).forEach((row) => {
    const current = latestByRegion.get(row.region_id as string);
    if (!current) {
      latestByRegion.set(row.region_id as string, row);
    }
  });

  const regionRows = (regionsResponse.data || []) as Array<Record<string, any>>;

  return regionRows
    .map((region) => {
      const context = latestByRegion.get(region.id as string);
      if (!context) {
        return null;
      }

      return {
        regionCode: (region.psgc_code as string) || '',
        region: (region.region_name as string) || 'Unknown Region',
        teacherPopulation: Number(context.teacher_population || 0),
        starCoverage: Number(context.star_coverage_pct || 0),
        underservedScore: Number(context.underserved_score || 0),
        dataQuality: Number(context.data_quality_score || 0),
        highPriorityDivisions: Number(context.high_priority_divisions || 0),
      } as RegionalProfileSummaryVm;
    })
    .filter((item): item is RegionalProfileSummaryVm => Boolean(item))
    .sort((a, b) => b.underservedScore - a.underservedScore);
}

export async function getRegionalProfiles() {
  return queryWithFallback(
    fetchRegionalProfilesFromSupabase,
    [],
    'regional profiles',
  );
}
