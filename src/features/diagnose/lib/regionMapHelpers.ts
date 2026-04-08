import type {
  ConfidenceLevel,
  DiagnoseRegionSummaryVm,
} from '../../shared/types/view-models';
import { REGION_CODE_BY_GEO_NAME, REGION_NAME_ALIASES_BY_CODE } from './regionNameMap';

type FeatureGeometry = {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
};

type BaseFeature<TProperties> = {
  type: 'Feature';
  properties: TProperties;
  geometry: FeatureGeometry;
};

type BaseFeatureCollection<TFeature> = {
  type: 'FeatureCollection';
  features: TFeature[];
};

export type Adm1FeatureProperties = {
  shapeISO?: string;
  shapeName?: string;
  shapeID?: string;
  shapeGroup?: string;
  shapeType?: string;
  regionCode?: string | null;
  regionLabel?: string;
  uas?: number | null;
  priority?: DiagnoseRegionSummaryVm['priority'] | 'unknown';
  coverageGap?: number | null;
  dataQuality?: number | null;
  confidence?: ConfidenceLevel | 'unknown';
  isMatched?: boolean;
  [key: string]: unknown;
};

export type Adm2FeatureProperties = {
  shapeISO?: string;
  shapeName?: string;
  shapeID?: string;
  shapeGroup?: string;
  shapeType?: string;
  parentRegionCode?: string | null;
  parentRegionLabel?: string;
  subregionLabel?: string;
  score?: number | null;
  priority?: DiagnoseRegionSummaryVm['priority'] | 'unknown';
  confidence?: ConfidenceLevel | 'unknown';
  hasScore?: boolean;
  scoreAvailabilityNote?: string;
  [key: string]: unknown;
};

export type Adm1Feature = BaseFeature<Adm1FeatureProperties>;
export type Adm2Feature = BaseFeature<Adm2FeatureProperties>;

export type Adm1FeatureCollection = BaseFeatureCollection<Adm1Feature>;
export type Adm2FeatureCollection = BaseFeatureCollection<Adm2Feature>;

export type LngLatBoundsLike = [[number, number], [number, number]];

export function normalizeAreaLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/^region\s+[ivxlcdm0-9-]+\s*-\s*/g, '')
    .replace(/\bprovince of\b/g, '')
    .replace(/\bprovince\b/g, '')
    .replace(/\bcity\b/g, '')
    .replace(/\bregion\b/g, '')
    .replace(/\badministrative\b/g, '')
    .replace(/\bautonomous\b/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeRegionLabel(value: string): string {
  return normalizeAreaLabel(value);
}

function buildRegionIndexes(regions: DiagnoseRegionSummaryVm[]) {
  const byCode = new Map<string, DiagnoseRegionSummaryVm>();
  const byNormalizedName = new Map<string, DiagnoseRegionSummaryVm>();

  regions.forEach((region) => {
    byCode.set(region.regionCode, region);

    const candidates = new Set<string>();
    candidates.add(normalizeAreaLabel(region.regionName));

    const stripped = region.regionName.replace(/^Region\s+[IVX0-9-]+\s*-\s+/i, '');
    candidates.add(normalizeAreaLabel(stripped));

    const aliases = REGION_NAME_ALIASES_BY_CODE[region.regionCode] || [];
    aliases.forEach((alias) => candidates.add(normalizeAreaLabel(alias)));

    candidates.forEach((candidate) => {
      if (candidate && !byNormalizedName.has(candidate)) {
        byNormalizedName.set(candidate, region);
      }
    });
  });

  return { byCode, byNormalizedName };
}

function resolveRegionCodeFromShapeName(shapeName: string): string | null {
  const normalized = normalizeAreaLabel(shapeName);

  if (!normalized) {
    return null;
  }

  return REGION_CODE_BY_GEO_NAME[normalized] || null;
}

function getRegionForFeature(
  feature: Adm1Feature,
  byCode: Map<string, DiagnoseRegionSummaryVm>,
  byNormalizedName: Map<string, DiagnoseRegionSummaryVm>,
): DiagnoseRegionSummaryVm | null {
  const shapeName = String(feature.properties.shapeName || '');

  const mappedCode = resolveRegionCodeFromShapeName(shapeName);
  if (mappedCode && byCode.has(mappedCode)) {
    return byCode.get(mappedCode) || null;
  }

  const normalizedShapeName = normalizeAreaLabel(shapeName);
  return byNormalizedName.get(normalizedShapeName) || null;
}

export function buildFeatureCollectionWithMetrics(
  geoJson: Adm1FeatureCollection,
  regions: DiagnoseRegionSummaryVm[],
): Adm1FeatureCollection {
  const { byCode, byNormalizedName } = buildRegionIndexes(regions);

  return {
    type: 'FeatureCollection',
    features: geoJson.features.map((feature) => {
      const matchedRegion = getRegionForFeature(feature, byCode, byNormalizedName);
      const coverageGap = matchedRegion ? Math.max(0, 100 - matchedRegion.starCoverage) : null;

      return {
        ...feature,
        properties: {
          ...feature.properties,
          regionCode: matchedRegion?.regionCode || null,
          regionLabel: matchedRegion?.regionName || String(feature.properties.shapeName || 'Unknown Region'),
          uas: matchedRegion?.underservedScore ?? null,
          priority: matchedRegion?.priority || 'unknown',
          coverageGap,
          dataQuality: matchedRegion?.dataQuality ?? null,
          confidence: matchedRegion?.confidence || 'unknown',
          isMatched: Boolean(matchedRegion),
        },
      };
    }),
  };
}

function visitCoordinates(
  coordinates: number[][][] | number[][][][],
  callback: (lng: number, lat: number) => void,
) {
  const stack: unknown[] = [coordinates];

  while (stack.length > 0) {
    const current = stack.pop();

    if (!Array.isArray(current)) {
      continue;
    }

    if (current.length === 2 && typeof current[0] === 'number' && typeof current[1] === 'number') {
      callback(current[0], current[1]);
      continue;
    }

    current.forEach((entry) => stack.push(entry));
  }
}

export function getFeatureBounds<TProperties>(feature: BaseFeature<TProperties>): LngLatBoundsLike | null {
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  visitCoordinates(feature.geometry.coordinates, (lng, lat) => {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  });

  if (!Number.isFinite(minLng) || !Number.isFinite(minLat) || !Number.isFinite(maxLng) || !Number.isFinite(maxLat)) {
    return null;
  }

  return [[minLng, minLat], [maxLng, maxLat]];
}

export function getCollectionBounds<TFeature extends BaseFeature<unknown>>(collection: BaseFeatureCollection<TFeature>): LngLatBoundsLike | null {
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  collection.features.forEach((feature) => {
    const bounds = getFeatureBounds(feature);
    if (!bounds) {
      return;
    }

    minLng = Math.min(minLng, bounds[0][0]);
    minLat = Math.min(minLat, bounds[0][1]);
    maxLng = Math.max(maxLng, bounds[1][0]);
    maxLat = Math.max(maxLat, bounds[1][1]);
  });

  if (!Number.isFinite(minLng) || !Number.isFinite(minLat) || !Number.isFinite(maxLng) || !Number.isFinite(maxLat)) {
    return null;
  }

  return [[minLng, minLat], [maxLng, maxLat]];
}

function isPointInRing(point: [number, number], ring: number[][]): boolean {
  const [x, y] = point;
  let isInside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersects = ((yi > y) !== (yj > y))
      && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi);

    if (intersects) {
      isInside = !isInside;
    }
  }

  return isInside;
}

