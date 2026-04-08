import { StatusBadge } from '../../../../app/components/dashboard/StatusBadge';
import type { ScoreFactorVm } from '../../../shared/types/view-models';
import { EmptyDiagnoseState } from './EmptyDiagnoseState';

type UnderservedScoreViewProps = {
  scoreFactors: ScoreFactorVm[];
  underservedScore: number;
};

export function UnderservedScoreView({ scoreFactors, underservedScore }: UnderservedScoreViewProps) {
  if (scoreFactors.length === 0) {
    return <EmptyDiagnoseState title="No score factors" description="No underserved score factors are available." />;
  }

  return (
    <section className="space-y-4">
      <article className="rounded-xl border border-[var(--light-gray)] bg-white p-5">
        <h2 className="text-lg font-semibold text-[var(--navy-blue)]">Underserved Score Builder</h2>
        <p className="mt-1 text-sm text-[var(--mid-gray)]">Weighted factor decomposition of the regional underserved score.</p>
        <div className="mt-4 rounded-xl border border-[var(--light-gray)] bg-[var(--pale-blue)] p-6 text-center">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--mid-gray)]">Composite Score</p>
          <p className="mt-2 text-6xl font-semibold text-[var(--deep-yellow)]">{underservedScore.toFixed(1)}</p>
          <p className="text-sm text-[var(--mid-gray)]">out of 10.0</p>
        </div>
      </article>

      <article className="rounded-xl border border-[var(--light-gray)] bg-white p-5">
        <h3 className="text-sm font-semibold text-[var(--navy-blue)]">Factor Breakdown</h3>
        <div className="mt-3 space-y-3">
          {scoreFactors.map((item) => (
            <div key={item.factor} className="rounded-lg border border-[var(--light-gray)] bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--navy-blue)]">{item.factor}</p>
                  <p className="text-xs text-[var(--mid-gray)]">Weight {item.weight}% • Score {item.score.toFixed(1)}</p>
                </div>
                <StatusBadge status={item.impact === 'high' ? 'high' : 'moderate'} label={`${item.impact} impact`} />
              </div>
              <div className="mt-2 h-2 rounded-full bg-[var(--light-gray)]">
                <div className="h-2 rounded-full bg-[var(--medium-blue)]" style={{ width: `${Math.min(100, item.score * 10)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
