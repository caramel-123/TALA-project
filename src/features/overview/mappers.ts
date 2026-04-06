import type { KpiCardVm } from '../shared/types/view-models';
import type {
  OverviewKpiComputationInput,
  OverviewKpiComputationOutput,
  OverviewKpisVm,
} from './types';

function toSafePercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function computeFieldCompleteness<T extends Record<string, unknown>>(
  rows: T[],
  requiredKeys: Array<keyof T>,
): number {
  if (rows.length === 0 || requiredKeys.length === 0) {
    return 0;
  }

  const total = rows.length * requiredKeys.length;
  let filled = 0;

  rows.forEach((row) => {
    requiredKeys.forEach((key) => {
      const value = row[key];
      if (value === null || value === undefined) {
        return;
      }

      if (typeof value === 'string') {
        if (value.trim().length > 0) {
          filled += 1;
        }
        return;
      }

      filled += 1;
    });
  });

  return (filled / total) * 100;
}

export function buildOverviewKpis(input: OverviewKpiComputationInput): OverviewKpiComputationOutput {
  const vm: OverviewKpisVm = {
    activeRegions: input.activeRegions,
    activeRegionsDeltaText: `${input.activeRegions}/${input.totalRegions} regions with planning data`,
    dataCompleteness: toSafePercent(input.dataCompleteness),
    dataCompletenessDeltaText: `${input.totalTeachers.toLocaleString()} teacher rows evaluated`,
    highPriorityDivisions: input.highPriorityDivisions,
    highPriorityDivisionsDeltaText: 'Priority score threshold >= 70',
    teachersProfiled: input.teachersProfiled,
    teachersProfiledDeltaText: `${input.totalTeachers.toLocaleString()} total teacher records`,
    lastUpdatedText: 'No updates yet',
    dataQualityText: '0%',
  };

  const cards: KpiCardVm[] = [
    {
      label: 'Active Regions',
      value: String(vm.activeRegions),
      trend: 'up',
      trendValue: vm.activeRegionsDeltaText,
      accentColor: '#2E6DA4',
    },
    {
      label: 'Data Completeness',
      value: `${vm.dataCompleteness}%`,
      trend: 'up',
      trendValue: vm.dataCompletenessDeltaText,
      accentColor: '#E8C94F',
    },
    {
      label: 'High-Priority Divisions',
      value: String(vm.highPriorityDivisions),
      trend: 'up',
      trendValue: vm.highPriorityDivisionsDeltaText,
      accentColor: '#B8860B',
    },
    {
      label: 'Teachers Profiled',
      value: vm.teachersProfiled.toLocaleString(),
      trend: 'up',
      trendValue: vm.teachersProfiledDeltaText,
      accentColor: '#1B3A5C',
    },
  ];

  return { vm, cards };
}

export function mapOverviewVmToKpiCards(vm: OverviewKpisVm): KpiCardVm[] {
  return [
    {
      label: 'Active Regions',
      value: String(vm.activeRegions),
      trend: 'up',
      trendValue: vm.activeRegionsDeltaText,
      accentColor: '#2E6DA4',
    },
    {
      label: 'Data Completeness',
      value: `${vm.dataCompleteness}%`,
      trend: 'up',
      trendValue: vm.dataCompletenessDeltaText,
      accentColor: '#E8C94F',
    },
    {
      label: 'High-Priority Divisions',
      value: String(vm.highPriorityDivisions),
      trend: 'up',
      trendValue: vm.highPriorityDivisionsDeltaText,
      accentColor: '#B8860B',
    },
    {
      label: 'Teachers Profiled',
      value: vm.teachersProfiled.toLocaleString(),
      trend: 'up',
      trendValue: vm.teachersProfiledDeltaText,
      accentColor: '#1B3A5C',
    },
  ];
}
