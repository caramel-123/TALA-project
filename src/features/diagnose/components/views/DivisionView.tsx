import { MapPin } from 'lucide-react';
import { StatusBadge } from '../../../../app/components/dashboard/StatusBadge';
import type { DivisionVm } from '../../../shared/types/view-models';
import { EmptyDiagnoseState } from './EmptyDiagnoseState';

type DivisionViewProps = {
  divisions: DivisionVm[];
  onDivisionClick: (name: string) => void;
};

export function DivisionView({ divisions, onDivisionClick }: DivisionViewProps) {
  if (divisions.length === 0) {
    return <EmptyDiagnoseState title="No division data" description="No division breakdown is available for this region." />;
  }

  return (
    <section className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
      <h2 className="text-lg font-semibold text-[var(--navy-blue)]">Division-Level Analysis</h2>
      <p className="mt-1 text-sm text-[var(--mid-gray)]">Click a division to drill into clusters and intervention context.</p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-[var(--light-gray)] text-xs uppercase tracking-[0.08em] text-[var(--mid-gray)]">
              <th className="p-3 text-left">Division</th>
              <th className="p-3 text-right">Teachers</th>
              <th className="p-3 text-right">Coverage</th>
              <th className="p-3 text-left">Top Gap</th>
              <th className="p-3 text-right">Score</th>
              <th className="p-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {divisions.map((division) => (
              <tr
                key={division.name}
                className="cursor-pointer border-b border-[var(--light-gray)] hover:bg-[var(--pale-blue)]"
                onClick={() => onDivisionClick(division.name)}
              >
                <td className="p-3 text-sm font-medium text-[var(--black)]">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[var(--medium-blue)]" />
                    {division.name}
                  </div>
                </td>
                <td className="p-3 text-right text-sm text-[var(--black)]">{division.population.toLocaleString()}</td>
                <td className="p-3 text-right text-sm text-[var(--black)]">{division.coverage}%</td>
                <td className="p-3 text-sm text-[var(--mid-gray)]">{division.gap}</td>
                <td className="p-3 text-right text-sm font-semibold text-[var(--deep-yellow)]">{division.score.toFixed(1)}</td>
                <td className="p-3 text-center"><StatusBadge status={division.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
