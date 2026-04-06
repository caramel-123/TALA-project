import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { KPICard } from '../components/dashboard/KPICard';
import { StatusBadge } from '../components/dashboard/StatusBadge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Filter } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';
import { PhilippinesMap } from '../components/maps/PhilippinesMap';
import { getOverviewDashboardData } from '../../features/overview/api/overview';
import { devSeed } from '../../features/shared/dev-seed';
import type { OverviewDashboardVm } from '../../features/shared/types/view-models';

export function Overview() {
  const [overviewData, setOverviewData] = useState<OverviewDashboardVm>(devSeed.overview);
  const [isLoading, setIsLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadOverviewData() {
      setIsLoading(true);
      const result = await getOverviewDashboardData();

      if (!isMounted) {
        return;
      }

      setOverviewData(result.data);
      setUsingFallback(result.usingFallback);
      setLoadError(result.error);
      setIsLoading(false);
    }

    loadOverviewData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleFilterClick = () => {
    setShowFilter(!showFilter);
    toast.info(showFilter ? 'Filter panel closed' : 'Filter panel opened');
  };

  const handleRegionClick = (regionName: string) => {
    setSelectedRegion(regionName);
    toast.success(`Viewing detailed analysis for ${regionName}`);
    // In a real app, this would navigate to the Diagnose page with the region selected
  };

  const handleMapRegionClick = (regionName: string) => {
    setSelectedRegion(regionName);
    toast.info(`Selected: ${regionName} - Click priority region below for full details`);
  };

  const handleClearSelection = () => {
    setSelectedRegion(null);
    toast.info('Showing full heatmap');
  };

  return (
    <div className="flex-1">
      <Toaster />
      <div className="max-w-7xl mx-auto p-6">
        <Breadcrumbs />
        
        {/* Page Title */}
        <div className="mb-6">
          <h1 
            className="mb-2" 
            style={{ 
              fontFamily: 'Arial, sans-serif', 
              fontSize: '24px', 
              fontWeight: 'bold', 
              color: '#1B3A5C' 
            }}
          >
            National Overview Dashboard
          </h1>
          <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888' }}>
            Last updated: {overviewData.lastUpdated} • Data Quality: {overviewData.dataQuality}%
          </p>
          <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: usingFallback ? '#B8860B' : '#2E6DA4' }}>
            {isLoading ? 'Loading data from Supabase...' : usingFallback ? 'Using fallback demo data' : 'Live data connected to Supabase'}
          </p>
          {loadError && (
            <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#B8860B' }}>
              Data warning: {loadError}
            </p>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {overviewData.kpiData.map((kpi, index) => (
            <KPICard key={index} {...kpi} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* National Coverage Map Placeholder */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 
                style={{ 
                  fontFamily: 'Arial, sans-serif', 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#1B3A5C' 
                }}
              >
                National Coverage Map
              </h2>
              <button 
                onClick={handleFilterClick}
                className="flex items-center gap-2 px-3 py-1 rounded bg-[#D5E8F7] hover:bg-[#A8C8E8] transition-colors cursor-pointer"
              >
                <Filter className="w-4 h-4" style={{ color: '#2E6DA4' }} />
                <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#2E6DA4' }}>Filter</span>
              </button>
            </div>

            {showFilter && (
              <div className="mb-4 p-3 rounded border" style={{ borderColor: '#D8D8D8', backgroundColor: '#EBF4FB' }}>
                <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#1B3A5C', fontWeight: 'bold', marginBottom: '8px' }}>
                  Filter Options
                </div>
                <div className="flex gap-2 flex-wrap">
                  {['All Regions', 'High Priority Only', 'Critical Only', 'By Coverage'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => toast.info(`Applied filter: ${filter}`)}
                      className="px-3 py-1 rounded bg-white hover:bg-[#D5E8F7] transition-colors cursor-pointer"
                      style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', border: '1px solid #D8D8D8' }}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-[#EBF4FB] rounded h-[500px] p-4">
              <PhilippinesMap 
                selectedRegion={selectedRegion}
                onRegionClick={handleMapRegionClick}
                highlightMode={selectedRegion !== null}
              />
            </div>

            <div className="flex items-center gap-4 mt-4 text-xs" style={{ fontFamily: 'Arial, sans-serif' }}>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#A8C8E8' }}></div>
                <span style={{ color: '#888888' }}>Low Priority</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#2E6DA4' }}></div>
                <span style={{ color: '#888888' }}>Medium Priority</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#E8C94F' }}></div>
                <span style={{ color: '#888888' }}>High Priority</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#B8860B' }}></div>
                <span style={{ color: '#888888' }}>Critical Priority</span>
              </div>
            </div>
          </div>

          {/* Top Priority Regions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 
              className="mb-4" 
              style={{ 
                fontFamily: 'Arial, sans-serif', 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: '#1B3A5C' 
              }}
            >
              Top Priority Regions
            </h2>
            {selectedRegion && (
              <div className="mb-3 p-2 rounded" style={{ backgroundColor: '#E8C94F20', border: '1px solid #E8C94F' }}>
                <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#1B3A5C' }}>
                  <strong>Selected:</strong> {selectedRegion}
                </p>
              </div>
            )}
            <div className="space-y-4">
              {overviewData.priorityRegions.map((region, index) => (
                <div 
                  key={index} 
                  onClick={() => handleRegionClick(region.region)}
                  className={`
                    p-3 rounded border transition-all cursor-pointer
                    ${selectedRegion === region.region ? 'border-[#E8C94F] bg-[#FFF9E6] shadow-md' : 'border-[#D8D8D8] hover:bg-[#EBF4FB] hover:border-[#2E6DA4]'}
                  `}
                  style={{ 
                    borderWidth: selectedRegion === region.region ? '2px' : '1px',
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 
                      className="flex-1" 
                      style={{ 
                        fontFamily: 'Arial, sans-serif', 
                        fontSize: '11px', 
                        fontWeight: 'bold', 
                        color: selectedRegion === region.region ? '#B8860B' : '#1B3A5C'
                      }}
                    >
                      {region.region}
                    </h3>
                    <span 
                      className="px-2 py-1 rounded text-white" 
                      style={{ 
                        fontFamily: 'Arial, sans-serif', 
                        fontSize: '10px', 
                        fontWeight: 'bold',
                        backgroundColor: selectedRegion === region.region ? '#B8860B' : '#E8C94F'
                      }}
                    >
                      {region.score}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs" style={{ fontFamily: 'Arial, sans-serif' }}>
                    <div style={{ color: '#888888' }}>
                      <span className="font-bold">Gap:</span> {region.gap}
                    </div>
                    <div style={{ color: '#888888' }}>
                      <span className="font-bold">Intervention:</span> {region.intervention}
                    </div>
                    <div className="mt-2">
                      <StatusBadge status={region.confidence as any} label={`${region.confidence} confidence`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Program Reach Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Training Reach Comparison */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
            <h2 
              className="mb-4" 
              style={{ 
                fontFamily: 'Arial, sans-serif', 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: '#1B3A5C' 
              }}
            >
              Training Reach by Program
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={overviewData.trainingReachData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D8D8D8" />
                <XAxis 
                  dataKey="program" 
                  tick={{ fill: '#888888', fontSize: 10, fontFamily: 'Arial, sans-serif' }}
                />
                <YAxis 
                  tick={{ fill: '#888888', fontSize: 10, fontFamily: 'Arial, sans-serif' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#FFFFFF', 
                    border: '1px solid #D8D8D8',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '11px'
                  }}
                />
                <Bar dataKey="reach" fill="#2E6DA4" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Teacher Specialization Distribution */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 
              className="mb-4" 
              style={{ 
                fontFamily: 'Arial, sans-serif', 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: '#1B3A5C' 
              }}
            >
              Teacher Specialization
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={overviewData.specializationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={(entry) => `${entry.name} ${entry.value}%`}
                >
                  {overviewData.specializationData.map((entry, index) => (
                    <Cell key={`specialization-cell-${entry.name}-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#FFFFFF', 
                    border: '1px solid #D8D8D8',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '11px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Participation Trend */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h2 
            className="mb-4" 
            style={{ 
              fontFamily: 'Arial, sans-serif', 
              fontSize: '18px', 
              fontWeight: 'bold', 
              color: '#1B3A5C' 
            }}
          >
            Participation Trend (2026)
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={overviewData.participationTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D8D8D8" />
              <XAxis 
                dataKey="month" 
                tick={{ fill: '#888888', fontSize: 10, fontFamily: 'Arial, sans-serif' }}
              />
              <YAxis 
                tick={{ fill: '#888888', fontSize: 10, fontFamily: 'Arial, sans-serif' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#FFFFFF', 
                  border: '1px solid #D8D8D8',
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '11px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="teachers" 
                stroke="#2E6DA4" 
                strokeWidth={3}
                dot={{ fill: '#2E6DA4', r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}