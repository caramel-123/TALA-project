export type MapScoreTier = 'critical' | 'high' | 'moderate' | 'low' | 'unknown';

export const MAP_TIER_COLORS: Record<MapScoreTier, string> = {
  critical: '#1B3A5C',
  high: '#2E6DA4',
  moderate: '#A8C8E8',
  low: '#D7E8F7',
  unknown: '#E6EAEE',
};

export function scoreToTier(score: number | null | undefined): MapScoreTier {
  if (typeof score !== 'number' || Number.isNaN(score)) {
    return 'unknown';
  }

  if (score > 8) {
    return 'critical';
  }

  if (score > 7) {
    return 'high';
  }

  if (score > 6) {
    return 'moderate';
  }

  return 'low';
}

export function getTierLabel(tier: MapScoreTier): string {
  if (tier === 'critical') {
    return 'Critical';
  }

  if (tier === 'high') {
    return 'High';
  }

  if (tier === 'moderate') {
    return 'Moderate';
  }

  if (tier === 'low') {
    return 'Low';
  }

  return 'No score';
}
