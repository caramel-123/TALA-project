import type {
  ClusterVm,
  ConfidenceLevel,
  DataConfidenceVm,
  GapFactorVm,
  ScoreFactorVm,
} from '../../shared/types/view-models';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as UnknownRecord;
}

function toStringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toNumberOrFallback(value: unknown, fallback: number): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeConfidence(value: unknown, fallback: ConfidenceLevel = 'moderate'): ConfidenceLevel {
  const normalized = toStringOrEmpty(value).toLowerCase();

  if (normalized === 'high' || normalized === 'moderate' || normalized === 'low') {
    return normalized;
  }

  return fallback;
}

function normalizeClusterPriority(value: unknown): ClusterVm['priority'] {
  const normalized = toStringOrEmpty(value).toLowerCase();

  if (normalized === 'critical' || normalized === 'high' || normalized === 'moderate' || normalized === 'low') {
    return normalized;
  }

  return 'moderate';
}

function normalizeScoreImpact(value: unknown): ScoreFactorVm['impact'] {
  return toStringOrEmpty(value).toLowerCase() === 'high' ? 'high' : 'moderate';
}

function normalizeClusterName(value: unknown, index: number): string {
  const name = toStringOrEmpty(value);

  if (name) {
    return name;
  }

  return `Unnamed Cluster ${index + 1}`;
}

function toSafeArray<T>(raw: unknown, mapper: (item: unknown, index: number) => T): T[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map(mapper);
}

export function normalizeGapFactors(raw: unknown, fallback: GapFactorVm[]): GapFactorVm[] {
  const normalized = toSafeArray(raw, (item, index): GapFactorVm => {
    const record = asRecord(item);

    if (!record) {
      return {
        id: `gap-factor-${index + 1}`,
        factor: `Gap Factor ${index + 1}`,
        contribution: 0,
        confidence: 'moderate',
      };
    }

    const contribution = clamp(toNumberOrFallback(record.contribution, 0), 0, 100);

    return {
      id: toStringOrEmpty(record.id) || `gap-factor-${index + 1}`,
      factor: toStringOrEmpty(record.factor) || `Gap Factor ${index + 1}`,
      contribution,
      confidence: normalizeConfidence(record.confidence),
      definition: toStringOrEmpty(record.definition) || undefined,
      source: toStringOrEmpty(record.source) || undefined,
      recency: toStringOrEmpty(record.recency) || undefined,
    };
  });

  return normalized.length > 0 ? normalized : fallback;
}

export function normalizeClusters(raw: unknown, fallback: ClusterVm[]): ClusterVm[] {
  const normalized = toSafeArray(raw, (item, index): ClusterVm => {
    const record = asRecord(item);

    if (!record) {
      return {
        name: `Unnamed Cluster ${index + 1}`,
        schools: 0,
        teachers: 0,
        coverage: 0,
        priority: 'moderate',
      };
    }

    return {
      name: normalizeClusterName(record.name, index),
      divisionName: toStringOrEmpty(record.divisionName ?? record.division) || undefined,
      schools: Math.max(0, Math.round(toNumberOrFallback(record.schools, 0))),
      teachers: Math.max(0, Math.round(toNumberOrFallback(record.teachers, 0))),
      coverage: clamp(toNumberOrFallback(record.coverage, 0), 0, 100),
      priority: normalizeClusterPriority(record.priority),
    };
  });

  return normalized.length > 0 ? normalized : fallback;
}

export function normalizeScoreFactors(raw: unknown, fallback: ScoreFactorVm[]): ScoreFactorVm[] {
  const normalized = toSafeArray(raw, (item, index): ScoreFactorVm => {
    const record = asRecord(item);

    if (!record) {
      return {
        factor: `Factor ${index + 1}`,
        weight: 0,
        score: 0,
        impact: 'moderate',
      };
    }

    return {
      factor: toStringOrEmpty(record.factor) || `Factor ${index + 1}`,
      weight: clamp(toNumberOrFallback(record.weight, 0), 0, 100),
      score: clamp(toNumberOrFallback(record.score, 0), 0, 10),
      impact: normalizeScoreImpact(record.impact),
    };
  });

  return normalized.length > 0 ? normalized : fallback;
}

export function normalizeDataConfidence(raw: unknown, fallback: DataConfidenceVm[]): DataConfidenceVm[] {
  const normalized = toSafeArray(raw, (item, index): DataConfidenceVm => {
    const record = asRecord(item);

    if (!record) {
      return {
        source: `Data Source ${index + 1}`,
        completeness: 0,
        accuracy: 0,
        timeliness: 0,
        confidence: 'moderate',
      };
    }

    return {
      source: toStringOrEmpty(record.source) || `Data Source ${index + 1}`,
      completeness: clamp(toNumberOrFallback(record.completeness, 0), 0, 100),
      accuracy: clamp(toNumberOrFallback(record.accuracy, 0), 0, 100),
      timeliness: clamp(toNumberOrFallback(record.timeliness, 0), 0, 100),
      confidence: normalizeConfidence(record.confidence),
    };
  });

  return normalized.length > 0 ? normalized : fallback;
}

export function getClusterShortLabel(clusterName: string): string {
  const safeName = toStringOrEmpty(clusterName);

  if (!safeName) {
    return 'Unnamed Cluster';
  }

  const head = safeName.split('-')[0]?.trim();

  if (head) {
    return head;
  }

  return safeName;
}
