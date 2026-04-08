import { read, utils as xlsxUtils } from 'xlsx';
import type { ParsedSpreadsheetDataset, SpreadsheetRow, UploadSourceType } from '../types/upload-workflow';

const SUPPORTED_EXTENSIONS = new Set(['csv', 'xlsx']);

function getFileExtension(fileName: string) {
  const segments = fileName.toLowerCase().split('.');
  return segments.length > 1 ? segments[segments.length - 1] : '';
}

function coerceCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value);
}

function toUniqueHeaders(rawHeaders: string[]) {
  const used = new Map<string, number>();

  return rawHeaders.map((rawHeader, index) => {
    const cleaned = rawHeader.trim() || `column_${index + 1}`;
    const existingCount = used.get(cleaned) || 0;
    used.set(cleaned, existingCount + 1);

    if (existingCount === 0) {
      return cleaned;
    }

    return `${cleaned}_${existingCount + 1}`;
  });
}

function inferSourceType(fileName: string, headers: string[]): UploadSourceType {
  const fingerprint = `${fileName.toLowerCase()} ${headers.join(' ').toLowerCase()}`;

  if (fingerprint.includes('training') || fingerprint.includes('attendance')) {
    return 'training_data';
  }

  if (fingerprint.includes('infrastructure') || fingerprint.includes('facility')) {
    return 'infrastructure';
  }

  if (fingerprint.includes('remote') || fingerprint.includes('geographic') || fingerprint.includes('location')) {
    return 'geographic_data';
  }

  return 'teacher_records';
}

function toRows(records: unknown[][], headers: string[]) {
  return records.map((record) => {
    const row: SpreadsheetRow = {};

    headers.forEach((header, index) => {
      row[header] = coerceCellValue(record[index]);
    });

    return row;
  });
}

export async function parseUploadFile(file: File): Promise<ParsedSpreadsheetDataset> {
  const extension = getFileExtension(file.name);

  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error('Unsupported file type. Please upload a CSV or XLSX file.');
  }

  const fileBuffer = await file.arrayBuffer();

  const workbook = read(fileBuffer, {
    type: 'array',
    cellDates: false,
    raw: false,
  });

  if (workbook.SheetNames.length === 0) {
    throw new Error('The uploaded file does not contain any worksheet data.');
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error('Unable to read the first worksheet from the uploaded file.');
  }

  const rowsMatrix = xlsxUtils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (rowsMatrix.length === 0) {
    throw new Error('The uploaded file is empty.');
  }

  const rawHeaders = rowsMatrix[0].map((value) => coerceCellValue(value));
  const headers = toUniqueHeaders(rawHeaders);
  const rows = toRows(rowsMatrix.slice(1), headers);
  const sourceType = inferSourceType(file.name, headers);

  return {
    fileName: file.name,
    fileSizeBytes: file.size,
    fileType: extension,
    sheetName,
    sourceType,
    sourceName: file.name.replace(/\.[^/.]+$/, ''),
    coverageLabel: 'National',
    uploadedAtIso: new Date().toISOString(),
    headers,
    rows,
  };
}
