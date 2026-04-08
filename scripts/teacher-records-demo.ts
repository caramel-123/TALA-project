#!/usr/bin/env node

/// <reference types="node" />

import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { autoCleanDataset, validateDataset } from '../src/features/data-manager/utils/data-quality';
import type { ParsedSpreadsheetDataset, SpreadsheetRow } from '../src/features/data-manager/types/upload-workflow';

const TEACHER_HEADERS = [
  'teacher_external_id',
  'teacher_name',
  'region_code',
  'region_name',
  'canonical_region',
  'division_code',
  'school_id_code',
  'specialization',
  'years_experience',
  'training_hours_last_12m',
  'consent_flag',
  'submitted_at',
] as const;

type TeacherHeader = (typeof TEACHER_HEADERS)[number];
type TeacherRow = Record<TeacherHeader, string>;
type SeverityLevel = 'light' | 'medium' | 'heavy';
type Command = 'generate' | 'clean' | 'pipeline';

type RegionDef = {
  code: string;
  canonical: string;
  aliases: string[];
};

type GenerationStats = {
  rowsGenerated: number;
  dirtyRows: number;
  exactDuplicateRowsInjected: number;
  nearDuplicateRowsInjected: number;
  duplicateIdsInjected: number;
  missingValuesInjected: number;
  invalidNumericsInjected: number;
  invalidBooleansInjected: number;
  regionAliasIssuesInjected: number;
};

const REGIONS: RegionDef[] = [
  {
    code: '130000000',
    canonical: 'NCR',
    aliases: ['NCR', 'National Capital Region', 'Metro Manila', 'ncr', ' NCR '],
  },
  {
    code: '040000000',
    canonical: 'Region IV-A',
    aliases: ['Region IV-A', 'CALABARZON', 'Calabarzon', 'region iv-a', 'Region 4A'],
  },
  {
    code: '120000000',
    canonical: 'Region XII',
    aliases: ['Region XII', 'SOCCSKSARGEN', 'Region 12', 'region xii', 'Soccsksargen'],
  },
  {
    code: '190000000',
    canonical: 'BARMM',
    aliases: ['BARMM', 'Bangsamoro', 'Bangsamoro Autonomous Region', 'barmm', ' BARMM'],
  },
];

const SPECIALIZATIONS = [
  'Mathematics',
  'General Science',
  'Biology',
  'Chemistry',
  'Physics',
  'Earth Science',
  'Integrated Science',
] as const;

const SPECIALIZATION_TYPO_VARIANTS: Record<string, string[]> = {
  Mathematics: [
    'Math',
    'math',
    'maths',
    'Maths',
    'mathematics',
    'Mathematics',
    'math education',
    'gen math',
    'General Math',
    'applied math',
    'Applied Mathematics',
    'Mathemathics',
    '  Mathematics  ',
  ],
  'General Science': [
    'GenSci',
    'Gensci',
    'gen sci',
    'general sci',
    'General Sci',
    'general science',
    'General Science',
    'GEN SCI',
    'sci',
    'Science',
    'Gen Science',
  ],
  Biology: ['Biolgy', 'bio', 'biology'],
  Chemistry: ['Chemstry', 'Chem', 'chemistry'],
  Physics: ['Physcs', 'Phys', 'physics'],
  'Earth Science': ['Earth Sci', 'EarthScience', 'earth science'],
  'Integrated Science': ['Integrated Science', 'integ science', 'Integrated Sci', 'Int Science', 'integrated science'],
};

const FIRST_NAMES = [
  'Ana',
  'Ben',
  'Carlo',
  'Dina',
  'Elena',
  'Francis',
  'Grace',
  'Hector',
  'Iris',
  'Janelle',
  'Karl',
  'Liza',
  'Marco',
  'Nina',
  'Omar',
  'Paolo',
  'Queenie',
  'Rina',
  'Santos',
  'Tina',
  'Uriel',
  'Vince',
  'Wendy',
  'Xavier',
  'Yna',
  'Zed',
] as const;

