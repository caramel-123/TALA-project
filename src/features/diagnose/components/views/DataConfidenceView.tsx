import { StatusBadge } from '../../../../app/components/dashboard/StatusBadge';
import type { DataConfidenceVm } from '../../../shared/types/view-models';
import { EmptyDiagnoseState } from './EmptyDiagnoseState';

type DataConfidenceViewProps = {
  dataQuality: DataConfidenceVm[];
};

function average(data: DataConfidenceVm[], key: keyof Pick<DataConfidenceVm, 'completeness' | 'accuracy' | 'timeliness'>) {
  if (data.length === 0) return 0;
  return Math.round(data.reduce((sum, row) => sum + row[key], 0) / data.length);
}

export function DataConfidenceView({ dataQuality }: DataConfidenceViewProps) {
  if (dataQuality.length === 0) {
    return <EmptyDiagnoseState title="No confidence data" description="No data confidence metrics are available." />;
  }

  const completeness = average(dataQuality, 'completeness');
  const accuracy = average(dataQuality, 'accuracy');
  const timeliness = average(dataQuality, 'timeliness');

  return (
    <section className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
      <h2 className="text-lg font-semibold text-[var(--navy-blue)]">Data Confidence Panel</h2>
      <p className="mt-1 text-sm text-[var(--mid-gray)]">Source-level reliability for completeness, accuracy, and timeliness.</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <article className="rounded-lg border border-[var(--light-gray)] bg-[var(--pale-blue)] p-3 text-center">
          <p className="text-xs uppercase tracking-[0.1em] text-[var(--mid-gray)]">Completeness</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--medium-blue)]">{completeness}%</p>
        </article>
        <article className="rounded-lg border border-[var(--light-gray)] bg-[var(--pale-blue)] p-3 text-center">
          <p className="text-xs uppercase tracking-[0.1em] text-[var(--mid-gray)]">Accuracy</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--medium-blue)]">{accuracy}%</p>
        </article>
        <article className="rounded-lg border border-[var(--light-gray)] bg-[var(--pale-blue)] p-3 text-center">
          <p className="text-xs uppercase tracking-[0.1em] text-[var(--mid-gray)]">Timeliness</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--medium-blue)]">{timeliness}%</p>
        </article>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[680px]">
          <thead>
            <tr className="border-b border-[var(--light-gray)] text-xs uppercase tracking-[0.08em] text-[var(--mid-gray)]">
              <th className="p-3 text-left">Source</th>
              <th className="p-3 text-center">Completeness</th>
              <th className="p-3 text-center">Accuracy</th>
              <th className="p-3 text-center">Timeliness</th>
              <th className="p-3 text-center">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {dataQuality.map((item) => (
              <tr key={item.source} className="border-b border-[var(--light-gray)] hover:bg-[var(--pale-blue)]">
                <td className="p-3 text-sm text-[var(--black)]">{item.source}</td>
                <td className="p-3 text-center text-sm text-[var(--black)]">{item.completeness}%</td>
                <td className="p-3 text-center text-sm text-[var(--black)]">{item.accuracy}%</td>
                <td className="p-3 text-center text-sm text-[var(--black)]">{item.timeliness}%</td>
                <td className="p-3 text-center">
                  <StatusBadge status={item.confidence === 'high' ? 'high' : item.confidence === 'low' ? 'low' : 'moderate'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
