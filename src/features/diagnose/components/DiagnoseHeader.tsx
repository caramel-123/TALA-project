import { Download, PlusCircle } from 'lucide-react';
import { Button } from '../../../app/components/ui/button';
import { StatusBadge } from '../../../app/components/dashboard/StatusBadge';
import type {
  DiagnoseNationalSummaryVm,
  DiagnoseRegionSummaryVm,
} from '../../shared/types/view-models';

type DiagnoseHeaderProps = {
  nationalSummary: DiagnoseNationalSummaryVm;
  selectedRegion: DiagnoseRegionSummaryVm | null;
  selectedDivision: string | null;
  selectedCluster: string | null;
  isLoading: boolean;
  usingFallback: boolean;
  loadError: string | null;
  onExportData: () => void;
  onAddToQueue: () => void;
  onResetScope: () => void;
};

function getDataBadgeStatus(isLoading: boolean, usingFallback: boolean, loadError: string | null) {
  if (isLoading) {
    return { status: 'pending' as const, label: 'Loading' };
  }

  if (loadError || usingFallback) {
    return { status: 'flagged' as const, label: 'Fallback Data' };
  }

  return { status: 'validated' as const, label: 'Live Data' };
}

export function DiagnoseHeader({
  nationalSummary,
  selectedRegion,
  selectedDivision,
  selectedCluster,
  isLoading,
  usingFallback,
  loadError,
  onExportData,
  onAddToQueue,
  onResetScope,
}: DiagnoseHeaderProps) {
  const badge = getDataBadgeStatus(isLoading, usingFallback, loadError);
  const scopePath = [
    'National',
    selectedRegion?.regionName,
    selectedDivision,
    selectedCluster,
  ].filter(Boolean).join(' / ');

  const lastUpdated = selectedRegion ? nationalSummary.lastUpdated : nationalSummary.lastUpdated;

  return (
    <section className="rounded-xl border border-[var(--light-gray)] bg-white p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--medium-blue)]">Pillar 2 • Regional Gap Analyzer</p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--navy-blue)]">Diagnose Planning Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--mid-gray)]">National underserved area prioritization with formal regional drilldown and evidence quality context.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[var(--black)]">
            <span>Scope: <strong>{scopePath}</strong></span>
            <span className="text-[var(--light-gray)]">•</span>
            <span>Regions Covered: <strong>{nationalSummary.regionCount}</strong></span>
            <span className="text-[var(--light-gray)]">•</span>
            <span>Last Updated: <strong>{lastUpdated}</strong></span>
            <StatusBadge status={badge.status} label={badge.label} />
          </div>
          {loadError && <p className="mt-2 text-xs text-[var(--deep-yellow)]">Data warning: {loadError}</p>}
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={onResetScope}>
            National Scope
          </Button>
          <Button type="button" variant="outline" onClick={onExportData}>
            <Download className="h-4 w-4" />
            Export Data
          </Button>
          <Button type="button" onClick={onAddToQueue}>
            <PlusCircle className="h-4 w-4" />
            Add to Queue
          </Button>
        </div>
      </div>
    </section>
  );
}
