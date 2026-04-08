import type {
  CleaningSummary,
  DatasetValidationResult,
  ParsedSpreadsheetDataset,
  SpreadsheetRow,
  UploadIssueType,
  UploadValidationIssue,
  ValidationSeverity,
  ValidationSummary,
} from '../types/upload-workflow';

const BLANK_LIKE_VALUES = new Set(['', 'n/a', 'na', 'none', 'null', 'nil', '-', '--']);

const KNOWN_COLUMN_KEYS = new Set([
  'teacher_external_id',
  'teacher_name',
  'anonymized_teacher_hash',
  'specialization',
  'years_experience',
  'training_hours_last_12m',
  'region',
  'division',
  'school_id_code',
  'submitted_at',
  'participation_date',
]);

const REQUIRED_COLUMN_KEYS = ['teacher_external_id'];

const NUMERIC_RULES: Record<string, { min: number; max: number }> = {
  years_experience: { min: 0, max: 70 },
  training_hours_last_12m: { min: 0, max: 2000 },
};

const DATE_FIELDS = new Set(['submitted_at', 'participation_date']);

const TITLE_CASE_FIELDS = new Set(['teacher_name', 'specialization', 'region', 'division']);

const HEADER_ALIAS_TO_CANONICAL: Record<string, string> = {
  teacherid: 'teacher_external_id',
  teacher_id: 'teacher_external_id',
  teacher_external_id: 'teacher_external_id',
  employee_id: 'teacher_external_id',
  teacher_name: 'teacher_name',
  fullname: 'teacher_name',
  full_name: 'teacher_name',
  name: 'teacher_name',
  specialization: 'specialization',
  specialisation: 'specialization',
  subject_specialization: 'specialization',
  years_experience: 'years_experience',
  years_of_experience: 'years_experience',
  experience_years: 'years_experience',
  training_hours_last_12m: 'training_hours_last_12m',
  training_hours: 'training_hours_last_12m',
  training_hours_last12m: 'training_hours_last_12m',
  submitted_at: 'submitted_at',
  submission_date: 'submitted_at',
  participation_date: 'participation_date',
  region: 'region',
  division: 'division',
  school_id: 'school_id_code',
  school_id_code: 'school_id_code',
};

function normalizeToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function toCanonicalHeader(header: string) {
  const normalized = normalizeToken(header);

  if (!normalized) {
    return '';
  }

  return HEADER_ALIAS_TO_CANONICAL[normalized] || normalized;
}

function normalizeBlankLike(value: string) {
  const trimmed = value.trim();
  if (BLANK_LIKE_VALUES.has(trimmed.toLowerCase())) {
    return '';
  }
  return trimmed;
}

