import { Trash2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import type { SpreadsheetRow } from '../types/upload-workflow';

type FocusTarget = {
  rowIndex: number | null;
  columnKey: string | null;
  token: number;
};

type SpreadsheetGridProps = {
  title: string;
  headers: string[];
  rows: SpreadsheetRow[];
  editable?: boolean;
  maxPreviewRows?: number;
  focusTarget?: FocusTarget;
  onCellEdit?: (rowIndex: number, columnKey: string, value: string) => void;
  onDeleteRow?: (rowIndex: number) => void;
};

function toHeaderLabel(header: string) {
  return header
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function SpreadsheetGrid({
  title,
  headers,
  rows,
  editable = false,
  maxPreviewRows = 250,
  focusTarget,
  onCellEdit,
  onDeleteRow,
}: SpreadsheetGridProps) {
  const previewRows = useMemo(() => rows.slice(0, maxPreviewRows), [rows, maxPreviewRows]);

  useEffect(() => {
    if (!focusTarget || focusTarget.rowIndex === null) {
      return;
    }

    const rowWithinPreview = focusTarget.rowIndex < previewRows.length;
    if (!rowWithinPreview) {
      return;
    }

    const columnIndex = focusTarget.columnKey ? headers.indexOf(focusTarget.columnKey) : -1;

    const focusId =
      focusTarget.columnKey && columnIndex >= 0
        ? `spreadsheet-cell-${focusTarget.rowIndex}-${columnIndex}`
        : `spreadsheet-row-${focusTarget.rowIndex}`;

    const element = document.getElementById(focusId);
    if (!element) {
      return;
    }

    element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });

    if (element instanceof HTMLInputElement) {
      element.focus();
      element.select();
    }
  }, [focusTarget, headers, previewRows]);

  return (
    <div className="rounded-lg border border-[#D8D8D8] bg-white">
      <div className="flex items-center justify-between border-b border-[#D8D8D8] bg-[#EBF4FB] px-4 py-2">
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>
          {title}
        </div>
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888' }}>
          Showing {previewRows.length.toLocaleString()} of {rows.length.toLocaleString()} rows
        </div>
      </div>

      <div className="max-h-[420px] overflow-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th
                className="sticky left-0 top-0 z-30 border-b border-r border-[#D8D8D8] bg-[#D5E8F7] px-3 py-2 text-right"
                style={{
                  width: '56px',
                  minWidth: '56px',
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  color: '#1B3A5C',
                }}
              >
                #
              </th>

              {headers.map((header) => (
                <th
                  key={header}
                  className="sticky top-0 z-20 border-b border-r border-[#D8D8D8] bg-[#D5E8F7] px-3 py-2 text-left"
                  style={{
                    minWidth: '160px',
                    maxWidth: '280px',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: '#1B3A5C',
                  }}
                  title={header}
                >
                  <div className="max-w-[280px] truncate">{toHeaderLabel(header)}</div>
                </th>
              ))}

              {editable && (
                <th
                  className="sticky right-0 top-0 z-30 border-b border-[#D8D8D8] bg-[#D5E8F7] px-2 py-2 text-center"
                  style={{
                    width: '56px',
                    minWidth: '56px',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: '#1B3A5C',
                  }}
                >
                  Del
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {previewRows.length === 0 && (
              <tr>
                <td
                  colSpan={headers.length + (editable ? 2 : 1)}
                  className="px-3 py-4 text-center"
                  style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#888888' }}
                >
                  No rows available for preview.
                </td>
              </tr>
            )}

            {previewRows.map((row, rowIndex) => {
              const isFocusedRow = focusTarget?.rowIndex === rowIndex;

              return (
                <tr key={`preview-row-${rowIndex}`} id={`spreadsheet-row-${rowIndex}`}>
                  <td
                    className="sticky left-0 z-10 border-r border-b border-[#D8D8D8] px-3 py-1 text-right"
                    style={{
                      backgroundColor: isFocusedRow ? '#F5DFA0' : '#EBF4FB',
                      fontFamily: 'Arial, sans-serif',
                      fontSize: '10px',
                      color: '#1A1A1A',
                    }}
                  >
                    {rowIndex + 1}
                  </td>

                  {headers.map((header, columnIndex) => {
                    const value = row[header] || '';
                    const isFocusedCell =
                      focusTarget?.rowIndex === rowIndex
                      && focusTarget?.columnKey === header;

                    return (
                      <td
                        key={`${rowIndex}-${header}`}
                        className="border-r border-b border-[#D8D8D8] px-2 py-1"
                        style={{
                          minWidth: '160px',
                          maxWidth: '280px',
                          backgroundColor: isFocusedCell ? '#F5DFA0' : '#FFFFFF',
                        }}
                        title={value}
                      >
                        {editable ? (
                          <input
                            id={`spreadsheet-cell-${rowIndex}-${columnIndex}`}
                            value={value}
                            onChange={(event) => onCellEdit?.(rowIndex, header, event.target.value)}
                            className="w-full border-none bg-transparent px-1 py-1 outline-none"
                            style={{
                              fontFamily: 'Arial, sans-serif',
                              fontSize: '10px',
                              color: '#1A1A1A',
                            }}
                          />
                        ) : (
                          <div
                            id={`spreadsheet-cell-${rowIndex}-${columnIndex}`}
                            className="max-w-[260px] truncate"
                            style={{
                              fontFamily: 'Arial, sans-serif',
                              fontSize: '10px',
                              color: '#1A1A1A',
                            }}
                          >
                            {value}
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {editable && (
                    <td
                      className="sticky right-0 border-b border-[#D8D8D8] px-1 py-1 text-center"
                      style={{ backgroundColor: '#FFFFFF' }}
                    >
                      <button
                        type="button"
                        onClick={() => onDeleteRow?.(rowIndex)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#D8D8D8] hover:bg-[#EBF4FB]"
                        title="Delete row"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-[#1B3A5C]" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
