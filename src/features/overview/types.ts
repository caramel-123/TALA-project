import type { KpiCardVm } from '../shared/types/view-models';

export type OverviewKpisVm = {
  activeRegions: number;
  activeRegionsDeltaText: string;
  dataCompleteness: number;
  dataCompletenessDeltaText: string;
  highPriorityDivisions: number;
  highPriorityDivisionsDeltaText: string;
  teachersProfiled: number;
  teachersProfiledDeltaText: string;
  lastUpdatedText: string;
  dataQualityText: string;
};

export type OverviewHeaderMetaVm = {
  lastUpdatedText: string;
  dataQualityText: string;
};

export type OverviewKpiComputationInput = {
  activeRegions: number;
  totalRegions: number;
  dataCompleteness: number;
  highPriorityDivisions: number;
  teachersProfiled: number;
  totalTeachers: number;
};

export type OverviewKpiComputationOutput = {
  vm: OverviewKpisVm;
  cards: KpiCardVm[];
};
