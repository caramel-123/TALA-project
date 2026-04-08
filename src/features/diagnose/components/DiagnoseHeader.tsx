import { Download, PlusCircle } from 'lucide-react';
import { Button } from '../../../app/components/ui/button';
import { StatusBadge } from '../../../app/components/dashboard/StatusBadge';
import type { RegionalProfileVm } from '../../shared/types/view-models';

type DiagnoseHeaderProps = {
  regionData: RegionalProfileVm;
  isLoading: boolean;
  usingFallback: boolean;
  loadError: string | null;
  onExportData: () => void;
  onAddToQueue: () => void;
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
  regionData,
  isLoading,
  usingFallback,
  loadError,
  onExportData,
  onAddToQueue,
}: DiagnoseHeaderProps) {
  const badge = getDataBadgeStatus(isLoading, usingFallback, loadError);

  return (
    <section className="rounded-xl border border-[var(--light-gray)] bg-white p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--navy-blue)]">{regionData.name}</h1>
          <p className="mt-1 text-sm text-[var(--mid-gray)]">Diagnose regional drivers and intervention readiness.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[var(--black)]">
            <span>Teachers: <strong>{regionData.teacherPopulation.toLocaleString()}</strong></span>
            <span className="text-[var(--light-gray)]">•</span>
            <span>STAR Coverage: <strong>{regionData.starCoverage}%</strong></span>
            <span className="text-[var(--light-gray)]">•</span>
            <span>Last Updated: <strong>{regionData.lastUpdated}</strong></span>
            <StatusBadge status={badge.status} label={badge.label} />
          </div>
          {loadError && <p className="mt-2 text-xs text-[var(--deep-yellow)]">Data warning: {loadError}</p>}
        </div>

        <div className="flex items-center gap-2">
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

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <article className="rounded-lg border border-[var(--light-gray)] bg-[var(--pale-blue)] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--mid-gray)]">Underserved Score</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--deep-yellow)]">{regionData.underservedScore.toFixed(1)}</p>
        </article>
        <article className="rounded-lg border border-[var(--light-gray)] bg-[var(--pale-blue)] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--mid-gray)]">Data Quality</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--medium-blue)]">{regionData.dataQuality}%</p>
        </article>
        <article className="rounded-lg border border-[var(--light-gray)] bg-[var(--pale-blue)] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--mid-gray)]">Coverage Gap</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--navy-blue)]">{Math.max(0, 100 - regionData.starCoverage)}%</p>
        </article>
      </div>
    </section>
  );
}
