export type UploadSourceType = 'teacher_records' | 'training_data' | 'infrastructure' | 'geographic_data';

export type WorkflowStage = 'idle' | 'parsing' | 'parsed' | 'cleaning' | 'ready' | 'loading' | 'loaded' | 'error';

export type SpreadsheetRow = Record<string, string>;

export type ParsedSpreadsheetDataset = {
  fileName: string;
  fileSizeBytes: number;
  fileType: string;
  sheetName: string;
  sourceType: UploadSourceType;
  sourceName: string;
  coverageLabel: string;
  uploadedAtIso: string;
  headers: string[];
  rows: SpreadsheetRow[];
};

export type ValidationSeverity = 'high' | 'moderate' | 'low';

export type UploadIssueType =
  | 'missing_required_field'
  | 'duplicate_record'
  | 'duplicate_id'
  | 'invalid_number_format'
  | 'invalid_date'
  | 'empty_row'
  | 'out_of_range_value'
  | 'unknown_header';

export type IssueState = 'open' | 'resolved';

export type UploadValidationIssue = {
  id: string;
  type: UploadIssueType;
  severity: ValidationSeverity;
  message: string;
  rowIndex: number | null;
  columnKey: string | null;
  state: IssueState;
};

export type ValidationSummary = {
  total: number;
  open: number;
  bySeverity: Record<ValidationSeverity, number>;
  byType: Record<string, number>;
};

export type DatasetValidationResult = {
  issues: UploadValidationIssue[];
  summary: ValidationSummary;
};

export type CleaningSummary = {
  trimmedValues: number;
  normalizedDates: number;
  coercedNumbers: number;
  blankLikeNormalized: number;
  removedEmptyRows: number;
  removedDuplicateRows: number;
  renamedHeaders: number;
  issuesResolved: number;
  issuesRemaining: number;
};

export type DatasetLoadMode = 'live' | 'demo';

export type DatasetLoadResult = {
  mode: DatasetLoadMode;
  dataSourceName: string;
  dataSourceType: UploadSourceType;
  fileName: string;
  rowCount: number;
  unresolvedIssues: number;
  warning: string | null;
};
