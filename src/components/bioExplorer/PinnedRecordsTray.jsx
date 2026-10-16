import React, { useState } from 'react';
import { 
  Pin, GitCompare, Download, FolderPlus, 
  Trash2, ChevronUp, ChevronDown, Check, FileText 
} from 'lucide-react';
import { exportToCsv, exportToBibtex, fetchRecordFasta } from '../../services/bioDatabaseService';

export default function PinnedRecordsTray({
  pinnedRecords = [],
  onUnpinRecord,
  onClearAll,
  onOpenCompare,
  onSaveToProject
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!pinnedRecords || pinnedRecords.length === 0) return null;

  const handleExportCsv = () => {
    const csvContent = exportToCsv(pinnedRecords);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bionexus_pinned_records_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportBibtex = () => {
    const bibtex = exportToBibtex(pinnedRecords);
    const blob = new Blob([bibtex], { type: 'application/x-bibtex;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bionexus_citations_${new Date().toISOString().slice(0, 10)}.bib`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportFasta = async () => {
    setExporting(true);
    try {
      const fastaTexts = [];
      for (const rec of pinnedRecords) {
        try {
          const res = await fetchRecordFasta(rec);
          if (res && res.rawFasta) {
            fastaTexts.push(res.rawFasta.trim());
          }
        } catch {}
      }
      if (fastaTexts.length > 0) {
        const fullFasta = fastaTexts.join('\n\n') + '\n';
        const blob = new Blob([fullFasta], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bionexus_collection_${pinnedRecords.length}_sequences.fasta`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert('None of the pinned records have sequence data available for FASTA export.');
      }
    } finally {
      setExporting(false);
    }
  };

  const handleSaveProject = () => {
    if (onSaveToProject) {
      onSaveToProject(pinnedRecords);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#0c1322',
      borderTop: '1px solid rgba(56, 189, 248, 0.3)',
      boxShadow: '0 -10px 25px rgba(0, 0, 0, 0.6)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Expanded Pinned Records List */}
      {isExpanded && (
        <div style={{
          maxHeight: '160px',
          overflowY: 'auto',
          padding: '12px 24px',
          background: '#090f1d',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          {pinnedRecords.map((rec) => (
            <div
              key={rec.id}
              style={{
                background: '#131e34',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '8px',
                padding: '6px 10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.78rem'
              }}
            >
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: rec.sourceColor || '#38bdf8'
              }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#f8fafc' }}>
                {rec.accession}
              </span>
              <span style={{ color: '#94a3b8' }}>
                {rec.source}
              </span>
              <button
                type="button"
                onClick={() => onUnpinRecord(rec.id)}
                title="Unpin record"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '0 2px'
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Bar Controls */}
      <div style={{
        padding: '10px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid rgba(6, 182, 212, 0.35)',
              color: '#38bdf8',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Pin size={14} />
            <span>Pinned Tray ({pinnedRecords.length})</span>
            {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>

          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Pin 2 to 4 records to run direct side-by-side comparison matrix.
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {pinnedRecords.length >= 2 && pinnedRecords.length <= 4 && (
            <button
              type="button"
              onClick={onOpenCompare}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#06b6d4',
                color: '#08101e',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <GitCompare size={14} />
              <span>Compare ({pinnedRecords.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveProject}
            disabled={savedSuccess}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: savedSuccess ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${savedSuccess ? '#10b981' : 'rgba(255, 255, 255, 0.15)'}`,
              color: savedSuccess ? '#10b981' : '#cbd5e1',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {savedSuccess ? <Check size={14} /> : <FolderPlus size={14} />}
            <span>{savedSuccess ? 'Saved to Project' : 'Save to Project'}</span>
          </button>

          {/* Export Dropdown buttons */}
          <button
            type="button"
            onClick={handleExportCsv}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            CSV
          </button>

          <button
            type="button"
            onClick={handleExportFasta}
            disabled={exporting}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {exporting ? 'Exporting...' : 'FASTA'}
          </button>

          <button
            type="button"
            onClick={handleExportBibtex}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            BibTeX
          </button>

          <button
            type="button"
            onClick={onClearAll}
            title="Clear all pinned records"
            style={{
              background: 'transparent',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '0.78rem',
              cursor: 'pointer'
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