const LAST_NAMES = [
  'Abad',
  'Bautista',
  'Cruz',
  'Dela Cruz',
  'Escobar',
  'Flores',
  'Garcia',
  'Herrera',
  'Ilagan',
  'Javier',
  'Lopez',
  'Mendoza',
  'Navarro',
  'Ortega',
  'Perez',
  'Quinto',
  'Reyes',
  'Santos',
  'Torres',
  'Uy',
  'Valdez',
] as const;

const BLANK_LIKE_TOKENS = ['', ' ', 'N/A', 'NA', 'null', '-'] as const;
const BOOLEAN_TRUE_VARIANTS = ['Yes', 'Y', 'TRUE', '1', 'yes'] as const;
const BOOLEAN_FALSE_VARIANTS = ['No', 'N', 'FALSE', '0', 'no'] as const;

const DEFAULT_DIRTY_BY_SEVERITY: Record<SeverityLevel, number> = {
  light: 0.28,
  medium: 0.48,
  heavy: 0.7,
};

class SeededRng {
  private state: number;

  constructor(seed: number) {
    const normalized = Math.floor(Number.isFinite(seed) ? seed : 42);
    this.state = (normalized >>> 0) || 1;
  }

  next(): number {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 4294967296;
  }

  bool(probability: number): boolean {
    return this.next() < probability;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(values: readonly T[]): T {
    return values[this.int(0, values.length - 1)];
  }
}

function parseArgs(argv: string[]): Record<string, string> {
  const options: Record<string, string> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith('--')) {
      options[key] = 'true';
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return options;
}

function toNumberOption(options: Record<string, string>, key: string, fallback: number): number {
  const value = Number(options[key]);
  return Number.isFinite(value) ? value : fallback;
}

function toSeverityOption(options: Record<string, string>): SeverityLevel {
  const raw = (options.severity || 'medium').toLowerCase();

  if (raw === 'light' || raw === 'heavy') {
    return raw;
  }

  return 'medium';
}

function toDirtyRatio(options: Record<string, string>, severity: SeverityLevel): number {
  const value = Number(options.dirty);

  if (!Number.isFinite(value)) {
    return DEFAULT_DIRTY_BY_SEVERITY[severity];
  }

  return Math.min(0.98, Math.max(0.01, value));
}

function ensureParentDirectory(filePath: string): void {
  mkdirSync(dirname(resolve(filePath)), { recursive: true });
}

function padNumber(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

function toCanonicalTeacherId(rowNumber: number): string {
  return `TCH-${padNumber(rowNumber, 6)}`;
}

function randomDateIso(rng: SeededRng): string {
  const base = new Date('2026-04-01T00:00:00.000Z');
  base.setUTCDate(base.getUTCDate() - rng.int(0, 420));
  return base.toISOString().slice(0, 10);
}

function buildCanonicalTeacherRows(rowCount: number, rng: SeededRng): TeacherRow[] {
  const rows: TeacherRow[] = [];

  for (let index = 0; index < rowCount; index += 1) {
    const region = rng.pick(REGIONS);
    const firstName = rng.pick(FIRST_NAMES);
    const lastName = rng.pick(LAST_NAMES);
    const specialization = rng.pick(SPECIALIZATIONS);

    rows.push({
      teacher_external_id: toCanonicalTeacherId(index + 1),
      teacher_name: `${firstName} ${lastName}`,
      region_code: region.code,
      region_name: region.canonical,
      canonical_region: region.canonical,
      division_code: `DIV-${padNumber(rng.int(1, 35), 3)}`,
      school_id_code: `SCH-${padNumber(rng.int(1, 260), 5)}`,
      specialization,
      years_experience: String(rng.int(0, 38)),
      training_hours_last_12m: String(rng.int(0, 180)),
      consent_flag: rng.bool(0.88) ? 'Yes' : 'No',
      submitted_at: randomDateIso(rng),
    });
  }

  return rows;
}

function chooseWeightedMutationIndex(rng: SeededRng): number {
  const weights = [16, 14, 12, 14, 11, 9, 18, 6];
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let threshold = rng.next() * total;

  for (let index = 0; index < weights.length; index += 1) {
    threshold -= weights[index];
    if (threshold <= 0) {
      return index;
    }
  }

  return weights.length - 1;
}

function mutateWhitespaceAndCase(row: TeacherRow, rng: SeededRng): void {
  if (rng.bool(0.75)) {
    row.teacher_name = `  ${row.teacher_name.replace(' ', '   ')}  `;
  }

  if (rng.bool(0.55)) {
    row.teacher_name = rng.bool(0.5) ? row.teacher_name.toUpperCase() : row.teacher_name.toLowerCase();
  }

  if (rng.bool(0.5)) {
    row.specialization = ` ${row.specialization} `;
  }
}

function mutateRegionAliases(row: TeacherRow, rng: SeededRng, stats: GenerationStats): void {
  const canonical = REGIONS.find((region) => region.code === row.region_code);

  if (!canonical) {
    return;
  }

  row.region_name = rng.pick(canonical.aliases);

  if (rng.bool(0.35)) {
    const wrongRegion = rng.pick(REGIONS.filter((region) => region.code !== row.region_code));
    row.canonical_region = wrongRegion.canonical;
  }

  stats.regionAliasIssuesInjected += 1;
}

function mutateCodeFormatting(row: TeacherRow, rng: SeededRng): void {
  const divisionDigits = row.division_code.replace(/\D+/g, '');
  const schoolDigits = row.school_id_code.replace(/\D+/g, '');

  const divisionFormats = [
    `div-${divisionDigits}`,
    `DIV ${divisionDigits}`,
    `division-${Number(divisionDigits)}`,
    `DIV${divisionDigits}`,
  ];

  const schoolFormats = [
    `sch-${schoolDigits}`,
    `SCH ${schoolDigits}`,
    `school-${Number(schoolDigits)}`,
    `SCH${schoolDigits}`,
    `${Number(schoolDigits)}`,
  ];

  row.division_code = rng.pick(divisionFormats);
  row.school_id_code = rng.pick(schoolFormats);

  if (rng.bool(0.25)) {
    row.teacher_external_id = row.teacher_external_id.toLowerCase().replace('-', ' ');
  }
}

function mutateNumericValues(row: TeacherRow, rng: SeededRng, stats: GenerationStats): void {
  const yearsSeed = row.years_experience.match(/\d+/)?.[0];
  const trainingSeed = row.training_hours_last_12m.match(/\d+/)?.[0];

  const years = yearsSeed ? Number(yearsSeed) : rng.int(0, 38);
  const training = trainingSeed ? Number(trainingSeed) : rng.int(0, 180);

  const yearFormats = [
    `${years}`,
    ` ${years} `,
    `${years} yrs`,
    `${String(years).padStart(2, '0')}`,
    years > 0 ? `${years} years` : '0 years',
  ];

  const trainingFormats = [
    `${training}`,
    ` ${training} `,
    `${training} hrs`,
    `${training} hours`,
    `${String(training).padStart(2, '0')}`,
  ];

  row.years_experience = rng.pick(yearFormats);
  row.training_hours_last_12m = rng.pick(trainingFormats);
  stats.invalidNumericsInjected += 1;
}

function mutateBooleanValues(row: TeacherRow, rng: SeededRng, stats: GenerationStats): void {
  const variants = [...BOOLEAN_TRUE_VARIANTS, ...BOOLEAN_FALSE_VARIANTS];
  row.consent_flag = rng.pick(variants);
}

function mutateBlankLikeValues(row: TeacherRow, rng: SeededRng, stats: GenerationStats): void {
  const candidates: TeacherHeader[] = [
    'region_name',
    'training_hours_last_12m',
    'consent_flag',
    'submitted_at',
  ];

  const selected = rng.pick(candidates);
  row[selected] = rng.pick(BLANK_LIKE_TOKENS);

  stats.missingValuesInjected += 1;
}

function mutateSpecialization(row: TeacherRow, rng: SeededRng): void {
  const typoPool = SPECIALIZATION_TYPO_VARIANTS[row.specialization] || [row.specialization];
  row.specialization = rng.pick(typoPool);
}

function mutateStrayPunctuation(row: TeacherRow, rng: SeededRng): void {
  row.teacher_name = `${row.teacher_name}${rng.pick(['.', ',', ';'])}`;

  if (rng.bool(0.15)) {
    row.region_name = `${row.region_name}${rng.pick([',', ' ;'])}`;
  }
}

function cloneRow(row: TeacherRow): TeacherRow {
  return { ...row };
}

function applyMessiness(
  canonicalRows: TeacherRow[],
  rng: SeededRng,
  severity: SeverityLevel,
  dirtyRatio: number,
): { rows: TeacherRow[]; stats: GenerationStats } {
  const rows = canonicalRows.map(cloneRow);
  const stats: GenerationStats = {
    rowsGenerated: canonicalRows.length,
    dirtyRows: 0,
    exactDuplicateRowsInjected: 0,
    nearDuplicateRowsInjected: 0,
    duplicateIdsInjected: 0,
    missingValuesInjected: 0,
    invalidNumericsInjected: 0,
    invalidBooleansInjected: 0,
    regionAliasIssuesInjected: 0,
  };

  const dirtyTarget = Math.max(1, Math.floor(rows.length * dirtyRatio));
  const dirtyIndexes = new Set<number>();

  while (dirtyIndexes.size < dirtyTarget) {
    dirtyIndexes.add(rng.int(0, rows.length - 1));
  }

  const extraMutations = severity === 'heavy' ? 2 : severity === 'medium' ? 1 : 0;

  dirtyIndexes.forEach((rowIndex) => {
    const row = rows[rowIndex];
    const mutationCount = 1 + rng.int(0, extraMutations);

    for (let i = 0; i < mutationCount; i += 1) {
      const mutation = chooseWeightedMutationIndex(rng);

      if (mutation === 0) {
        mutateWhitespaceAndCase(row, rng);
      } else if (mutation === 1) {
        mutateRegionAliases(row, rng, stats);
      } else if (mutation === 2) {
        mutateCodeFormatting(row, rng);
      } else if (mutation === 3) {
        mutateNumericValues(row, rng, stats);
      } else if (mutation === 4) {
        mutateBooleanValues(row, rng, stats);
      } else if (mutation === 5) {
        mutateBlankLikeValues(row, rng, stats);
      } else if (mutation === 6) {
        mutateSpecialization(row, rng);
      } else {
        mutateStrayPunctuation(row, rng);
      }
    }

    // Ensure specialization aliases are visible enough for demo standardization.
    if (rng.bool(0.45)) {
      mutateSpecialization(row, rng);
    }

  });

  stats.dirtyRows = dirtyIndexes.size;

  const exactDuplicateCount = Math.max(1, Math.floor(rows.length * (severity === 'light' ? 0.02 : severity === 'medium' ? 0.03 : 0.05)));
  for (let index = 0; index < exactDuplicateCount; index += 1) {
    const duplicateSource = rows[rng.int(0, rows.length - 1)];
    rows.push(cloneRow(duplicateSource));
    stats.exactDuplicateRowsInjected += 1;
  }

  const nearDuplicateCount = Math.max(1, Math.floor(rows.length * (severity === 'light' ? 0.01 : severity === 'medium' ? 0.02 : 0.04)));
  for (let index = 0; index < nearDuplicateCount; index += 1) {
    const duplicateSource = rows[rng.int(0, rows.length - 1)];
    const nearDuplicate = cloneRow(duplicateSource);
    nearDuplicate.teacher_name = ` ${nearDuplicate.teacher_name.replace(/\s+/g, '  ')} `;
    nearDuplicate.training_hours_last_12m = rng.pick(['40 hrs', '55', '72 hours', ' 90 ']);
    rows.push(nearDuplicate);
    stats.nearDuplicateRowsInjected += 1;
  }

  const duplicateIdCount = Math.max(1, Math.floor(rows.length * (severity === 'light' ? 0.01 : severity === 'medium' ? 0.02 : 0.03)));
  for (let index = 0; index < duplicateIdCount; index += 1) {
    const source = rows[rng.int(0, rows.length - 1)];
    const target = rows[rng.int(0, rows.length - 1)];

    if (source === target) {
      continue;
    }

    target.teacher_external_id = source.teacher_external_id;
    target.teacher_name = `${target.teacher_name} Jr`;
    stats.duplicateIdsInjected += 1;
  }

  return { rows, stats };
}

function writeCsv(outputPath: string, headers: readonly string[], rows: Array<Record<string, string>>): void {
  ensureParentDirectory(outputPath);

  const escapeCell = (value: string) => {
    if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
      return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
  };

  const lines: string[] = [];
  lines.push(headers.map((header) => escapeCell(header)).join(','));

  rows.forEach((row) => {
    const record = headers.map((header) => escapeCell(row[header] ?? ''));
    lines.push(record.join(','));
  });

  writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf-8');
}

function readCsv(inputPath: string): { headers: string[]; rows: SpreadsheetRow[] } {
  const csvText = readFileSync(inputPath, 'utf-8');

  const matrix: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];

    if (inQuotes) {
      if (char === '"') {
        if (csvText[index + 1] === '"') {
          currentCell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }

    if (char === '\n') {
      currentRow.push(currentCell);
      currentCell = '';

      if (currentRow.length > 1 || currentRow[0] !== '') {
        matrix.push(currentRow);
      }

      currentRow = [];
      continue;
    }

    if (char !== '\r') {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    if (currentRow.length > 1 || currentRow[0] !== '') {
      matrix.push(currentRow);
    }
  }

  if (matrix.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = matrix[0].map((value, index) => {
    const label = String(value ?? '').trim();
    return label || `column_${index + 1}`;
  });

  const rows = matrix.slice(1).map((record) => {
    const row: SpreadsheetRow = {};

    headers.forEach((header, index) => {
      row[header] = String(record[index] ?? '');
    });

    return row;
  });

  return { headers, rows };
}

function toDataset(fileName: string, headers: string[], rows: SpreadsheetRow[]): ParsedSpreadsheetDataset {
  return {
    fileName,
    fileSizeBytes: 0,
    fileType: 'csv',
    sheetName: 'teacher_records',
    sourceType: 'teacher_records',
    sourceName: 'teacher_records',
    coverageLabel: 'National',
    uploadedAtIso: new Date().toISOString(),
    headers,
    rows,
  };
}

function summarizeValidationIssues(dataset: ParsedSpreadsheetDataset) {
  const validation = validateDataset(dataset);

  const requiredFieldGaps = validation.issues.filter((issue) => issue.type === 'missing_required_field').length;
  const duplicatesFound = validation.issues.filter(
    (issue) => issue.type === 'duplicate_id' || issue.type === 'duplicate_record',
  ).length;
  const invalidValuesRemaining = validation.issues.filter(
    (issue) => issue.type === 'invalid_number_format' || issue.type === 'out_of_range_value' || issue.type === 'invalid_date',
  ).length;

  return {
    validation,
    requiredFieldGaps,
    duplicatesFound,
    invalidValuesRemaining,
  };
}

function runGenerate(options: Record<string, string>): void {
  const rowCount = Math.max(20, Math.floor(toNumberOption(options, 'rows', 220)));
  const seed = Math.floor(toNumberOption(options, 'seed', 42));
  const severity = toSeverityOption(options);
  const dirty = toDirtyRatio(options, severity);
  const outputPath = options.out || 'demo_uploads/teacher_records_messy.csv';

  const rng = new SeededRng(seed);
  const canonicalRows = buildCanonicalTeacherRows(rowCount, rng);
  const messy = applyMessiness(canonicalRows, rng, severity, dirty);

  writeCsv(outputPath, TEACHER_HEADERS, messy.rows);

  console.log('Teacher records CSV generated');
  console.log(`Output: ${resolve(outputPath)}`);
  console.log(`Rows generated: ${messy.stats.rowsGenerated}`);
  console.log(`Dirty rows: ${messy.stats.dirtyRows}`);
  console.log(`Exact duplicate rows injected: ${messy.stats.exactDuplicateRowsInjected}`);
  console.log(`Near-duplicate rows injected: ${messy.stats.nearDuplicateRowsInjected}`);
  console.log(`Duplicate IDs injected: ${messy.stats.duplicateIdsInjected}`);
  console.log(`Missing values injected: ${messy.stats.missingValuesInjected}`);
  console.log(`Invalid numerics injected: ${messy.stats.invalidNumericsInjected}`);
  console.log(`Invalid booleans injected: ${messy.stats.invalidBooleansInjected}`);
  console.log(`Region alias issues injected: ${messy.stats.regionAliasIssuesInjected}`);
}

function runClean(options: Record<string, string>): void {
  const inputPath = options.in || 'demo_uploads/teacher_records_messy.csv';
  const outputPath = options.out || 'demo_uploads/teacher_records_cleaned.csv';
  const reportPath = options.report === 'false' ? null : (options.report || 'demo_uploads/teacher_records_cleaning_report.json');

  const parsed = readCsv(inputPath);
  const rawDataset = toDataset('teacher_records_messy.csv', parsed.headers, parsed.rows);

  const baseline = summarizeValidationIssues(rawDataset);
  const cleaning = autoCleanDataset(rawDataset, baseline.validation.summary.open);
  const post = summarizeValidationIssues(cleaning.cleanedDataset);

  writeCsv(outputPath, cleaning.cleanedDataset.headers, cleaning.cleanedDataset.rows);

  const report = {
    inputPath: resolve(inputPath),
    outputPath: resolve(outputPath),
    totalRowsProcessed: rawDataset.rows.length,
    rowsChanged: cleaning.summary.rowsChanged,
    rowsAfterCleaning: cleaning.cleanedDataset.rows.length,
    rowsRemoved: rawDataset.rows.length - cleaning.cleanedDataset.rows.length,
    rowsAutoCleaned:
      cleaning.summary.standardizedNames
      + cleaning.summary.standardizedRegions
      + cleaning.summary.standardizedSpecializations
      + cleaning.summary.standardizedBooleans
      + cleaning.summary.standardizedCodes
      + cleaning.summary.coercedNumbers
      + cleaning.summary.normalizedDates
      + cleaning.summary.outOfRangeNumbersCleared,
    rowsStillFlagged: post.validation.summary.open,
    duplicatesFound: baseline.duplicatesFound,
    duplicatesFlaggedAfterCleaning: cleaning.summary.duplicatesFlagged,
    requiredFieldGaps: post.requiredFieldGaps,
    invalidValuesRemaining: post.invalidValuesRemaining,
    baselineIssueSummary: baseline.validation.summary,
    cleanedIssueSummary: post.validation.summary,
    cleaningSummary: cleaning.summary,
  };

  if (reportPath) {
    ensureParentDirectory(reportPath);
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  }

  console.log('Teacher records CSV cleaned');
  console.log(`Input: ${resolve(inputPath)}`);
  console.log(`Output: ${resolve(outputPath)}`);
  if (reportPath) {
    console.log(`Report: ${resolve(reportPath)}`);
  }
  console.log(`Rows processed: ${report.totalRowsProcessed}`);
  console.log(`Rows after cleaning: ${report.rowsAfterCleaning}`);
  console.log(`Rows still flagged: ${report.rowsStillFlagged}`);
}

function runPipeline(options: Record<string, string>): void {
  const shared = { ...options };
  const seed = Math.floor(toNumberOption(options, 'seed', 42));
  const severity = toSeverityOption(options);
  const dirty = toDirtyRatio(options, severity);
  const rows = Math.max(20, Math.floor(toNumberOption(options, 'rows', 220)));
  const messyPath = options.out || 'demo_uploads/teacher_records_messy.csv';
  const cleanedPath = options.cleaned || 'demo_uploads/teacher_records_cleaned.csv';
  const reportPath = options.report || 'demo_uploads/teacher_records_cleaning_report.json';

  runGenerate({ ...shared, rows: String(rows), seed: String(seed), severity, dirty: String(dirty), out: messyPath });
  runClean({ in: messyPath, out: cleanedPath, report: reportPath });
}

function main(): void {
  const argv = process.argv.slice(2);
  const command = (argv[0] as Command) || 'pipeline';
  const options = parseArgs(argv.slice(1));

  if (command === 'generate') {
    runGenerate(options);
    return;
  }

  if (command === 'clean') {
    runClean(options);
    return;
  }

  if (command === 'pipeline') {
    runPipeline(options);
    return;
  }

  console.error('Unknown command. Use: generate | clean | pipeline');
  process.exit(1);
}

main();
