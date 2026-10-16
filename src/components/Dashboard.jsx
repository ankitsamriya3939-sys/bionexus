import React, { useState } from 'react';
import { LayoutDashboard, Scissors, Binary, FileText, Download, Upload, Trash2, Plus, FileCode } from 'lucide-react';
import { generateQuickPdfReport } from '../utils/pdfGenerator';

export default function Dashboard({ savedPrimers = [], savedAnalyses = [], savedFastas = [], deletePrimer, deleteAnalysis, exportWorkspaceJson, importWorkspaceJson }) {
  const [activeTab, setActiveTab] = useState('primers');

  const handleExportPdf = (item, type) => {
    if (type === 'primer') {
      generateQuickPdfReport({
        title: `Primer Design Report - ${item.name || 'Sample'}`,
        sectionData: [
          { label: 'Forward Primer', value: item.forward?.sequence || 'N/A' },
          { label: 'Forward Tm', value: `${item.forward?.tm || 0} °C` },
          { label: 'Reverse Primer', value: item.reverse?.sequence || 'N/A' },
          { label: 'Reverse Tm', value: `${item.reverse?.tm || 0} °C` },
          { label: 'Product Length', value: `${item.productLength || 0} bp` },
          { label: 'Recommended Ta', value: `${item.recommendedTa || 0} °C` }
        ]
      });
    } else if (type === 'analysis') {
      generateQuickPdfReport({
        title: `Sequence Analysis Report - ${item.name || 'Sample'}`,
        sectionData: [
          { label: 'Sequence Length', value: `${item.gcData?.length || 0} bp` },
          { label: 'GC Content', value: `${item.gcData?.gcPercent || 0}%` },
          { label: 'Detected ORFs', value: `${item.orfs?.length || 0}` },
          { label: 'Protein MW', value: `${item.mw || 0} kDa` },
          { label: 'Isoelectric Point (pI)', value: `${item.pi || 0}` }
        ]
      });
    }
  };

  return (
    <div className="page-fade-in">
      <div className="card-header">
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Workspace Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Manage saved primer sets, sequence analyses, FASTA uploads, and PDF reports.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={exportWorkspaceJson}>
            <Download size={16} /> Export Backup (.json)
          </button>
          <label className="btn-secondary" style={{ cursor: 'pointer' }}>
            <Upload size={16} /> Import Backup
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={importWorkspaceJson} />
          </label>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid-4" style={{ marginBottom: '24px' }}>
        <div className="stat-pill">
          <div className="stat-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' }}>
            <Scissors size={20} />
          </div>
          <div>
            <div className="stat-value">{savedPrimers.length}</div>
            <div className="stat-label">Saved Primers</div>
          </div>
        </div>

        <div className="stat-pill">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)' }}>
            <Binary size={20} />
          </div>
          <div>
            <div className="stat-value">{savedAnalyses.length}</div>
            <div className="stat-label">Sequence Analyses</div>
          </div>
        </div>

        <div className="stat-pill">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-violet)' }}>
            <FileCode size={20} />
          </div>
          <div>
            <div className="stat-value">{savedFastas.length}</div>
            <div className="stat-label">FASTA Uploads</div>
          </div>
        </div>

        <div className="stat-pill">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' }}>
            <FileText size={20} />
          </div>
          <div>
            <div className="stat-value">{savedPrimers.length + savedAnalyses.length}</div>
            <div className="stat-label">Generated Reports</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', marginBottom: '20px' }}>
        <button
          className={`nav-item ${activeTab === 'primers' ? 'active' : ''}`}
          style={{ padding: '8px 16px', borderRadius: '8px 8px 0 0' }}
          onClick={() => setActiveTab('primers')}
        >
          Saved Primers ({savedPrimers.length})
        </button>
        <button
          className={`nav-item ${activeTab === 'analyses' ? 'active' : ''}`}
          style={{ padding: '8px 16px', borderRadius: '8px 8px 0 0' }}
          onClick={() => setActiveTab('analyses')}
        >
          Saved Analyses ({savedAnalyses.length})
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'primers' && (
        <div className="glass-card">
          <div className="card-header">
            <h3 className="card-title"><Scissors size={18} color="var(--accent-cyan)" /> Saved Primer Pairs</h3>
          </div>

          {savedPrimers.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
              No saved primers yet. Use the Primer Designer to generate and save primer sets.
            </p>
          ) : (
            <div className="table-container">
              <table className="bio-table">
                <thead>
                  <tr>
                    <th>Name / Gene</th>
                    <th>Forward Primer (5'-3')</th>
                    <th>Reverse Primer (5'-3')</th>
                    <th>Product</th>
                    <th>Fwd/Rev Tm</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {savedPrimers.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{item.name || `Primer Set #${idx + 1}`}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>{item.forward?.sequence}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: '#34d399' }}>{item.reverse?.sequence}</td>
                      <td>{item.productLength} bp</td>
                      <td>{item.forward?.tm} °C / {item.reverse?.tm} °C</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-icon" title="Export PDF" onClick={() => handleExportPdf(item, 'primer')}>
                            <FileText size={16} />
                          </button>
                          <button className="btn-icon" title="Delete" onClick={() => deletePrimer(idx)}>
                            <Trash2 size={16} color="var(--accent-rose)" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analyses' && (
        <div className="glass-card">
          <div className="card-header">
            <h3 className="card-title"><Binary size={18} color="var(--accent-emerald)" /> Saved Sequence Analyses</h3>
          </div>

          {savedAnalyses.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
              No saved sequence analyses yet. Use the Sequence Analysis module to run and save reports.
            </p>
          ) : (
            <div className="table-container">
              <table className="bio-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Length</th>
                    <th>GC%</th>
                    <th>ORFs Found</th>
                    <th>Protein MW</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {savedAnalyses.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{item.name || `Analysis #${idx + 1}`}</td>
                      <td>{item.gcData?.length || 0} bp</td>
                      <td>{item.gcData?.gcPercent || 0}%</td>
                      <td>{item.orfs?.length || 0}</td>
                      <td>{item.mw || 0} kDa</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-icon" title="Export PDF" onClick={() => handleExportPdf(item, 'analysis')}>
                            <FileText size={16} />
                          </button>
                          <button className="btn-icon" title="Delete" onClick={() => deleteAnalysis(idx)}>
                            <Trash2 size={16} color="var(--accent-rose)" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
