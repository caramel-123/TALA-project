import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { Toaster } from '../components/ui/sonner';
import { getDiagnosePageData } from '../../features/diagnose/api/diagnose';
import { DiagnoseHeader } from '../../features/diagnose/components/DiagnoseHeader';
import { DiagnoseWorkspace } from '../../features/diagnose/components/DiagnoseWorkspace';
import { devSeed } from '../../features/shared/dev-seed';
import type { DiagnosePageVm } from '../../features/shared/types/view-models';

export function Diagnose() {
  const [pageData, setPageData] = useState<DiagnosePageVm>(devSeed.diagnose);
  const [isLoading, setIsLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedRegionCode, setSelectedRegionCode] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDiagnoseData(regionCode?: string) {
      setIsLoading(true);

      try {
        const result = await getDiagnosePageData(regionCode);

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
    if (!selectedRegionCode || pageData.divisions.length === 0) {
      setSelectedDivision(null);
      return;
    }

    if (!selectedDivision || !pageData.divisions.some((division) => division.name === selectedDivision)) {
      setSelectedDivision(pageData.divisions[0].name);
    }
  }, [pageData.divisions, selectedDivision, selectedRegionCode]);

  useEffect(() => {
    if (!selectedRegionCode || !selectedDivision || pageData.clusters.length === 0) {
      setSelectedCluster(null);
      return;
    }

    const scopedClusters = pageData.clusters.filter((cluster) => !cluster.divisionName || cluster.divisionName === selectedDivision);
    const firstCluster = scopedClusters[0] || pageData.clusters[0] || null;

    if (!selectedCluster || !scopedClusters.some((cluster) => cluster.name === selectedCluster)) {
      setSelectedCluster(firstCluster?.name || null);
    }
  }, [pageData.clusters, selectedCluster, selectedDivision, selectedRegionCode]);

  const handleExportData = () => {
    toast.success('Exporting diagnose planning dashboard data...');
  };

  const handleAddToQueue = () => {
    toast.success('Selection added to planning queue.');
  };

  const selectedRegion = pageData.regions.find((region) => region.regionCode === selectedRegionCode) || null;

  const handleSelectRegion = async (regionCode: string) => {
    setIsLoading(true);

    try {
      const result = await getDiagnosePageData(regionCode);
      setPageData(result.data);
      setUsingFallback(result.usingFallback);
      setLoadError(result.error);
      setSelectedRegionCode(regionCode);
      setSelectedDivision(null);
      setSelectedCluster(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load selected region data.');
      setUsingFallback(true);
      toast.error('Unable to load selected region. Showing available data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetScope = async () => {
    setIsLoading(true);

    try {
      const result = await getDiagnosePageData();
      setPageData(result.data);
      setUsingFallback(result.usingFallback);
      setLoadError(result.error);
      setSelectedRegionCode(null);
      setSelectedDivision(null);
      setSelectedCluster(null);
      toast.success('Returned to national diagnose scope.');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to return to national scope.');
      setUsingFallback(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1">
      <Toaster />
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <Breadcrumbs />

        <main className="mt-6 space-y-6" aria-live="polite">
          <DiagnoseHeader
            nationalSummary={pageData.nationalSummary}
            selectedRegion={selectedRegion}
            selectedDivision={selectedDivision}
            selectedCluster={selectedCluster}
            isLoading={isLoading}
            usingFallback={usingFallback}
            loadError={loadError}
            onExportData={handleExportData}
            onAddToQueue={handleAddToQueue}
            onResetScope={handleResetScope}
          />

          {isLoading && (
            <section className="rounded-xl border border-[var(--light-gray)] bg-white p-4 text-sm text-[var(--mid-gray)]">
              Loading diagnose investigation workspace...
            </section>
          )}

          <DiagnoseWorkspace
            data={pageData}
            selectedRegionCode={selectedRegionCode}
            selectedDivision={selectedDivision}
            selectedCluster={selectedCluster}
            onSelectRegion={handleSelectRegion}
            onClearRegion={handleResetScope}
            onSelectDivision={setSelectedDivision}
            onSelectCluster={setSelectedCluster}
          />
        </main>
      </div>
    </div>
  );
}
