import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { FileText, Download, Share2, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';
import { useState } from 'react';
import { generatedReports, reportTemplates } from '../../features/shared/dev-seed/non-dashboard';

export function Reports() {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'excel'>('pdf');

  const handleGenerateReport = () => {
    toast.info(`Generating report in ${selectedFormat.toUpperCase()} format...`);
    setTimeout(() => {
      toast.success(`Report generated successfully as ${selectedFormat.toUpperCase()}!`);
    }, 2000);
  };

  const handleSaveTemplate = () => {
    toast.success('Report template saved');
  };

  const handleDownload = (reportName: string, format: 'pdf' | 'excel') => {
    toast.success(`Downloading ${reportName} as ${format.toUpperCase()}...`);
    // Simulate download
    setTimeout(() => {
      toast.success(`${reportName}.${format === 'pdf' ? 'pdf' : 'xlsx'} downloaded`);
    }, 1000);
  };

  const handleShare = (reportName: string) => {
    toast.info(`Opening share dialog for: ${reportName}`);
  };

  const handleArchive = (reportName: string) => {
    toast.success(`${reportName} archived`);
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
            Reports and Export Center
          </h1>
          <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888' }}>
            Generate outputs for planning meetings, documentation, and decision-making
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Builder */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-sm p-6">
            <h2 
              className="mb-4" 
              style={{ 
                fontFamily: 'Arial, sans-serif', 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: '#1B3A5C' 
              }}
            >
              Report Builder
            </h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label 
                  className="block mb-2" 
                  style={{ 
                    fontFamily: 'Arial, sans-serif', 
                    fontSize: '11px', 
                    fontWeight: 'bold',
                    color: '#1B3A5C' 
                  }}
                >
                  Report Type
                </label>
                <select 
                  className="w-full px-3 py-2 border rounded"
                  style={{
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '11px',
                    borderColor: '#D8D8D8'
                  }}
                >
                  {reportTemplates.map((template, index) => (
                    <option key={index} value={template.name}>
                      {template.name} ({template.scope})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label 
                  className="block mb-2" 
                  style={{ 
                    fontFamily: 'Arial, sans-serif', 
                    fontSize: '11px', 
                    fontWeight: 'bold',
                    color: '#1B3A5C' 
                  }}
                >
                  Select Scope
                </label>
                <select 
                  className="w-full px-3 py-2 border rounded"
                  style={{
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '11px',
                    borderColor: '#D8D8D8'
                  }}
                >
                  <option>Region XII - SOCCSKSARGEN</option>
                  <option>Region V - Bicol</option>
                  <option>BARMM</option>
                  <option>Region IV-A - Calabarzon</option>
                  <option>National</option>
                </select>
              </div>

              <div>
                <label 
                  className="block mb-2" 
                  style={{ 
                    fontFamily: 'Arial, sans-serif', 
                    fontSize: '11px', 
                    fontWeight: 'bold',
                    color: '#1B3A5C' 
                  }}
                >
                  Content Sections
                </label>
                <div className="space-y-2">
                  {['KPIs', 'Gap Analysis', 'Recommendations', 'Data Quality Notes'].map((section, index) => (
                    <label key={index} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        defaultChecked
                        className="rounded"
                        style={{ accentColor: '#2E6DA4' }}
                      />
                      <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1A1A1A' }}>
                        {section}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label 
                  className="block mb-2" 
                  style={{ 
                    fontFamily: 'Arial, sans-serif', 
                    fontSize: '11px', 
                    fontWeight: 'bold',
                    color: '#1B3A5C' 
                  }}
                >
                  Export Format
                </label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setSelectedFormat('pdf');
                      toast.success('PDF format selected');
                    }}
                    className={`
                      flex-1 px-3 py-2 rounded border transition-colors cursor-pointer
                      ${selectedFormat === 'pdf' ? 'bg-[#2E6DA4] text-white border-[#2E6DA4]' : 'bg-white hover:bg-[#D5E8F7]'}
                    `}
                    style={{ 
                      fontFamily: 'Arial, sans-serif', 
                      fontSize: '10px', 
                      fontWeight: 'bold',
                      borderColor: selectedFormat === 'pdf' ? '#2E6DA4' : '#D8D8D8',
                      color: selectedFormat === 'pdf' ? '#FFFFFF' : '#2E6DA4'
                    }}
                  >
                    PDF
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedFormat('excel');
                      toast.success('Excel format selected');
                    }}
                    className={`
                      flex-1 px-3 py-2 rounded border transition-colors cursor-pointer
                      ${selectedFormat === 'excel' ? 'bg-[#2E6DA4] text-white border-[#2E6DA4]' : 'bg-white hover:bg-[#D5E8F7]'}
                    `}
                    style={{ 
                      fontFamily: 'Arial, sans-serif', 
                      fontSize: '10px', 
                      fontWeight: 'bold',
                      borderColor: selectedFormat === 'excel' ? '#2E6DA4' : '#D8D8D8',
                      color: selectedFormat === 'excel' ? '#FFFFFF' : '#1A1A1A'
                    }}
                  >
                    Excel
                  </button>
                </div>
              </div>
            </div>

            <button 
              onClick={handleGenerateReport}
              className="w-full px-4 py-3 rounded bg-[#2E6DA4] text-white hover:bg-[#1B3A5C] transition-colors cursor-pointer"
              style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', fontWeight: 'bold' }}
            >
              Generate Report
            </button>

            <button 
              onClick={handleSaveTemplate}
              className="w-full mt-2 px-4 py-2 rounded bg-white border hover:bg-[#EBF4FB] transition-colors cursor-pointer"
              style={{ 
                fontFamily: 'Arial, sans-serif', 
                fontSize: '10px', 
                fontWeight: 'bold',
                borderColor: '#2E6DA4',
                color: '#2E6DA4'
              }}
            >
              Save as Template
            </button>
          </div>

          {/* Report Library & Preview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Report Library */}
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
                Report Library
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: '#D5E8F7' }}>
                      <th className="text-left p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Report Name</th>
                      <th className="text-left p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Type</th>
                      <th className="text-left p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Scope</th>
                      <th className="text-left p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Date</th>
                      <th className="text-left p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Generated By</th>
                      <th className="text-center p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedReports.map((report, index) => (
                      <tr 
                        key={index}
                        className="border-b hover:bg-[#EBF4FB] transition-colors"
                        style={{ borderColor: '#D8D8D8' }}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" style={{ color: '#2E6DA4' }} />
                            <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1A1A1A' }}>
                              {report.name}
                            </span>
                          </div>
                        </td>
                        <td className="p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888' }}>
                          {report.type}
                        </td>
                        <td className="p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888' }}>
                          {report.scope}
                        </td>
                        <td className="p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888' }}>
                          {report.date}
                        </td>
                        <td className="p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888' }}>
                          {report.generatedBy}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(report.name, selectedFormat);
                              }}
                              className="p-2 rounded hover:bg-[#D5E8F7] transition-colors cursor-pointer"
                              title="Download"
                            >
                              <Download className="w-4 h-4" style={{ color: '#2E6DA4' }} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShare(report.name);
                              }}
                              className="p-2 rounded hover:bg-[#D5E8F7] transition-colors cursor-pointer"
                              title="Share"
                            >
                              <Share2 className="w-4 h-4" style={{ color: '#2E6DA4' }} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchive(report.name);
                              }}
                              className="p-2 rounded hover:bg-[#D5E8F7] transition-colors cursor-pointer"
                              title="Archive"
                            >
                              <Archive className="w-4 h-4" style={{ color: '#888888' }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Preview Panel */}
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
                Live Preview
              </h2>
              <div 
                className="border-2 rounded-lg p-8 text-center"
                style={{ borderColor: '#D8D8D8', minHeight: '400px', backgroundColor: '#FAFAFA' }}
              >
                <FileText className="w-20 h-20 mx-auto mb-4" style={{ color: '#A8C8E8' }} />
                <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888' }}>
                  Report preview will appear here
                </p>
                <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888' }}>
                  Configure report settings and click "Generate Report" to see preview
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}