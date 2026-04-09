import { Outlet } from 'react-router';
import { TopNavigation } from './TopNavigation';

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
