export type ConfidenceLevel = 'high' | 'moderate' | 'low';
export type ValidationStatus = 'validated' | 'pending' | 'flagged';
export type SourceStatus = 'pending' | 'validated' | 'flagged' | 'rejected';

export type KpiCardVm = {
  label: string;
  value: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  accentColor: string;
};

export type PriorityRegionVm = {
  region: string;
  score: number;
  gap: string;
  intervention: string;
  confidence: ConfidenceLevel;
};

export type TrainingReachVm = {
  id: string;
  program: string;
  reach: number;
};

export type SpecializationVm = {
  id: string;
  name: string;
  value: number;
  color: string;
};

export type ParticipationTrendVm = {
  id: string;
  month: string;
  teachers: number;
};

export type RegionalProfileSummaryVm = {
  regionCode: string;
  region: string;
  teacherPopulation: number;
  starCoverage: number;
  underservedScore: number;
  dataQuality: number;
  highPriorityDivisions: number;
};

export type OverviewDashboardVm = {
  lastUpdated: string;
  dataQuality: number;
  kpiData: KpiCardVm[];
  priorityRegions: PriorityRegionVm[];
  trainingReachData: TrainingReachVm[];
  specializationData: SpecializationVm[];
  participationTrend: ParticipationTrendVm[];
};

export type DiagnoseSidebarItemVm = {
  id: string;
  label: string;
  active: boolean;
};

export type DiagnoseScopeLevel = 'national' | 'region' | 'division' | 'cluster';

export type DiagnoseRegionSummaryVm = {
  regionCode: string;
  regionName: string;
  teacherPopulation: number;
  starCoverage: number;
  underservedScore: number;
  dataQuality: number;
  completeness?: number;
  timeliness?: number;
  validationStatus?: ValidationStatus;
  conflictFlags?: number;
  sourceCount?: number;
  lastRefresh?: string;
  reliabilityNote?: string;
  topGap: string;
  priority: 'critical' | 'high' | 'moderate' | 'low';
  confidence: ConfidenceLevel;
};

export type DiagnoseNationalSummaryVm = {
  regionCount: number;
  teacherPopulation: number;
  nationalScore: number;
  averageCoverage: number;
  averageDataQuality: number;
  highPriorityRegions: number;
  lastUpdated: string;
};

export type RegionalProfileVm = {
  name: string;
  teacherPopulation: number;
  starCoverage: number;
  underservedScore: number;
  dataQuality: number;
  lastUpdated: string;
};

export type GapFactorVm = {
  id: string;
  factor: string;
  contribution: number;
  confidence: ConfidenceLevel;
  definition?: string;
  source?: string;
  recency?: string;
};

export type DivisionVm = {
  name: string;
  population: number;
  coverage: number;
  gap: string;
  score: number;
  status: 'critical' | 'high' | 'moderate' | 'low';
};

export type CohortVm = {
  name: string;
  count: number;
  support: 'High' | 'Moderate' | 'Low';
  intervention: string;
  confidence: ConfidenceLevel;
};

export type ClusterVm = {
  name: string;
  divisionName?: string;
  schools: number;
  teachers: number;
  coverage: number;
  priority: 'critical' | 'high' | 'moderate' | 'low';
};

export type ScoreFactorVm = {
  factor: string;
  weight: number;
  score: number;
  impact: 'high' | 'moderate';
};

export type DataConfidenceVm = {
  source: string;
  completeness: number;
  accuracy: number;
  timeliness: number;
  confidence: ConfidenceLevel;
  validationStatus?: ValidationStatus;
  conflictFlags?: number;
  lastRefresh?: string;
};

export type DiagnosePageVm = {
  sidebarItems: DiagnoseSidebarItemVm[];
  nationalSummary: DiagnoseNationalSummaryVm;
  regions: DiagnoseRegionSummaryVm[];
  regionData: RegionalProfileVm | null;
  gapFactors: GapFactorVm[];
  divisions: DivisionVm[];
  cohorts: CohortVm[];
  clusters: ClusterVm[];
  scoreFactors: ScoreFactorVm[];
  dataQuality: DataConfidenceVm[];
};

export type RecommendationVm = {
  id: string;
  region: string;
  score: number;
  gap: string;
  interventions: string[];
  status: SourceStatus;
  confidence: 'high' | 'moderate';
  deliveryMethod: string;
  resourceRequirement: string;
};

export type AdvisePageVm = {
  recommendations: RecommendationVm[];
  interventionPortfolio: string[];
};

export type DataSourceVm = {
  name: string;
  type: string;
  region: string;
  records: number;
  lastUpdated: string;
  completeness: number;
  status: SourceStatus;
};

export type ValidationIssueVm = {
  type: string;
  count: number;
  severity: ConfidenceLevel;
};

export type RegionalDataQualityVm = {
  region: string;
  score: number;
  completeness: number;
  recency: string;
};

export type IngestionBatchVm = {
  id: string;
  sourceName: string;
  fileName: string;
  uploadStatus: SourceStatus;
  rowCount: number;
  startedAt: string;
  completedAt: string;
};

export type DataManagerPageVm = {
  dataSources: DataSourceVm[];
  validationIssues: ValidationIssueVm[];
  dataQualityByRegion: RegionalDataQualityVm[];
};
