import { AlertCircle, ArrowRightCircle, CheckCircle2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../../../app/components/ui/sheet';
import type { UploadValidationIssue, ValidationSummary } from '../types/upload-workflow';

type ValidationIssuesSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issues: UploadValidationIssue[];
  summary: ValidationSummary | null;
  onJumpToIssue: (issue: UploadValidationIssue) => void;
};

const severityLabelMap: Record<string, string> = {
  high: 'High',
  moderate: 'Moderate',
  low: 'Low',
};

function getSeverityColor(severity: UploadValidationIssue['severity']) {
  if (severity === 'high') {
    return { bg: '#F5DFA0', text: '#1A1A1A', icon: '#B8860B' };
  }

  if (severity === 'moderate') {
    return { bg: '#EBF4FB', text: '#1A1A1A', icon: '#2E6DA4' };
  }

  return { bg: '#D5E8F7', text: '#1A1A1A', icon: '#2E6DA4' };
}

function toReadableIssueType(type: string) {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function ValidationIssuesSheet({
  open,
  onOpenChange,
  issues,
  summary,
  onJumpToIssue,
}: ValidationIssuesSheetProps) {
  const openIssues = issues.filter((issue) => issue.state === 'open');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[96vw] max-w-[640px]">
        <SheetHeader>
          <SheetTitle style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>Validation Issue Review</SheetTitle>
          <SheetDescription style={{ fontFamily: 'Arial, sans-serif', color: '#888888' }}>
            Review issues detected in the current dataset and jump directly to affected rows or cells.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-3">
          <div className="grid grid-cols-2 gap-2 rounded border border-[#D8D8D8] bg-[#EBF4FB] p-3">
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#1A1A1A' }}>
              Total Issues: <strong>{summary?.total ?? 0}</strong>
            </div>
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#1A1A1A' }}>
              Open: <strong>{summary?.open ?? 0}</strong>
            </div>
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#1A1A1A' }}>
              High: <strong>{summary?.bySeverity.high ?? 0}</strong>
            </div>
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#1A1A1A' }}>
              Moderate: <strong>{summary?.bySeverity.moderate ?? 0}</strong>
            </div>
          </div>
        </div>

        <div className="h-[calc(100%-170px)] overflow-auto px-4 pb-6">
          {openIssues.length === 0 && (
            <div className="rounded border border-[#D8D8D8] bg-white p-3 text-center" style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#888888' }}>
              No open issues remain for this dataset.
            </div>
          )}

          <div className="space-y-2">
            {openIssues.map((issue) => {
              const severityColor = getSeverityColor(issue.severity);
              const rowLabel = issue.rowIndex !== null ? `Row ${issue.rowIndex + 1}` : 'Header';
              const columnLabel = issue.columnKey ? `Column ${issue.columnKey}` : 'Row-level';

              return (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => onJumpToIssue(issue)}
                  className="w-full rounded border border-[#D8D8D8] bg-white p-3 text-left hover:bg-[#EBF4FB]"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" style={{ color: severityColor.icon }} />
                      <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', fontWeight: 'bold', color: '#1A1A1A' }}>
                        {toReadableIssueType(issue.type)}
                      </span>
                    </div>

                    <span
                      className="rounded px-2 py-0.5"
                      style={{
                        fontFamily: 'Arial, sans-serif',
                        fontSize: '9px',
                        backgroundColor: severityColor.bg,
                        color: severityColor.text,
                      }}
                    >
                      {severityLabelMap[issue.severity]}
                    </span>
                  </div>

                  <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#1A1A1A' }}>{issue.message}</p>

                  <div className="mt-2 flex items-center justify-between">
                    <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888' }}>
                      {rowLabel} • {columnLabel}
                    </span>
                    <span className="inline-flex items-center gap-1" style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#2E6DA4' }}>
                      Jump
                      <ArrowRightCircle className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {openIssues.length === 0 && (
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center rounded border border-[#A8C8E8] bg-[#EBF4FB] p-2">
            <CheckCircle2 className="mr-2 h-4 w-4 text-[#2E6DA4]" />
            <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#1A1A1A' }}>
              Dataset has no open validation blockers.
            </span>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
