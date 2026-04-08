import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { StatusBadge } from '../components/dashboard/StatusBadge';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';
import { useCallback, useEffect, useState } from 'react';
import { getDataManagerPageData } from '../../features/data-manager/api/data-manager';
import { devSeed } from '../../features/shared/dev-seed';
import type { DataManagerPageVm } from '../../features/shared/types/view-models';
import { UploadWorkflowPanel } from '../../features/data-manager/components/UploadWorkflowPanel';
import type { DatasetLoadResult, UploadSourceType } from '../../features/data-manager/types/upload-workflow';

export function DataManager() {
  const [pageData, setPageData] = useState<DataManagerPageVm>(devSeed.dataManager);
  const [isLoading, setIsLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const hasDataSources = pageData.dataSources.length > 0;
  const hasValidationIssues = pageData.validationIssues.length > 0;
  const hasRegionalQuality = pageData.dataQualityByRegion.length > 0;

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
      setLoadError(error instanceof Error ? error.message : 'Unable to load Data Manager data.');
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
      const nextSource = {
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
      } as const;

      const existingSources = previous.dataSources.filter((source) => source.name !== nextSource.name);

      const validationIssues = result.unresolvedIssues > 0
        ? [
            {
              type: 'Uploaded Batch Review',
              count: result.unresolvedIssues,
              severity: result.unresolvedIssues > 10 ? 'high' : 'moderate',
            },
            ...previous.validationIssues,
          ]
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
    <div className="flex-1">
      <Toaster />
      <div className="max-w-7xl mx-auto p-6">
        <Breadcrumbs />
        
        {/* Page Header */}
        <div className="mb-6">
          <h1 
            className="mb-2" 
            style={{ 
              fontFamily: 'Arial, sans-serif', 
              fontSize: '24px', 
              fontWeight: 'bold', 
              color: '#1B3A5C' 
            }}
          >
            Data Manager
          </h1>
          <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888' }}>
            IDA Integrate Layer - Control and validate all data feeding TALA
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

        <UploadWorkflowPanel onLoadComplete={handleWorkflowLoadComplete} />

        {/* Data Source Registry */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 
            className="mb-4" 
            style={{ 
              fontFamily: 'Arial, sans-serif', 
              fontSize: '18px', 
              fontWeight: 'bold', 
              color: '#1B3A5C' 
            }}
          >
            Data Source Registry
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#D5E8F7' }}>
                  <th className="text-left p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Source Name</th>
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
                              backgroundColor: '#2E6DA4' 
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Validation Report Panel */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 
              className="mb-4" 
              style={{ 
                fontFamily: 'Arial, sans-serif', 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: '#1B3A5C' 
              }}
            >
              Validation Issues
            </h2>
            {!isLoading && !hasValidationIssues && (
              <div className="p-3 rounded mb-3" style={{ backgroundColor: '#EBF4FB', fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1A1A1A' }}>
                No validation issues were found for recent batches.
              </div>
            )}
            <div className="space-y-3">
              {pageData.validationIssues.map((issue, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded border"
                  style={{ borderColor: '#D8D8D8' }}
                >
                  <div className="flex items-center gap-3">
                    {issue.severity === 'high' && <AlertCircle className="w-5 h-5" style={{ color: '#B8860B' }} />}
                    {issue.severity === 'moderate' && <AlertCircle className="w-5 h-5" style={{ color: '#E8C94F' }} />}
                    {issue.severity === 'low' && <CheckCircle className="w-5 h-5" style={{ color: '#A8C8E8' }} />}
                    <div>
                      <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1A1A1A' }}>
                        {issue.type}
                      </div>
                      <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888' }}>
                        Severity: {issue.severity}
                      </div>
                    </div>
                  </div>
                  <span 
                    className="px-3 py-1 rounded" 
                    style={{ 
                      fontFamily: 'Arial, sans-serif', 
                      fontSize: '11px', 
                      fontWeight: 'bold',
                      backgroundColor: '#EBF4FB',
                      color: '#1A1A1A'
                    }}
                  >
                    {issue.count}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4" style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888' }}>
              Use the upload workflow above to review and clean the current file issues.
            </div>
          </div>

          {/* Data Quality Dashboard */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 
              className="mb-4" 
              style={{ 
                fontFamily: 'Arial, sans-serif', 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: '#1B3A5C' 
              }}
            >
              Data Quality by Region
            </h2>
            {!isLoading && !hasRegionalQuality && (
              <div className="p-3 rounded mb-3" style={{ backgroundColor: '#EBF4FB', fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1A1A1A' }}>
                No regional quality snapshots are available yet.
              </div>
            )}
            <div className="space-y-4">
              {pageData.dataQualityByRegion.map((region, index) => (
                <div key={index} className="p-3 rounded" style={{ backgroundColor: '#EBF4FB' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>
                      {region.region}
                    </span>
                    <span 
                      className="px-2 py-1 rounded" 
                      style={{ 
                        fontFamily: 'Arial, sans-serif', 
                        fontSize: '10px', 
                        fontWeight: 'bold',
                        backgroundColor: region.score >= 85 ? '#2E6DA4' : region.score >= 75 ? '#E8C94F' : '#B8860B',
                        color: '#FFFFFF'
                      }}
                    >
                      {region.score}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs" style={{ fontFamily: 'Arial, sans-serif' }}>
                    <div style={{ color: '#888888' }}>
                      Completeness: <strong style={{ color: '#1A1A1A' }}>{region.completeness}%</strong>
                    </div>
                    <div style={{ color: '#888888' }}>
                      Recency: <strong style={{ color: '#1A1A1A' }}>{region.recency}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}