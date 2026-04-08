import {
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Loader2,
  RefreshCcw,
  Sparkles,
  Upload,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '../../../app/components/ui/button';
import { Input } from '../../../app/components/ui/input';
import { SpreadsheetGrid } from './SpreadsheetGrid';
import { ValidationIssuesSheet } from './ValidationIssuesSheet';
import { loadDatasetToRegistry } from '../api/upload-workflow';
import type {
  CleaningSummary,
  DatasetLoadResult,
  DatasetValidationResult,
  ParsedSpreadsheetDataset,
  UploadValidationIssue,
  WorkflowStage,
} from '../types/upload-workflow';
import { autoCleanDataset, normalizeDatasetHeaders, validateDataset } from '../utils/data-quality';
import { parseUploadFile } from '../utils/parse-upload-file';

type UploadWorkflowPanelProps = {
  onLoadComplete: (result: DatasetLoadResult) => void;
};

type UndoSnapshot = {
  dataset: ParsedSpreadsheetDataset;
  label: string;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function cloneDataset(dataset: ParsedSpreadsheetDataset) {
  return {
    ...dataset,
    headers: [...dataset.headers],
    rows: dataset.rows.map((row) => ({ ...row })),
  };
}

function sourceTypeLabel(value: ParsedSpreadsheetDataset['sourceType']) {
  if (value === 'teacher_records') {
    return 'Teacher Records';
  }

  if (value === 'training_data') {
    return 'Training Data';
  }

  if (value === 'infrastructure') {
    return 'Infrastructure';
  }

  return 'Geographic Data';
}

function getValidationStatus(validation: DatasetValidationResult | null) {
  if (!validation) {
    return 'No validation results yet';
  }

  if (validation.summary.open === 0) {
    return 'No open issues';
  }

  return `${validation.summary.open} open issues`;
}

export function UploadWorkflowPanel({ onLoadComplete }: UploadWorkflowPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stage, setStage] = useState<WorkflowStage>('idle');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [rawDataset, setRawDataset] = useState<ParsedSpreadsheetDataset | null>(null);
  const [rawValidation, setRawValidation] = useState<DatasetValidationResult | null>(null);
  const [cleanedDataset, setCleanedDataset] = useState<ParsedSpreadsheetDataset | null>(null);
  const [cleanedValidation, setCleanedValidation] = useState<DatasetValidationResult | null>(null);
  const [cleaningSummary, setCleaningSummary] = useState<string | null>(null);
  const [cleaningMetrics, setCleaningMetrics] = useState<CleaningSummary | null>(null);
  const [lastLoadResult, setLastLoadResult] = useState<DatasetLoadResult | null>(null);
  const [issueSheetOpen, setIssueSheetOpen] = useState(false);
  const [focusTarget, setFocusTarget] = useState<{ rowIndex: number | null; columnKey: string | null; token: number }>({
    rowIndex: null,
    columnKey: null,
    token: 0,
  });
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(null);

  const currentValidation = cleanedValidation || rawValidation;
  const currentIssues = currentValidation?.issues || [];

  const openHighIssues = (cleanedValidation?.issues || []).filter(
    (issue) => issue.state === 'open' && issue.severity === 'high',
  ).length;

  const canLoad = Boolean(cleanedDataset && cleanedValidation && cleanedDataset.rows.length > 0 && openHighIssues === 0);

  const stepStatuses = useMemo(
    () => [
      { label: '1. Upload', active: stage !== 'idle' || Boolean(rawDataset) },
      { label: '2. Review Raw + Issues', active: Boolean(rawDataset) },
      { label: '3. Auto Clean or Review', active: stage === 'cleaning' || Boolean(cleanedDataset) },
      { label: '4. Review Cleaned Data', active: Boolean(cleanedDataset) },
      { label: '5. Load Data', active: stage === 'loaded' || stage === 'loading' },
    ],
    [stage, rawDataset, cleanedDataset],
  );

  const updateDatasetMetadata = (
    field: 'sourceName' | 'coverageLabel' | 'sourceType',
    value: string,
  ) => {
    setRawDataset((previous) => {
      if (!previous) {
        return previous;
      }

      return {
        ...previous,
        [field]: value,
      };
    });

    setCleanedDataset((previous) => {
      if (!previous) {
        return previous;
      }

      return {
        ...previous,
        [field]: value,
      };
    });
  };

  const handleIssueJump = (issue: UploadValidationIssue) => {
    setFocusTarget((previous) => ({
      rowIndex: issue.rowIndex,
      columnKey: issue.columnKey,
      token: previous.token + 1,
    }));
  };

  const handleFile = async (file: File) => {
    setStage('parsing');
    setUndoSnapshot(null);

    try {
      const parsed = await parseUploadFile(file);
      const normalized = normalizeDatasetHeaders(parsed);
      const validation = validateDataset(normalized.dataset);

      setRawDataset(normalized.dataset);
      setRawValidation(validation);
      setCleanedDataset(null);
      setCleanedValidation(null);
      setCleaningMetrics(null);
      setLastLoadResult(null);
      setCleaningSummary(
        normalized.renamedHeaders > 0
          ? `${normalized.renamedHeaders} header names were standardized for schema mapping.`
          : null,
      );
      setStage('parsed');

      toast.success(`Parsed ${file.name} with ${normalized.dataset.rows.length.toLocaleString()} rows.`);
    } catch (error) {
      setStage('error');
      const message = error instanceof Error ? error.message : 'Could not parse the uploaded file.';
      toast.error(message);
    }
  };

  const handleFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await handleFile(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    await handleFile(file);
  };

  const handleAutoClean = async () => {
    if (!rawDataset || !rawValidation) {
      return;
    }

    setStage('cleaning');

    const { cleanedDataset: nextCleaned, validation, summary } = autoCleanDataset(rawDataset, rawValidation.summary.open);

    setCleanedDataset(nextCleaned);
    setCleanedValidation(validation);
    setCleaningMetrics(summary);
    setLastLoadResult(null);
    setUndoSnapshot(null);
    setStage('ready');

    setCleaningSummary(
      [
        `${summary.issuesResolved} issues auto-resolved`,
        `${summary.issuesRemaining} issues still need review`,
        `${summary.removedEmptyRows} empty rows removed`,
        `${summary.removedDuplicateRows} duplicates removed`,
      ].join(' • '),
    );

    toast.success('Auto clean completed. Review the cleaned spreadsheet before loading.');
  };

  const handleCellEdit = (rowIndex: number, columnKey: string, value: string) => {
    setCleanedDataset((previous) => {
      if (!previous || !previous.rows[rowIndex]) {
        return previous;
      }

      const snapshot = cloneDataset(previous);
      const nextRows = previous.rows.map((row, index) => {
        if (index !== rowIndex) {
          return row;
        }

        return {
          ...row,
          [columnKey]: value,
        };
      });

      const nextDataset: ParsedSpreadsheetDataset = {
        ...previous,
        rows: nextRows,
      };

      setUndoSnapshot({
        dataset: snapshot,
        label: `Edited row ${rowIndex + 1}`,
      });
      setCleanedValidation(validateDataset(nextDataset));
      return nextDataset;
    });
  };

  const handleDeleteRow = (rowIndex: number) => {
    setCleanedDataset((previous) => {
      if (!previous || !previous.rows[rowIndex]) {
        return previous;
      }

      const snapshot = cloneDataset(previous);
      const nextRows = previous.rows.filter((_, index) => index !== rowIndex);
      const nextDataset: ParsedSpreadsheetDataset = {
        ...previous,
        rows: nextRows,
      };

      setUndoSnapshot({
        dataset: snapshot,
        label: `Deleted row ${rowIndex + 1}`,
      });
      setCleanedValidation(validateDataset(nextDataset));
      return nextDataset;
    });
  };

  const handleUndo = () => {
    if (!undoSnapshot) {
      return;
    }

    const reverted = cloneDataset(undoSnapshot.dataset);
    const validation = validateDataset(reverted);

    setCleanedDataset(reverted);
    setCleanedValidation(validation);
    toast.info(`Undid: ${undoSnapshot.label}`);
    setUndoSnapshot(null);
  };

  const handleLoadData = async () => {
    if (!cleanedDataset || !cleanedValidation) {
      return;
    }

    setStage('loading');

    const loadResult = await loadDatasetToRegistry(cleanedDataset, cleanedValidation);

    if (loadResult.mode === 'live') {
      toast.success(`Loaded ${loadResult.rowCount.toLocaleString()} rows into registry.`);
    } else {
      toast.info(loadResult.warning || 'Load simulated in demo mode.');
    }

    onLoadComplete(loadResult);
    setLastLoadResult(loadResult);
    setStage('loaded');
  };

  return (
    <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#1B3A5C',
          }}
        >
          Upload, Clean, and Load Data
        </h2>
        <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#888888' }}>
          {stage === 'idle' ? 'Ready to upload' : stage === 'loading' ? 'Loading to registry...' : 'Workflow active'}
        </span>
      </div>

      <div className="mb-4 grid gap-2 md:grid-cols-5">
        {stepStatuses.map((step) => (
          <div
            key={step.label}
            className="rounded border px-3 py-2"
            style={{
              borderColor: step.active ? '#2E6DA4' : '#D8D8D8',
              backgroundColor: step.active ? '#EBF4FB' : '#FFFFFF',
              color: step.active ? '#1B3A5C' : '#888888',
              fontFamily: 'Arial, sans-serif',
              fontSize: '10px',
              fontWeight: 'bold',
            }}
          >
            {step.label}
          </div>
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx"
        className="hidden"
        onChange={handleFileInputChange}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className="mb-4 cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors"
        style={{
          borderColor: isDraggingOver ? '#2E6DA4' : '#A8C8E8',
          backgroundColor: isDraggingOver ? '#EBF4FB' : '#FFFFFF',
        }}
      >
        <Upload className="mx-auto mb-2 h-10 w-10" style={{ color: '#2E6DA4' }} />
        <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1A1A1A' }}>
          Click to upload or drag and drop
        </p>
        <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888' }}>
          Supports .csv and .xlsx
        </p>
      </div>

      {rawDataset && (
        <div className="mb-4 overflow-x-auto rounded border border-[#D8D8D8] bg-[#EBF4FB] p-2">
          <div className="flex min-w-max items-center gap-2 whitespace-nowrap">
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#1A1A1A' }}>
              <strong>File:</strong> {rawDataset.fileName}
            </div>
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#1A1A1A' }}>
              <strong>Rows:</strong> {rawDataset.rows.length.toLocaleString()}
            </div>
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#1A1A1A' }}>
              <strong>Columns:</strong> {rawDataset.headers.length.toLocaleString()}
            </div>
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#1A1A1A' }}>
              <strong>Status:</strong> {getValidationStatus(currentValidation)}
            </div>

            <div className="h-5 w-px bg-[#A8C8E8]" aria-hidden="true" />

            <div className="flex items-center gap-2">
              <label style={{ fontFamily: 'Arial, sans-serif', fontSize: '8px', color: '#888888' }}>Source Name</label>
              <Input
                value={rawDataset.sourceName}
                onChange={(event) => updateDatasetMetadata('sourceName', event.target.value)}
                className="h-7 w-40 bg-white"
                style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px' }}
              />
            </div>

            <div className="flex items-center gap-2">
              <label style={{ fontFamily: 'Arial, sans-serif', fontSize: '8px', color: '#888888' }}>Coverage</label>
              <Input
                value={rawDataset.coverageLabel}
                onChange={(event) => updateDatasetMetadata('coverageLabel', event.target.value)}
                className="h-7 w-28 bg-white"
                style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px' }}
              />
            </div>

            <div className="flex items-center gap-2">
              <label style={{ fontFamily: 'Arial, sans-serif', fontSize: '8px', color: '#888888' }}>Source Type</label>
              <select
                className="h-7 w-36 rounded-md border border-[#D8D8D8] bg-white px-2"
                style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px' }}
                value={rawDataset.sourceType}
                onChange={(event) => updateDatasetMetadata('sourceType', event.target.value)}
              >
                <option value="teacher_records">Teacher Records</option>
                <option value="training_data">Training Data</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="geographic_data">Geographic Data</option>
              </select>
            </div>

            {rawValidation && (
              <>
                <div className="h-5 w-px bg-[#A8C8E8]" aria-hidden="true" />

                <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#1A1A1A' }}>
                  <strong>Total Issues:</strong> {rawValidation.summary.total}
                </span>
                <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#1A1A1A' }}>
                  <strong>High:</strong> {rawValidation.summary.bySeverity.high}
                </span>
                <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#1A1A1A' }}>
                  <strong>Moderate:</strong> {rawValidation.summary.bySeverity.moderate}
                </span>
                <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#1A1A1A' }}>
                  <strong>Low:</strong> {rawValidation.summary.bySeverity.low}
                </span>

                {cleaningSummary && (
                  <span
                    className="max-w-[380px] truncate"
                    title={cleaningSummary}
                    style={{ fontFamily: 'Arial, sans-serif', fontSize: '8px', color: '#2E6DA4' }}
                  >
                    {cleaningSummary}
                  </span>
                )}

                <Button
                  type="button"
                  onClick={() => setIssueSheetOpen(true)}
                  className="h-7 bg-[#2E6DA4] px-2 hover:bg-[#1B3A5C]"
                  style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', fontWeight: 'bold' }}
                >
                  Review All Issues
                </Button>
                <Button
                  type="button"
                  onClick={handleAutoClean}
                  disabled={stage === 'cleaning' || stage === 'loading'}
                  variant="outline"
                  className="h-7 border-[#2E6DA4] px-2 text-[#2E6DA4] hover:bg-[#EBF4FB]"
                  style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', fontWeight: 'bold' }}
                >
                  {stage === 'cleaning' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Auto Clean Data
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {rawDataset && rawValidation && (
        <div className="mb-4">
          <SpreadsheetGrid
            title="Raw Data Preview"
            headers={rawDataset.headers}
            rows={rawDataset.rows}
            focusTarget={focusTarget}
          />
        </div>
      )}

      {cleanedDataset && cleanedValidation && (
        <div className="space-y-3">
          {cleaningMetrics && (
            <div className="flex flex-wrap items-center gap-3 rounded border border-[#D8D8D8] bg-white px-3 py-2">
              <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#1A1A1A' }}>
                <strong>Rows Processed:</strong> {rawDataset?.rows.length.toLocaleString() || 0}
              </span>
              <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#1A1A1A' }}>
                <strong>Values Standardized:</strong> {(cleaningMetrics.trimmedValues + cleaningMetrics.coercedNumbers + cleaningMetrics.normalizedDates).toLocaleString()}
              </span>
              <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#1A1A1A' }}>
                <strong>Duplicates Removed:</strong> {cleaningMetrics.removedDuplicateRows.toLocaleString()}
              </span>
              <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#1A1A1A' }}>
                <strong>Remaining Issues:</strong> {cleanedValidation.summary.open.toLocaleString()}
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-[#D8D8D8] bg-[#EBF4FB] p-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-[#2E6DA4]" />
              <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#1A1A1A' }}>
                Cleaned Dataset ({sourceTypeLabel(cleanedDataset.sourceType)})
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#1A1A1A' }}>
                Open issues: <strong>{cleanedValidation.summary.open}</strong>
              </span>
              <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: canLoad ? '#2E6DA4' : '#B8860B' }}>
                {canLoad ? 'Ready to load' : 'Resolve high-severity issues before loading'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleUndo}
              disabled={!undoSnapshot}
              variant="outline"
              className="border-[#D8D8D8]"
              style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px' }}
            >
              <RefreshCcw className="h-4 w-4" />
              Undo Last Edit/Delete
            </Button>

            <Button
              type="button"
              onClick={handleLoadData}
              disabled={!canLoad || stage === 'loading'}
              className="bg-[#2E6DA4] hover:bg-[#1B3A5C]"
              style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', fontWeight: 'bold' }}
            >
              {stage === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              Load Data
            </Button>
          </div>

          <SpreadsheetGrid
            title="Cleaned Data Preview (Editable)"
            headers={cleanedDataset.headers}
            rows={cleanedDataset.rows}
            editable
            focusTarget={focusTarget}
            onCellEdit={handleCellEdit}
            onDeleteRow={handleDeleteRow}
          />

          {lastLoadResult && (
            <div className="flex flex-wrap items-center gap-3 rounded border border-[#A8C8E8] bg-[#EBF4FB] px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-[#2E6DA4]" />
              <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#1A1A1A' }}>
                {lastLoadResult.mode === 'live' ? 'Loaded to Supabase successfully.' : 'Load simulated in demo mode.'}
              </span>
              <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#1A1A1A' }}>
                <strong>Rows:</strong> {lastLoadResult.rowCount.toLocaleString()}
              </span>
              <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#1A1A1A' }}>
                <strong>Source:</strong> {lastLoadResult.dataSourceName}
              </span>
              {lastLoadResult.batchId && (
                <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#1A1A1A' }}>
                  <strong>Batch:</strong> {lastLoadResult.batchId}
                </span>
              )}
              {lastLoadResult.mode === 'live' && lastLoadResult.loadedToTables.length > 0 && (
                <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#1A1A1A' }}>
                  <strong>Tables:</strong> {lastLoadResult.loadedToTables.join(', ')}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <ValidationIssuesSheet
        open={issueSheetOpen}
        onOpenChange={setIssueSheetOpen}
        issues={currentIssues}
        summary={currentValidation?.summary || null}
        onJumpToIssue={(issue) => {
          handleIssueJump(issue);
          setIssueSheetOpen(false);
        }}
      />
    </div>
  );
}
