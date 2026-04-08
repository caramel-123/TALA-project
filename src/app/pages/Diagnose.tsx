import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { Toaster } from '../components/ui/sonner';
import { getDiagnosePageData } from '../../features/diagnose/api/diagnose';
import { DiagnoseHeader } from '../../features/diagnose/components/DiagnoseHeader';
import { DiagnoseSidebar } from '../../features/diagnose/components/DiagnoseSidebar';
import {
  ClusterMapView,
  DataConfidenceView,
  DivisionView,
  GapFactorView,
  RegionalProfilerView,
  TeacherCohortView,
  UnderservedScoreView,
} from '../../features/diagnose/components/views';
import { devSeed } from '../../features/shared/dev-seed';
import type { DiagnosePageVm } from '../../features/shared/types/view-models';

type DiagnoseViewId =
  | 'profiler'
  | 'division'
  | 'cluster'
  | 'cohort'
  | 'score'
  | 'gap'
  | 'confidence';

const DEFAULT_VIEW: DiagnoseViewId = 'profiler';

function isDiagnoseViewId(value: string): value is DiagnoseViewId {
  return [
    'profiler',
    'division',
    'cluster',
    'cohort',
    'score',
    'gap',
    'confidence',
  ].includes(value);
}

export function Diagnose() {
  const [pageData, setPageData] = useState<DiagnosePageVm>(devSeed.diagnose);
  const [isLoading, setIsLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeSidebar, setActiveSidebar] = useState<DiagnoseViewId>(DEFAULT_VIEW);

  const { sidebarItems, regionData, gapFactors, divisions, cohorts, clusters, scoreFactors, dataQuality } = pageData;

  useEffect(() => {
    let isMounted = true;

    async function loadDiagnoseData() {
      setIsLoading(true);

      try {
        const result = await getDiagnosePageData('040000000');

        if (!isMounted) {
          return;
        }

        setPageData(result.data);
        setUsingFallback(result.usingFallback);
        setLoadError(result.error);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPageData(devSeed.diagnose);
        setUsingFallback(true);
        setLoadError(error instanceof Error ? error.message : 'Unable to load Diagnose data.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDiagnoseData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!sidebarItems.length) {
      setActiveSidebar(DEFAULT_VIEW);
      return;
    }

    const ids = sidebarItems.map((item) => item.id).filter(isDiagnoseViewId);

    if (!ids.includes(activeSidebar)) {
      setActiveSidebar(ids[0] || DEFAULT_VIEW);
    }
  }, [activeSidebar, sidebarItems]);

  const handleExportData = () => {
    toast.success('Exporting regional diagnosis summary...');
  };

  const handleAddToQueue = () => {
    toast.success('Region added to planning queue.');
  };

  const handleDivisionClick = (divisionName: string) => {
    toast.info(`Opening detailed diagnostics for ${divisionName}.`);
  };

  const viewContent = useMemo<Record<DiagnoseViewId, JSX.Element>>(() => ({
    profiler: (
      <RegionalProfilerView
        gapFactors={gapFactors}
        divisions={divisions}
        cohorts={cohorts}
        scoreFactors={scoreFactors}
        dataQuality={dataQuality}
        underservedScore={regionData.underservedScore}
      />
    ),
    division: <DivisionView divisions={divisions} onDivisionClick={handleDivisionClick} />,
    cluster: <ClusterMapView clusters={clusters} />,
    cohort: <TeacherCohortView cohorts={cohorts} />,
    score: <UnderservedScoreView scoreFactors={scoreFactors} underservedScore={regionData.underservedScore} />,
    gap: <GapFactorView gapFactors={gapFactors} />,
    confidence: <DataConfidenceView dataQuality={dataQuality} />,
  }), [clusters, cohorts, dataQuality, divisions, gapFactors, regionData.underservedScore, scoreFactors]);

  const safeSidebarItems = sidebarItems.length > 0 ? sidebarItems : devSeed.diagnose.sidebarItems;

  return (
    <div className="flex-1">
      <Toaster />
      <div className="mx-auto w-full max-w-[1440px] p-6">
        <Breadcrumbs />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <DiagnoseSidebar
            items={safeSidebarItems}
            activeId={activeSidebar}
            onSelect={(id) => {
              if (isDiagnoseViewId(id)) {
                setActiveSidebar(id);
              }
            }}
          />

          <main className="space-y-6" aria-live="polite">
            <DiagnoseHeader
              regionData={regionData}
              isLoading={isLoading}
              usingFallback={usingFallback}
              loadError={loadError}
              onExportData={handleExportData}
              onAddToQueue={handleAddToQueue}
            />

            {isLoading && (
              <section className="rounded-xl border border-[var(--light-gray)] bg-white p-4 text-sm text-[var(--mid-gray)]">
                Loading diagnose analytics...
              </section>
            )}

            {viewContent[activeSidebar]}
          </main>
        </div>
      </div>
    </div>
  );
}
