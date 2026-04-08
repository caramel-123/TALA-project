import { Fragment, useEffect, useState } from 'react';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { StatusBadge } from '../components/dashboard/StatusBadge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, PlusCircle, MapPin, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';
import { Tooltip as UiTooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip';
import { getDiagnosePageData } from '../../features/diagnose/api/diagnose';
import { devSeed } from '../../features/shared/dev-seed';

function getIslandGroup(regionName: string) {
  const normalized = regionName.toLowerCase();
  if (/barmm|mindanao|region (?:ix|x|xi|xii|xiii)|caraga|davao|soccsksargen/.test(normalized)) {
    return 'Mindanao';
  }
  if (/ncr|region (?:i|ii|iii|iv|v|vi|vii|viii|xiv)|calabarzon|luzon|cordillera/.test(normalized)) {
    return 'Luzon';
  }
  if (/visayas|region (?:vii|viii|x|xi)/.test(normalized)) {
    return 'Visayas';
  }
  return 'Philippines';
}
import type {
  ClusterVm,
  CohortVm,
  ConfidenceLevel,
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
        return <RegionalProfilerView gapFactors={gapFactors} divisions={divisions} cohorts={cohorts} scoreFactors={scoreFactors} dataQuality={dataQuality} underservedScore={regionData.underservedScore} />;
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
        return <RegionalProfilerView gapFactors={gapFactors} divisions={divisions} cohorts={cohorts} scoreFactors={scoreFactors} dataQuality={dataQuality} underservedScore={regionData.underservedScore} />;
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
                <div className="flex flex-wrap gap-3 text-sm" style={{ fontFamily: 'Arial, sans-serif', color: '#888888' }}>
                  <span>Teacher Population: <strong style={{ color: '#1A1A1A' }}>{regionData.teacherPopulation.toLocaleString()}</strong></span>
                  <span>•</span>
                  <span>STAR Coverage: <strong style={{ color: '#1A1A1A' }}>{regionData.starCoverage}%</strong></span>
                  <span>•</span>
                  <span>{getIslandGroup(regionData.name)}</span>
                </div>
                <div className="mt-2 rounded-full bg-[#F8FAFC] px-3 py-1 inline-flex text-xs font-semibold text-[#2E6DA4]" style={{ fontFamily: 'Arial, sans-serif' }}>
                  Last Updated: {regionData.lastUpdated}
                </div>
                <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: usingFallback ? '#B8860B' : '#2E6DA4', marginTop: '6px' }}>
                  {isLoading ? 'Loading data from Supabase...' : usingFallback ? 'Using fallback demo data' : 'Live data connected'}
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
function RegionalProfilerView({
  gapFactors,
  divisions,
  cohorts,
  scoreFactors,
  dataQuality,
  underservedScore,
}: {
  gapFactors: GapFactorVm[];
  divisions: DivisionVm[];
  cohorts: CohortVm[];
  scoreFactors: ScoreFactorVm[];
  dataQuality: DataConfidenceVm[];
  underservedScore: number;
}) {
  const [showScoreExplanation, setShowScoreExplanation] = useState(false);
  const [selectedStage, setSelectedStage] = useState('All');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [trainingHistory, setTrainingHistory] = useState('All');
  const [sortBy, setSortBy] = useState<'name' | 'population' | 'coverage' | 'gap' | 'score' | 'status'>('score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [expandedDivision, setExpandedDivision] = useState<string | null>(null);
  const [activeCohortName, setActiveCohortName] = useState(cohorts[0]?.name || 'Early Career');

  const stageOptions = ['All', 'Early Career', 'Mid Career', 'Senior', 'Near Retirement'];
  const subjectOptions = ['All', 'Math', 'Science', 'Languages', 'ICT', 'Special Education'];
  const trainingOptions = ['All', 'Completed', 'Pending', 'No history'];

  const highlightedCohort = cohorts.find((cohort) => cohort.name === activeCohortName) || cohorts[0] || null;

  const sortedDivisions = [...divisions].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name) * multiplier;
      case 'population':
        return (a.population - b.population) * multiplier;
      case 'coverage':
        return (a.coverage - b.coverage) * multiplier;
      case 'score':
        return (a.score - b.score) * multiplier;
      case 'status':
        return a.status.localeCompare(b.status) * multiplier;
      default:
        return 0;
    }
  });

  const toggleDivision = (divisionName: string) => {
    setSelectedDivisions((current) =>
      current.includes(divisionName)
        ? current.filter((name) => name !== divisionName)
        : [...current, divisionName],
    );
  };

  const isAllSelected = selectedDivisions.length === divisions.length && divisions.length > 0;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedDivisions([]);
    } else {
      setSelectedDivisions(divisions.map((division) => division.name));
    }
  };

  const scoreColor = (value: number) => {
    return value >= 8 ? '#1B3A5C' : value >= 6.5 ? '#E8C94F' : '#A8C8E8';
  };

  const gapColor = (value: number) => {
    if (value >= 75) return '#1B3A5C';
    if (value >= 55) return '#A8C8E8';
    return '#D5E8F7';
  };

  const confidenceRing = (confidence: ConfidenceLevel) => {
    if (confidence === 'high') return '#1B3A5C';
    if (confidence === 'moderate') return '#2E6DA4';
    return '#A8C8E8';
  };

  const dataQualityScore = dataQuality.length > 0
    ? Math.round(
        dataQuality.reduce((sum, item) => sum + item.completeness + item.accuracy + item.timeliness, 0) /
        (dataQuality.length * 3),
      )
    : 0;

  const selectedCohortSummary = highlightedCohort
    ? `${highlightedCohort.name} teachers are prioritized for ${highlightedCohort.intervention.toLowerCase()}. This cohort is currently rated ${highlightedCohort.confidence} confidence in the underlying data.`
    : 'Select a cohort tile to review a detailed placeholder summary.';

  if (gapFactors.length === 0 && divisions.length === 0 && cohorts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1A1A1A' }}>
        No regional profiler metrics are available yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <div className="text-sm font-semibold" style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>
                Regional Profiler
              </div>
              <div className="mt-2 text-2xl font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>
                In-depth regional support profile
              </div>
            </div>
            <button
              onClick={() => setShowScoreExplanation((current) => !current)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#D8D8D8] bg-[#F8FAFC] text-sm font-semibold text-[#1B3A5C] hover:bg-[#EBF4FB] transition-colors"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              <Info className="w-4 h-4" />
              {showScoreExplanation ? 'Hide Score Breakdown' : 'Show Score Breakdown'}
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[0.85fr_1.15fr] gap-6">
            <div className="rounded-2xl border border-[#D8D8D8] bg-[#F8FAFC] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[#888888]" style={{ fontFamily: 'Arial, sans-serif' }}>
                    Underserved Area Score
                  </div>
                  <div className="mt-3 flex items-end gap-4">
                    <div className="text-5xl font-bold" style={{ fontFamily: 'Arial, sans-serif', color: scoreColor(underservedScore) }}>
                      {underservedScore}
                    </div>
                    <div className="text-sm text-[#1A1A1A]" style={{ fontFamily: 'Arial, sans-serif' }}>/ 10</div>
                  </div>
                </div>
                <div className="rounded-3xl px-4 py-3" style={{ backgroundColor: scoreColor(underservedScore) }}>
                  <div className="text-sm font-semibold text-white" style={{ fontFamily: 'Arial, sans-serif' }}>
                    {underservedScore >= 8 ? 'Critical' : underservedScore >= 6.5 ? 'Important' : 'Monitor'}
                  </div>
                </div>
              </div>

              {showScoreExplanation && (
                <div className="mt-6 space-y-3">
                  {scoreFactors.slice(0, 4).map((item) => (
                    <div key={item.factor} className="rounded-lg bg-white p-3 border border-[#D8D8D8]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold" style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>
                          {item.factor}
                        </div>
                        <div className="text-sm font-semibold" style={{ fontFamily: 'Arial, sans-serif', color: '#B8860B' }}>
                          {item.weight}%
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-[#888888]" style={{ fontFamily: 'Arial, sans-serif' }}>
                        Current impact: {item.score.toFixed(1)} / 10
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#D8D8D8] bg-white p-5">
              <div className="flex items-center justify-between gap-2 mb-5">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[#888888]" style={{ fontFamily: 'Arial, sans-serif' }}>
                    Data Quality Score
                  </div>
                  <div className="mt-2 text-2xl font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>
                    {dataQualityScore}%
                  </div>
                </div>
                <div className="rounded-full bg-[#EBF4FB] px-3 py-1 text-xs font-semibold text-[#2E6DA4]" style={{ fontFamily: 'Arial, sans-serif' }}>
                  Source validated
                </div>
              </div>
              <div className="w-full bg-[#D8D8D8] rounded-full h-3 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${dataQualityScore}%`, backgroundColor: '#A8C8E8' }} />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-[#888888]" style={{ fontFamily: 'Arial, sans-serif' }}>
                <span>Last updated</span>
                <span>{dataQuality.length > 0 ? 'Source: regional profile' : 'No source'} </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#D8D8D8] bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-semibold" style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>
                  Gap Factor Breakdown
                </div>
                <div className="mt-1 text-xs text-[#888888]" style={{ fontFamily: 'Arial, sans-serif' }}>
                  Review where support gaps are concentrated and what drives the underserved score.
                </div>
              </div>
              <button
                onClick={() => toast.success('Exporting gap factor details to planning brief...')}
                className="inline-flex items-center gap-2 rounded-lg border border-[#D8D8D8] bg-[#F8FAFC] px-4 py-2 text-sm font-semibold text-[#1B3A5C] hover:bg-[#EBF4FB] transition-colors"
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                <Download className="w-4 h-4" />
                Export Breakdown
              </button>
            </div>
            <div className="overflow-x-auto">
              <ResponsiveContainer width="100%" height={320}>
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
                    width={240}
                    tick={{ fill: '#1A1A1A', fontSize: 11, fontFamily: 'Arial, sans-serif' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #D8D8D8',
                      fontFamily: 'Arial, sans-serif',
                      fontSize: '11px',
                    }}
                  />
                  <Bar
                    dataKey="contribution"
                    isAnimationActive={false}
                    fill="#2E6DA4"
                    label={false}
                    radius={[6, 6, 6, 6]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {gapFactors.map((factor) => (
                <div key={factor.id} className="rounded-2xl border border-[#D8D8D8] bg-[#F8FAFC] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="inline-flex h-3 w-3 rounded-full"
                        style={{ backgroundColor: confidenceRing(factor.confidence) }}
                      />
                      <div>
                        <div className="text-sm font-semibold" style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>
                          {factor.factor}
                        </div>
                        <div className="text-xs text-[#888888]" style={{ fontFamily: 'Arial, sans-serif' }}>
                          Contribution: {factor.contribution}%
                        </div>
                      </div>
                    </div>
                    <UiTooltip>
                      <TooltipTrigger asChild>
                        <button className="rounded-full bg-white p-2 shadow-sm hover:bg-[#EBF4FB] transition-colors">
                          <Info className="h-4 w-4 text-[#2E6DA4]" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-1">
                          <div className="font-semibold">Definition</div>
                          <div>{factor.definition ?? 'This factor represents the degree to which the gap influences regional scoring.'}</div>
                          <div className="font-semibold">Source</div>
                          <div>{factor.source ?? 'Regional analytics pipeline'}</div>
                          <div className="font-semibold">Recency</div>
                          <div>{factor.recency ?? 'Updated this month'}</div>
                        </div>
                      </TooltipContent>
                    </UiTooltip>
                  </div>
                  <div className="mt-4 h-3 rounded-full bg-white shadow-inner overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${factor.contribution}%`, backgroundColor: gapColor(factor.contribution) }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-[#D8D8D8] bg-white p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <div className="text-sm font-semibold" style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>
                  Teacher Cohort Segment Panel
                </div>
                <div className="text-xs text-[#888888]" style={{ fontFamily: 'Arial, sans-serif' }}>
                  Explore priority teacher groups by career stage and support needs.
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <select
                  value={selectedStage}
                  onChange={(event) => setSelectedStage(event.target.value)}
                  className="rounded-lg border border-[#D8D8D8] bg-[#F8FAFC] px-3 py-2 text-sm"
                >
                  {stageOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <select
                  value={selectedSubject}
                  onChange={(event) => setSelectedSubject(event.target.value)}
                  className="rounded-lg border border-[#D8D8D8] bg-[#F8FAFC] px-3 py-2 text-sm"
                >
                  {subjectOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <select
                  value={trainingHistory}
                  onChange={(event) => setTrainingHistory(event.target.value)}
                  className="rounded-lg border border-[#D8D8D8] bg-[#F8FAFC] px-3 py-2 text-sm"
                >
                  {trainingOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {cohorts.map((cohort) => {
                const isHighlighted = cohort.support === 'High';
                return (
                  <button
                    key={cohort.name}
                    type="button"
                    onClick={() => setActiveCohortName(cohort.name)}
                    className={`rounded-2xl border p-4 text-left transition-all ${isHighlighted ? 'bg-[#FFF3C4] border-[#E8C94F]' : 'bg-[#F8FBFF] border-[#D8D8D8] hover:shadow-md'}`}
                    style={{ fontFamily: 'Arial, sans-serif' }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold" style={{ color: '#1B3A5C' }}>{cohort.name}</div>
                        <div className="text-xs text-[#888888]">{selectedSubject} · {trainingHistory}</div>
                      </div>
                      <div className="text-sm font-semibold text-[#1A1A1A">{cohort.count.toLocaleString()}</div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl bg-white p-3">
                        <div className="text-[10px] text-[#888888]">Primary support need</div>
                        <div className="mt-1 text-sm font-semibold text-[#1B3A5C]">{cohort.support}</div>
                      </div>
                      <div className="rounded-xl bg-white p-3">
                        <div className="text-[10px] text-[#888888]">Recommended intervention</div>
                        <div className="mt-1 text-sm font-semibold text-[#1B3A5C]">{cohort.intervention}</div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#888888]">Confidence</span>
                      <StatusBadge status={cohort.confidence === 'high' ? 'high' : 'moderate'} label={`${cohort.confidence}`} />
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 rounded-2xl bg-[#F8FAFC] p-4">
              <div className="text-sm font-semibold" style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>
                Cohort Detail View
              </div>
              <div className="mt-2 text-sm text-[#1A1A1A]" style={{ fontFamily: 'Arial, sans-serif' }}>
                {selectedCohortSummary}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#D8D8D8] bg-white p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <div className="text-sm font-semibold" style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>
                  Division-Level Detail Table
                </div>
                <div className="text-xs text-[#888888]" style={{ fontFamily: 'Arial, sans-serif' }}>
                  Sort and select divisions to drive batch intervention recommendations.
                </div>
              </div>
              <button
                onClick={() => toast.success(`Added ${selectedDivisions.length} divisions to planning queue.`)}
                className="rounded-lg border border-[#D8D8D8] bg-[#F8FAFC] px-4 py-2 text-sm font-semibold text-[#1B3A5C] hover:bg-[#EBF4FB] transition-colors"
                disabled={selectedDivisions.length === 0}
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                Add Selected to Queue
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-2" style={{ borderCollapse: 'separate' }}>
                <thead>
                  <tr>
                    <th className="p-3 text-left text-xs font-semibold uppercase text-[#1B3A5C]"> <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} /></th>
                    <th className="p-3 text-left text-xs font-semibold uppercase text-[#1B3A5C]">Division</th>
                    <th className="p-3 text-right text-xs font-semibold uppercase text-[#1B3A5C]">Teachers</th>
                    <th className="p-3 text-right text-xs font-semibold uppercase text-[#1B3A5C]">Coverage</th>
                    <th className="p-3 text-left text-xs font-semibold uppercase text-[#1B3A5C]">Top Gap</th>
                    <th className="p-3 text-right text-xs font-semibold uppercase text-[#1B3A5C]">Score</th>
                    <th className="p-3 text-center text-xs font-semibold uppercase text-[#1B3A5C]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDivisions.map((division, index) => {
                    const isSelected = selectedDivisions.includes(division.name);
                    const isExpanded = expandedDivision === division.name;
                    return (
                      <Fragment key={division.name}>
                        <tr
                          className={`cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-[#F8FBFF]' : 'bg-white'} hover:bg-[#EBF4FB]`}
                          onClick={() => setExpandedDivision((current) => (current === division.name ? null : division.name))}
                        >
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(event) => {
                                event.stopPropagation();
                                toggleDivision(division.name);
                              }}
                            />
                          </td>
                          <td className="p-3 text-sm font-semibold text-[#1A1A1A]">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-[#2E6DA4]" />
                              {division.name}
                            </div>
                          </td>
                          <td className="p-3 text-right text-sm text-[#1A1A1A]">{division.population.toLocaleString()}</td>
                          <td className="p-3 text-right text-sm text-[#1A1A1A]">{division.coverage}%</td>
                          <td className="p-3 text-sm text-[#888888]">{division.gap}</td>
                          <td className="p-3 text-right text-sm font-semibold" style={{ color: '#B8860B' }}>{division.score}</td>
                          <td className="p-3 text-center">
                            <StatusBadge status={division.status} />
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-[#EFF6FF]">
                            <td colSpan={7} className="p-4 text-sm text-[#1A1A1A]">
                              <div className="rounded-2xl border border-[#D8D8D8] bg-white p-4">
                                <div className="text-sm font-semibold text-[#1B3A5C]">{division.name} cluster map</div>
                                <div className="mt-2 text-xs text-[#888888]">This inline expansion displays the division's schools, clusters, and a summary of the most critical support gaps.</div>
                                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                  <div className="rounded-xl bg-[#F8FAFC] p-3">
                                    <div className="text-[10px] text-[#888888]">Estimated cluster count</div>
                                    <div className="mt-2 text-sm font-semibold text-[#1B3A5C]">{Math.max(3, Math.round(division.population / 2500))}</div>
                                  </div>
                                  <div className="rounded-xl bg-[#F8FAFC] p-3">
                                    <div className="text-[10px] text-[#888888]">Primary gap</div>
                                    <div className="mt-2 text-sm font-semibold text-[#1B3A5C]">{division.gap}</div>
                                  </div>
                                  <div className="rounded-xl bg-[#F8FAFC] p-3">
                                    <div className="text-[10px] text-[#888888]">Recommended action</div>
                                    <div className="mt-2 text-sm font-semibold text-[#1B3A5C]">Targeted support planning</div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DivisionView({ divisions, onDivisionClick }: { divisions: DivisionVm[]; onDivisionClick: (name: string) => void }) {
  if (divisions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1A1A1A' }}>
        No division breakdown is available for this region.
      </div>
    );
  }

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
  if (clusters.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1A1A1A' }}>
        No school clusters are available for this region.
      </div>
    );
  }

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
  if (cohorts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1A1A1A' }}>
        No teacher cohort segmentation data is available.
      </div>
    );
  }

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
  if (scoreFactors.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1A1A1A' }}>
        No underserved score factors are available.
      </div>
    );
  }

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
  if (gapFactors.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1A1A1A' }}>
        No gap-factor data is available.
      </div>
    );
  }

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
  if (dataQuality.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1A1A1A' }}>
        No data confidence metrics are available.
      </div>
    );
  }

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