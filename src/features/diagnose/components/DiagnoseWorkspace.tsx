import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { StatusBadge } from '../../../app/components/dashboard/StatusBadge';
import { PhilippinesMap } from '../../../app/components/maps/PhilippinesMap';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../app/components/ui/tabs';
import type {
  ClusterVm,
  DataConfidenceVm,
  DiagnosePageVm,
  DiagnoseRegionSummaryVm,
  DivisionVm,
} from '../../shared/types/view-models';
import { getClusterShortLabel } from '../lib/normalizers';

type DiagnoseWorkspaceProps = {
  data: DiagnosePageVm;
  selectedRegionCode: string | null;
  selectedDivision: string | null;
  selectedCluster: string | null;
  onSelectRegion: (regionCode: string) => void;
  onClearRegion: () => void;
  onSelectDivision: (division: string | null) => void;
  onSelectCluster: (cluster: string | null) => void;
};

type DashboardTab = 'national-overview' | 'geographic-drilldown' | 'score-decomposition' | 'data-confidence' | 'cohort-context';

function parseAverage(rows: DataConfidenceVm[], key: keyof Pick<DataConfidenceVm, 'completeness' | 'accuracy' | 'timeliness'>): number {
  if (rows.length === 0) {
    return 0;
  }

  return Math.round(rows.reduce((sum, row) => sum + row[key], 0) / rows.length);
}

function resolveRegionFromMap(mapName: string, regions: DiagnoseRegionSummaryVm[]): DiagnoseRegionSummaryVm | null {
  const normalized = mapName.toUpperCase().trim();
  return regions.find((region) => {
    const name = region.regionName.toUpperCase();
    return name.includes(normalized) || normalized.includes(name.replace(' - ', ' '));
  }) || null;
}

function getFilteredClusters(clusters: ClusterVm[], selectedDivision: string | null): ClusterVm[] {
  if (!selectedDivision) {
    return [];
  }

  const withDivisionTag = clusters.filter((cluster) => cluster.divisionName === selectedDivision);
  if (withDivisionTag.length > 0) {
    return withDivisionTag;
  }

  return clusters;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--light-gray)] bg-white p-8 text-center">
      <h3 className="text-base font-semibold text-[var(--navy-blue)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--mid-gray)]">{description}</p>
    </div>
  );
}

