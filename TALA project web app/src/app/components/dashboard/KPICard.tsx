import { ReactNode } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down';
  trendValue?: string;
  accentColor?: string;
}

export function KPICard({ label, value, trend, trendValue, accentColor = '#2E6DA4' }: KPICardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-1" style={{ backgroundColor: accentColor }} />
      <div className="p-6">
        <div 
          className="text-3xl mb-2" 
          style={{ fontFamily: 'Arial, sans-serif', fontWeight: 'bold', color: '#1A1A1A' }}
        >
          {value}
        </div>
        <div 
          className="text-sm mb-2" 
          style={{ fontFamily: 'Arial, sans-serif', color: '#888888' }}
        >
          {label}
        </div>
        {trend && trendValue && (
          <div className="flex items-center gap-1 text-xs" style={{ color: '#2E6DA4' }}>
            {trend === 'up' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
    </div>
  );
}
