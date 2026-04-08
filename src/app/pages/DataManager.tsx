import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { StatusBadge } from '../components/dashboard/StatusBadge';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';
import { useCallback, useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { getDataManagerPageData } from '../../features/data-manager/api/data-manager';
import { devSeed } from '../../features/shared/dev-seed';
import type { DataManagerPageVm, DataSourceVm, ValidationIssueVm } from '../../features/shared/types/view-models';
import { UploadWorkflowPanel } from '../../features/data-manager/components/UploadWorkflowPanel';
import type { DatasetLoadResult, UploadSourceType } from '../../features/data-manager/types/upload-workflow';

export function DataManager() {
  const [pageData, setPageData] = useState<DataManagerPageVm>(devSeed.dataManager);
  const [isLoading, setIsLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const hasDataSources = pageData.dataSources.length > 0;

  const loadDataManagerData = useCallback(async () => {
    setIsLoading(true);

    try {
      const result = await getDataManagerPageData();

      setPageData(result.data);
      setUsingFallback(result.usingFallback);
      setLoadError(result.error);
    } catch (error) {
      setPageData(devSeed.dataManager);
      setUsingFallback(true);
      setLoadError(error instanceof Error ? error.message : 'Unable to load Integrate data.');
      toast.error('Unable to load Supabase data. Showing demo values.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    loadDataManagerData().catch(() => {
      if (!isMounted) {
        return;
      }
      // Fail-safe fallback already handled inside loadDataManagerData.
    });

    return () => {
      isMounted = false;
    };
  }, [loadDataManagerData]);

  const toSourceTypeLabel = (sourceType: UploadSourceType) => {
    if (sourceType === 'teacher_records') {
      return 'Teacher Records';
    }
    if (sourceType === 'training_data') {
      return 'Training Data';
    }
    if (sourceType === 'infrastructure') {
      return 'Infrastructure';
    }
    return 'Geographic Data';
  };

  const handleWorkflowLoadComplete = useCallback(async (result: DatasetLoadResult) => {
    setLoadError(result.warning);

    if (result.mode === 'live') {
      await loadDataManagerData();
      return;
    }

    setUsingFallback(true);

    setPageData((previous) => {
      const nextSource: DataSourceVm = {
        name: result.dataSourceName,
        type: toSourceTypeLabel(result.dataSourceType),
        region: 'National',
        records: result.rowCount,
        lastUpdated: new Date().toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
        completeness: result.unresolvedIssues > 0 ? 82 : 100,
        status: result.unresolvedIssues > 0 ? 'flagged' : 'validated',
      };

      const existingSources = previous.dataSources.filter((source) => source.name !== nextSource.name);

      const nextIssue: ValidationIssueVm = {
        type: 'Uploaded Batch Review',
        count: result.unresolvedIssues,
        severity: result.unresolvedIssues > 10 ? 'high' : 'moderate',
      };

      const validationIssues: ValidationIssueVm[] = result.unresolvedIssues > 0
        ? [nextIssue, ...previous.validationIssues]
        : previous.validationIssues;

      return {
        ...previous,
        dataSources: [nextSource, ...existingSources],
        validationIssues,
      };
    });
  }, [loadDataManagerData]);

  const handleSourceClick = (sourceName: string) => {
    toast.info(`Opening detailed view for: ${sourceName}`);
  };

  return (
    <div className="min-w-0 flex-1">
      <Toaster />
      <div className="w-full min-w-0 p-6">
        <Breadcrumbs />
        
        <Tabs defaultValue="integrate" className="gap-4">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1
                className="mb-2"
                style={{
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#1B3A5C',
                }}
              >
                Integrate
              </h1>
              <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888' }}>
                IDA Integrate Layer - upload, clean, review, and load data into TALA
              </p>
              <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: usingFallback ? '#B8860B' : '#2E6DA4' }}>
                {isLoading ? 'Loading data from Supabase...' : usingFallback ? 'Using fallback demo data' : 'Live data connected'}
              </p>
              {loadError && (
                <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#B8860B' }}>
                  Data warning: {loadError}
                </p>
              )}
            </div>

            <TabsList className="h-auto w-fit rounded-lg border border-[#D8D8D8] bg-white p-1">
              <TabsTrigger
                value="integrate"
                className="px-4 py-2 data-[state=active]:bg-[#D5E8F7]"
                style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}
              >
                Integrate
              </TabsTrigger>
              <TabsTrigger
                value="registry"
                className="px-4 py-2 data-[state=active]:bg-[#D5E8F7]"
                style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}
              >
                Source Registry
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="integrate">
            <UploadWorkflowPanel onLoadComplete={handleWorkflowLoadComplete} />
          </TabsContent>

          <TabsContent value="registry">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2
                className="mb-4"
                style={{
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#1B3A5C',
                }}
              >
                Source Registry
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: '#D5E8F7' }}>
                      <th className="text-left p-1" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Source Name</th>
                      <th className="text-left p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Type</th>
                      <th className="text-left p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Region</th>
                      <th className="text-right p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Records</th>
                      <th className="text-left p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Last Updated</th>
                      <th className="text-right p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Completeness</th>
                      <th className="text-center p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!isLoading && !hasDataSources && (
                      <tr>
                        <td colSpan={7} className="p-4" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888' }}>
                          No data sources found. Upload a dataset to populate this registry.
                        </td>
                      </tr>
                    )}
                    {pageData.dataSources.map((source, index) => (
                      <tr
                        key={index}
                        onClick={() => handleSourceClick(source.name)}
                        className="border-b hover:bg-[#EBF4FB] cursor-pointer transition-colors"
                        style={{ borderColor: '#D8D8D8' }}
                      >
                        <td className="p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1A1A1A' }}>
                          {source.name}
                        </td>
                        <td className="p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888' }}>
                          {source.type}
                        </td>
                        <td className="p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888' }}>
                          {source.region}
                        </td>
                        <td className="text-right p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1A1A1A' }}>
                          {source.records.toLocaleString()}
                        </td>
                        <td className="p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888' }}>
                          {source.lastUpdated}
                        </td>
                        <td className="text-right p-3">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 bg-[#D8D8D8] rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${source.completeness}%`,
                                  backgroundColor: '#2E6DA4',
                                }}
                              />
                            </div>
                            <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1A1A1A' }}>
                              {source.completeness}%
                            </span>
                          </div>
                        </td>
                        <td className="text-center p-3">
                          <StatusBadge status={source.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}