function toTitleCase(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function parseNumber(value: string) {
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized) {
    return null;
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function normalizeDateString(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function createSummary(issues: UploadValidationIssue[]): ValidationSummary {
  const summary: ValidationSummary = {
    total: issues.length,
    open: 0,
    bySeverity: {
      high: 0,
      moderate: 0,
      low: 0,
    },
    byType: {},
  };

  issues.forEach((issue) => {
    if (issue.state === 'open') {
      summary.open += 1;
    }

    summary.bySeverity[issue.severity] += 1;
    summary.byType[issue.type] = (summary.byType[issue.type] || 0) + 1;
  });

  return summary;
}

function pushIssue(
  issues: UploadValidationIssue[],
  type: UploadIssueType,
  severity: ValidationSeverity,
  message: string,
  rowIndex: number | null,
  columnKey: string | null,
) {
  issues.push({
    id: `${type}-${issues.length + 1}`,
    type,
    severity,
    message,
    rowIndex,
    columnKey,
    state: 'open',
  });
}

function hasOnlyEmptyValues(row: SpreadsheetRow, headers: string[]) {
  return headers.every((header) => normalizeBlankLike(row[header] || '') === '');
}

export function normalizeDatasetHeaders(dataset: ParsedSpreadsheetDataset) {
  const headerOccurrences = new Map<string, number>();
  const unknownHeaders: string[] = [];

  const normalizedHeaders = dataset.headers.map((header, index) => {
    const canonical = toCanonicalHeader(header) || `column_${index + 1}`;

    if (!KNOWN_COLUMN_KEYS.has(canonical) && !canonical.startsWith('column_')) {
      unknownHeaders.push(header);
    }

    const currentCount = headerOccurrences.get(canonical) || 0;
    headerOccurrences.set(canonical, currentCount + 1);

    if (currentCount === 0) {
      return canonical;
    }

    return `${canonical}_${currentCount + 1}`;
  });

  const renamedHeaders = dataset.headers.reduce((count, header, index) => {
    return normalizedHeaders[index] !== header ? count + 1 : count;
  }, 0);

  const normalizedRows = dataset.rows.map((row) => {
    const normalizedRow: SpreadsheetRow = {};

    dataset.headers.forEach((header, index) => {
      normalizedRow[normalizedHeaders[index]] = row[header] || '';
    });

    return normalizedRow;
  });

  return {
    dataset: {
      ...dataset,
      headers: normalizedHeaders,
      rows: normalizedRows,
    },
    renamedHeaders,
    unknownHeaders,
  };
}

export function validateDataset(dataset: ParsedSpreadsheetDataset): DatasetValidationResult {
  const issues: UploadValidationIssue[] = [];

  const missingRequiredColumns = REQUIRED_COLUMN_KEYS.filter((requiredColumn) => !dataset.headers.includes(requiredColumn));

  missingRequiredColumns.forEach((requiredColumn) => {
    pushIssue(
      issues,
      'missing_required_field',
      'high',
      `Required column \"${requiredColumn}\" is missing from the file header.`,
      null,
      requiredColumn,
    );
  });

  dataset.headers.forEach((header) => {
    if (!KNOWN_COLUMN_KEYS.has(header) && !header.startsWith('column_')) {
      pushIssue(
        issues,
        'unknown_header',
        'low',
        `Header \"${header}\" is not mapped to the staging schema.`,
        null,
        header,
      );
    }
  });

  const duplicateIdIndex = new Map<string, number>();
  const duplicateRowIndex = new Map<string, number>();

  dataset.rows.forEach((row, rowIndex) => {
    if (hasOnlyEmptyValues(row, dataset.headers)) {
      pushIssue(issues, 'empty_row', 'moderate', 'Row is completely empty.', rowIndex, null);
      return;
    }

    REQUIRED_COLUMN_KEYS.forEach((requiredColumn) => {
      if (missingRequiredColumns.includes(requiredColumn)) {
        return;
      }

      const value = normalizeBlankLike(row[requiredColumn] || '');
      if (!value) {
        pushIssue(
          issues,
          'missing_required_field',
          'high',
          `Required value for \"${requiredColumn}\" is empty.`,
          rowIndex,
          requiredColumn,
        );
      }
    });

    const externalId = normalizeBlankLike(row.teacher_external_id || '');
    if (externalId) {
      const duplicateKey = externalId.toLowerCase();
      if (duplicateIdIndex.has(duplicateKey)) {
        pushIssue(
          issues,
          'duplicate_id',
          'high',
          `Duplicate teacher_external_id \"${externalId}\" found.`,
          rowIndex,
          'teacher_external_id',
        );
      } else {
        duplicateIdIndex.set(duplicateKey, rowIndex);
      }
    }

    const dedupeSignature = dataset.headers
      .map((header) => normalizeBlankLike(row[header] || '').toLowerCase())
      .join('|');

    if (dedupeSignature && duplicateRowIndex.has(dedupeSignature)) {
      pushIssue(issues, 'duplicate_record', 'moderate', 'Potential duplicate row detected.', rowIndex, null);
    } else {
      duplicateRowIndex.set(dedupeSignature, rowIndex);
    }

    Object.entries(NUMERIC_RULES).forEach(([columnKey, range]) => {
      if (!dataset.headers.includes(columnKey)) {
        return;
      }

      const value = normalizeBlankLike(row[columnKey] || '');
      if (!value) {
        return;
      }

      const parsedValue = parseNumber(value);
      if (parsedValue === null) {
        pushIssue(
          issues,
          'invalid_number_format',
          'moderate',
          `Value \"${value}\" is not a valid number for ${columnKey}.`,
          rowIndex,
          columnKey,
        );
        return;
      }

      if (parsedValue < range.min || parsedValue > range.max) {
        pushIssue(
          issues,
          'out_of_range_value',
          'high',
          `${columnKey} must be between ${range.min} and ${range.max}.`,
          rowIndex,
          columnKey,
        );
      }
    });

    DATE_FIELDS.forEach((columnKey) => {
      if (!dataset.headers.includes(columnKey)) {
        return;
      }

      const value = normalizeBlankLike(row[columnKey] || '');
      if (!value) {
        return;
      }

      if (!normalizeDateString(value)) {
        pushIssue(
          issues,
          'invalid_date',
          'moderate',
          `Date value \"${value}\" is not in a recognized format.`,
          rowIndex,
          columnKey,
        );
      }
    });
  });

  return {
    issues,
    summary: createSummary(issues),
  };
}

export function autoCleanDataset(
  dataset: ParsedSpreadsheetDataset,
  baselineIssueCount: number,
): {
  cleanedDataset: ParsedSpreadsheetDataset;
  validation: DatasetValidationResult;
  summary: CleaningSummary;
} {
  const { dataset: normalizedDataset, renamedHeaders } = normalizeDatasetHeaders(dataset);

  let trimmedValues = 0;
  let normalizedDates = 0;
  let coercedNumbers = 0;
  let blankLikeNormalized = 0;
  let removedEmptyRows = 0;
  let removedDuplicateRows = 0;

  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();

  const cleanedRows = normalizedDataset.rows.reduce<SpreadsheetRow[]>((accumulator, row) => {
    const nextRow: SpreadsheetRow = {};

    normalizedDataset.headers.forEach((header) => {
      const originalValue = row[header] || '';
      const trimmed = originalValue.trim();

      if (trimmed !== originalValue) {
        trimmedValues += 1;
      }

      let cleanedValue = normalizeBlankLike(trimmed);

      if (cleanedValue !== trimmed && cleanedValue === '') {
        blankLikeNormalized += 1;
      }

      if (cleanedValue && TITLE_CASE_FIELDS.has(header)) {
        const titleCased = toTitleCase(cleanedValue);
        if (titleCased !== cleanedValue) {
          cleanedValue = titleCased;
        }
      }

      if (cleanedValue && DATE_FIELDS.has(header)) {
        const normalizedDate = normalizeDateString(cleanedValue);
        if (normalizedDate && normalizedDate !== cleanedValue) {
          cleanedValue = normalizedDate;
          normalizedDates += 1;
        }
      }

      if (cleanedValue && NUMERIC_RULES[header]) {
        const parsed = parseNumber(cleanedValue);
        if (parsed !== null) {
          const normalizedNumber = Number.isInteger(parsed) ? String(parsed) : String(parsed);
          if (normalizedNumber !== cleanedValue) {
            cleanedValue = normalizedNumber;
            coercedNumbers += 1;
          }
        }
      }

      nextRow[header] = cleanedValue;
    });

    if (hasOnlyEmptyValues(nextRow, normalizedDataset.headers)) {
      removedEmptyRows += 1;
      return accumulator;
    }

    const dedupeSignature = normalizedDataset.headers
      .map((header) => normalizeBlankLike(nextRow[header] || '').toLowerCase())
      .join('|');

    const normalizedId = normalizeBlankLike(nextRow.teacher_external_id || '').toLowerCase();

    if (normalizedId && seenIds.has(normalizedId)) {
      removedDuplicateRows += 1;
      return accumulator;
    }

    if (dedupeSignature && seenSignatures.has(dedupeSignature)) {
      removedDuplicateRows += 1;
      return accumulator;
    }

    if (normalizedId) {
      seenIds.add(normalizedId);
    }

    seenSignatures.add(dedupeSignature);
    accumulator.push(nextRow);
    return accumulator;
  }, []);

  const cleanedDataset: ParsedSpreadsheetDataset = {
    ...normalizedDataset,
    rows: cleanedRows,
  };

  const validation = validateDataset(cleanedDataset);

  return {
    cleanedDataset,
    validation,
    summary: {
      trimmedValues,
      normalizedDates,
      coercedNumbers,
      blankLikeNormalized,
      removedEmptyRows,
      removedDuplicateRows,
      renamedHeaders,
      issuesResolved: Math.max(baselineIssueCount - validation.summary.open, 0),
      issuesRemaining: validation.summary.open,
    },
  };
}
