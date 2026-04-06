import { Link, useLocation } from 'react-router';
import { ChevronRight } from 'lucide-react';

const pathNames: Record<string, string> = {
  '': 'Overview',
  'diagnose': 'Diagnose',
  'advise': 'Advise',
  'data-manager': 'Data Manager',
  'reports': 'Reports',
  'settings': 'Settings',
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  if (pathSegments.length === 0) return null;

  return (
    <div className="flex items-center gap-2 text-sm mb-4" style={{ fontFamily: 'Arial, sans-serif' }}>
      <Link to="/" className="text-[#2E6DA4] hover:underline">
        Home
      </Link>
      {pathSegments.map((segment, index) => {
        const path = '/' + pathSegments.slice(0, index + 1).join('/');
        const isLast = index === pathSegments.length - 1;
        const label = pathNames[segment] || segment;

        return (
          <div key={path} className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-[#D8D8D8]" />
            {isLast ? (
              <span className="text-[#888888]">{label}</span>
            ) : (
              <Link to={path} className="text-[#2E6DA4] hover:underline">
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
