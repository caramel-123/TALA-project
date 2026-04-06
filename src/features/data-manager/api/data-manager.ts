import { supabase } from '../../../lib/supabase/client';
import { devSeed } from '../../shared/dev-seed';
import { formatDateLabel, normalizeSourceStatus, toTitleCaseFromSnake } from '../../shared/mappers/formatters';
import { queryWithFallback } from '../../shared/api/query-with-fallback';
import type {
  DataManagerPageVm,
  DataSourceVm,
  IngestionBatchVm,
  RegionalDataQualityVm,
  ValidationIssueVm,
} from '../../shared/types/view-models';

function normalizeSeverity(value: string): ValidationIssueVm['severity'] {
  if (value === 'high' || value === 'moderate' || value === 'low') {
    return value;
  }
  return 'moderate';
}

async function fetchDataSourcesFromSupabase(): Promise<DataSourceVm[]> {
  if (!supabase) {
    throw new Error('Supabase client is not available.');
  }

  const response = await supabase
    .from('v_data_source_registry')
    .select('source_name, source_type, region_or_coverage, records_count, last_updated_at, completeness_pct, status')
    .order('last_updated_at', { ascending: false, nullsFirst: false });

  if (response.error) {
    throw response.error;
  }

  const rows = (response.data || []) as Array<Record<string, any>>;

  return rows.map((row) => ({
    name: row.source_name,
    type: toTitleCaseFromSnake(row.source_type || ''),
    region: row.region_or_coverage || 'National',
    records: row.records_count || 0,
    lastUpdated: formatDateLabel(row.last_updated_at),
    completeness: Number(row.completeness_pct || 0),
    status: normalizeSourceStatus(row.status || ''),
  }));
}

async function fetchValidationIssuesFromSupabase(): Promise<ValidationIssueVm[]> {
  if (!supabase) {
    throw new Error('Supabase client is not available.');
  }

  const response = await supabase
    .from('v_validation_issue_summary')
    .select('issue_type, severity, issue_count');

  if (response.error) {
    throw response.error;
  }

  const issueAccumulator = new Map<string, ValidationIssueVm>();

  const rows = (response.data || []) as Array<Record<string, any>>;

  rows.forEach((row) => {
    const key = `${row.issue_type}-${row.severity}`;
    const existing = issueAccumulator.get(key);

    if (existing) {
      existing.count += Number(row.issue_count || 0);
      return;
    }

    issueAccumulator.set(key, {
      type: toTitleCaseFromSnake(row.issue_type || 'unknown'),
      count: Number(row.issue_count || 0),
      severity: normalizeSeverity(row.severity || 'moderate'),
    });
  });

  return Array.from(issueAccumulator.values()).sort((a, b) => b.count - a.count);
}

async function fetchRegionalDataQualityFromSupabase(): Promise<RegionalDataQualityVm[]> {
  if (!supabase) {
    throw new Error('Supabase client is not available.');
  }

  const response = await supabase
    .from('v_region_data_quality_latest')
    .select('region_name, quality_score, completeness_pct, recency')
    .order('quality_score', { ascending: false });

  if (response.error) {
    throw response.error;
  }

  const rows = (response.data || []) as Array<Record<string, any>>;

  return rows.map((row) => ({
    region: row.region_name,
    score: Number(row.quality_score || 0),
    completeness: Number(row.completeness_pct || 0),
    recency: row.recency || 'Recent',
  }));
}

async function fetchIngestionBatchesFromSupabase(): Promise<IngestionBatchVm[]> {
  if (!supabase) {
    throw new Error('Supabase client is not available.');
  }

  const response = await supabase
    .from('ingestion_batches')
    .select('id, source_name, file_name, upload_status, row_count, started_at, completed_at')
    .order('started_at', { ascending: false })
    .limit(10);

  if (response.error) {
    throw response.error;
  }

  const rows = (response.data || []) as Array<Record<string, any>>;

  return rows.map((row) => ({
    id: String(row.id),
    sourceName: row.source_name || 'Unknown Source',
    fileName: row.file_name || 'Unknown File',
    uploadStatus: normalizeSourceStatus(row.upload_status || 'pending_review'),
    rowCount: Number(row.row_count || 0),
    startedAt: formatDateLabel(row.started_at),
    completedAt: formatDateLabel(row.completed_at),
  }));
}

export async function getDataSources() {
  return queryWithFallback(fetchDataSourcesFromSupabase, devSeed.dataManager.dataSources, 'Data Manager sources');
}

export async function getValidationIssues() {
  return queryWithFallback(fetchValidationIssuesFromSupabase, devSeed.dataManager.validationIssues, 'validation issues');
}

export async function getRegionalDataQuality() {
  return queryWithFallback(fetchRegionalDataQualityFromSupabase, devSeed.dataManager.dataQualityByRegion, 'regional data quality');
}

export async function getIngestionBatches() {
  return queryWithFallback(fetchIngestionBatchesFromSupabase, [], 'ingestion batches');
}

export async function getDataManagerPageData() {
  return queryWithFallback<DataManagerPageVm>(
    async () => {
      const [sources, issues, quality] = await Promise.all([
        fetchDataSourcesFromSupabase(),
        fetchValidationIssuesFromSupabase(),
        fetchRegionalDataQualityFromSupabase(),
      ]);

      return {
        dataSources: sources.length > 0 ? sources : devSeed.dataManager.dataSources,
        validationIssues: issues.length > 0 ? issues : devSeed.dataManager.validationIssues,
        dataQualityByRegion: quality.length > 0 ? quality : devSeed.dataManager.dataQualityByRegion,
      };
    },
    devSeed.dataManager,
    'Data Manager page data',
  );
}
