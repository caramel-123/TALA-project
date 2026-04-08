import { isSupabaseConfigured, supabase } from '../../../lib/supabase/client';
import type {
  DatasetLoadResult,
  DatasetValidationResult,
  ParsedSpreadsheetDataset,
  SpreadsheetRow,
  UploadIssueType,
} from '../types/upload-workflow';

type DatasetStatus = 'pending_review' | 'validated' | 'flagged' | 'rejected';
type LoadStep = 'reference_lookup' | 'data_source_insert' | 'upload_batch_insert' | 'staging_insert' | 'validation_issue_insert';
type StepState = 'pending' | 'success' | 'failed' | 'skipped';

type StructuredError = {
  message: string;
  code: string | null;
  details: string | null;
  hint: string | null;
  status: number | null;
  raw: unknown;
};

type LoadDiagnostics = {
  steps: Record<LoadStep, StepState>;
  rowsAttempted: number;
  rowsInserted: number;
  rowsSkipped: number;
  regionMappedRows: number;
  schoolMappedRows: number;
  notes: string[];
};

type RegionRecord = {
  id: string;
  psgc_code: string;
  region_name: string;
};

type SchoolRecord = {
  id: string;
  school_id_code: string;
};

type ReferenceLookup = {
  regionByCode: Map<string, string>;
  regionByToken: Map<string, string>;
  schoolByCode: Map<string, string>;
};

const WRITE_CHUNK_SIZE = 500;
const runtimeEnv = ((import.meta as unknown as { env?: Record<string, string | boolean | undefined> }).env || {});
const isDevRuntime = runtimeEnv.DEV === true || runtimeEnv.DEV === 'true';
const REGION_TOKEN_ALIAS_TO_CANONICAL: Record<string, string> = {
  ncr: 'ncr',
  national_capital_region: 'ncr',
  metro_manila: 'ncr',
  region_iv_a: 'region_iv_a',
  region_4a: 'region_iv_a',
  region_iva: 'region_iv_a',
  calabarzon: 'region_iv_a',
  region_xii: 'region_xii',
  region_12: 'region_xii',
  region12: 'region_xii',
  soccsksargen: 'region_xii',
  barmm: 'barmm',
  bangsamoro: 'barmm',
  bangsamoro_autonomous_region: 'barmm',
  bangsamoro_autonomous_region_in_muslim_mindanao: 'barmm',
};

class LoadWriteError extends Error {
  readonly step: LoadStep;
  readonly table: string;
  readonly structured: StructuredError;
  readonly diagnostics: LoadDiagnostics;

  constructor(step: LoadStep, table: string, rawError: unknown, diagnostics: LoadDiagnostics) {
    const structured = toStructuredError(rawError);
    super(buildStepMessage(step, table, structured));
    this.name = 'LoadWriteError';
    this.step = step;
    this.table = table;
    this.structured = structured;
    this.diagnostics = diagnostics;
  }

  get fallbackEligible() {
    return isConnectivityFailure(this.structured);
  }
}

function createDiagnostics(rowsAttempted: number): LoadDiagnostics {
  return {
    steps: {
      reference_lookup: 'pending',
      data_source_insert: 'pending',
      upload_batch_insert: 'pending',
      staging_insert: 'pending',
      validation_issue_insert: 'pending',
    },
    rowsAttempted,
    rowsInserted: 0,
    rowsSkipped: 0,
    regionMappedRows: 0,
    schoolMappedRows: 0,
    notes: [],
  };
}

function toStructuredError(error: unknown): StructuredError {
  if (error instanceof Error) {
    return {
      message: error.message || 'Unknown write error.',
      code: null,
      details: null,
      hint: null,
      status: null,
      raw: error,
    };
  }

  if (error && typeof error === 'object') {
    const asRecord = error as {
      message?: unknown;
      code?: unknown;
      details?: unknown;
      hint?: unknown;
      status?: unknown;
    };

    const message = typeof asRecord.message === 'string' && asRecord.message.trim()
      ? asRecord.message
      : 'Unknown write error.';

    return {
      message,
      code: typeof asRecord.code === 'string' ? asRecord.code : null,
      details: typeof asRecord.details === 'string' ? asRecord.details : null,
      hint: typeof asRecord.hint === 'string' ? asRecord.hint : null,
      status: typeof asRecord.status === 'number' ? asRecord.status : null,
      raw: error,
    };
  }

  return {
    message: typeof error === 'string' && error.trim() ? error : 'Unknown write error.',
    code: null,
    details: null,
    hint: null,
    status: null,
    raw: error,
  };
}

