import { StatusBadge } from '../../../../app/components/dashboard/StatusBadge';
import type { GapFactorVm } from '../../../shared/types/view-models';
import { EmptyDiagnoseState } from './EmptyDiagnoseState';

type GapFactorViewProps = {
  gapFactors: GapFactorVm[];
};

export function GapFactorView({ gapFactors }: GapFactorViewProps) {
  if (gapFactors.length === 0) {
    return <EmptyDiagnoseState title="No gap factors" description="No gap-factor data is available for this region." />;
  }

  return (
    <section className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
      <h2 className="text-lg font-semibold text-[var(--navy-blue)]">Gap Factor Analysis</h2>
      <p className="mt-1 text-sm text-[var(--mid-gray)]">Detailed contribution and confidence of intervention gap drivers.</p>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {gapFactors.map((gap) => (
          <article key={gap.id} className="rounded-lg border border-[var(--light-gray)] bg-[var(--pale-blue)] p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-[var(--navy-blue)]">{gap.factor}</h3>
              <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-[var(--deep-yellow)]">{gap.contribution}%</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-[var(--light-gray)]">
              <div className="h-2 rounded-full bg-[var(--medium-blue)]" style={{ width: `${gap.contribution}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[var(--mid-gray)]">
              <span>{gap.source || 'Regional analytics pipeline'}</span>
              <StatusBadge status={gap.confidence === 'high' ? 'high' : gap.confidence === 'low' ? 'low' : 'moderate'} label={`${gap.confidence} confidence`} />
            </div>
            {gap.definition && <p className="mt-2 text-xs text-[var(--mid-gray)]">{gap.definition}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
