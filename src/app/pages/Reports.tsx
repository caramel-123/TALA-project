import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { FileText, Download, Share2, Archive, Eye, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';
import { useState } from 'react';
import { generatedReports, reportTemplates } from '../../features/shared/dev-seed/non-dashboard';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

// ─── Types ────────────────────────────────────────────────────────────────────

type Format = 'pdf' | 'excel';

interface ReportConfig {
  type: string;
  scope: string;
  sections: string[];
  format: Format;
}

// ─── Sample report data used when generating ──────────────────────────────────

const SAMPLE_DATA = {
  kpis: [
    { label: 'Active Regions', value: '17' },
    { label: 'Data Completeness', value: '82%' },
    { label: 'High-Priority Divisions', value: '34' },
    { label: 'Teachers Profiled', value: '12,840' },
  ],
  gapAnalysis: [
    { region: 'BARMM', score: 91, topFactor: 'Science teacher shortage', confidence: 'High' },
    { region: 'Region XII – SOCCSKSARGEN', score: 84, topFactor: 'Specialization mismatch', confidence: 'High' },
    { region: 'Region V – Bicol', score: 78, topFactor: 'Low STAR coverage', confidence: 'Moderate' },
    { region: 'Region IX – Zamboanga', score: 74, topFactor: 'Geographic isolation', confidence: 'Moderate' },
    { region: 'Region VIII – Eastern Visayas', score: 69, topFactor: 'Limited trainer access', confidence: 'Low' },
  ],
  recommendations: [
    { region: 'BARMM', intervention: 'Inquiry-Based Science (7E Model)', modality: 'Blended', priority: 'Critical' },
    { region: 'Region XII', intervention: 'Teaching Math through Problem Solving', modality: 'Face-to-face', priority: 'High' },
    { region: 'Region V', intervention: 'Instrumentation and Improvisation', modality: 'Alternative', priority: 'High' },
  ],
  dataQuality: [
    { source: 'STAR Training Records', completeness: '94%', recency: 'April 2026', status: 'Validated' },
    { source: 'Regional Admin Uploads', completeness: '78%', recency: 'March 2026', status: 'Pending Review' },
    { source: 'DepEd Teacher Registry', completeness: '61%', recency: 'January 2026', status: 'Flagged' },
  ],
};

// ─── PDF Generator ────────────────────────────────────────────────────────────

function generatePDF(config: ReportConfig): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = 0;

  const setNavy = () => doc.setFillColor(27, 58, 92);
  const setMedBlue = () => doc.setFillColor(46, 109, 164);
  const setLightBlue = () => doc.setFillColor(213, 232, 247);
  const setPaleBlue = () => doc.setFillColor(235, 244, 251);
  const setYellowFill = () => doc.setFillColor(232, 201, 79);
  const setWhiteFill = () => doc.setFillColor(255, 255, 255);
  const setWhiteText = () => doc.setTextColor(255, 255, 255);
  const setNavyText = () => doc.setTextColor(27, 58, 92);
  const setBlackText = () => doc.setTextColor(26, 26, 26);
  const setGrayText = () => doc.setTextColor(136, 136, 136);

  const addPage = () => {
    doc.addPage();
    y = 20;
    setNavy();
    doc.rect(0, 0, pageW, 12, 'F');
    setWhiteText();
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('TALA: Teacher Analytics and Localized Action  |  STAR Program Planning Intelligence Layer', margin, 8);
    doc.text(`${config.type} — ${config.scope}`, pageW - margin, 8, { align: 'right' });
    y = 20;
  };

  const checkY = (needed: number) => {
    if (y + needed > 275) addPage();
  };

  // ── Cover header ──
  setNavy();
  doc.rect(0, 0, pageW, 55, 'F');
  setYellowFill();
  doc.rect(0, 55, pageW, 12, 'F');

  setWhiteText();
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('TALA', margin, 22);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Teacher Analytics and Localized Action', margin, 31);
  doc.setFontSize(9);
  doc.text('STAR Program Planning Intelligence Layer', margin, 38);

  doc.setTextColor(26, 26, 26);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`${config.type}  —  ${config.scope}`, margin, 62);

  setGrayText();
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const now = new Date();
  doc.text(`Generated: ${now.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}   |   IDA Engine: Integrate · Diagnose · Advise`, margin, 70);

  y = 82;

  // ── KPIs ──
  if (config.sections.includes('KPIs')) {
    checkY(30);
    setMedBlue();
    doc.rect(margin, y, contentW, 7, 'F');
    setWhiteText();
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('KEY PERFORMANCE INDICATORS', margin + 3, y + 5);
    y += 10;

    const cardW = contentW / 4 - 2;
    SAMPLE_DATA.kpis.forEach((kpi, i) => {
      const x = margin + i * (cardW + 2.67);
      setLightBlue();
      doc.rect(x, y, cardW, 18, 'F');
      setNavyText();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(kpi.value, x + cardW / 2, y + 10, { align: 'center' });
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      setGrayText();
      doc.text(kpi.label, x + cardW / 2, y + 15, { align: 'center' });
    });
    y += 24;
  }

  // ── Gap Analysis ──
  if (config.sections.includes('Gap Analysis')) {
    checkY(50);
    setNavy();
    doc.rect(margin, y, contentW, 7, 'F');
    setWhiteText();
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('GAP ANALYSIS — UNDERSERVED AREA SCORES', margin + 3, y + 5);
    y += 10;

    const cols = [55, 25, 70, 30];
    const headers = ['Region / Division', 'Score', 'Top Gap Factor', 'Confidence'];
    setMedBlue();
    doc.rect(margin, y, contentW, 7, 'F');
    setWhiteText();
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    let cx = margin + 2;
    headers.forEach((h, i) => { doc.text(h, cx, y + 5); cx += cols[i]; });
    y += 7;

    SAMPLE_DATA.gapAnalysis.forEach((row, ri) => {
      checkY(8);
      if (ri % 2 === 0) setPaleBlue(); else setWhiteFill();
      doc.rect(margin, y, contentW, 7, 'F');
      setBlackText();
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      cx = margin + 2;
      const cells = [row.region, String(row.score), row.topFactor, row.confidence];
      cells.forEach((cell, i) => {
        doc.text(String(cell), cx, y + 5);
        cx += cols[i];
      });
      setMedBlue();
      const barX = margin + cols[0] + 2;
      doc.rect(barX, y + 5.5, (row.score / 100) * 20, 1.2, 'F');
      y += 7;
    });
    y += 6;
  }

  // ── Recommendations ──
  if (config.sections.includes('Recommendations')) {
    checkY(50);
    setNavy();
    doc.rect(margin, y, contentW, 7, 'F');
    setWhiteText();
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('INTERVENTION RECOMMENDATIONS', margin + 3, y + 5);
    y += 10;

    const cols2 = [55, 75, 30, 20];
    const headers2 = ['Region', 'Recommended Intervention', 'Modality', 'Priority'];
    setMedBlue();
    doc.rect(margin, y, contentW, 7, 'F');
    setWhiteText();
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    let cx2 = margin + 2;
    headers2.forEach((h, i) => { doc.text(h, cx2, y + 5); cx2 += cols2[i]; });
    y += 7;

    SAMPLE_DATA.recommendations.forEach((row, ri) => {
      checkY(8);
      if (ri % 2 === 0) setPaleBlue(); else setWhiteFill();
      doc.rect(margin, y, contentW, 7, 'F');
      setBlackText();
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      cx2 = margin + 2;
      [row.region, row.intervention, row.modality, row.priority].forEach((cell, i) => {
        doc.text(String(cell), cx2, y + 5);
        cx2 += cols2[i];
      });
      y += 7;
    });
    y += 6;
  }

  // ── Data Quality ──
  if (config.sections.includes('Data Quality Notes')) {
    checkY(50);
    setNavy();
    doc.rect(margin, y, contentW, 7, 'F');
    setWhiteText();
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DATA QUALITY SUMMARY', margin + 3, y + 5);
    y += 10;

    const cols3 = [65, 30, 35, 35];
    const headers3 = ['Data Source', 'Completeness', 'Last Updated', 'Status'];
    setMedBlue();
    doc.rect(margin, y, contentW, 7, 'F');
    setWhiteText();
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    let cx3 = margin + 2;
    headers3.forEach((h, i) => { doc.text(h, cx3, y + 5); cx3 += cols3[i]; });
    y += 7;

    SAMPLE_DATA.dataQuality.forEach((row, ri) => {
      checkY(8);
      if (ri % 2 === 0) setPaleBlue(); else setWhiteFill();
      doc.rect(margin, y, contentW, 7, 'F');
      setBlackText();
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      cx3 = margin + 2;
      [row.source, row.completeness, row.recency, row.status].forEach((cell, i) => {
        doc.text(String(cell), cx3, y + 5);
        cx3 += cols3[i];
      });
      y += 7;
    });
    y += 6;
  }

  // ── Footer on all pages ──
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const pageH = doc.internal.pageSize.getHeight();
    setNavy();
    doc.rect(0, pageH - 10, pageW, 10, 'F');
    setWhiteText();
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text('STAR Program  |  TALA Planning Intelligence Layer  |  Confidential — For Planning Use Only', margin, pageH - 4);
    doc.text(`Page ${p} of ${totalPages}`, pageW - margin, pageH - 4, { align: 'right' });
  }

  const filename = `TALA_${config.type.replace(/\s+/g, '_')}_${config.scope.replace(/\s+/g, '_')}_${now.getFullYear()}.pdf`;
  doc.save(filename);
}

