import { useMemo } from 'react';
import { CheckCircle2, ClipboardList, LockKeyhole, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { Toaster } from '../components/ui/sonner';
import { settingsAuditLog as auditLog, settingsRoles as roles, settingsUsers as users } from '../../features/shared/dev-seed/non-dashboard';

// Developer audit note (requested classification)
// 1. Advise page already exists: Already implemented
// 2. Recommendation queue already exists: Already implemented
// 3. Recommendation detail/action area already exists: Already implemented
// 4. Scenario simulation UI already exists: Already implemented
// 5. Scenario simulation logic is functional: Partially implemented
// 6. Advise page uses a compact one-page layout: Already implemented
// 7. Advise page avoids repeating Diagnose content: Already implemented
// 8. Tabs for Action Plan/Delivery Notes/Simulation exist: Already implemented
// 9. Settings page already exists: Already implemented
// 10. Settings page has more admin content than needed: Already implemented
// 11. Settings includes user management/roles/audit/governance: Already implemented
// 12. Reports page is required for simulation: Missing
// 13. Layout currently constrains page width with max-width containers: Already implemented
// 14. Full-width layout is already implemented: Partially implemented
// 15. Full-width changes can be made at layout level instead of per-page patching: Missing

const plannerRoleNames = ['National Admin', 'Regional Implementer', 'Data Steward'];
const teacherDetailRoleNames = ['National Admin', 'Data Steward'];

export function Settings() {
  const activeUsers = useMemo(() => users.filter((user) => user.status === 'Active'), []);
  const recentAudit = useMemo(() => auditLog.slice(0, 3), []);

  const plannerRoles = useMemo(
    () => roles.filter((role) => plannerRoleNames.includes(role.name)).map((role) => `${role.name} (${role.users})`),
    [],
  );

  const teacherDetailRoles = useMemo(
    () => roles.filter((role) => teacherDetailRoleNames.includes(role.name)).map((role) => `${role.name} (${role.users})`),
    [],
  );

  const handleExportAuditSummary = () => {
    toast.success('Audit summary exported for governance review.');
  };

  const handleOpenPolicyReview = () => {
    toast.info('Opening governance policy review checklist...');
  };

  return (
    <div className="flex-1">
      <Toaster />

      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <Breadcrumbs />

        <header className="mb-4 rounded-xl border border-[#D8D8D8] bg-white p-4">
          <h1
            className="text-2xl font-bold"
            style={{
              fontFamily: 'Arial, sans-serif',
              color: '#1B3A5C',
            }}
          >
            Settings / Governance
          </h1>
          <p className="mt-1 text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#555555' }}>
            Privacy, access control, and accountability safeguards for responsible TALA planning decisions.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs" style={{ fontFamily: 'Arial, sans-serif' }}>
            <span className="rounded-full border border-[#D8D8D8] bg-[#EBF4FB] px-3 py-1" style={{ color: '#1B3A5C' }}>
              Authorized users: {activeUsers.length}
            </span>
            <span className="rounded-full border border-[#D8D8D8] bg-white px-3 py-1" style={{ color: '#555555' }}>
              Role groups: {roles.length}
            </span>
            <span className="rounded-full border border-[#D8D8D8] bg-white px-3 py-1" style={{ color: '#555555' }}>
              Recent audit events: {recentAudit.length}
            </span>
          </div>
        </header>

        <main className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <section className="rounded-xl border border-[#D8D8D8] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <LockKeyhole className="h-5 w-5" style={{ color: '#1B3A5C' }} />
              <h2 className="text-sm font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>
                Access Control
              </h2>
            </div>

            <div className="space-y-2 text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}>
              <PolicyItem label="Who can view planner data" value={plannerRoles.join(' | ')} />
              <PolicyItem label="Who can access teacher-level details" value={teacherDetailRoles.join(' | ')} />
            </div>

            <div className="mt-3 rounded-lg border border-[#D8D8D8] bg-[#EBF4FB] p-3">
              <h3 className="text-xs font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>
                Authorized users (sample)
              </h3>
              <ul className="mt-2 space-y-1.5 text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}>
                {activeUsers.slice(0, 4).map((user) => (
                  <li key={user.email} className="flex items-center justify-between gap-2">
                    <span>{user.name}</span>
                    <span className="rounded-full border border-[#D8D8D8] bg-white px-2 py-0.5 text-[10px]" style={{ color: '#555555' }}>
                      {user.role}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-xl border border-[#D8D8D8] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" style={{ color: '#2E6DA4' }} />
              <h2 className="text-sm font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>
                Data Governance
              </h2>
            </div>

            <div className="space-y-2 text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}>
              <GovernanceRow title="Anonymized planning views" status="Enabled" description="Teacher names are masked in decision-facing views." />
              <GovernanceRow title="Data minimization" status="Enabled" description="Only fields needed for planning and monitoring are surfaced." />
              <GovernanceRow title="Retention policy" status="3-year archive" description="Aged records are archived and restricted from planner default views." />
              <GovernanceRow title="Export safeguards" status="Enabled" description="Export actions are logged and limited to authorized roles." />
            </div>
          </section>

          <section className="rounded-xl border border-[#D8D8D8] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <ClipboardList className="h-5 w-5" style={{ color: '#B8860B' }} />
              <h2 className="text-sm font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>
                Audit and Accountability
              </h2>
            </div>

            <div className="rounded-lg border border-[#D8D8D8] bg-[#EBF4FB] p-3 text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}>
              <p className="font-bold" style={{ color: '#1B3A5C' }}>
                Human review safeguard
              </p>
              <p className="mt-1">High-stakes recommendation approvals require reviewer sign-off before rollout.</p>
            </div>

            <div className="mt-3 space-y-2">
              {recentAudit.map((entry) => (
                <div key={`${entry.user}-${entry.timestamp}`} className="rounded-md border border-[#D8D8D8] p-2">
                  <p className="text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}>
                    <strong>{entry.user}</strong> {entry.action}
                  </p>
                  <p className="mt-1 text-[10px]" style={{ fontFamily: 'Arial, sans-serif', color: '#555555' }}>
                    {entry.module} | {entry.timestamp}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportAuditSummary}
                className="rounded-md border border-[#D8D8D8] bg-white px-3 py-2 text-xs font-bold transition-colors hover:bg-[#EBF4FB]"
                style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}
              >
                Export audit summary
              </button>
              <button
                onClick={handleOpenPolicyReview}
                className="rounded-md bg-[#1B3A5C] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#2E6DA4]"
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                Open policy review
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function PolicyItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#D8D8D8] p-2">
      <p className="text-[10px]" style={{ fontFamily: 'Arial, sans-serif', color: '#888888' }}>
        {label}
      </p>
      <p className="mt-1 text-xs font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}>
        {value}
      </p>
    </div>
  );
}

function GovernanceRow({
  title,
  status,
  description,
}: {
  title: string;
  status: string;
  description: string;
}) {
  return (
    <div className="rounded-md border border-[#D8D8D8] p-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}>
          {title}
        </p>
        <span className="inline-flex items-center gap-1 rounded-full border border-[#D8D8D8] bg-[#EBF4FB] px-2 py-0.5 text-[10px] font-bold" style={{ color: '#1B3A5C' }}>
          <CheckCircle2 className="h-3 w-3" />
          {status}
        </span>
      </div>
      <p className="mt-1 text-[10px]" style={{ fontFamily: 'Arial, sans-serif', color: '#555555' }}>
        {description}
      </p>
    </div>
  );
}