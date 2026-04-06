import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { StatusBadge } from '../components/dashboard/StatusBadge';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';
import { useEffect, useState } from 'react';
import { getDataManagerPageData } from '../../features/data-manager/api/data-manager';
import { devSeed } from '../../features/shared/dev-seed';
import type { DataManagerPageVm } from '../../features/shared/types/view-models';

export function DataManager() {
  const [pageData, setPageData] = useState<DataManagerPageVm>(devSeed.dataManager);
  const [isLoading, setIsLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const hasDataSources = pageData.dataSources.length > 0;
  const hasValidationIssues = pageData.validationIssues.length > 0;
  const hasRegionalQuality = pageData.dataQualityByRegion.length > 0;

  useEffect(() => {
    let isMounted = true;

    async function loadDataManagerData() {
      setIsLoading(true);

      try {
        const result = await getDataManagerPageData();

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

        setPageData(devSeed.dataManager);
        setUsingFallback(true);
        setLoadError(error instanceof Error ? error.message : 'Unable to load Data Manager data.');
        toast.error('Unable to load Supabase data. Showing demo values.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDataManagerData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleUpload = () => {
    toast.info('File upload dialog would open here');
  };

  const handleReviewIssues = () => {
    toast.info('Opening validation issue details panel');
  };

  const handleAutoCorrect = () => {
    toast.success('Auto-correcting 89 format mismatches...');
    setTimeout(() => {
      toast.success('Auto-correction complete!');
    }, 1500);
  };

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

        {/* Upload Section */}
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
            Upload New Data
          </h2>
          <div 
            onClick={handleUpload}
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-[#EBF4FB] transition-colors"
            style={{ borderColor: '#A8C8E8' }}
          >
            <Upload className="w-12 h-12 mx-auto mb-3" style={{ color: '#2E6DA4' }} />
            <p 
              className="mb-2" 
              style={{ 
                fontFamily: 'Arial, sans-serif', 
                fontSize: '11px', 
                fontWeight: 'bold',
                color: '#1A1A1A' 
              }}
            >
              Click to upload or drag and drop
            </p>
            <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888' }}>
              Supported formats: CSV, XLSX, JSON (Max 50MB)
            </p>
          </div>
        </div>

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
            <div className="mt-4 flex gap-2">
              <button 
                onClick={handleReviewIssues}
                className="flex-1 px-4 py-2 rounded bg-[#2E6DA4] text-white hover:bg-[#1B3A5C] transition-colors cursor-pointer"
                style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', fontWeight: 'bold' }}
              >
                Review All Issues
              </button>
              <button 
                onClick={handleAutoCorrect}
                className="px-4 py-2 rounded bg-white border hover:bg-[#EBF4FB] transition-colors cursor-pointer"
                style={{ 
                  fontFamily: 'Arial, sans-serif', 
                  fontSize: '10px', 
                  fontWeight: 'bold',
                  borderColor: '#2E6DA4',
                  color: '#2E6DA4'
                }}
              >
                Auto-Correct
              </button>
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