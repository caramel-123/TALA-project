import { StatusBadge } from '../../../../app/components/dashboard/StatusBadge';
import type { CohortVm } from '../../../shared/types/view-models';
import { EmptyDiagnoseState } from './EmptyDiagnoseState';

type TeacherCohortViewProps = {
  cohorts: CohortVm[];
};

export function TeacherCohortView({ cohorts }: TeacherCohortViewProps) {
  if (cohorts.length === 0) {
    return <EmptyDiagnoseState title="No cohort segments" description="No teacher cohort segmentation data is available." />;
  }

  return (
    <section className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
      <h2 className="text-lg font-semibold text-[var(--navy-blue)]">Teacher Cohort Segments</h2>
      <p className="mt-1 text-sm text-[var(--mid-gray)]">Career-stage groupings for targeted support planning.</p>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {cohorts.map((cohort) => (
          <article key={cohort.name} className="rounded-lg border border-[var(--light-gray)] bg-[var(--pale-blue)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-[var(--navy-blue)]">{cohort.name}</h3>
                <p className="text-sm text-[var(--mid-gray)]">{cohort.count.toLocaleString()} teachers</p>
              </div>
              <StatusBadge status={cohort.confidence === 'high' ? 'high' : cohort.confidence === 'low' ? 'low' : 'moderate'} label={`${cohort.confidence} confidence`} />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-md bg-white p-3 text-xs text-[var(--mid-gray)]">
                <p>Support Need</p>
                <p className="mt-1 text-sm font-semibold text-[var(--black)]">{cohort.support}</p>
              </div>
              <div className="rounded-md bg-white p-3 text-xs text-[var(--mid-gray)]">
                <p>Intervention</p>
                <p className="mt-1 text-sm font-semibold text-[var(--black)]">{cohort.intervention}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