// ─── Excel Generator ──────────────────────────────────────────────────────────

function generateExcel(config: ReportConfig): void {
  const wb = XLSX.utils.book_new();

  const metaData = [
    ['TALA: Teacher Analytics and Localized Action'],
    ['STAR Program Planning Intelligence Layer'],
    [''],
    ['Report Type', config.type],
    ['Scope', config.scope],
    ['Generated', new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })],
    ['Sections', config.sections.join(', ')],
  ];
  const metaSheet = XLSX.utils.aoa_to_sheet(metaData);
  metaSheet['!cols'] = [{ wch: 25 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, metaSheet, 'Report Info');

  if (config.sections.includes('KPIs')) {
    const kpiData = [
      ['Indicator', 'Value'],
      ...SAMPLE_DATA.kpis.map(k => [k.label, k.value]),
    ];
    const kpiSheet = XLSX.utils.aoa_to_sheet(kpiData);
    kpiSheet['!cols'] = [{ wch: 30 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, kpiSheet, 'KPIs');
  }

  if (config.sections.includes('Gap Analysis')) {
    const gapData = [
      ['Region / Division', 'Underserved Area Score', 'Top Gap Factor', 'Confidence Level'],
      ...SAMPLE_DATA.gapAnalysis.map(r => [r.region, r.score, r.topFactor, r.confidence]),
    ];
    const gapSheet = XLSX.utils.aoa_to_sheet(gapData);
    gapSheet['!cols'] = [{ wch: 35 }, { wch: 22 }, { wch: 40 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, gapSheet, 'Gap Analysis');
  }

  if (config.sections.includes('Recommendations')) {
    const recData = [
      ['Region', 'Recommended Intervention', 'Delivery Modality', 'Priority Level'],
      ...SAMPLE_DATA.recommendations.map(r => [r.region, r.intervention, r.modality, r.priority]),
    ];
    const recSheet = XLSX.utils.aoa_to_sheet(recData);
    recSheet['!cols'] = [{ wch: 30 }, { wch: 45 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, recSheet, 'Recommendations');
  }

  if (config.sections.includes('Data Quality Notes')) {
    const dqData = [
      ['Data Source', 'Completeness', 'Last Updated', 'Validation Status'],
      ...SAMPLE_DATA.dataQuality.map(r => [r.source, r.completeness, r.recency, r.status]),
    ];
    const dqSheet = XLSX.utils.aoa_to_sheet(dqData);
    dqSheet['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, dqSheet, 'Data Quality');
  }

  const now = new Date();
  const filename = `TALA_${config.type.replace(/\s+/g, '_')}_${config.scope.replace(/\s+/g, '_')}_${now.getFullYear()}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ─── Existing-report download (PDF or Excel) ──────────────────────────────────

function downloadExistingReport(report: typeof generatedReports[0], format: Format): void {
  if (format === 'pdf') {
    generatePDF({
      type: report.type,
      scope: report.scope,
      sections: ['KPIs', 'Gap Analysis', 'Recommendations', 'Data Quality Notes'],
      format: 'pdf',
    });
  } else {
    generateExcel({
      type: report.type,
      scope: report.scope,
      sections: ['KPIs', 'Gap Analysis', 'Recommendations', 'Data Quality Notes'],
      format: 'excel',
    });
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

const ALL_SECTIONS = ['KPIs', 'Gap Analysis', 'Recommendations', 'Data Quality Notes'];

export function Reports() {
  const [selectedFormat, setSelectedFormat] = useState<Format>('pdf');
  const [selectedType, setSelectedType] = useState(reportTemplates[0].name);
  const [selectedScope, setSelectedScope] = useState('Region XII - SOCCSKSARGEN');
  const [selectedSections, setSelectedSections] = useState<string[]>(ALL_SECTIONS);
  const [generating, setGenerating] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [previewConfig, setPreviewConfig] = useState<ReportConfig | null>(null);

  const toggleSection = (section: string) => {
    setSelectedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const handleGenerateReport = () => {
    if (selectedSections.length === 0) {
      toast.error('Please select at least one content section.');
      return;
    }

    const config: ReportConfig = {
      type: selectedType,
      scope: selectedScope,
      sections: selectedSections,
      format: selectedFormat,
    };

    setGenerating(true);
    setPreviewReady(false);
    toast.info(`Generating ${selectedFormat.toUpperCase()} report...`);

    setTimeout(() => {
      try {
        if (selectedFormat === 'pdf') {
          generatePDF(config);
        } else {
          generateExcel(config);
        }
        setPreviewConfig(config);
        setPreviewReady(true);
        setGenerating(false);
        toast.success(`Report downloaded as ${selectedFormat.toUpperCase()}!`);
      } catch (err) {
        setGenerating(false);
        toast.error('Failed to generate report. Please try again.');
      }
    }, 800);
  };

  const handleDownload = (report: typeof generatedReports[0]) => {
    toast.info(`Preparing ${report.name}...`);
    setTimeout(() => {
      downloadExistingReport(report, selectedFormat);
      toast.success(`Downloaded as ${selectedFormat.toUpperCase()}`);
    }, 600);
  };

  const handleShare = (reportName: string) => {
    navigator.clipboard?.writeText(`TALA Report: ${reportName}`).catch(() => {});
    toast.info(`Share link copied for: ${reportName}`);
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
            className="mb-1"
            style={{ fontFamily: 'Arial, sans-serif', fontSize: '24px', fontWeight: 'bold', color: '#1B3A5C' }}
          >
            Reports and Export Center
          </h1>
          <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888' }}>
            Generate planning briefs, gap analysis exports, and intervention summaries for decision-making and documentation
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Report Builder ── */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Builder header */}
            <div style={{ backgroundColor: '#1B3A5C', padding: '12px 20px' }}>
              <h2 style={{ fontFamily: 'Arial, sans-serif', fontSize: '13px', fontWeight: 'bold', color: '#FFFFFF', margin: 0 }}>
                Report Builder
              </h2>
            </div>

            <div className="p-5 space-y-5">
              {/* Report Type */}
              <div>
                <label className="block mb-1" style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', fontWeight: 'bold', color: '#1B3A5C' }}>
                  Report Type
                </label>
                <select
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none"
                  style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', borderColor: '#D8D8D8', color: '#1A1A1A' }}
                >
                  {reportTemplates.map((t, i) => (
                    <option key={i} value={t.name}>{t.name} ({t.scope})</option>
                  ))}
                </select>
              </div>

              {/* Scope */}
              <div>
                <label className="block mb-1" style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', fontWeight: 'bold', color: '#1B3A5C' }}>
                  Select Scope
                </label>
                <select
                  value={selectedScope}
                  onChange={e => setSelectedScope(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none"
                  style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', borderColor: '#D8D8D8', color: '#1A1A1A' }}
                >
                  <option>Region XII - SOCCSKSARGEN</option>
                  <option>Region V - Bicol</option>
                  <option>BARMM</option>
                  <option>Region IV-A - Calabarzon</option>
                  <option>National</option>
                </select>
              </div>

              {/* Content Sections */}
              <div>
                <label className="block mb-2" style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', fontWeight: 'bold', color: '#1B3A5C' }}>
                  Content Sections
                </label>
                <div className="space-y-1.5">
                  {ALL_SECTIONS.map((section) => (
                    <label key={section} className="flex items-center gap-2 cursor-pointer group">
                      <div
                        onClick={() => toggleSection(section)}
                        className="w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-colors"
                        style={{
                          backgroundColor: selectedSections.includes(section) ? '#2E6DA4' : '#FFFFFF',
                          borderColor: selectedSections.includes(section) ? '#2E6DA4' : '#D8D8D8',
                        }}
                      >
                        {selectedSections.includes(section) && (
                          <CheckSquare className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1A1A1A' }}>
                        {section}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Export Format */}
              <div>
                <label className="block mb-2" style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', fontWeight: 'bold', color: '#1B3A5C' }}>
                  Export Format
                </label>
                <div className="flex gap-2">
                  {(['pdf', 'excel'] as Format[]).map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => setSelectedFormat(fmt)}
                      className="flex-1 px-3 py-2 rounded border transition-colors cursor-pointer"
                      style={{
                        fontFamily: 'Arial, sans-serif',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        backgroundColor: selectedFormat === fmt ? '#2E6DA4' : '#FFFFFF',
                        borderColor: selectedFormat === fmt ? '#2E6DA4' : '#D8D8D8',
                        color: selectedFormat === fmt ? '#FFFFFF' : '#2E6DA4',
                      }}
                    >
                      {fmt === 'pdf' ? 'PDF' : 'Excel'}
                    </button>
                  ))}
                </div>
                <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888', marginTop: '4px' }}>
                  {selectedFormat === 'pdf'
                    ? 'Formatted PDF — ideal for presentations and sharing'
                    : 'Excel workbook — ideal for further data analysis'}
                </p>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateReport}
                disabled={generating}
                className="w-full px-4 py-3 rounded transition-colors cursor-pointer"
                style={{
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  backgroundColor: generating ? '#A8C8E8' : '#2E6DA4',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: generating ? 'wait' : 'pointer',
                }}
              >
                {generating ? 'Generating...' : `Generate & Download ${selectedFormat.toUpperCase()}`}
              </button>

              <button
                onClick={() => toast.success('Template configuration saved')}
                className="w-full px-4 py-2 rounded border transition-colors cursor-pointer hover:bg-[#EBF4FB]"
                style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', fontWeight: 'bold', borderColor: '#2E6DA4', color: '#2E6DA4', backgroundColor: '#FFFFFF' }}
              >
                Save as Template
              </button>
            </div>
          </div>

          {/* ── Right Column ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Report Library */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div style={{ backgroundColor: '#1B3A5C', padding: '12px 20px' }}>
                <h2 style={{ fontFamily: 'Arial, sans-serif', fontSize: '13px', fontWeight: 'bold', color: '#FFFFFF', margin: 0 }}>
                  Report Library
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: '#D5E8F7' }}>
                      {['Report Name', 'Type', 'Scope', 'Date', 'Generated By', 'Actions'].map(h => (
                        <th key={h} className="text-left p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', fontWeight: 'bold', color: '#1B3A5C' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {generatedReports.map((report, index) => (
                      <tr key={index} className="border-b hover:bg-[#EBF4FB] transition-colors" style={{ borderColor: '#D8D8D8' }}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 flex-shrink-0" style={{ color: '#2E6DA4' }} />
                            <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#1A1A1A' }}>{report.name}</span>
                          </div>
                        </td>
                        <td className="p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#888888' }}>{report.type}</td>
                        <td className="p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#888888' }}>{report.scope}</td>
                        <td className="p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#888888', whiteSpace: 'nowrap' }}>{report.date}</td>
                        <td className="p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#888888' }}>{report.generatedBy}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDownload(report)}
                              className="p-1.5 rounded hover:bg-[#D5E8F7] transition-colors cursor-pointer"
                              title={`Download as ${selectedFormat.toUpperCase()}`}
                            >
                              <Download className="w-4 h-4" style={{ color: '#2E6DA4' }} />
                            </button>
                            <button
                              onClick={() => handleShare(report.name)}
                              className="p-1.5 rounded hover:bg-[#D5E8F7] transition-colors cursor-pointer"
                              title="Share"
                            >
                              <Share2 className="w-4 h-4" style={{ color: '#2E6DA4' }} />
                            </button>
                            <button
                              onClick={() => handleArchive(report.name)}
                              className="p-1.5 rounded hover:bg-[#D5E8F7] transition-colors cursor-pointer"
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
              <div className="px-4 py-2 border-t" style={{ borderColor: '#D8D8D8', backgroundColor: '#FAFAFA' }}>
                <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888' }}>
                  Download icons will export using your selected format ({selectedFormat.toUpperCase()}) from the builder panel.
                </p>
              </div>
            </div>

            {/* Live Preview / Confirmation Panel */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div style={{ backgroundColor: '#1B3A5C', padding: '12px 20px' }}>
                <h2 style={{ fontFamily: 'Arial, sans-serif', fontSize: '13px', fontWeight: 'bold', color: '#FFFFFF', margin: 0 }}>
                  Report Preview
                </h2>
              </div>

              {!previewReady ? (
                <div
                  className="flex flex-col items-center justify-center p-12 text-center"
                  style={{ minHeight: '260px', backgroundColor: '#FAFAFA' }}
                >
                  {generating ? (
                    <>
                      <div
                        className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mb-4"
                        style={{ borderColor: '#A8C8E8', borderTopColor: 'transparent' }}
                      />
                      <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#2E6DA4', fontWeight: 'bold' }}>
                        Building your report...
                      </p>
                      <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888', marginTop: '4px' }}>
                        Compiling {selectedSections.join(', ')}
                      </p>
                    </>
                  ) : (
                    <>
                      <Eye className="w-14 h-14 mb-3" style={{ color: '#A8C8E8' }} />
                      <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888' }}>
                        Configure your report and click Generate to download
                      </p>
                      <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888', marginTop: '4px' }}>
                        PDF opens immediately — Excel saves to your downloads folder
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="p-5">
                  {/* Success state with summary */}
                  <div
                    className="rounded-lg p-4 mb-4 flex items-start gap-3"
                    style={{ backgroundColor: '#EBF4FB', borderLeft: '4px solid #2E6DA4' }}
                  >
                    <Download className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#2E6DA4' }} />
                    <div>
                      <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>
                        Report downloaded successfully
                      </p>
                      <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888', marginTop: '2px' }}>
                        Check your downloads folder for the {previewConfig?.format.toUpperCase()} file.
                      </p>
                    </div>
                  </div>

                  {/* Report summary card */}
                  {previewConfig && (
                    <div className="rounded border overflow-hidden" style={{ borderColor: '#D8D8D8' }}>
                      <div style={{ backgroundColor: '#D5E8F7', padding: '8px 14px' }}>
                        <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', fontWeight: 'bold', color: '#1B3A5C' }}>
                          Last Generated Report
                        </p>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {[
                          { label: 'Type', value: previewConfig.type },
                          { label: 'Scope', value: previewConfig.scope },
                          { label: 'Format', value: previewConfig.format.toUpperCase() },
                          { label: 'Sections', value: `${previewConfig.sections.length} included` },
                        ].map(item => (
                          <div key={item.label}>
                            <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888' }}>{item.label}</p>
                            <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>{item.value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="px-4 pb-4">
                        <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888' }}>
                          Sections: {previewConfig.sections.join(' · ')}
                        </p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleGenerateReport}
                    disabled={generating}
                    className="mt-4 w-full px-4 py-2 rounded border transition-colors cursor-pointer hover:bg-[#EBF4FB]"
                    style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', fontWeight: 'bold', borderColor: '#2E6DA4', color: '#2E6DA4', backgroundColor: '#FFFFFF' }}
                  >
                    Download Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}