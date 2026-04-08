import { StatusBadge } from '../../../../app/components/dashboard/StatusBadge';
import { getClusterShortLabel } from '../../lib/normalizers';
import type { ClusterVm } from '../../../shared/types/view-models';
import { EmptyDiagnoseState } from './EmptyDiagnoseState';

type ClusterMapViewProps = {
  clusters: ClusterVm[];
};

function getPriorityBorder(priority: ClusterVm['priority']) {
  if (priority === 'critical') return 'var(--deep-yellow)';
  if (priority === 'high') return 'var(--warm-yellow)';
  if (priority === 'moderate') return 'var(--medium-blue)';
  return 'var(--soft-blue)';
}

export function ClusterMapView({ clusters }: ClusterMapViewProps) {
  if (clusters.length === 0) {
    return <EmptyDiagnoseState title="No cluster map" description="No school clusters are available for this region." />;
  }

  return (
    <section className="space-y-4">
      <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
        <h2 className="text-lg font-semibold text-[var(--navy-blue)]">School Cluster View</h2>
        <p className="mt-1 text-sm text-[var(--mid-gray)]">Cluster priorities and education coverage readiness.</p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {clusters.map((cluster, index) => (
            <div
              key={`${cluster.name}-${index}`}
              className="rounded-lg border bg-[var(--pale-blue)] p-4"
              style={{ borderColor: getPriorityBorder(cluster.priority) }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--navy-blue)]">{cluster.name}</h3>
                  <p className="mt-1 text-xs text-[var(--mid-gray)]">{cluster.schools} schools • {cluster.teachers} teachers</p>
                </div>
                <StatusBadge status={cluster.priority} />
              </div>
              <div className="mt-3 h-2 rounded-full bg-[var(--light-gray)]">
                <div className="h-2 rounded-full bg-[var(--medium-blue)]" style={{ width: `${cluster.coverage}%` }} />
              </div>
              <p className="mt-1 text-xs text-[var(--mid-gray)]">Coverage {cluster.coverage}%</p>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
        <h3 className="text-sm font-semibold text-[var(--navy-blue)]">Cluster Summary</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {clusters.map((cluster, index) => (
            <div key={`cluster-summary-${index}`} className="rounded-lg border border-[var(--light-gray)] bg-white p-3">
              <p className="text-sm font-medium text-[var(--navy-blue)]">{getClusterShortLabel(cluster.name)}</p>
              <div className="mt-2 space-y-1 text-xs text-[var(--mid-gray)]">
                <p>Schools: <strong className="text-[var(--black)]">{cluster.schools}</strong></p>
                <p>Teachers: <strong className="text-[var(--black)]">{cluster.teachers}</strong></p>
                <p>Coverage: <strong className="text-[var(--black)]">{cluster.coverage}%</strong></p>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
