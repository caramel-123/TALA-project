import { Link, useLocation } from 'react-router';
import { 
  LayoutDashboard, 
  Activity, 
  Lightbulb, 
  Database, 
  FileText, 
  Settings,
  Star
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/diagnose', label: 'Diagnose', icon: Activity },
  { path: '/advise', label: 'Advise', icon: Lightbulb },
  { path: '/data-manager', label: 'Data Manager', icon: Database },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function TopNavigation() {
  const location = useLocation();
  
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="w-full bg-[#1B3A5C] text-white sticky top-0 z-50">
      <div className="flex items-center h-14 px-6">
        <Link 
          to="/" 
          className="flex items-center gap-2 font-bold mr-8 hover:text-[#E8C94F] transition-colors"
        >
          <Star className="w-5 h-5" fill="#E8C94F" stroke="#E8C94F" />
          <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '18px' }}>TALA</span>
        </Link>
        
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors
                  ${active 
                    ? 'bg-[#E8C94F] text-[#1A1A1A]' 
                    : 'hover:bg-[#2E6DA4]'
                  }
                `}
                style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: active ? 'bold' : 'normal' }}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}