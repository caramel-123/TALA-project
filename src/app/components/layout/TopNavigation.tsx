import { Link, useLocation } from 'react-router';
import { 
  Activity, 
  Lightbulb, 
  Database, 
  Settings
} from 'lucide-react';
import talaLogo from '../../../public/Tala_Logo.png';

const navItems = [
  { path: '/data-manager', label: 'Integrate', icon: Database },
  { path: '/diagnose', label: 'Diagnose', icon: Activity },
  { path: '/advise', label: 'Advise', icon: Lightbulb },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function TopNavigation() {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="w-full bg-[#1B3A5C] text-white sticky top-0 z-50">
      <div className="flex items-center h-16 px-6">
        <Link 
          to="/diagnose" 
          className="flex items-center gap-2 font-bold mr-8 hover:text-[#E8C94F] transition-colors"
        >
          <img src={talaLogo} alt="TALA" className="h-10 w-auto object-contain" />
          <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '20px', lineHeight: '1', letterSpacing: '0.02em' }}>TALA</span>
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