function isPointInPolygon(point: [number, number], polygon: number[][][]): boolean {
  if (polygon.length === 0) {
    return false;
  }

  const [outerRing, ...holes] = polygon;
  if (!isPointInRing(point, outerRing)) {
    return false;
  }

  return !holes.some((hole) => isPointInRing(point, hole));
}

function isPointInFeature(point: [number, number], feature: Adm1Feature): boolean {
  const geometry = feature.geometry;

  if (geometry.type === 'Polygon') {
    return isPointInPolygon(point, geometry.coordinates as number[][][]);
  }

  return (geometry.coordinates as number[][][][]).some((polygon) => isPointInPolygon(point, polygon));
}

function getRepresentativePoint<TProperties>(feature: BaseFeature<TProperties>): [number, number] | null {
  const bounds = getFeatureBounds(feature);

  if (!bounds) {
    return null;
  }

  return [
    (bounds[0][0] + bounds[1][0]) / 2,
    (bounds[0][1] + bounds[1][1]) / 2,
  ];
}

export function buildAdm2FeatureCollectionWithContext(
  adm2GeoJson: Adm2FeatureCollection,
  adm1GeoJson: Adm1FeatureCollection,
): Adm2FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: adm2GeoJson.features.map((feature) => {
      const representativePoint = getRepresentativePoint(feature);
      const parentRegion = representativePoint
        ? adm1GeoJson.features.find((adm1Feature) => isPointInFeature(representativePoint, adm1Feature)) || null
        : null;

      return {
        ...feature,
        properties: {
          ...feature.properties,
          subregionLabel: String(feature.properties.shapeName || 'Unknown Subregion'),
          parentRegionCode: parentRegion?.properties.regionCode || null,
          parentRegionLabel: parentRegion?.properties.regionLabel || String(parentRegion?.properties.shapeName || 'Unknown Region'),
          score: null,
          hasScore: false,
          priority: 'unknown',
          confidence: 'unknown',
          scoreAvailabilityNote: 'Detailed subregional scoring not yet available. Boundary shown for drilldown context.',
        },
      };
    }),
  };
}

export function getSubregionFilterRegionCode(selectedRegionCode: string | null): string {
  return selectedRegionCode || '__no-region-selected__';
}

export function formatConfidenceLabel(value: ConfidenceLevel | 'unknown'): string {
  if (value === 'high') {
    return 'High confidence';
  }

  if (value === 'moderate') {
    return 'Moderate confidence';
  }

  if (value === 'low') {
    return 'Low confidence';
  }

  return 'No confidence data';
}
