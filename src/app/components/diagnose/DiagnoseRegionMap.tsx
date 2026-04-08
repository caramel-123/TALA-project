import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { MapGeoJSONFeature } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import adm1GeoJsonUrl from '../../../features/diagnose/lib/geoBoundaries-PHL-ADM1_simplified.geojson?url';
import adm2GeoJsonUrl from '../../../features/diagnose/lib/geoBoundaries-PHL-ADM2_simplified.geojson?url';
import {
  buildAdm2FeatureCollectionWithContext,
  buildFeatureCollectionWithMetrics,
  formatConfidenceLabel,
  getCollectionBounds,
  getFeatureBounds,
  getSubregionFilterRegionCode,
  normalizeAreaLabel,
  type Adm1Feature,
  type Adm1FeatureCollection,
  type Adm2Feature,
  type Adm2FeatureCollection,
} from '../../../features/diagnose/lib/regionMapHelpers';
import { MAP_TIER_COLORS, scoreToTier } from '../../../features/diagnose/lib/mapColorScale';
import type { DiagnoseRegionSummaryVm, DivisionVm } from '../../../features/shared/types/view-models';

type DiagnoseRegionMapProps = {
  regions: DiagnoseRegionSummaryVm[];
  divisions: DivisionVm[];
  selectedRegionCode: string | null;
  selectedDivision: string | null;
  onSelectRegion: (regionCode: string) => void;
  onSelectDivision?: (division: string | null) => void;
};

type TooltipState = {
  x: number;
  y: number;
  level: 'adm1' | 'adm2';
  title: string;
  subtitle: string;
  rows: Array<{ label: string; value: string }>;
};

const BASEMAP_STYLE_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

const SOURCE_ADM1_ID = 'diagnose-adm1-source';
const SOURCE_ADM2_ID = 'diagnose-adm2-source';
const ADM1_FILL_LAYER_ID = 'diagnose-adm1-fill';
const ADM1_OUTLINE_LAYER_ID = 'diagnose-adm1-outline';
const ADM1_HOVER_LAYER_ID = 'diagnose-adm1-hover-outline';
const ADM1_SELECTED_LAYER_ID = 'diagnose-adm1-selected-outline';
const ADM2_FILL_LAYER_ID = 'diagnose-adm2-fill';
const ADM2_OUTLINE_LAYER_ID = 'diagnose-adm2-outline';
const ADM2_HOVER_LAYER_ID = 'diagnose-adm2-hover-outline';
const ADM2_SELECTED_LAYER_ID = 'diagnose-adm2-selected-outline';

const NO_SHAPE_ID = '__none__';
const NO_REGION_CODE = '__no-region-selected__';

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asShapeId(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  return NO_SHAPE_ID;
}

function safeString(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return fallback;
}

