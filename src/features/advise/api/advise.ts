import { supabase } from '../../../lib/supabase/client';
import { devSeed } from '../../shared/dev-seed';
import { normalizeSourceStatus } from '../../shared/mappers/formatters';
import { queryWithFallback } from '../../shared/api/query-with-fallback';
import type { AdvisePageVm, RecommendationVm } from '../../shared/types/view-models';

async function fetchRecommendationsFromSupabase(): Promise<RecommendationVm[]> {
  if (!supabase) {
    throw new Error('Supabase client is not available.');
  }

  const [recommendationsResponse, regionsResponse, programsResponse] = await Promise.all([
    supabase
      .from('recommendations')
      .select('id, region_id, score, gap, primary_program_id, secondary_program_id, status, confidence, delivery_method, resource_requirement')
      .order('score', { ascending: false }),
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

  return recommendationRows.map((row) => {
    const interventions: string[] = [];

    if (row.primary_program_id && programsMap.get(row.primary_program_id)) {
      interventions.push(programsMap.get(row.primary_program_id) as string);
    }
    if (row.secondary_program_id && programsMap.get(row.secondary_program_id)) {
      interventions.push(programsMap.get(row.secondary_program_id) as string);
    }

    if (interventions.length === 0) {
      interventions.push('Intervention TBD');
    }

    return {
      id: String(row.id),
      region: regionsMap.get(row.region_id) || 'Unknown Region',
      score: Number(row.score || 0),
      gap: row.gap || 'Data gap',
      interventions,
      status: normalizeSourceStatus(row.status || 'pending_review'),
      confidence: row.confidence === 'high' ? 'high' : 'moderate',
      deliveryMethod: row.delivery_method || 'Blended',
      resourceRequirement: row.resource_requirement || 'Medium',
    };
  });
}

async function fetchInterventionPortfolioFromSupabase(): Promise<string[]> {
  if (!supabase) {
    throw new Error('Supabase client is not available.');
  }

  const response = await supabase
    .from('star_programs')
    .select('name')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (response.error) {
    throw response.error;
  }

  const rows = (response.data || []) as Array<Record<string, any>>;

  return rows.map((row) => row.name as string);
}

export async function getRecommendations() {
  return queryWithFallback(fetchRecommendationsFromSupabase, devSeed.advise.recommendations, 'advice recommendations');
}

export async function getInterventionPortfolio() {
  return queryWithFallback(fetchInterventionPortfolioFromSupabase, devSeed.advise.interventionPortfolio, 'intervention portfolio');
}

export async function getAdvisePageData() {
  return queryWithFallback<AdvisePageVm>(
    async () => {
      const [recommendations, interventionPortfolio] = await Promise.all([
        fetchRecommendationsFromSupabase(),
        fetchInterventionPortfolioFromSupabase(),
      ]);

      return {
        recommendations: recommendations.length > 0 ? recommendations : devSeed.advise.recommendations,
        interventionPortfolio: interventionPortfolio.length > 0 ? interventionPortfolio : devSeed.advise.interventionPortfolio,
      };
    },
    devSeed.advise,
    'advise page data',
  );
}
