import { isSupabaseConfigured, supabase } from '../../../lib/supabase/client';
import type {
  DatasetLoadResult,
  DatasetValidationResult,
  ParsedSpreadsheetDataset,
  UploadIssueType,
} from '../types/upload-workflow';

type DatasetStatus = 'pending_review' | 'validated' | 'flagged' | 'rejected';

const WRITE_CHUNK_SIZE = 500;

function toNumberOrNull(value: string | undefined) {
  if (!value || !value.trim()) {
    return null;
  }

  const cleaned = value.replace(/,/g, '').trim();
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    return null;
  }

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.round(parsed);
}

function toStatusFromIssues(openIssueCount: number): DatasetStatus {
  return openIssueCount > 0 ? 'flagged' : 'validated';
}

function normalizeSourceName(sourceName: string) {
  return sourceName.trim() || `Uploaded dataset ${new Date().toISOString().slice(0, 10)}`;
}

function mapIssueTypeToDb(issueType: UploadIssueType) {
  if (issueType === 'unknown_header') {
    return 'provenance_conflict';
  }

  if (issueType === 'duplicate_id') {
    return 'duplicate_record';
  }

  if (issueType === 'invalid_number_format' || issueType === 'invalid_date') {
    return 'format_mismatch';
  }

  if (issueType === 'empty_row') {
    return 'missing_required_field';
  }

  return issueType;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function insertDataSource(dataset: ParsedSpreadsheetDataset, status: DatasetStatus) {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const client = supabase as any;

  const sourceType = dataset.sourceType;
  const baseName = normalizeSourceName(dataset.sourceName);
  const nameCandidates = [
    baseName,
    `${baseName} (${new Date().toISOString().slice(0, 10)})`,
    `${baseName} (${Date.now()})`,
  ];

  for (const sourceName of nameCandidates) {
    const response = await client
      .from('data_sources')
      .insert({
        source_name: sourceName,
        source_type: sourceType,
        coverage_label: dataset.coverageLabel || 'National',
        records_count: dataset.rows.length,
        completeness_pct: 100,
        status,
        last_updated_at: new Date().toISOString(),
      })
      .select('id, source_name')
      .single();

    if (!response.error && response.data) {
      return response.data;
    }

    if (response.error?.code !== '23505') {
      throw response.error;
    }
  }

  throw new Error('Unable to create a unique data source name for this upload.');
}

async function runLiveLoad(dataset: ParsedSpreadsheetDataset, validation: DatasetValidationResult): Promise<DatasetLoadResult> {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const client = supabase as any;

  const status = toStatusFromIssues(validation.summary.open);
  const createdSource = await insertDataSource(dataset, status);

  const uploadBatchResponse = await client
    .from('upload_batches')
    .insert({
      data_source_id: createdSource.id,
      file_name: dataset.fileName,
      file_type: dataset.fileType,
      file_size_bytes: dataset.fileSizeBytes,
      upload_status: status,
      row_count: dataset.rows.length,
      started_at: dataset.uploadedAtIso,
      completed_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (uploadBatchResponse.error || !uploadBatchResponse.data) {
    throw uploadBatchResponse.error || new Error('Failed to create upload batch.');
  }

  const batchId = uploadBatchResponse.data.id;

  const stagingRows = dataset.rows.map((row, index) => ({
    batch_id: batchId,
    teacher_external_id: row.teacher_external_id?.trim() || `MISSING-${index + 1}`,
    teacher_name: row.teacher_name?.trim() || null,
    anonymized_teacher_hash: row.anonymized_teacher_hash?.trim() || null,
    specialization: row.specialization?.trim() || null,
    school_id: null,
    region_id: null,
    years_experience: toNumberOrNull(row.years_experience),
    training_hours_last_12m: toNumberOrNull(row.training_hours_last_12m),
  }));

  for (const chunk of chunkArray(stagingRows, WRITE_CHUNK_SIZE)) {
    const stagingResponse = await client.from('teacher_records_staging').insert(chunk);
    if (stagingResponse.error) {
      throw stagingResponse.error;
    }
  }

  if (validation.issues.length > 0) {
    const issueRows = validation.issues.map((issue) => ({
      batch_id: batchId,
      issue_type: mapIssueTypeToDb(issue.type),
      severity: issue.severity,
      field_name: issue.columnKey,
      issue_message: issue.message,
      is_resolved: issue.state === 'resolved',
    }));

    for (const chunk of chunkArray(issueRows, WRITE_CHUNK_SIZE)) {
      const issuesResponse = await client.from('validation_issues').insert(chunk);
      if (issuesResponse.error) {
        throw issuesResponse.error;
      }
    }
  }

  return {
    mode: 'live',
    dataSourceName: createdSource.source_name,
    dataSourceType: dataset.sourceType,
    fileName: dataset.fileName,
    rowCount: dataset.rows.length,
    unresolvedIssues: validation.summary.open,
    warning: null,
  };
}

export async function loadDatasetToRegistry(
  dataset: ParsedSpreadsheetDataset,
  validation: DatasetValidationResult,
): Promise<DatasetLoadResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      mode: 'demo',
      dataSourceName: normalizeSourceName(dataset.sourceName),
      dataSourceType: dataset.sourceType,
      fileName: dataset.fileName,
      rowCount: dataset.rows.length,
      unresolvedIssues: validation.summary.open,
      warning: 'Supabase is not configured. Data load is simulated in demo mode.',
    };
  }

  try {
    return await runLiveLoad(dataset, validation);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown write error';

    return {
      mode: 'demo',
      dataSourceName: normalizeSourceName(dataset.sourceName),
      dataSourceType: dataset.sourceType,
      fileName: dataset.fileName,
      rowCount: dataset.rows.length,
      unresolvedIssues: validation.summary.open,
      warning: `Supabase write path is unavailable (${message}). Load was simulated for the demo.`,
    };
  }
}
