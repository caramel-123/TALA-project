import { useEffect, useState } from 'react';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { StatusBadge } from '../components/dashboard/StatusBadge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, PlusCircle, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';
import { getDiagnosePageData } from '../../features/diagnose/api/diagnose';
import { devSeed } from '../../features/shared/dev-seed';
import type {
  ClusterVm,
  CohortVm,
  DataConfidenceVm,
  DiagnosePageVm,
  DivisionVm,
  GapFactorVm,
  ScoreFactorVm,
} from '../../features/shared/types/view-models';

export function Diagnose() {
  const [pageData, setPageData] = useState<DiagnosePageVm>(devSeed.diagnose);
  const [isLoading, setIsLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeSidebar, setActiveSidebar] = useState('profiler');

  const { sidebarItems, regionData, gapFactors, divisions, cohorts, clusters, scoreFactors, dataQuality } = pageData;

  useEffect(() => {
    let isMounted = true;

    async function loadDiagnoseData() {
      setIsLoading(true);
      const result = await getDiagnosePageData('040000000');

      if (!isMounted) {
        return;
      }

      setPageData(result.data);
      setUsingFallback(result.usingFallback);
      setLoadError(result.error);
      setIsLoading(false);
    }

    loadDiagnoseData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleExportData = () => {
    toast.success('Exporting regional data to CSV...');
  };

  const handleAddToQueue = () => {
    toast.success('Region added to planning queue');
  };

  const handleDivisionClick = (divisionName: string) => {
    toast.info(`Opening cluster map for ${divisionName}`);
  };

  // Render content based on active sidebar
  const renderContent = () => {
    switch (activeSidebar) {
      case 'profiler':
        return <RegionalProfilerView gapFactors={gapFactors} cohorts={cohorts} />;
      case 'division':
        return <DivisionView divisions={divisions} onDivisionClick={handleDivisionClick} />;
      case 'cluster':
        return <ClusterMapView clusters={clusters} />;
      case 'cohort':
        return <TeacherCohortView cohorts={cohorts} />;
      case 'score':
        return <UnderservedScoreView scoreFactors={scoreFactors} underservedScore={regionData.underservedScore} />;
      case 'gap':
        return <GapFactorView gapFactors={gapFactors} />;
      case 'confidence':
        return <DataConfidenceView dataQuality={dataQuality} />;
      default:
        return <RegionalProfilerView gapFactors={gapFactors} cohorts={cohorts} />;
    }
  };

  return (
    <div className="flex flex-1">
      <Toaster />
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r" style={{ borderColor: '#D8D8D8' }}>
        <div className="p-4">
          <h3 
            className="mb-4" 
            style={{ 
              fontFamily: 'Arial, sans-serif', 
              fontSize: '14px', 
              fontWeight: 'bold', 
              color: '#1B3A5C' 
            }}
          >
            Diagnose Views
          </h3>
          <nav className="space-y-1">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSidebar(item.id);
                  toast.success(`Switched to ${item.label}`);
                }}
                className={`
                  w-full text-left px-3 py-2 rounded transition-colors
                  ${activeSidebar === item.id 
                    ? 'bg-[#D5E8F7] border-l-4' 
                    : 'hover:bg-[#EBF4FB]'
                  }
                `}
                style={{
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '11px',
                  color: activeSidebar === item.id ? '#1B3A5C' : '#1A1A1A',
                  fontWeight: activeSidebar === item.id ? 'bold' : 'normal',
                  borderLeftColor: activeSidebar === item.id ? '#2E6DA4' : 'transparent',
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto p-6">
          <Breadcrumbs />
          
          {/* Region Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 
                  className="mb-2" 
                  style={{ 
                    fontFamily: 'Arial, sans-serif', 
                    fontSize: '24px', 
                    fontWeight: 'bold', 
                    color: '#1B3A5C' 
                  }}
                >
                  {regionData.name}
                </h1>
                <div className="flex items-center gap-4 text-sm" style={{ fontFamily: 'Arial, sans-serif', color: '#888888' }}>
                  <span>Teacher Population: <strong style={{ color: '#1A1A1A' }}>{regionData.teacherPopulation.toLocaleString()}</strong></span>
                  <span>•</span>
                  <span>STAR Coverage: <strong style={{ color: '#1A1A1A' }}>{regionData.starCoverage}%</strong></span>
                  <span>•</span>
                  <span>Last Updated: {regionData.lastUpdated}</span>
                </div>
                <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: usingFallback ? '#B8860B' : '#2E6DA4', marginTop: '6px' }}>
                  {isLoading ? 'Loading data from Supabase...' : usingFallback ? 'Using fallback demo data' : 'Live data connected to Supabase'}
                </div>
                {loadError && (
                  <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#B8860B', marginTop: '4px' }}>
                    Data warning: {loadError}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleExportData}
                  className="flex items-center gap-2 px-4 py-2 rounded bg-white border hover:bg-[#EBF4FB] transition-colors cursor-pointer" 
                  style={{ borderColor: '#2E6DA4', color: '#2E6DA4', fontFamily: 'Arial, sans-serif', fontSize: '10px', fontWeight: 'bold' }}
                >
                  <Download className="w-4 h-4" />
                  Export Data
                </button>
                <button 
                  onClick={handleAddToQueue}
                  className="flex items-center gap-2 px-4 py-2 rounded bg-[#2E6DA4] text-white hover:bg-[#1B3A5C] transition-colors cursor-pointer" 
                  style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', fontWeight: 'bold' }}
                >
                  <PlusCircle className="w-4 h-4" />
                  Add to Queue
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded" style={{ backgroundColor: '#EBF4FB' }}>
                <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888' }}>
                  Underserved Area Score
                </div>
                <div className="flex items-baseline gap-2">
                  <span 
                    style={{ 
                      fontFamily: 'Arial, sans-serif', 
                      fontSize: '36px', 
                      fontWeight: 'bold', 
                      color: '#B8860B' 
                    }}
                  >
                    {regionData.underservedScore}
                  </span>
                  <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888' }}>/ 10</span>
                </div>
              </div>
              <div className="p-4 rounded" style={{ backgroundColor: '#EBF4FB' }}>
                <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888' }}>
                  Data Quality Score
                </div>
                <div className="mt-2">
                  <div className="w-full bg-[#D8D8D8] rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${regionData.dataQuality}%`, 
                        backgroundColor: '#2E6DA4' 
                      }}
                    />
                  </div>
                  <div className="mt-1 text-right" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1A1A1A' }}>
                    {regionData.dataQuality}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Content Area */}
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

// View Components
function RegionalProfilerView({ gapFactors, cohorts }: { gapFactors: GapFactorVm[]; cohorts: CohortVm[] }) {
  return (
    <div className="space-y-6">
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
          Regional Profiler Overview
        </h2>
        <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888', marginBottom: '16px' }}>
          Comprehensive regional analysis showing all key metrics and indicators
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={gapFactors} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#D8D8D8" />
            <XAxis 
              type="number"
              domain={[0, 100]}
              tick={{ fill: '#888888', fontSize: 10, fontFamily: 'Arial, sans-serif' }}
            />
            <YAxis 
              type="category"
              dataKey="factor" 
              width={180}
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
            <Bar dataKey="contribution" fill="#2E6DA4" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cohorts.map((cohort, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="h-1 rounded-t mb-3" style={{ backgroundColor: '#2E6DA4' }} />
            <h3 
              className="mb-2" 
              style={{ 
                fontFamily: 'Arial, sans-serif', 
                fontSize: '14px', 
                fontWeight: 'bold', 
                color: '#1B3A5C' 
              }}
            >
              {cohort.name}
            </h3>
            <div className="space-y-2" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}>
              <div style={{ color: '#888888' }}>
                <strong style={{ color: '#1A1A1A' }}>{cohort.count.toLocaleString()}</strong> teachers
              </div>
              <div style={{ color: '#888888' }}>
                Support Need: <strong style={{ color: '#1A1A1A' }}>{cohort.support}</strong>
              </div>
              <div className="pt-2 border-t" style={{ borderColor: '#D8D8D8', color: '#2E6DA4' }}>
                <strong>Recommended:</strong>
                <div className="mt-1" style={{ color: '#1A1A1A' }}>{cohort.intervention}</div>
              </div>
              <div className="mt-2">
                <StatusBadge status={cohort.confidence === 'high' ? 'high' : 'moderate'} label={`${cohort.confidence} confidence`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DivisionView({ divisions, onDivisionClick }: { divisions: DivisionVm[]; onDivisionClick: (name: string) => void }) {
  return (
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
        Division-Level Analysis
      </h2>
      <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888', marginBottom: '16px' }}>
        Detailed breakdown of all divisions within the region
      </p>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: '#D5E8F7' }}>
              <th className="text-left p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Division</th>
              <th className="text-right p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Teachers</th>
              <th className="text-right p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Coverage</th>
              <th className="text-left p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Top Gap</th>
              <th className="text-right p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Score</th>
              <th className="text-center p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {divisions.map((division, index) => (
              <tr 
                key={index}
                onClick={() => onDivisionClick(division.name)}
                className="border-b hover:bg-[#EBF4FB] cursor-pointer transition-colors"
                style={{ borderColor: '#D8D8D8' }}
              >
                <td className="p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1A1A1A' }}>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" style={{ color: '#2E6DA4' }} />
                    {division.name}
                  </div>
                </td>
                <td className="text-right p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1A1A1A' }}>
                  {division.population.toLocaleString()}
                </td>
                <td className="text-right p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1A1A1A' }}>
                  {division.coverage}%
                </td>
                <td className="p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888' }}>
                  {division.gap}
                </td>
                <td className="text-right p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#B8860B' }}>
                  {division.score}
                </td>
                <td className="text-center p-3">
                  <StatusBadge status={division.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClusterMapView({ clusters }: { clusters: ClusterVm[] }) {

  return (
    <div className="space-y-6">
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
          School Cluster Map
        </h2>
        <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888', marginBottom: '16px' }}>
          Geographical clustering of schools for targeted interventions
        </p>
        <div className="bg-[#EBF4FB] rounded h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="w-full max-w-2xl mx-auto mb-4">
              <div className="grid grid-cols-2 gap-4 p-8">
                {clusters.map((cluster, i) => (
                  <div 
                    key={i}
                    className="p-6 rounded-lg border-2 cursor-pointer hover:shadow-lg transition-all"
                    style={{ 
                      backgroundColor: '#FFFFFF',
                      borderColor: cluster.priority === 'critical' ? '#B8860B' : cluster.priority === 'high' ? '#E8C94F' : '#2E6DA4'
                    }}
                  >
                    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', fontWeight: 'bold', color: '#1B3A5C' }}>
                      {cluster.name}
                    </div>
                    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#888888', marginTop: '4px' }}>
                      {cluster.schools} schools • {cluster.teachers} teachers
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888' }}>
              Interactive cluster visualization - Click clusters for details
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {clusters.map((cluster, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-4">
            <h3 style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', fontWeight: 'bold', color: '#1B3A5C', marginBottom: '8px' }}>
              {cluster.name.split(' - ')[0]}
            </h3>
            <div className="space-y-2" style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px' }}>
              <div style={{ color: '#888888' }}>Schools: <strong style={{ color: '#1A1A1A' }}>{cluster.schools}</strong></div>
              <div style={{ color: '#888888' }}>Teachers: <strong style={{ color: '#1A1A1A' }}>{cluster.teachers}</strong></div>
              <div style={{ color: '#888888' }}>Coverage: <strong style={{ color: '#1A1A1A' }}>{cluster.coverage}%</strong></div>
              <div className="mt-2">
                <StatusBadge status={cluster.priority as any} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeacherCohortView({ cohorts }: { cohorts: CohortVm[] }) {
  return (
    <div className="space-y-6">
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
          Teacher Cohort Segments
        </h2>
        <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888', marginBottom: '16px' }}>
          Segmentation of teachers by career stage for targeted support programs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cohorts.map((cohort, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <h3 
                style={{ 
                  fontFamily: 'Arial, sans-serif', 
                  fontSize: '16px', 
                  fontWeight: 'bold', 
                  color: '#1B3A5C' 
                }}
              >
                {cohort.name}
              </h3>
              <span 
                className="px-3 py-1 rounded"
                style={{ 
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  backgroundColor: '#E8C94F',
                  color: '#1A1A1A'
                }}
              >
                {cohort.count.toLocaleString()} teachers
              </span>
            </div>
            <div className="space-y-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}>
              <div className="p-3 rounded" style={{ backgroundColor: '#EBF4FB' }}>
                <div style={{ color: '#888888', fontSize: '9px' }}>Support Need Level</div>
                <div style={{ color: '#1B3A5C', fontWeight: 'bold', marginTop: '4px' }}>{cohort.support}</div>
              </div>
              <div className="p-3 rounded border" style={{ borderColor: '#D8D8D8' }}>
                <div style={{ color: '#888888', fontSize: '9px' }}>Recommended Intervention</div>
                <div style={{ color: '#1A1A1A', marginTop: '4px' }}>{cohort.intervention}</div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: '#D8D8D8' }}>
                <span style={{ color: '#888888', fontSize: '10px' }}>Data Confidence</span>
                <StatusBadge status={cohort.confidence === 'high' ? 'high' : 'moderate'} label={cohort.confidence} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UnderservedScoreView({ scoreFactors, underservedScore }: { scoreFactors: ScoreFactorVm[]; underservedScore: number }) {

  return (
    <div className="space-y-6">
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
          Underserved Score Builder
        </h2>
        <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888', marginBottom: '16px' }}>
          Composite scoring methodology showing weighted factors contributing to underserved area classification
        </p>
        
        <div className="flex items-center justify-center p-8 rounded" style={{ backgroundColor: '#EBF4FB' }}>
          <div className="text-center">
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#888888', marginBottom: '8px' }}>
              COMPOSITE UNDERSERVED SCORE
            </div>
            <div 
              style={{ 
                fontFamily: 'Arial, sans-serif', 
                fontSize: '72px', 
                fontWeight: 'bold', 
                color: '#B8860B',
                lineHeight: 1
              }}
            >
              {underservedScore}
            </div>
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#888888', marginTop: '8px' }}>
              out of 10.0
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 
          className="mb-4" 
          style={{ 
            fontFamily: 'Arial, sans-serif', 
            fontSize: '14px', 
            fontWeight: 'bold', 
            color: '#1B3A5C' 
          }}
        >
          Score Factor Breakdown
        </h3>
        <div className="space-y-3">
          {scoreFactors.map((item, index) => (
            <div key={index} className="p-4 rounded border hover:border-[#2E6DA4] transition-colors" style={{ borderColor: '#D8D8D8' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>
                    {item.factor}
                  </div>
                  <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888' }}>
                    Weight: {item.weight}%
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '18px', fontWeight: 'bold', color: '#B8860B' }}>
                      {item.score}
                    </div>
                  </div>
                  <StatusBadge status={item.impact === 'high' ? 'high' : 'moderate'} label={`${item.impact} impact`} />
                </div>
              </div>
              <div className="w-full bg-[#D8D8D8] rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full rounded-full" 
                  style={{ 
                    width: `${item.score * 10}%`, 
                    backgroundColor: '#2E6DA4' 
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GapFactorView({ gapFactors }: { gapFactors: GapFactorVm[] }) {
  return (
    <div className="space-y-6">
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
          Gap Factor Analysis
        </h2>
        <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888', marginBottom: '16px' }}>
          Detailed analysis of gaps preventing optimal teacher development and deployment
        </p>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={gapFactors} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#D8D8D8" />
            <XAxis 
              type="number"
              domain={[0, 100]}
              tick={{ fill: '#888888', fontSize: 10, fontFamily: 'Arial, sans-serif' }}
            />
            <YAxis 
              type="category"
              dataKey="factor" 
              width={200}
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
            <Bar dataKey="contribution" fill="#2E6DA4" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {gapFactors.map((gap, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start justify-between mb-3">
              <h3 style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', fontWeight: 'bold', color: '#1B3A5C', flex: 1 }}>
                {gap.factor}
              </h3>
              <span 
                className="px-2 py-1 rounded"
                style={{ 
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  backgroundColor: '#E8C94F',
                  color: '#1A1A1A'
                }}
              >
                {gap.contribution}%
              </span>
            </div>
            <div className="w-full bg-[#D8D8D8] rounded-full h-3 overflow-hidden mb-2">
              <div 
                className="h-full rounded-full" 
                style={{ 
                  width: `${gap.contribution}%`, 
                  backgroundColor: '#2E6DA4' 
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888' }}>
                Contribution to Total Gap
              </span>
              <StatusBadge status={gap.confidence === 'high' ? 'high' : 'moderate'} label={`${gap.confidence} confidence`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataConfidenceView({ dataQuality }: { dataQuality: DataConfidenceVm[] }) {

  return (
    <div className="space-y-6">
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
          Data Confidence Panel
        </h2>
        <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888', marginBottom: '16px' }}>
          Assessment of data quality across all sources feeding regional analysis
        </p>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded text-center" style={{ backgroundColor: '#EBF4FB' }}>
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888' }}>OVERALL COMPLETENESS</div>
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '32px', fontWeight: 'bold', color: '#2E6DA4', marginTop: '4px' }}>
              80%
            </div>
          </div>
          <div className="p-4 rounded text-center" style={{ backgroundColor: '#EBF4FB' }}>
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888' }}>OVERALL ACCURACY</div>
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '32px', fontWeight: 'bold', color: '#2E6DA4', marginTop: '4px' }}>
              83%
            </div>
          </div>
          <div className="p-4 rounded text-center" style={{ backgroundColor: '#EBF4FB' }}>
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888' }}>OVERALL TIMELINESS</div>
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '32px', fontWeight: 'bold', color: '#2E6DA4', marginTop: '4px' }}>
              77%
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: '#D5E8F7' }}>
                <th className="text-left p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Data Source</th>
                <th className="text-center p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Completeness</th>
                <th className="text-center p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Accuracy</th>
                <th className="text-center p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Timeliness</th>
                <th className="text-center p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {dataQuality.map((item, index) => (
                <tr key={index} className="border-b hover:bg-[#EBF4FB]" style={{ borderColor: '#D8D8D8' }}>
                  <td className="p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1A1A1A' }}>
                    {item.source}
                  </td>
                  <td className="text-center p-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 bg-[#D8D8D8] rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full rounded-full" 
                          style={{ width: `${item.completeness}%`, backgroundColor: '#2E6DA4' }}
                        />
                      </div>
                      <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#1A1A1A' }}>
                        {item.completeness}%
                      </span>
                    </div>
                  </td>
                  <td className="text-center p-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 bg-[#D8D8D8] rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full rounded-full" 
                          style={{ width: `${item.accuracy}%`, backgroundColor: '#2E6DA4' }}
                        />
                      </div>
                      <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#1A1A1A' }}>
                        {item.accuracy}%
                      </span>
                    </div>
                  </td>
                  <td className="text-center p-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 bg-[#D8D8D8] rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full rounded-full" 
                          style={{ width: `${item.timeliness}%`, backgroundColor: '#2E6DA4' }}
                        />
                      </div>
                      <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#1A1A1A' }}>
                        {item.timeliness}%
                      </span>
                    </div>
                  </td>
                  <td className="text-center p-3">
                    <StatusBadge status={item.confidence as any} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}