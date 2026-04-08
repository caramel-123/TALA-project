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

const BLANK_LIKE_VALUES = new Set(['', 'n/a', 'na', 'none', 'null', 'nil', '-', '--', '""']);

const KNOWN_COLUMN_KEYS = new Set([
  'teacher_external_id',
  'teacher_name',
  'anonymized_teacher_hash',
  'region_code',
  'canonical_region',
  'specialization',
  'years_experience',
  'training_hours_last_12m',
  'region',
  'division',
  'school_id_code',
  'consent_flag',
  'submitted_at',
  'participation_date',
]);

const REQUIRED_COLUMN_KEYS = ['teacher_external_id'];

const NUMERIC_RULES: Record<string, { min: number; max: number }> = {
  years_experience: { min: 0, max: 50 },
  training_hours_last_12m: { min: 0, max: 320 },
};

const DATE_FIELDS = new Set(['submitted_at', 'participation_date']);

const TITLE_CASE_FIELDS = new Set(['teacher_name', 'specialization', 'division']);

const BOOLEAN_FIELDS = new Set(['consent_flag']);

const REGION_CODE_TO_CANONICAL: Record<string, string> = {
  '130000000': 'NCR',
  '040000000': 'Region IV-A',
  '120000000': 'Region XII',
  '190000000': 'BARMM',
};

const REGION_ALIAS_TO_CANONICAL: Record<string, string> = {
  ncr: 'NCR',
  national_capital_region: 'NCR',
  metro_manila: 'NCR',
  region_iv_a: 'Region IV-A',
  region_4a: 'Region IV-A',
  calabarzon: 'Region IV-A',
  region_xii: 'Region XII',
  region_12: 'Region XII',
  soccsksargen: 'Region XII',
  barmm: 'BARMM',
  bangsamoro: 'BARMM',
  bangsamoro_autonomous_region: 'BARMM',
};

const SPECIALIZATION_ALIAS_TO_CANONICAL: Record<string, string> = {
  gensci: 'General Science',
  gen_sci: 'General Science',
  general_sci: 'General Science',
  gen_science: 'General Science',
  science: 'General Science',
  sci: 'General Science',
  general_science: 'General Science',
  sciense: 'General Science',
  mathematics: 'Mathematics',
  math: 'Mathematics',
  maths: 'Mathematics',
  math_education: 'Mathematics',
  gen_math: 'Mathematics',
  general_math: 'Mathematics',
  applied_math: 'Mathematics',
  applied_mathematics: 'Mathematics',
  mathemathics: 'Mathematics',
  biology: 'Biology',
  bio: 'Biology',
  biolgy: 'Biology',
  chemistry: 'Chemistry',
  chem: 'Chemistry',
  chemstry: 'Chemistry',
  physics: 'Physics',
  phys: 'Physics',
  physcs: 'Physics',
  earth_science: 'Earth Science',
  earth_sci: 'Earth Science',
  earthsci: 'Earth Science',
  earthscience: 'Earth Science',
  integ_science: 'Integrated Science',
  integrated_science: 'Integrated Science',
  integrated_sci: 'Integrated Science',
  int_science: 'Integrated Science',
};

const ALLOWED_SPECIALIZATIONS = new Set([
  'Mathematics',
  'General Science',
  'Biology',
  'Chemistry',
  'Physics',
  'Earth Science',
  'Integrated Science',
]);

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
  training_hours_last_12_months: 'training_hours_last_12m',
  submitted_at: 'submitted_at',
  submission_date: 'submitted_at',
  participation_date: 'participation_date',
  region_code: 'region_code',
  region_name: 'region',
  canonical_region: 'canonical_region',
  region: 'region',
  division_code: 'division',
  division: 'division',
  school_id: 'school_id_code',
  school_id_code: 'school_id_code',
  consent_flag: 'consent_flag',
  consent: 'consent_flag',
  consented: 'consent_flag',
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
  const collapsed = value.replace(/\s+/g, ' ').trim();

  if (!collapsed) {
    return '';
  }

  if (/^[A-Z0-9-]+$/.test(collapsed)) {
    return collapsed;
  }

  return value
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function canonicalizeRegion(value: string) {
  const normalized = normalizeToken(value);
  if (!normalized) {
    return null;
  }

  if (REGION_CODE_TO_CANONICAL[normalized]) {
    return REGION_CODE_TO_CANONICAL[normalized];
  }

  return REGION_ALIAS_TO_CANONICAL[normalized] || null;
}

function canonicalizeSpecialization(value: string) {
  const normalized = normalizeToken(value);
  if (!normalized) {
    return null;
  }

  return SPECIALIZATION_ALIAS_TO_CANONICAL[normalized] || null;
}

function normalizeBooleanValue(value: string) {
  const normalized = normalizeToken(value);

  if (!normalized) {
    return '';
  }

  if (['1', 'true', 'yes', 'y'].includes(normalized)) {
    return 'Yes';
  }

  if (['0', 'false', 'no', 'n'].includes(normalized)) {
    return 'No';
  }

  return null;
}

function normalizeTeacherExternalId(value: string) {
  const cleaned = value.trim().toUpperCase();
  if (!cleaned) {
    return '';
  }

  const normalized = cleaned.replace(/\s+/g, '');
  const directDigits = normalized.match(/^\d{1,6}$/);
  const prefixedDigits = normalized.match(/^(?:TCH|TEACHER)[-_]?([0-9]{1,6})$/);

  if (directDigits) {
    return `TCH-${directDigits[0].padStart(6, '0')}`;
  }

  if (prefixedDigits?.[1]) {
    return `TCH-${prefixedDigits[1].padStart(6, '0')}`;
  }

  return cleaned;
}

