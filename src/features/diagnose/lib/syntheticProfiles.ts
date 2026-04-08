import type {
  ConfidenceLevel,
  DataConfidenceVm,
  GapFactorVm,
  ValidationStatus,
} from '../../shared/types/view-models';

type RegionConfidenceProfile = {
  completeness: number;
  timeliness: number;
  validationStatus: ValidationStatus;
  conflictFlags: number;
  sourceCount: number;
  lastRefresh: string;
  reliabilityNote: string;
};

type GapFactorSeedInput = {
  regionCode: string;
  regionName: string;
  topGap: string;
  underservedScore: number;
  starCoverage: number;
  dataQuality: number;
  confidence: ConfidenceLevel;
};

type GapFactorTemplate = {
  id: string;
  factor: string;
  source: string;
  narrative: string;
  base: number;
  benchmarkText: string;
};

const gapFactorTemplates: GapFactorTemplate[] = [
  {
    id: 'star-coverage-gap',
    factor: 'STAR Coverage Gap',
    source: 'Training participation registry and estimated S&M teacher population model',
    narrative: 'Low STAR participation relative to estimated science and mathematics teacher population.',
    base: 72,
    benchmarkText: 'Coverage below national benchmark',
  },
  {
    id: 'subject-specialist-shortage',
    factor: 'Subject Specialist Shortage',
    source: 'Teacher specialization registry and school staffing submissions',
    narrative: 'High out-of-field teaching assignments in mathematics and science subjects.',
    base: 68,
    benchmarkText: 'Specialist ratio below target',
  },
  {
    id: 'specialization-mismatch',
    factor: 'Specialization Mismatch',
    source: 'Teacher licensure, assignment, and subject load reconciliation',
    narrative: 'Mismatch between assigned teaching load and recorded specialization clusters.',
    base: 64,
    benchmarkText: 'Mismatch ratio above peer median',
  },
  {
    id: 'mentoring-trainer-access',
    factor: 'Mentoring and Trainer Access',
    source: 'TEI mentor registry, STAR facilitator deployment logs',
    narrative: 'Limited access to TEI mentors within practical travel distance for coaching cycles.',
    base: 58,
    benchmarkText: 'Mentor availability below threshold',
  },
  {
    id: 'resource-infrastructure-gap',
    factor: 'Resource and Infrastructure Gap',
    source: 'School infrastructure inventory and laboratory readiness reports',
    narrative: 'Laboratory and equipment availability below regional benchmark for delivery-ready schools.',
    base: 61,
    benchmarkText: 'Infrastructure readiness lag',
  },
  {
    id: 'connectivity-delivery-constraints',
    factor: 'Connectivity and Delivery Constraints',
    source: 'Connectivity monitoring and blended delivery readiness checks',
    narrative: 'Intermittent connectivity affecting blended delivery continuity and reporting cadence.',
    base: 55,
    benchmarkText: 'Blended readiness below target',
  },
  {
    id: 'geographic-isolation',
    factor: 'Geographic Isolation',
    source: 'Travel impedance index and school geospatial remoteness model',
    narrative: 'Island or mountain travel constraints increasing delivery complexity and response lead time.',
    base: 62,
    benchmarkText: 'Travel burden above median',
  },
  {
    id: 'staffing-vulnerability',
    factor: 'Staffing Vulnerability',
    source: 'Workforce age profile, attrition records, and vacancy monitoring',
    narrative: 'High early-career concentration and turnover risk reducing continuity of instructional delivery.',
    base: 53,
    benchmarkText: 'Attrition and vacancy risk elevated',
  },
  {
    id: 'learning-outcome-proxies',
    factor: 'Learning Outcome Proxies',
    source: 'Assessment proxy indicators and cross-year trend synthesis',
    narrative: 'Below-benchmark science and mathematics outcome proxies in comparable cohorts.',
    base: 57,
    benchmarkText: 'Outcome trend under benchmark',
  },
];