function formatPriorityLabel(priority: string): string {
  if (!priority || priority === 'unknown') {
    return 'Not available';
  }

  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function resolveDivisionFromSubregion(subregionName: string, divisions: DivisionVm[]): string | null {
  if (divisions.length === 0) {
    return null;
  }

  const normalizedSubregion = normalizeAreaLabel(subregionName);

  for (const division of divisions) {
    const normalizedDivision = normalizeAreaLabel(division.name);

    if (!normalizedDivision) {
      continue;
    }

    if (normalizedDivision.includes(normalizedSubregion) || normalizedSubregion.includes(normalizedDivision)) {
      return division.name;
    }

    const shortDivision = normalizedDivision.split(' division')[0]?.trim() || normalizedDivision;
    if (shortDivision && (shortDivision.includes(normalizedSubregion) || normalizedSubregion.includes(shortDivision))) {
      return division.name;
    }
  }

  return null;
}

function isLayerReady(map: maplibregl.Map, layerId: string): boolean {
  return map.isStyleLoaded() === true && Boolean(map.getLayer(layerId));
}

function safeSetFilter(map: maplibregl.Map, layerId: string, filter: unknown[]) {
  if (!isLayerReady(map, layerId)) {
    return;
  }

  map.setFilter(layerId, filter as unknown as maplibregl.FilterSpecification);
}

function buildAdm1Tooltip(feature: MapGeoJSONFeature, x: number, y: number): TooltipState {
  const regionLabel = safeString(feature.properties?.regionLabel, safeString(feature.properties?.shapeName, 'Unknown Region'));
  const uas = toNumber(feature.properties?.uas);
  const coverageGap = toNumber(feature.properties?.coverageGap);
  const dataQuality = toNumber(feature.properties?.dataQuality);
  const confidence = safeString(feature.properties?.confidence, 'unknown') as 'high' | 'moderate' | 'low' | 'unknown';
  const priority = safeString(feature.properties?.priority, 'unknown');

  return {
    x,
    y,
    level: 'adm1',
    title: regionLabel,
    subtitle: 'Regional Priority View',
    rows: [
      { label: 'UAS', value: uas !== null ? uas.toFixed(1) : 'Not available' },
      { label: 'Priority Tier', value: formatPriorityLabel(priority) },
      { label: 'Coverage Gap', value: coverageGap !== null ? `${coverageGap}%` : 'Not available' },
      { label: 'Data Quality', value: dataQuality !== null ? `${dataQuality}%` : 'Not available' },
      { label: 'Data Confidence', value: formatConfidenceLabel(confidence) },
    ],
  };
}

function buildAdm2Tooltip(feature: MapGeoJSONFeature, x: number, y: number): TooltipState {
  const subregionLabel = safeString(feature.properties?.subregionLabel, safeString(feature.properties?.shapeName, 'Unknown Subregion'));
  const parentRegionLabel = safeString(feature.properties?.parentRegionLabel, 'Unknown Region');
  const score = toNumber(feature.properties?.score);
  const confidence = safeString(feature.properties?.confidence, 'unknown') as 'high' | 'moderate' | 'low' | 'unknown';
  const note = safeString(
    feature.properties?.scoreAvailabilityNote,
    'Detailed subregional scoring not yet available. Boundary shown for drilldown context.',
  );

  return {
    x,
    y,
    level: 'adm2',
    title: subregionLabel,
    subtitle: `Inside ${parentRegionLabel}`,
    rows: [
      { label: 'Subregional Score', value: score !== null ? score.toFixed(1) : 'Not available' },
      { label: 'Priority', value: score !== null ? formatPriorityLabel(scoreToTier(score)) : 'Not available' },
      { label: 'Data Confidence', value: score !== null ? formatConfidenceLabel(confidence) : 'Not available' },
      { label: 'Note', value: note },
    ],
  };
}

export function DiagnoseRegionMap({
  regions,
  divisions,
  selectedRegionCode,
  selectedDivision,
  onSelectRegion,
  onSelectDivision,
}: DiagnoseRegionMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hasFittedNationalBoundsRef = useRef(false);

  const [rawAdm1GeoJson, setRawAdm1GeoJson] = useState<Adm1FeatureCollection | null>(null);
  const [rawAdm2GeoJson, setRawAdm2GeoJson] = useState<Adm2FeatureCollection | null>(null);
  const [geoJsonError, setGeoJsonError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const [hoveredAdm1ShapeId, setHoveredAdm1ShapeId] = useState<string>(NO_SHAPE_ID);
  const [hoveredAdm2ShapeId, setHoveredAdm2ShapeId] = useState<string>(NO_SHAPE_ID);
  const [selectedAdm2ShapeId, setSelectedAdm2ShapeId] = useState<string>(NO_SHAPE_ID);
  const [selectedAdm2Name, setSelectedAdm2Name] = useState<string | null>(null);
  const [selectedAdm2ParentName, setSelectedAdm2ParentName] = useState<string | null>(null);
  const [matchedDivisionName, setMatchedDivisionName] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const enrichedAdm1GeoJson = useMemo(() => {
    if (!rawAdm1GeoJson) {
      return null;
    }

    return buildFeatureCollectionWithMetrics(rawAdm1GeoJson, regions);
  }, [rawAdm1GeoJson, regions]);

  const enrichedAdm2GeoJson = useMemo(() => {
    if (!rawAdm2GeoJson || !enrichedAdm1GeoJson) {
      return null;
    }

    return buildAdm2FeatureCollectionWithContext(rawAdm2GeoJson, enrichedAdm1GeoJson);
  }, [rawAdm2GeoJson, enrichedAdm1GeoJson]);

  const selectedAdm1Feature = useMemo(() => {
    if (!enrichedAdm1GeoJson || !selectedRegionCode) {
      return null;
    }

    return enrichedAdm1GeoJson.features.find((feature) => feature.properties.regionCode === selectedRegionCode) || null;
  }, [enrichedAdm1GeoJson, selectedRegionCode]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadBoundarySources() {
      try {
        const [adm1Response, adm2Response] = await Promise.all([
          fetch(adm1GeoJsonUrl, { signal: controller.signal }),
          fetch(adm2GeoJsonUrl, { signal: controller.signal }),
        ]);

        if (!adm1Response.ok || !adm2Response.ok) {
          throw new Error('Unable to load one or more boundary layers.');
        }

        const [adm1Parsed, adm2Parsed] = await Promise.all([
          adm1Response.json() as Promise<Adm1FeatureCollection>,
          adm2Response.json() as Promise<Adm2FeatureCollection>,
        ]);

        if (!adm1Parsed?.features?.length || !adm2Parsed?.features?.length) {
          throw new Error('Boundary files are empty or invalid.');
        }

        setRawAdm1GeoJson(adm1Parsed);
        setRawAdm2GeoJson(adm2Parsed);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setGeoJsonError(error instanceof Error ? error.message : 'Unable to load national boundaries.');
      }
    }

    loadBoundarySources();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!containerRef.current || !enrichedAdm1GeoJson || !enrichedAdm2GeoJson || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLE_URL,
      center: [122.6, 12.7],
      zoom: 4.2,
      minZoom: 4,
      maxZoom: 9,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    const styleTimeout = window.setTimeout(() => {
      if (!map.isStyleLoaded()) {
        setMapError('Map style did not finish loading.');
      }
    }, 12000);

    map.on('error', (event) => {
      if (!map.isStyleLoaded()) {
        setMapError(event.error?.message || 'Unable to initialize map style.');
      }
    });

    map.on('load', () => {
      window.clearTimeout(styleTimeout);

      map.addSource(SOURCE_ADM1_ID, {
        type: 'geojson',
        data: enrichedAdm1GeoJson as unknown as GeoJSON.GeoJSON,
      });

      map.addSource(SOURCE_ADM2_ID, {
        type: 'geojson',
        data: enrichedAdm2GeoJson as unknown as GeoJSON.GeoJSON,
      });

      map.addLayer({
        id: ADM1_FILL_LAYER_ID,
        type: 'fill',
        source: SOURCE_ADM1_ID,
        paint: {
          'fill-color': [
            'case',
            ['==', ['get', 'isMatched'], false],
            MAP_TIER_COLORS.unknown,
            ['>', ['coalesce', ['get', 'uas'], 0], 8],
            MAP_TIER_COLORS.critical,
            ['>', ['coalesce', ['get', 'uas'], 0], 7],
            MAP_TIER_COLORS.high,
            ['>', ['coalesce', ['get', 'uas'], 0], 6],
            MAP_TIER_COLORS.moderate,
            MAP_TIER_COLORS.low,
          ],
          'fill-opacity': 0.82,
        },
      });

      map.addLayer({
        id: ADM1_OUTLINE_LAYER_ID,
        type: 'line',
        source: SOURCE_ADM1_ID,
        paint: {
          'line-color': '#FFFFFF',
          'line-width': 1.3,
          'line-opacity': 0.94,
        },
      });

      map.addLayer({
        id: ADM2_FILL_LAYER_ID,
        type: 'fill',
        source: SOURCE_ADM2_ID,
        filter: ['==', ['get', 'parentRegionCode'], NO_REGION_CODE],
        paint: {
          'fill-color': [
            'case',
            ['==', ['get', 'hasScore'], true],
            [
              'case',
              ['>', ['coalesce', ['get', 'score'], 0], 8],
              MAP_TIER_COLORS.critical,
              ['>', ['coalesce', ['get', 'score'], 0], 7],
              MAP_TIER_COLORS.high,
              ['>', ['coalesce', ['get', 'score'], 0], 6],
              MAP_TIER_COLORS.moderate,
              MAP_TIER_COLORS.low,
            ],
            '#EDF2F7',
          ],
          'fill-opacity': 0.78,
        },
      });

      map.addLayer({
        id: ADM2_OUTLINE_LAYER_ID,
        type: 'line',
        source: SOURCE_ADM2_ID,
        filter: ['==', ['get', 'parentRegionCode'], NO_REGION_CODE],
        paint: {
          'line-color': '#7C93AE',
          'line-width': 0.9,
          'line-opacity': 0.92,
        },
      });

      map.addLayer({
        id: ADM1_HOVER_LAYER_ID,
        type: 'line',
        source: SOURCE_ADM1_ID,
        filter: ['==', ['get', 'shapeID'], NO_SHAPE_ID],
        paint: {
          'line-color': '#244A73',
          'line-width': 2.8,
        },
      });

      map.addLayer({
        id: ADM1_SELECTED_LAYER_ID,
        type: 'line',
        source: SOURCE_ADM1_ID,
        filter: ['==', ['get', 'shapeID'], NO_SHAPE_ID],
        paint: {
          'line-color': '#E8C94F',
          'line-width': 4,
        },
      });

      map.addLayer({
        id: ADM2_HOVER_LAYER_ID,
        type: 'line',
        source: SOURCE_ADM2_ID,
        filter: ['==', ['get', 'shapeID'], NO_SHAPE_ID],
        paint: {
          'line-color': '#1B3A5C',
          'line-width': 2.2,
        },
      });

      map.addLayer({
        id: ADM2_SELECTED_LAYER_ID,
        type: 'line',
        source: SOURCE_ADM2_ID,
        filter: ['==', ['get', 'shapeID'], NO_SHAPE_ID],
        paint: {
          'line-color': '#E8C94F',
          'line-width': 2.8,
        },
      });

      const nationalBounds = getCollectionBounds(enrichedAdm1GeoJson);
      if (nationalBounds) {
        map.fitBounds(nationalBounds, {
          padding: { top: 28, right: 24, bottom: 36, left: 24 },
          duration: 680,
          maxZoom: 6,
        });
        hasFittedNationalBoundsRef.current = true;
      }

      map.on('mousemove', ADM1_FILL_LAYER_ID, (event) => {
        const feature = event.features?.[0] as MapGeoJSONFeature | undefined;
        const shapeId = asShapeId(feature?.properties?.shapeID);

        map.getCanvas().style.cursor = 'pointer';
        setHoveredAdm1ShapeId(shapeId);

        if (feature) {
          setTooltip(buildAdm1Tooltip(feature, event.point.x, event.point.y));
        }
      });

      map.on('mouseleave', ADM1_FILL_LAYER_ID, () => {
        map.getCanvas().style.cursor = '';
        setHoveredAdm1ShapeId(NO_SHAPE_ID);
        setTooltip(null);
      });

      map.on('click', ADM1_FILL_LAYER_ID, (event) => {
        const feature = event.features?.[0] as MapGeoJSONFeature | undefined;
        if (!feature) {
          return;
        }

        const regionCode = safeString(feature.properties?.regionCode, '');
        if (!regionCode) {
          return;
        }

        setSelectedAdm2ShapeId(NO_SHAPE_ID);
        setSelectedAdm2Name(null);
        setSelectedAdm2ParentName(null);
        setMatchedDivisionName(null);
        onSelectRegion(regionCode);
      });

      map.on('mousemove', ADM2_FILL_LAYER_ID, (event) => {
        const feature = event.features?.[0] as MapGeoJSONFeature | undefined;
        const shapeId = asShapeId(feature?.properties?.shapeID);

        map.getCanvas().style.cursor = 'pointer';
        setHoveredAdm2ShapeId(shapeId);

        if (feature) {
          setTooltip(buildAdm2Tooltip(feature, event.point.x, event.point.y));
        }
      });

      map.on('mouseleave', ADM2_FILL_LAYER_ID, () => {
        map.getCanvas().style.cursor = '';
        setHoveredAdm2ShapeId(NO_SHAPE_ID);
        setTooltip(null);
      });

      map.on('click', ADM2_FILL_LAYER_ID, (event) => {
        const feature = event.features?.[0] as MapGeoJSONFeature | undefined;
        if (!feature) {
          return;
        }

        const subregionName = safeString(feature.properties?.subregionLabel, safeString(feature.properties?.shapeName, 'Unknown Subregion'));
        const parentRegionName = safeString(feature.properties?.parentRegionLabel, 'Unknown Region');
        const shapeId = asShapeId(feature.properties?.shapeID);
        const matchedDivision = resolveDivisionFromSubregion(subregionName, divisions);

        setSelectedAdm2ShapeId(shapeId);
        setSelectedAdm2Name(subregionName);
        setSelectedAdm2ParentName(parentRegionName);
        setMatchedDivisionName(matchedDivision);

        if (matchedDivision && onSelectDivision) {
          onSelectDivision(matchedDivision);
        }
      });

      setIsMapReady(true);
    });

    mapRef.current = map;

    return () => {
      window.clearTimeout(styleTimeout);
      setIsMapReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, [divisions, enrichedAdm1GeoJson, enrichedAdm2GeoJson, onSelectDivision, onSelectRegion]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isMapReady || !enrichedAdm1GeoJson || !enrichedAdm2GeoJson) {
      return;
    }

    const adm1Source = map.getSource(SOURCE_ADM1_ID) as maplibregl.GeoJSONSource | undefined;
    const adm2Source = map.getSource(SOURCE_ADM2_ID) as maplibregl.GeoJSONSource | undefined;

    if (adm1Source) {
      adm1Source.setData(enrichedAdm1GeoJson as unknown as GeoJSON.GeoJSON);
    }

    if (adm2Source) {
      adm2Source.setData(enrichedAdm2GeoJson as unknown as GeoJSON.GeoJSON);
    }
  }, [enrichedAdm1GeoJson, enrichedAdm2GeoJson, isMapReady]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isMapReady) {
      return;
    }

    safeSetFilter(map, ADM1_HOVER_LAYER_ID, ['==', ['get', 'shapeID'], hoveredAdm1ShapeId]);
  }, [hoveredAdm1ShapeId, isMapReady]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isMapReady) {
      return;
    }

    const selectedShapeId = selectedAdm1Feature ? asShapeId(selectedAdm1Feature.properties.shapeID) : NO_SHAPE_ID;
    safeSetFilter(map, ADM1_SELECTED_LAYER_ID, ['==', ['get', 'shapeID'], selectedShapeId]);

    if (selectedAdm1Feature) {
      const selectedBounds = getFeatureBounds(selectedAdm1Feature as Adm1Feature);

      if (selectedBounds) {
        map.fitBounds(selectedBounds, {
          padding: { top: 32, right: 42, bottom: 42, left: 42 },
          duration: 620,
          maxZoom: 6.8,
        });
      }

      return;
    }

    if (!selectedAdm1Feature && enrichedAdm1GeoJson && hasFittedNationalBoundsRef.current) {
      const nationalBounds = getCollectionBounds(enrichedAdm1GeoJson);
      if (nationalBounds) {
        map.fitBounds(nationalBounds, {
          padding: { top: 28, right: 24, bottom: 36, left: 24 },
          duration: 560,
          maxZoom: 6,
        });
      }
    }
  }, [enrichedAdm1GeoJson, isMapReady, selectedAdm1Feature]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isMapReady) {
      return;
    }

    const regionFilterCode = getSubregionFilterRegionCode(selectedRegionCode);
    const baseFilter = ['==', ['get', 'parentRegionCode'], regionFilterCode] as unknown[];

    safeSetFilter(map, ADM2_FILL_LAYER_ID, baseFilter);
    safeSetFilter(map, ADM2_OUTLINE_LAYER_ID, baseFilter);
    safeSetFilter(map, ADM2_HOVER_LAYER_ID, ['all', baseFilter, ['==', ['get', 'shapeID'], hoveredAdm2ShapeId]]);
    safeSetFilter(map, ADM2_SELECTED_LAYER_ID, ['all', baseFilter, ['==', ['get', 'shapeID'], selectedAdm2ShapeId]]);
  }, [hoveredAdm2ShapeId, isMapReady, selectedAdm2ShapeId, selectedRegionCode]);

  useEffect(() => {
    if (selectedDivision) {
      setMatchedDivisionName(selectedDivision);
    }
  }, [selectedDivision]);

  useEffect(() => {
    if (!selectedRegionCode) {
      setSelectedAdm2ShapeId(NO_SHAPE_ID);
      setSelectedAdm2Name(null);
      setSelectedAdm2ParentName(null);
      setMatchedDivisionName(null);
    }
  }, [selectedRegionCode]);

  const errorMessage = geoJsonError || mapError;

  if (errorMessage) {
    return (
      <div className="flex h-full min-h-[340px] items-center justify-center rounded-lg border border-dashed border-[var(--light-gray)] bg-[var(--pale-blue)] p-6 text-center">
        <div>
          <p className="text-sm font-semibold text-[var(--navy-blue)]">National Priority Map Unavailable</p>
          <p className="mt-2 text-xs text-[var(--mid-gray)]">{errorMessage}</p>
          <p className="mt-2 text-xs text-[var(--mid-gray)]">Regional selection remains available through ranking and selector panels.</p>
        </div>
      </div>
    );
  }

  if (!enrichedAdm1GeoJson || !enrichedAdm2GeoJson) {
    return (
      <div className="flex h-full min-h-[340px] items-center justify-center rounded-lg border border-[var(--light-gray)] bg-[var(--pale-blue)] p-6 text-sm text-[var(--mid-gray)]">
        Loading ADM1 and ADM2 boundaries...
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[340px] overflow-hidden rounded-lg border border-[var(--light-gray)] bg-white">
      <div ref={containerRef} className="h-full min-h-[340px] w-full" />

      <aside className="pointer-events-none absolute left-2 top-2 rounded-md border border-[var(--light-gray)] bg-white/95 p-2 text-[11px] shadow-sm">
        <p className="font-semibold text-[var(--navy-blue)]">National Priority Map</p>
        <div className="mt-1 grid grid-cols-[12px_auto] items-center gap-x-2 gap-y-1 text-[var(--mid-gray)]">
          <span className="h-3 w-3 rounded-sm border border-[var(--light-gray)]" style={{ background: MAP_TIER_COLORS.critical }} />
          <span>UAS &gt; 8.0 (Critical)</span>
          <span className="h-3 w-3 rounded-sm border border-[var(--light-gray)]" style={{ background: MAP_TIER_COLORS.high }} />
          <span>UAS 7.0-8.0 (High)</span>
          <span className="h-3 w-3 rounded-sm border border-[var(--light-gray)]" style={{ background: MAP_TIER_COLORS.moderate }} />
          <span>UAS 6.0-7.0 (Moderate)</span>
          <span className="h-3 w-3 rounded-sm border border-[var(--light-gray)]" style={{ background: MAP_TIER_COLORS.low }} />
          <span>UAS &lt;= 6.0 (Low)</span>
          <span className="h-3 w-3 rounded-sm border border-[var(--light-gray)]" style={{ background: MAP_TIER_COLORS.unknown }} />
          <span>No matched score</span>
        </div>
        <p className="mt-2 text-[10px] text-[var(--mid-gray)]">ADM2 drilldown appears after selecting a region.</p>
      </aside>

      {selectedRegionCode && (
        <aside className="pointer-events-none absolute bottom-2 left-2 max-w-[340px] rounded-md border border-[var(--light-gray)] bg-white/95 p-2 text-[11px] shadow-sm">
          <p className="font-semibold text-[var(--navy-blue)]">ADM2 Drilldown</p>
          {!selectedAdm2Name && (
            <p className="mt-1 text-[var(--mid-gray)]">Hover or click subregional boundaries to inspect lower-level context.</p>
          )}
          {selectedAdm2Name && (
            <div className="mt-1 space-y-0.5">
              <p className="text-[var(--black)]"><strong>Selected:</strong> {selectedAdm2Name}</p>
              <p className="text-[var(--mid-gray)]"><strong>Parent Region:</strong> {selectedAdm2ParentName || 'Unknown Region'}</p>
              <p className="text-[var(--mid-gray)]"><strong>Division Link:</strong> {matchedDivisionName || 'Detailed subregional scoring not yet available'}</p>
            </div>
          )}
        </aside>
      )}

      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 max-w-[280px] rounded-md border border-[var(--light-gray)] bg-white/95 p-3 text-xs shadow-md"
          style={{
            left: Math.min(tooltip.x + 12, 520),
            top: Math.max(tooltip.y - 8, 8),
          }}
        >
          <p className="font-semibold text-[var(--navy-blue)]">{tooltip.title}</p>
          <p className="text-[11px] text-[var(--mid-gray)]">{tooltip.subtitle}</p>
          <div className="mt-1 space-y-0.5">
            {tooltip.rows.map((row) => (
              <p key={`${tooltip.level}-${row.label}`} className="text-[var(--mid-gray)]">
                {row.label}: <span className="font-semibold text-[var(--black)]">{row.value}</span>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}