function normalizeCodeWithPrefix(value: string, prefix: 'DIV' | 'SCH', width: number) {
  const cleaned = value.trim().toUpperCase();
  if (!cleaned) {
    return '';
  }

  const digits = cleaned.replace(/\D+/g, '');
  if (!digits || digits.length > width) {
    return cleaned;
  }

  if (cleaned.startsWith(prefix) || /^\d+$/.test(cleaned)) {
    return `${prefix}-${digits.padStart(width, '0')}`;
  }

  return cleaned;
}

function parseFlexibleNumber(value: string) {
  const compact = value
    .trim()
    .toLowerCase()
    .replace(/,/g, '')
    .replace(/\s+/g, ' ');

  if (!compact) {
    return null;
  }

  if (/^-?\d+(\.\d+)?$/.test(compact)) {
    const direct = Number(compact);
    return Number.isFinite(direct) ? direct : null;
  }

  const withUnits = compact.match(/^(-?\d+(?:\.\d+)?)\s*(hours?|hrs?|years?|yrs?)$/);
  if (withUnits?.[1]) {
    const parsed = Number(withUnits[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const stripped = compact.replace(/[$%]/g, '');
  if (/^-?\d+(\.\d+)?$/.test(stripped)) {
    const parsed = Number(stripped);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
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

    BOOLEAN_FIELDS.forEach((columnKey) => {
      if (!dataset.headers.includes(columnKey)) {
        return;
      }

      const value = normalizeBlankLike(row[columnKey] || '');
      if (!value) {
        return;
      }

      if (normalizeBooleanValue(value) === null) {
        pushIssue(
          issues,
          'invalid_number_format',
          'moderate',
          `Value "${value}" is not a recognized Yes/No value for ${columnKey}.`,
          rowIndex,
          columnKey,
        );
      }
    });

    if (dataset.headers.includes('region') && dataset.headers.includes('canonical_region')) {
      const region = normalizeBlankLike(row.region || '');
      const canonicalRegion = normalizeBlankLike(row.canonical_region || '');

      if (region && canonicalRegion) {
        const normalizedRegion = canonicalizeRegion(region);
        const normalizedCanonical = canonicalizeRegion(canonicalRegion);

        if (normalizedRegion && normalizedCanonical && normalizedRegion !== normalizedCanonical) {
          pushIssue(
            issues,
            'out_of_range_value',
            'moderate',
            `region and canonical_region do not match: "${region}" vs "${canonicalRegion}".`,
            rowIndex,
            'canonical_region',
          );
        }
      }
    }

    if (dataset.headers.includes('specialization')) {
      const specialization = normalizeBlankLike(row.specialization || '');

      if (specialization) {
        const canonicalSpecialization = canonicalizeSpecialization(specialization) || toTitleCase(specialization);

        if (!ALLOWED_SPECIALIZATIONS.has(canonicalSpecialization)) {
          pushIssue(
            issues,
            'out_of_range_value',
            'moderate',
            `specialization "${specialization}" is outside the allowed math/science domain.`,
            rowIndex,
            'specialization',
          );
        }
      }
    }
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

      if (cleanedValue && cleanedValue.includes('  ')) {
        const collapsed = cleanedValue.replace(/\s+/g, ' ').trim();
        if (collapsed !== cleanedValue) {
          cleanedValue = collapsed;
          trimmedValues += 1;
        }
      }

      if (cleanedValue && header === 'teacher_external_id') {
        const normalizedId = normalizeTeacherExternalId(cleanedValue);
        if (normalizedId !== cleanedValue) {
          cleanedValue = normalizedId;
          trimmedValues += 1;
        }
      }

      if (cleanedValue && header === 'division') {
        const normalizedDivision = normalizeCodeWithPrefix(cleanedValue, 'DIV', 3);
        if (normalizedDivision !== cleanedValue) {
          cleanedValue = normalizedDivision;
          trimmedValues += 1;
        }
      }

      if (cleanedValue && header === 'school_id_code') {
        const normalizedSchool = normalizeCodeWithPrefix(cleanedValue, 'SCH', 5);
        if (normalizedSchool !== cleanedValue) {
          cleanedValue = normalizedSchool;
          trimmedValues += 1;
        }
      }

      if (cleanedValue && (header === 'region' || header === 'canonical_region')) {
        const canonicalRegion = canonicalizeRegion(cleanedValue);
        if (canonicalRegion && canonicalRegion !== cleanedValue) {
          cleanedValue = canonicalRegion;
          trimmedValues += 1;
        }
      }

      if (cleanedValue && header === 'specialization') {
        const canonicalSpecialization = canonicalizeSpecialization(cleanedValue);
        if (canonicalSpecialization && canonicalSpecialization !== cleanedValue) {
          cleanedValue = canonicalSpecialization;
          trimmedValues += 1;
        }
      }

      if (cleanedValue && BOOLEAN_FIELDS.has(header)) {
        const normalizedBoolean = normalizeBooleanValue(cleanedValue);
        if (normalizedBoolean && normalizedBoolean !== cleanedValue) {
          cleanedValue = normalizedBoolean;
          trimmedValues += 1;
        }
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
        const parsed = parseFlexibleNumber(cleanedValue);
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

    if (dedupeSignature && seenSignatures.has(dedupeSignature)) {
      removedDuplicateRows += 1;
      return accumulator;
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
