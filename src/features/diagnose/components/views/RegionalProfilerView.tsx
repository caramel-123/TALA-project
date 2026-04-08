import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { StatusBadge } from '../../../../app/components/dashboard/StatusBadge';
import type {
  CohortVm,
  DataConfidenceVm,
  DivisionVm,
  GapFactorVm,
  ScoreFactorVm,
} from '../../../shared/types/view-models';
import { EmptyDiagnoseState } from './EmptyDiagnoseState';

type RegionalProfilerViewProps = {
  gapFactors: GapFactorVm[];
  divisions: DivisionVm[];
  cohorts: CohortVm[];
  scoreFactors: ScoreFactorVm[];
  dataQuality: DataConfidenceVm[];
  underservedScore: number;
};

export function RegionalProfilerView({
  gapFactors,
  divisions,
  cohorts,
  scoreFactors,
  dataQuality,
  underservedScore,
}: RegionalProfilerViewProps) {
  if (gapFactors.length === 0 && divisions.length === 0 && cohorts.length === 0) {
    return <EmptyDiagnoseState title="Regional profiler unavailable" description="No profiler metrics are available for this region yet." />;
  }

  const topFactors = [...gapFactors].sort((a, b) => b.contribution - a.contribution).slice(0, 5);
  const highestDivision = [...divisions].sort((a, b) => b.score - a.score)[0];
  const highestCohort = [...cohorts].sort((a, b) => b.count - a.count)[0];
  const confidenceAverage = dataQuality.length > 0
    ? Math.round(dataQuality.reduce((sum, item) => sum + item.completeness + item.accuracy + item.timeliness, 0) / (dataQuality.length * 3))
    : 0;

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--mid-gray)]">Underserved Score</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--deep-yellow)]">{underservedScore.toFixed(1)} / 10</p>
        </article>
        <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--mid-gray)]">Top Risk Division</p>
          <p className="mt-2 text-lg font-semibold text-[var(--navy-blue)]">{highestDivision?.name || 'N/A'}</p>
          <p className="text-sm text-[var(--mid-gray)]">Score {highestDivision?.score.toFixed(1) ?? '0.0'}</p>
        </article>
        <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--mid-gray)]">Largest Cohort</p>
          <p className="mt-2 text-lg font-semibold text-[var(--navy-blue)]">{highestCohort?.name || 'N/A'}</p>
          <p className="text-sm text-[var(--mid-gray)]">{highestCohort?.count.toLocaleString() || '0'} teachers</p>
        </article>
        <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--mid-gray)]">Data Confidence</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--medium-blue)]">{confidenceAverage}%</p>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
          <h3 className="text-sm font-semibold text-[var(--navy-blue)]">Top Gap Drivers</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topFactors} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--light-gray)" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--mid-gray)', fontSize: 11 }} />
                <YAxis type="category" dataKey="factor" width={170} tick={{ fill: 'var(--black)', fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="contribution" fill="var(--medium-blue)" radius={[6, 6, 6, 6]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
          <h3 className="text-sm font-semibold text-[var(--navy-blue)]">Score Factors</h3>
          <div className="mt-3 space-y-3">
            {scoreFactors.slice(0, 6).map((factor) => (
              <div key={factor.factor} className="rounded-lg border border-[var(--light-gray)] bg-[var(--pale-blue)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[var(--navy-blue)]">{factor.factor}</p>
                  <StatusBadge status={factor.impact === 'high' ? 'high' : 'moderate'} label={`${factor.impact} impact`} />
                </div>
                <div className="mt-2 text-xs text-[var(--mid-gray)]">Weight {factor.weight}% • Score {factor.score.toFixed(1)}</div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