const explicitRegionProfiles: Record<string, RegionConfidenceProfile> = {
  '130000000': { completeness: 97, timeliness: 94, validationStatus: 'validated', conflictFlags: 1, sourceCount: 7, lastRefresh: '2026-04-07', reliabilityNote: 'Stable source convergence and low variance across teacher and school datasets.' },
  '010000000': { completeness: 90, timeliness: 86, validationStatus: 'validated', conflictFlags: 2, sourceCount: 6, lastRefresh: '2026-04-06', reliabilityNote: 'Good completeness with minor schedule lag on school infrastructure updates.' },
  '020000000': { completeness: 88, timeliness: 84, validationStatus: 'pending', conflictFlags: 3, sourceCount: 6, lastRefresh: '2026-04-05', reliabilityNote: 'Moderate timeliness due to asynchronous uploads from remote divisions.' },
  '140000000': { completeness: 84, timeliness: 79, validationStatus: 'pending', conflictFlags: 4, sourceCount: 5, lastRefresh: '2026-04-04', reliabilityNote: 'Geographic remoteness introduces periodic delay in supporting source synchronization.' },
  '030000000': { completeness: 93, timeliness: 89, validationStatus: 'validated', conflictFlags: 2, sourceCount: 7, lastRefresh: '2026-04-07', reliabilityNote: 'Strong provenance consistency with low unresolved validation exceptions.' },
  '040000000': { completeness: 92, timeliness: 88, validationStatus: 'validated', conflictFlags: 2, sourceCount: 7, lastRefresh: '2026-04-07', reliabilityNote: 'High-confidence records with minor reconciliation gaps in specialized assignment coding.' },
  '170000000': { completeness: 82, timeliness: 76, validationStatus: 'pending', conflictFlags: 4, sourceCount: 5, lastRefresh: '2026-04-03', reliabilityNote: 'Archipelagic logistics increase reporting delay and cross-source mismatch handling time.' },
  '050000000': { completeness: 83, timeliness: 78, validationStatus: 'pending', conflictFlags: 5, sourceCount: 6, lastRefresh: '2026-04-04', reliabilityNote: 'Coverage-intensive areas show moderate evidence lag during quarterly consolidation windows.' },
  '060000000': { completeness: 89, timeliness: 85, validationStatus: 'validated', conflictFlags: 3, sourceCount: 6, lastRefresh: '2026-04-06', reliabilityNote: 'Balanced source quality with manageable conflicts concentrated in infrastructure records.' },
  '070000000': { completeness: 95, timeliness: 91, validationStatus: 'validated', conflictFlags: 1, sourceCount: 7, lastRefresh: '2026-04-07', reliabilityNote: 'Consistently validated records with strong recency across core evidence streams.' },
  '080000000': { completeness: 81, timeliness: 75, validationStatus: 'pending', conflictFlags: 5, sourceCount: 5, lastRefresh: '2026-04-03', reliabilityNote: 'Moderate confidence due to delayed refreshes and localized consistency exceptions.' },
  '090000000': { completeness: 86, timeliness: 82, validationStatus: 'pending', conflictFlags: 3, sourceCount: 6, lastRefresh: '2026-04-05', reliabilityNote: 'Evidence quality is serviceable but requires continued conflict resolution for planning use.' },
  '100000000': { completeness: 88, timeliness: 84, validationStatus: 'validated', conflictFlags: 3, sourceCount: 6, lastRefresh: '2026-04-06', reliabilityNote: 'Reliable baseline with moderate discrepancies in training participation timelines.' },
  '110000000': { completeness: 91, timeliness: 87, validationStatus: 'validated', conflictFlags: 2, sourceCount: 6, lastRefresh: '2026-04-06', reliabilityNote: 'Strong confidence profile supported by regular refresh cadence and low conflict volume.' },
  '120000000': { completeness: 79, timeliness: 73, validationStatus: 'flagged', conflictFlags: 6, sourceCount: 5, lastRefresh: '2026-04-02', reliabilityNote: 'High-priority records require additional reconciliation due to lagging infrastructure updates.' },
  '160000000': { completeness: 80, timeliness: 74, validationStatus: 'pending', conflictFlags: 5, sourceCount: 5, lastRefresh: '2026-04-03', reliabilityNote: 'Coverage-sensitive zones exhibit slower refresh and elevated consistency checks.' },
  '190000000': { completeness: 74, timeliness: 68, validationStatus: 'flagged', conflictFlags: 8, sourceCount: 4, lastRefresh: '2026-04-01', reliabilityNote: 'Low confidence due to sparse source coverage and unresolved cross-source conflicts.' },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function deriveFallbackProfile(
  dataQuality: number,
  confidence: ConfidenceLevel,
  lastRefresh: string,
): RegionConfidenceProfile {
  const completeness = clamp(Math.round(dataQuality + 3), 65, 98);
  const timeliness = clamp(Math.round(dataQuality - 4), 58, 96);
  const validationStatus: ValidationStatus = confidence === 'high' ? 'validated' : confidence === 'low' ? 'flagged' : 'pending';
  const conflictFlags = confidence === 'high' ? 2 : confidence === 'low' ? 7 : 4;

  return {
    completeness,
    timeliness,
    validationStatus,
    conflictFlags,
    sourceCount: confidence === 'low' ? 4 : 6,
    lastRefresh,
    reliabilityNote: confidence === 'high'
      ? 'Reliable dataset blend with strong cross-source agreement.'
      : confidence === 'low'
        ? 'Caution advised due to limited source depth and unresolved conflicts.'
        : 'Moderate confidence; validate supporting evidence before final prioritization.',
  };
}

export function getRegionConfidenceProfile(
  regionCode: string,
  dataQuality: number,
  confidence: ConfidenceLevel,
  fallbackLastRefresh: string,
): RegionConfidenceProfile {
  return explicitRegionProfiles[regionCode]
    || deriveFallbackProfile(dataQuality, confidence, fallbackLastRefresh);
}

function computeFactorContribution(
  template: GapFactorTemplate,
  input: GapFactorSeedInput,
): number {
  const coverageGap = 100 - input.starCoverage;
  const severity = input.underservedScore * 7.8;
  const qualityAdjustment = (100 - input.dataQuality) * 0.22;
  const topGapBoost = input.topGap.toLowerCase().includes(template.factor.toLowerCase().split(' ')[0]) ? 9 : 0;
  const regionalAdjustment = input.regionName.toLowerCase().includes('barmm') || input.regionName.toLowerCase().includes('mimaropa')
    ? (template.id === 'geographic-isolation' || template.id === 'connectivity-delivery-constraints' ? 6 : 0)
    : 0;

  const raw = (template.base * 0.42) + (severity * 0.34) + (coverageGap * 0.24) + qualityAdjustment + topGapBoost + regionalAdjustment;
  return clamp(Math.round(raw), 18, 96);
}

function recencyWindow(contribution: number): string {
  if (contribution >= 80) {
    return '21 days';
  }
  if (contribution >= 65) {
    return '35 days';
  }
  if (contribution >= 50) {
    return '49 days';
  }
  return '63 days';
}

export function buildRegionalGapFactors(input: GapFactorSeedInput): GapFactorVm[] {
  return gapFactorTemplates.map((template) => {
    const contribution = computeFactorContribution(template, input);

    return {
      id: template.id,
      factor: template.factor,
      contribution,
      confidence: input.confidence,
      definition: `${template.narrative} ${template.benchmarkText}: ${contribution >= 70 ? 'high variance' : contribution >= 50 ? 'moderate variance' : 'contained variance'}.`,
      source: template.source,
      recency: recencyWindow(contribution),
    };
  });
}

export function buildRegionSourceConfidence(
  regionCode: string,
  confidence: ConfidenceLevel,
  dataQuality: number,
  lastRefresh: string,
): DataConfidenceVm[] {
  const profile = getRegionConfidenceProfile(regionCode, dataQuality, confidence, lastRefresh);

  const baseSources = [
    { source: 'Teacher Registry', offset: 4, conflict: Math.max(0, profile.conflictFlags - 2) },
    { source: 'School Directory', offset: 2, conflict: Math.max(0, profile.conflictFlags - 1) },
    { source: 'STAR Training Attendance', offset: -2, conflict: profile.conflictFlags },
    { source: 'Infrastructure Inventory', offset: -4, conflict: profile.conflictFlags + 1 },
    { source: 'Connectivity and Delivery Logs', offset: -6, conflict: profile.conflictFlags + 1 },
  ];

  return baseSources.map((item, index) => {
    const completeness = clamp(profile.completeness + item.offset, 45, 99);
    const timeliness = clamp(profile.timeliness + item.offset, 40, 98);
    const accuracy = clamp(dataQuality + item.offset, 45, 98);

    const rowConfidence: ConfidenceLevel = (completeness + timeliness + accuracy) / 3 >= 88
      ? 'high'
      : (completeness + timeliness + accuracy) / 3 >= 74
        ? 'moderate'
        : 'low';

    const validationStatus: ValidationStatus = rowConfidence === 'high'
      ? 'validated'
      : rowConfidence === 'low'
        ? 'flagged'
        : 'pending';

    return {
      source: item.source,
      completeness,
      accuracy,
      timeliness,
      confidence: rowConfidence,
      validationStatus,
      conflictFlags: clamp(item.conflict + (index % 2), 0, 12),
      lastRefresh,
    };
  });
}