function buildStepMessage(step: LoadStep, table: string, structured: StructuredError) {
  const parts = [
    `Supabase write failed at ${step} (${table}): ${structured.message}`,
  ];

  if (structured.code) {
    parts.push(`code=${structured.code}`);
  }

  if (structured.details) {
    parts.push(`details=${structured.details}`);
  }

  if (structured.hint) {
    parts.push(`hint=${structured.hint}`);
  }

  if (structured.code === '42501') {
    parts.push('reason=RLS policy denied insert for current role/session');
  }

  return parts.join(' | ');
}

function isConnectivityFailure(structured: StructuredError) {
  const message = structured.message.toLowerCase();

  if (
    message.includes('failed to fetch')
    || message.includes('network')
    || message.includes('timed out')
    || message.includes('timeout')
    || message.includes('econnrefused')
    || message.includes('enotfound')
  ) {
    return true;
  }

  return structured.status === 502 || structured.status === 503 || structured.status === 504;
}

function normalizeToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeCodeToken(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function canonicalizeRegionToken(value: string) {
  const token = normalizeToken(value);
  return REGION_TOKEN_ALIAS_TO_CANONICAL[token] || token;
}

function registerRegionToken(regionByToken: Map<string, string>, token: string, regionId: string) {
  if (!token) {
    return;
  }

  if (!regionByToken.has(token)) {
    regionByToken.set(token, regionId);
  }
}

function ensureIsoTimestamp(value: string | undefined) {
  if (!value || !value.trim()) {
    return new Date().toISOString();
  }

  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00:00.000Z`;
  }

  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    const serial = Math.trunc(Number(trimmed));

    if (Number.isFinite(serial) && serial >= 1 && serial <= 100000) {
      const excelEpochUtcMs = Date.UTC(1899, 11, 30);
      const parsedDate = new Date(excelEpochUtcMs + serial * 86400000);
      const year = parsedDate.getUTCFullYear();

      if (year >= 2000 && year <= 2100) {
        return parsedDate.toISOString();
      }
    }
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  const year = parsed.getUTCFullYear();

  if (year < 2000 || year > 2100) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

async function fetchReferenceLookup(client: any, diagnostics: LoadDiagnostics): Promise<ReferenceLookup> {
  const regionByCode = new Map<string, string>();
  const regionByToken = new Map<string, string>();
  const schoolByCode = new Map<string, string>();

  try {
    const regionResponse = await client
      .from('regions')
      .select('id, psgc_code, region_name');

    if (regionResponse.error) {
      diagnostics.notes.push(`Region lookup failed: ${toStructuredError(regionResponse.error).message}`);
    } else {
      const regionRows = (regionResponse.data || []) as RegionRecord[];

      regionRows.forEach((region) => {
        const codeToken = region.psgc_code.replace(/\D+/g, '');
        if (codeToken) {
          regionByCode.set(codeToken, region.id);
        }

        const baseToken = normalizeToken(region.region_name);
        registerRegionToken(regionByToken, baseToken, region.id);

        if (baseToken.includes('ncr')) {
          registerRegionToken(regionByToken, 'ncr', region.id);
        }

        if (baseToken.includes('region_iv_a') || baseToken.includes('calabarzon')) {
          registerRegionToken(regionByToken, 'region_iv_a', region.id);
          registerRegionToken(regionByToken, 'calabarzon', region.id);
        }

        if (baseToken.includes('region_xii') || baseToken.includes('soccsksargen') || baseToken.includes('region_12')) {
          registerRegionToken(regionByToken, 'region_xii', region.id);
          registerRegionToken(regionByToken, 'soccsksargen', region.id);
        }

        if (baseToken.includes('barmm') || baseToken.includes('bangsamoro')) {
          registerRegionToken(regionByToken, 'barmm', region.id);
          registerRegionToken(regionByToken, 'bangsamoro', region.id);
        }
      });
    }
  } catch (error) {
    diagnostics.notes.push(`Region lookup failed: ${toStructuredError(error).message}`);
  }

  try {
    const schoolResponse = await client
      .from('schools')
      .select('id, school_id_code');

    if (schoolResponse.error) {
      diagnostics.notes.push(`School lookup failed: ${toStructuredError(schoolResponse.error).message}`);
    } else {
      const schoolRows = (schoolResponse.data || []) as SchoolRecord[];
      schoolRows.forEach((school) => {
        const codeToken = normalizeCodeToken(school.school_id_code || '');

        if (codeToken && !schoolByCode.has(codeToken)) {
          schoolByCode.set(codeToken, school.id);
        }
      });
    }
  } catch (error) {
    diagnostics.notes.push(`School lookup failed: ${toStructuredError(error).message}`);
  }

  diagnostics.steps.reference_lookup = 'success';

  return {
    regionByCode,
    regionByToken,
    schoolByCode,
  };
}

function resolveRegionId(row: SpreadsheetRow, lookup: ReferenceLookup) {
  const regionCodeToken = (row.region_code || '').replace(/\D+/g, '');

  if (regionCodeToken && lookup.regionByCode.has(regionCodeToken)) {
    return lookup.regionByCode.get(regionCodeToken) || null;
  }

  const regionCandidates = [row.canonical_region || '', row.region_name || '']
    .map(canonicalizeRegionToken)
    .filter(Boolean);

  for (const candidate of regionCandidates) {
    if (lookup.regionByToken.has(candidate)) {
      return lookup.regionByToken.get(candidate) || null;
    }

    for (const [token, regionId] of lookup.regionByToken.entries()) {
      if (token.startsWith(candidate) || candidate.startsWith(token)) {
        return regionId;
      }
    }
  }

  return null;
}

function resolveSchoolId(row: SpreadsheetRow, lookup: ReferenceLookup) {
  const codeToken = normalizeCodeToken(row.school_id_code || '');

  if (!codeToken) {
    return null;
  }

  return lookup.schoolByCode.get(codeToken) || null;
}

function resolveDataSourceRegionId(rows: SpreadsheetRow[], lookup: ReferenceLookup) {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    const regionId = resolveRegionId(row, lookup);

    if (!regionId) {
      return;
    }

    counts.set(regionId, (counts.get(regionId) || 0) + 1);
  });

  let bestRegionId: string | null = null;
  let bestCount = 0;

  counts.forEach((count, regionId) => {
    if (count > bestCount) {
      bestRegionId = regionId;
      bestCount = count;
    }
  });

  return bestRegionId;
}

function mapStagingRows(
  batchId: string,
  dataset: ParsedSpreadsheetDataset,
  lookup: ReferenceLookup,
  diagnostics: LoadDiagnostics,
) {
  return dataset.rows.map((row, index) => {
    const regionId = resolveRegionId(row, lookup);
    const schoolId = resolveSchoolId(row, lookup);

    if (regionId) {
      diagnostics.regionMappedRows += 1;
    }

    if (schoolId) {
      diagnostics.schoolMappedRows += 1;
    }

    return {
      batch_id: batchId,
      teacher_external_id: row.teacher_external_id?.trim() || `MISSING-${index + 1}`,
      teacher_name: row.teacher_name?.trim() || null,
      anonymized_teacher_hash: row.anonymized_teacher_hash?.trim() || null,
      specialization: row.specialization?.trim() || null,
      school_id: schoolId,
      region_id: regionId,
      years_experience: toNumberOrNull(row.years_experience),
      training_hours_last_12m: toNumberOrNull(row.training_hours_last_12m),
      submitted_at: ensureIsoTimestamp(row.submitted_at),
    };
  });
}

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

async function insertDataSource(dataset: ParsedSpreadsheetDataset, status: DatasetStatus, regionId: string | null) {
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
        region_id: regionId,
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
  const diagnostics = createDiagnostics(dataset.rows.length);
  const lookup = await fetchReferenceLookup(client, diagnostics);
  const resolvedRegionId = resolveDataSourceRegionId(dataset.rows, lookup);

  const status = toStatusFromIssues(validation.summary.open);
  let createdSource: { id: string; source_name: string };

  try {
    createdSource = await insertDataSource(dataset, status, resolvedRegionId);
    diagnostics.steps.data_source_insert = 'success';
  } catch (error) {
    diagnostics.steps.data_source_insert = 'failed';
    throw new LoadWriteError('data_source_insert', 'data_sources', error, diagnostics);
  }

  let uploadedBy: string | null = null;

  try {
    const authResponse = await client.auth.getUser();
    uploadedBy = authResponse?.data?.user?.id || null;
  } catch {
    diagnostics.notes.push('No active auth session; uploaded_by left null.');
  }

  const uploadBatchResponse = await client
    .from('upload_batches')
    .insert({
      data_source_id: createdSource.id,
      uploaded_by: uploadedBy,
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
    diagnostics.steps.upload_batch_insert = 'failed';
    throw new LoadWriteError(
      'upload_batch_insert',
      'upload_batches',
      uploadBatchResponse.error || new Error('Failed to create upload batch.'),
      diagnostics,
    );
  }

  diagnostics.steps.upload_batch_insert = 'success';

  const batchId = uploadBatchResponse.data.id;

  const stagingRows = mapStagingRows(batchId, dataset, lookup, diagnostics);

  for (const chunk of chunkArray(stagingRows, WRITE_CHUNK_SIZE)) {
    const stagingResponse = await client.from('teacher_records_staging').insert(chunk);
    if (stagingResponse.error) {
      diagnostics.steps.staging_insert = 'failed';
      throw new LoadWriteError('staging_insert', 'teacher_records_staging', stagingResponse.error, diagnostics);
    }

    diagnostics.rowsInserted += chunk.length;
  }

  diagnostics.steps.staging_insert = 'success';

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
        diagnostics.steps.validation_issue_insert = 'failed';
        throw new LoadWriteError('validation_issue_insert', 'validation_issues', issuesResponse.error, diagnostics);
      }
    }

    diagnostics.steps.validation_issue_insert = 'success';
  } else {
    diagnostics.steps.validation_issue_insert = 'skipped';
  }

  if (isDevRuntime) {
    console.info('[Integrate load diagnostics]', {
      ...diagnostics,
      dataSourceId: createdSource.id,
      batchId,
    });
  }

  return {
    mode: 'live',
    dataSourceName: createdSource.source_name,
    dataSourceType: dataset.sourceType,
    fileName: dataset.fileName,
    rowCount: dataset.rows.length,
    unresolvedIssues: validation.summary.open,
    warning: null,
    dataSourceId: createdSource.id,
    batchId,
    loadedToTables: validation.issues.length > 0
      ? ['data_sources', 'upload_batches', 'teacher_records_staging', 'validation_issues']
      : ['data_sources', 'upload_batches', 'teacher_records_staging'],
  };
}

export async function loadDatasetToRegistry(
  dataset: ParsedSpreadsheetDataset,
  validation: DatasetValidationResult,
): Promise<DatasetLoadResult> {
  const isForcedDemoMode = runtimeEnv.VITE_DATA_MANAGER_FORCE_DEMO === 'true';

  if (isForcedDemoMode) {
    return {
      mode: 'demo',
      dataSourceName: normalizeSourceName(dataset.sourceName),
      dataSourceType: dataset.sourceType,
      fileName: dataset.fileName,
      rowCount: dataset.rows.length,
      unresolvedIssues: validation.summary.open,
      warning: 'Deliberate demo mode is enabled (VITE_DATA_MANAGER_FORCE_DEMO=true). Load was simulated.',
      dataSourceId: null,
      batchId: null,
      loadedToTables: [],
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      mode: 'demo',
      dataSourceName: normalizeSourceName(dataset.sourceName),
      dataSourceType: dataset.sourceType,
      fileName: dataset.fileName,
      rowCount: dataset.rows.length,
      unresolvedIssues: validation.summary.open,
      warning: 'Supabase is not configured. Data load is simulated in demo mode.',
      dataSourceId: null,
      batchId: null,
      loadedToTables: [],
    };
  }

  try {
    return await runLiveLoad(dataset, validation);
  } catch (error) {
    if (error instanceof LoadWriteError) {
      if (isDevRuntime) {
        console.error('[Integrate load failure]', {
          step: error.step,
          table: error.table,
          message: error.structured.message,
          code: error.structured.code,
          details: error.structured.details,
          hint: error.structured.hint,
          diagnostics: error.diagnostics,
          raw: error.structured.raw,
        });
      }

      if (error.fallbackEligible) {
        return {
          mode: 'demo',
          dataSourceName: normalizeSourceName(dataset.sourceName),
          dataSourceType: dataset.sourceType,
          fileName: dataset.fileName,
          rowCount: dataset.rows.length,
          unresolvedIssues: validation.summary.open,
          warning: `Supabase is unreachable; load simulated in demo mode. ${error.message}`,
          dataSourceId: null,
          batchId: null,
          loadedToTables: [],
        };
      }

      throw new Error(error.message);
    }

    const structured = toStructuredError(error);

    if (isConnectivityFailure(structured)) {
      return {
        mode: 'demo',
        dataSourceName: normalizeSourceName(dataset.sourceName),
        dataSourceType: dataset.sourceType,
        fileName: dataset.fileName,
        rowCount: dataset.rows.length,
        unresolvedIssues: validation.summary.open,
        warning: `Supabase is unreachable; load simulated in demo mode. ${structured.message}`,
        dataSourceId: null,
        batchId: null,
        loadedToTables: [],
      };
    }

    const parts = [`Supabase write failed: ${structured.message}`];

    if (structured.code) {
      parts.push(`code=${structured.code}`);
    }

    if (structured.details) {
      parts.push(`details=${structured.details}`);
    }

    if (structured.hint) {
      parts.push(`hint=${structured.hint}`);
    }

    throw new Error(parts.join(' | '));
  }
}