export function DiagnoseWorkspace({
  data,
  selectedRegionCode,
  selectedDivision,
  selectedCluster,
  onSelectRegion,
  onClearRegion,
  onSelectDivision,
  onSelectCluster,
}: DiagnoseWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('national-overview');

  const sortedRegions = useMemo(
    () => [...data.regions].sort((a, b) => b.underservedScore - a.underservedScore),
    [data.regions],
  );

  const selectedRegion = useMemo(
    () => data.regions.find((region) => region.regionCode === selectedRegionCode) || null,
    [data.regions, selectedRegionCode],
  );

  const selectedDivisionRecord = useMemo(
    () => data.divisions.find((division) => division.name === selectedDivision) || null,
    [data.divisions, selectedDivision],
  );

  const filteredClusters = useMemo(
    () => getFilteredClusters(data.clusters, selectedDivision),
    [data.clusters, selectedDivision],
  );

  const selectedClusterRecord = useMemo(
    () => filteredClusters.find((cluster) => cluster.name === selectedCluster) || null,
    [filteredClusters, selectedCluster],
  );

  const nationalCoverageGap = Math.max(0, 100 - data.nationalSummary.averageCoverage);
  const nationalPriorityLevel = data.nationalSummary.highPriorityRegions >= 6 ? 'Elevated Priority' : 'Monitored Priority';

  const scoreBenchmarkData = selectedRegion
    ? [
        { label: 'Selected Region', score: selectedRegion.underservedScore },
        { label: 'National Average', score: data.nationalSummary.nationalScore },
        { label: 'Highest Region', score: sortedRegions[0]?.underservedScore || data.nationalSummary.nationalScore },
      ]
    : [];

  const qualityAverages = {
    completeness: parseAverage(data.dataQuality, 'completeness'),
    accuracy: parseAverage(data.dataQuality, 'accuracy'),
    timeliness: parseAverage(data.dataQuality, 'timeliness'),
  };

  const cohortTotal = data.cohorts.reduce((sum, cohort) => sum + cohort.count, 0);

  return (
    <section className="space-y-4">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DashboardTab)}>
        <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl border border-[var(--light-gray)] bg-white p-1">
          <TabsTrigger value="national-overview" className="min-w-[180px]">National Overview</TabsTrigger>
          <TabsTrigger value="geographic-drilldown" className="min-w-[180px]">Geographic Drilldown</TabsTrigger>
          <TabsTrigger value="score-decomposition" className="min-w-[180px]">Score Decomposition</TabsTrigger>
          <TabsTrigger value="data-confidence" className="min-w-[160px]">Data Confidence</TabsTrigger>
          <TabsTrigger value="cohort-context" className="min-w-[150px]">Cohort Context</TabsTrigger>
        </TabsList>

        <TabsContent value="national-overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
              <p className="text-xs uppercase tracking-[0.1em] text-[var(--mid-gray)]">National UAS</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--deep-yellow)]">{data.nationalSummary.nationalScore.toFixed(1)}</p>
            </article>
            <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
              <p className="text-xs uppercase tracking-[0.1em] text-[var(--mid-gray)]">Coverage Gap</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--navy-blue)]">{nationalCoverageGap}%</p>
            </article>
            <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
              <p className="text-xs uppercase tracking-[0.1em] text-[var(--mid-gray)]">Data Quality</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--medium-blue)]">{data.nationalSummary.averageDataQuality}%</p>
            </article>
            <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
              <p className="text-xs uppercase tracking-[0.1em] text-[var(--mid-gray)]">Teachers in Scope</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--navy-blue)]">{data.nationalSummary.teacherPopulation.toLocaleString()}</p>
            </article>
            <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
              <p className="text-xs uppercase tracking-[0.1em] text-[var(--mid-gray)]">Priority Level</p>
              <p className="mt-2 text-lg font-semibold text-[var(--deep-yellow)]">{nationalPriorityLevel}</p>
              <p className="text-xs text-[var(--mid-gray)]">{data.nationalSummary.highPriorityRegions} regions high or critical</p>
            </article>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4 xl:col-span-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--navy-blue)]">Philippine Regional Selector</h3>
                <button type="button" className="text-xs text-[var(--medium-blue)] hover:underline" onClick={onClearRegion}>Reset</button>
              </div>
              <div className="mt-3 aspect-[16/10] rounded-lg border border-[var(--light-gray)] bg-[var(--pale-blue)] p-2">
                <PhilippinesMap
                  selectedRegion={selectedRegion?.regionName || null}
                  onRegionClick={(regionName) => {
                    const mapped = resolveRegionFromMap(regionName, data.regions);
                    if (mapped) {
                      onSelectRegion(mapped.regionCode);
                      setActiveTab('geographic-drilldown');
                    }
                  }}
                />
              </div>
              <div className="mt-3">
                <label className="mb-1 block text-xs uppercase tracking-[0.08em] text-[var(--mid-gray)]" htmlFor="national-region-select">Select region</label>
                <select
                  id="national-region-select"
                  value={selectedRegionCode || ''}
                  onChange={(event) => {
                    if (!event.target.value) {
                      onClearRegion();
                      return;
                    }
                    onSelectRegion(event.target.value);
                    setActiveTab('geographic-drilldown');
                  }}
                  className="h-10 w-full rounded-lg border border-[var(--light-gray)] bg-white px-3 text-sm text-[var(--black)]"
                >
                  <option value="">National (no selected region)</option>
                  {sortedRegions.map((region) => (
                    <option key={region.regionCode} value={region.regionCode}>{region.regionName}</option>
                  ))}
                </select>
              </div>
            </article>

            <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4 xl:col-span-5">
              <h3 className="text-sm font-semibold text-[var(--navy-blue)]">Regional Priority Ranking</h3>
              <div className="mt-3 max-h-[440px] overflow-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-[var(--light-gray)] text-xs uppercase tracking-[0.08em] text-[var(--mid-gray)]">
                      <th className="p-2 text-left">Region</th>
                      <th className="p-2 text-right">UAS</th>
                      <th className="p-2 text-right">Coverage</th>
                      <th className="p-2 text-right">Data Quality</th>
                      <th className="p-2 text-left">Top Gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRegions.map((region) => (
                      <tr
                        key={region.regionCode}
                        className={[
                          'cursor-pointer border-b border-[var(--light-gray)]',
                          selectedRegionCode === region.regionCode ? 'bg-[var(--light-blue)]' : 'hover:bg-[var(--pale-blue)]',
                        ].join(' ')}
                        onClick={() => {
                          onSelectRegion(region.regionCode);
                          setActiveTab('geographic-drilldown');
                        }}
                      >
                        <td className="p-2 text-sm font-medium text-[var(--black)]">{region.regionName}</td>
                        <td className="p-2 text-right text-sm font-semibold text-[var(--deep-yellow)]">{region.underservedScore.toFixed(1)}</td>
                        <td className="p-2 text-right text-sm text-[var(--black)]">{region.starCoverage}%</td>
                        <td className="p-2 text-right text-sm text-[var(--black)]">{region.dataQuality}%</td>
                        <td className="p-2 text-xs text-[var(--mid-gray)]">{region.topGap}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4 xl:col-span-3">
              <h3 className="text-sm font-semibold text-[var(--navy-blue)]">Selected Scope Summary</h3>
              {!selectedRegion && (
                <div className="mt-3 rounded-lg border border-[var(--light-gray)] bg-[var(--pale-blue)] p-3 text-sm text-[var(--mid-gray)]">
                  No region selected. Choose a region from the map or ranking table to activate division, cluster, score driver, and confidence drilldown panels.
                </div>
              )}
              {selectedRegion && (
                <div className="mt-3 space-y-2">
                  <div className="rounded-lg border border-[var(--light-gray)] bg-[var(--pale-blue)] p-3">
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--mid-gray)]">Region</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--navy-blue)]">{selectedRegion.regionName}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--light-gray)] bg-[var(--pale-blue)] p-3">
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--mid-gray)]">Underserved Score</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--deep-yellow)]">{selectedRegion.underservedScore.toFixed(1)}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--light-gray)] bg-[var(--pale-blue)] p-3">
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--mid-gray)]">Data Confidence</p>
                    <div className="mt-2"><StatusBadge status={selectedRegion.confidence === 'high' ? 'validated' : selectedRegion.confidence === 'low' ? 'flagged' : 'pending'} label={`${selectedRegion.confidence} confidence`} /></div>
                  </div>
                </div>
              )}
            </article>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
              <h3 className="text-sm font-semibold text-[var(--navy-blue)]">Cross-Region UAS Comparison</h3>
              <div className="mt-3 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sortedRegions.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--light-gray)" />
                    <XAxis dataKey="regionName" tick={{ fill: 'var(--mid-gray)', fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={72} />
                    <YAxis domain={[0, 10]} tick={{ fill: 'var(--mid-gray)', fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="underservedScore" fill="var(--deep-yellow)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
            <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
              <h3 className="text-sm font-semibold text-[var(--navy-blue)]">Coverage and Evidence Quality Comparison</h3>
              <div className="mt-3 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sortedRegions.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--light-gray)" />
                    <XAxis dataKey="regionName" tick={{ fill: 'var(--mid-gray)', fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={72} />
                    <YAxis domain={[0, 100]} tick={{ fill: 'var(--mid-gray)', fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="starCoverage" fill="var(--medium-blue)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="dataQuality" fill="var(--soft-blue)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </div>
        </TabsContent>

        <TabsContent value="geographic-drilldown" className="space-y-4">
          <div className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-[0.08em] text-[var(--mid-gray)]" htmlFor="drilldown-region">Region</label>
                <select
                  id="drilldown-region"
                  value={selectedRegionCode || ''}
                  onChange={(event) => {
                    if (!event.target.value) {
                      onClearRegion();
                      return;
                    }
                    onSelectRegion(event.target.value);
                  }}
                  className="h-10 w-full rounded-lg border border-[var(--light-gray)] bg-white px-3 text-sm"
                >
                  <option value="">Select region</option>
                  {sortedRegions.map((region) => (
                    <option key={region.regionCode} value={region.regionCode}>{region.regionName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-[0.08em] text-[var(--mid-gray)]" htmlFor="drilldown-division">Division</label>
                <select
                  id="drilldown-division"
                  value={selectedDivision || ''}
                  disabled={!selectedRegion}
                  onChange={(event) => onSelectDivision(event.target.value || null)}
                  className="h-10 w-full rounded-lg border border-[var(--light-gray)] bg-white px-3 text-sm disabled:bg-[var(--pale-blue)]"
                >
                  <option value="">Select division</option>
                  {data.divisions.map((division) => (
                    <option key={division.name} value={division.name}>{division.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-[0.08em] text-[var(--mid-gray)]" htmlFor="drilldown-cluster">Cluster</label>
                <select
                  id="drilldown-cluster"
                  value={selectedCluster || ''}
                  disabled={!selectedRegion || !selectedDivision}
                  onChange={(event) => onSelectCluster(event.target.value || null)}
                  className="h-10 w-full rounded-lg border border-[var(--light-gray)] bg-white px-3 text-sm disabled:bg-[var(--pale-blue)]"
                >
                  <option value="">Select cluster</option>
                  {filteredClusters.map((cluster) => (
                    <option key={cluster.name} value={cluster.name}>{cluster.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {!selectedRegion && (
            <EmptyState title="Region Selection Required" description="Geographic drilldown activates after selecting a region from National Overview or the region selector above." />
          )}

          {selectedRegion && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4 xl:col-span-3">
                <h3 className="text-sm font-semibold text-[var(--navy-blue)]">Regional Profile</h3>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="rounded-lg border border-[var(--light-gray)] bg-[var(--pale-blue)] p-3">
                    <p className="text-xs text-[var(--mid-gray)]">Region</p>
                    <p className="font-semibold text-[var(--navy-blue)]">{selectedRegion.regionName}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--light-gray)] bg-[var(--pale-blue)] p-3">
                    <p className="text-xs text-[var(--mid-gray)]">Teachers in Scope</p>
                    <p className="font-semibold text-[var(--black)]">{selectedRegion.teacherPopulation.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--light-gray)] bg-[var(--pale-blue)] p-3">
                    <p className="text-xs text-[var(--mid-gray)]">Coverage / UAS</p>
                    <p className="font-semibold text-[var(--black)]">{selectedRegion.starCoverage}% / {selectedRegion.underservedScore.toFixed(1)}</p>
                  </div>
                </div>
              </article>

              <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4 xl:col-span-5">
                <h3 className="text-sm font-semibold text-[var(--navy-blue)]">Division Analysis</h3>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[560px]">
                    <thead>
                      <tr className="border-b border-[var(--light-gray)] text-xs uppercase tracking-[0.08em] text-[var(--mid-gray)]">
                        <th className="p-2 text-left">Division</th>
                        <th className="p-2 text-right">Teachers</th>
                        <th className="p-2 text-right">Coverage</th>
                        <th className="p-2 text-right">UAS</th>
                        <th className="p-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.divisions.map((division: DivisionVm) => (
                        <tr
                          key={division.name}
                          className={[
                            'cursor-pointer border-b border-[var(--light-gray)]',
                            selectedDivision === division.name ? 'bg-[var(--light-blue)]' : 'hover:bg-[var(--pale-blue)]',
                          ].join(' ')}
                          onClick={() => onSelectDivision(division.name)}
                        >
                          <td className="p-2 text-sm font-medium text-[var(--black)]">{division.name}</td>
                          <td className="p-2 text-right text-sm text-[var(--black)]">{division.population.toLocaleString()}</td>
                          <td className="p-2 text-right text-sm text-[var(--black)]">{division.coverage}%</td>
                          <td className="p-2 text-right text-sm font-semibold text-[var(--deep-yellow)]">{division.score.toFixed(1)}</td>
                          <td className="p-2 text-center"><StatusBadge status={division.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4 xl:col-span-4">
                <h3 className="text-sm font-semibold text-[var(--navy-blue)]">Cluster Analysis</h3>
                {!selectedDivisionRecord && (
                  <p className="mt-3 text-sm text-[var(--mid-gray)]">Select a division to view cluster-level diagnostics.</p>
                )}
                {selectedDivisionRecord && (
                  <div className="mt-3 max-h-[320px] space-y-2 overflow-auto">
                    {filteredClusters.map((cluster) => (
                      <button
                        key={cluster.name}
                        type="button"
                        onClick={() => onSelectCluster(cluster.name)}
                        className={[
                          'w-full rounded-lg border p-3 text-left',
                          selectedCluster === cluster.name ? 'border-[var(--medium-blue)] bg-[var(--light-blue)]' : 'border-[var(--light-gray)] bg-[var(--pale-blue)]',
                        ].join(' ')}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-[var(--navy-blue)]">{getClusterShortLabel(cluster.name)}</p>
                          <StatusBadge status={cluster.priority} />
                        </div>
                        <p className="mt-1 text-xs text-[var(--mid-gray)]">{cluster.schools} schools • {cluster.teachers} teachers • {cluster.coverage}% coverage</p>
                      </button>
                    ))}
                  </div>
                )}
              </article>
            </div>
          )}
        </TabsContent>

        <TabsContent value="score-decomposition" className="space-y-4">
          {!selectedRegion || !data.regionData ? (
            <EmptyState title="Regional Score Context Required" description="Select a region to inspect score decomposition, contributing factors, and benchmark position." />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.1em] text-[var(--mid-gray)]">Selected Region UAS</p>
                  <p className="mt-2 text-5xl font-semibold text-[var(--deep-yellow)]">{data.regionData.underservedScore.toFixed(1)}</p>
                  <p className="text-sm text-[var(--mid-gray)]">{selectedRegion.regionName}</p>
                  <div className="mt-4 space-y-2">
                    {data.gapFactors.slice(0, 3).map((factor) => (
                      <div key={factor.id} className="rounded-lg border border-[var(--light-gray)] bg-[var(--pale-blue)] p-3">
                        <p className="text-sm font-semibold text-[var(--navy-blue)]">{factor.factor}</p>
                        <p className="text-xs text-[var(--mid-gray)]">Contribution {factor.contribution}% • {factor.source || 'Regional analytics source'}</p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
                  <h3 className="text-sm font-semibold text-[var(--navy-blue)]">Top Contributing Signals</h3>
                  <div className="mt-3 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.gapFactors.slice(0, 6)} layout="vertical" margin={{ left: 8, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--light-gray)" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--mid-gray)', fontSize: 11 }} />
                        <YAxis type="category" dataKey="factor" width={170} tick={{ fill: 'var(--black)', fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="contribution" fill="var(--medium-blue)" radius={[6, 6, 6, 6]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </article>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
                  <h3 className="text-sm font-semibold text-[var(--navy-blue)]">Factor Weight Decomposition</h3>
                  <div className="mt-3 space-y-2">
                    {data.scoreFactors.map((factor) => (
                      <div key={factor.factor} className="rounded-lg border border-[var(--light-gray)] bg-[var(--pale-blue)] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[var(--navy-blue)]">{factor.factor}</p>
                            <p className="text-xs text-[var(--mid-gray)]">Weight {factor.weight}% • Score {factor.score.toFixed(1)}</p>
                          </div>
                          <StatusBadge status={factor.impact === 'high' ? 'high' : 'moderate'} label={`${factor.impact} impact`} />
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-[var(--light-gray)]">
                          <div className="h-2 rounded-full bg-[var(--medium-blue)]" style={{ width: `${Math.min(100, factor.score * 10)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
                  <h3 className="text-sm font-semibold text-[var(--navy-blue)]">Benchmark Comparison</h3>
                  <div className="mt-3 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={scoreBenchmarkData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--light-gray)" />
                        <XAxis dataKey="label" tick={{ fill: 'var(--mid-gray)', fontSize: 11 }} />
                        <YAxis domain={[0, 10]} tick={{ fill: 'var(--mid-gray)', fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="score" fill="var(--deep-yellow)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </article>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="data-confidence" className="space-y-4">
          {!selectedRegion ? (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.1em] text-[var(--mid-gray)]">Average Data Quality</p>
                  <p className="mt-2 text-3xl font-semibold text-[var(--medium-blue)]">{data.nationalSummary.averageDataQuality}%</p>
                </article>
                <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.1em] text-[var(--mid-gray)]">High-Confidence Regions</p>
                  <p className="mt-2 text-3xl font-semibold text-[var(--navy-blue)]">{data.regions.filter((region) => region.confidence === 'high').length}</p>
                </article>
                <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.1em] text-[var(--mid-gray)]">Low-Confidence Regions</p>
                  <p className="mt-2 text-3xl font-semibold text-[var(--deep-yellow)]">{data.regions.filter((region) => region.confidence === 'low').length}</p>
                </article>
              </div>
              <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
                <h3 className="text-sm font-semibold text-[var(--navy-blue)]">Regional Evidence Quality Matrix</h3>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[720px]">
                    <thead>
                      <tr className="border-b border-[var(--light-gray)] text-xs uppercase tracking-[0.08em] text-[var(--mid-gray)]">
                        <th className="p-2 text-left">Region</th>
                        <th className="p-2 text-right">Data Quality</th>
                        <th className="p-2 text-right">Coverage</th>
                        <th className="p-2 text-right">UAS</th>
                        <th className="p-2 text-center">Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRegions.map((region) => (
                        <tr key={`confidence-${region.regionCode}`} className="border-b border-[var(--light-gray)] hover:bg-[var(--pale-blue)]">
                          <td className="p-2 text-sm font-medium text-[var(--black)]">{region.regionName}</td>
                          <td className="p-2 text-right text-sm text-[var(--black)]">{region.dataQuality}%</td>
                          <td className="p-2 text-right text-sm text-[var(--black)]">{region.starCoverage}%</td>
                          <td className="p-2 text-right text-sm text-[var(--deep-yellow)]">{region.underservedScore.toFixed(1)}</td>
                          <td className="p-2 text-center"><StatusBadge status={region.confidence === 'high' ? 'validated' : region.confidence === 'low' ? 'flagged' : 'pending'} label={`${region.confidence}`} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4 text-center">
                  <p className="text-xs uppercase tracking-[0.1em] text-[var(--mid-gray)]">Completeness</p>
                  <p className="mt-2 text-3xl font-semibold text-[var(--medium-blue)]">{qualityAverages.completeness}%</p>
                </article>
                <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4 text-center">
                  <p className="text-xs uppercase tracking-[0.1em] text-[var(--mid-gray)]">Accuracy</p>
                  <p className="mt-2 text-3xl font-semibold text-[var(--medium-blue)]">{qualityAverages.accuracy}%</p>
                </article>
                <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4 text-center">
                  <p className="text-xs uppercase tracking-[0.1em] text-[var(--mid-gray)]">Timeliness</p>
                  <p className="mt-2 text-3xl font-semibold text-[var(--medium-blue)]">{qualityAverages.timeliness}%</p>
                </article>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
                  <h3 className="text-sm font-semibold text-[var(--navy-blue)]">Source-Level Data Confidence</h3>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[640px]">
                      <thead>
                        <tr className="border-b border-[var(--light-gray)] text-xs uppercase tracking-[0.08em] text-[var(--mid-gray)]">
                          <th className="p-2 text-left">Source</th>
                          <th className="p-2 text-center">Completeness</th>
                          <th className="p-2 text-center">Accuracy</th>
                          <th className="p-2 text-center">Timeliness</th>
                          <th className="p-2 text-center">Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.dataQuality.map((item) => (
                          <tr key={item.source} className="border-b border-[var(--light-gray)] hover:bg-[var(--pale-blue)]">
                            <td className="p-2 text-sm text-[var(--black)]">{item.source}</td>
                            <td className="p-2 text-center text-sm text-[var(--black)]">{item.completeness}%</td>
                            <td className="p-2 text-center text-sm text-[var(--black)]">{item.accuracy}%</td>
                            <td className="p-2 text-center text-sm text-[var(--black)]">{item.timeliness}%</td>
                            <td className="p-2 text-center">
                              <StatusBadge status={item.confidence === 'high' ? 'validated' : item.confidence === 'low' ? 'flagged' : 'pending'} label={`${item.confidence}`} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>

                <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
                  <h3 className="text-sm font-semibold text-[var(--navy-blue)]">Evidence Risk Notes</h3>
                  <div className="mt-3 space-y-2 text-sm text-[var(--black)]">
                    <div className="flex items-start gap-2 rounded-md border border-[var(--light-gray)] bg-[var(--pale-blue)] p-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--medium-blue)]" />
                      <p>Data confidence indicators are exposed for each source used in regional prioritization.</p>
                    </div>
                    <div className="flex items-start gap-2 rounded-md border border-[var(--light-gray)] bg-[var(--pale-blue)] p-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-[var(--deep-yellow)]" />
                      <p>Use confidence status and recency context before endorsing final intervention packages.</p>
                    </div>
                    <div className="flex items-start gap-2 rounded-md border border-[var(--light-gray)] bg-[var(--pale-blue)] p-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-[var(--deep-yellow)]" />
                      <p>Low-confidence sources should trigger validation checks in Data Manager before planning approval.</p>
                    </div>
                  </div>
                </article>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="cohort-context">
          {!selectedRegion || data.cohorts.length === 0 ? (
            <EmptyState title="Cohort Context Not Available" description="Select a region to inspect supporting cohort context for planning decisions." />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.1em] text-[var(--mid-gray)]">Teachers in Cohort Scope</p>
                  <p className="mt-2 text-3xl font-semibold text-[var(--navy-blue)]">{cohortTotal.toLocaleString()}</p>
                </article>
                <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.1em] text-[var(--mid-gray)]">High-Support Segment</p>
                  <p className="mt-2 text-3xl font-semibold text-[var(--deep-yellow)]">{data.cohorts.filter((cohort) => cohort.support === 'High').reduce((sum, cohort) => sum + cohort.count, 0).toLocaleString()}</p>
                </article>
                <article className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.1em] text-[var(--mid-gray)]">Tracked Cohorts</p>
                  <p className="mt-2 text-3xl font-semibold text-[var(--medium-blue)]">{data.cohorts.length}</p>
                </article>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {data.cohorts.map((cohort) => (
                  <article key={cohort.name} className="rounded-xl border border-[var(--light-gray)] bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[var(--navy-blue)]">{cohort.name}</h3>
                      <StatusBadge status={cohort.confidence === 'high' ? 'validated' : cohort.confidence === 'low' ? 'flagged' : 'pending'} label={`${cohort.confidence}`} />
                    </div>
                    <p className="mt-2 text-sm text-[var(--black)]">{cohort.count.toLocaleString()} teachers</p>
                    <p className="mt-1 text-xs text-[var(--mid-gray)]">Support: <strong className="text-[var(--black)]">{cohort.support}</strong></p>
                    <p className="mt-1 text-xs text-[var(--mid-gray)]">Intervention: <strong className="text-[var(--black)]">{cohort.intervention}</strong></p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {selectedRegion && selectedDivisionRecord && selectedClusterRecord && (
        <aside className="rounded-xl border border-[var(--light-gray)] bg-white p-4 text-sm text-[var(--black)]">
          <p className="font-semibold text-[var(--navy-blue)]">Selected Scope State</p>
          <p className="mt-1 text-[var(--mid-gray)]">{selectedRegion.regionName} / {selectedDivisionRecord.name} / {selectedClusterRecord.name}</p>
        </aside>
      )}
    </section>
  );
}
