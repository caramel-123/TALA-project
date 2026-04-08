import { Outlet, Link, useLocation } from 'react-router';
import { 
  LayoutDashboard, 
  Activity, 
  Lightbulb, 
  Database, 
  FileText, 
  Settings 
} from 'lucide-react';
import { TopNavigation } from './TopNavigation';
import { Breadcrumbs } from './Breadcrumbs';

export function MainLayout() {
  return (
    <div className="min-h-screen bg-[#EBF4FB]">
      <TopNavigation />
      <div className="flex min-w-0">
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
