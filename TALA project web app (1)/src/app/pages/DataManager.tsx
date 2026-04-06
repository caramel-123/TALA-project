import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { StatusBadge } from '../components/dashboard/StatusBadge';
import { Upload, CheckCircle, AlertCircle, XCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';

const dataSources = [
  {
    name: 'DepEd Teacher Master List Q1 2026',
    type: 'Teacher Records',
    region: 'National',
    records: 428950,
    lastUpdated: 'March 30, 2026',
    completeness: 94,
    status: 'validated' as const,
  },
  {
    name: 'STAR Training Attendance - Region IV-A',
    type: 'Training Data',
    region: 'Calabarzon',
    records: 8240,
    lastUpdated: 'April 2, 2026',
    completeness: 89,
    status: 'validated' as const,
  },
  {
    name: 'School Infrastructure Survey',
    type: 'Infrastructure',
    region: 'Multi-region',
    records: 12450,
    lastUpdated: 'April 1, 2026',
    completeness: 76,
    status: 'pending' as const,
  },
  {
    name: 'Remote Area Classification',
    type: 'Geographic Data',
    region: 'National',
    records: 3280,
    lastUpdated: 'March 15, 2026',
    completeness: 68,
    status: 'flagged' as const,
  },
];

const validationIssues = [
  { type: 'Missing required field', count: 142, severity: 'high' },
  { type: 'Duplicate record', count: 38, severity: 'moderate' },
  { type: 'Format mismatch', count: 89, severity: 'moderate' },
  { type: 'Out-of-range value', count: 24, severity: 'high' },
  { type: 'Provenance conflict', count: 12, severity: 'low' },
];

const dataQualityByRegion = [
  { region: 'NCR', score: 96, completeness: 98, recency: 'Current' },
  { region: 'Region IV-A', score: 89, completeness: 92, recency: 'Current' },
  { region: 'Region XII', score: 84, completeness: 86, recency: 'Recent' },
  { region: 'BARMM', score: 72, completeness: 74, recency: 'Outdated' },
];

export function DataManager() {
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
                {dataSources.map((source, index) => (
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
            <div className="space-y-3">
              {validationIssues.map((issue, index) => (
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
            <div className="space-y-4">
              {dataQualityByRegion.map((region, index) => (
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