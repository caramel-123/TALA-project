import type { DiagnoseSidebarItemVm } from '../../shared/types/view-models';

type DiagnoseSidebarProps = {
  items: DiagnoseSidebarItemVm[];
  activeId: string;
  onSelect: (id: string) => void;
};

export function DiagnoseSidebar({ items, activeId, onSelect }: DiagnoseSidebarProps) {
  return (
    <aside className="w-full max-w-64 rounded-xl border border-[var(--light-gray)] bg-white p-4 lg:sticky lg:top-4 lg:h-fit">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--mid-gray)]">Diagnose Views</h2>
      <nav className="space-y-1" aria-label="Diagnose views">
        {items.map((item) => {
          const isActive = item.id === activeId;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={[
                'w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                isActive
                  ? 'border-[var(--medium-blue)] bg-[var(--light-blue)] text-[var(--navy-blue)] font-semibold'
                  : 'border-transparent text-[var(--black)] hover:bg-[var(--pale-blue)]',
              ].join(' ')}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
