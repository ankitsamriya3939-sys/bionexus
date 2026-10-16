import React, { useState } from 'react';
import { 
  Dna, Play, Save, Download, Sun, Moon, 
  ExternalLink, ChevronDown, Check, Copy, RefreshCw, AlertCircle, Sparkles
} from 'lucide-react';
import { exportPrimersToCsv } from '../../utils/primerEngine';

export default function PrimerTopBar({
  sequenceName,
  theme,
  toggleTheme,
  isDesigning,
  onRunDesign,
  canDesign,
  pairs,
  selectedPair,
  activePreset,
  onSelectPreset,
  onSaveToWorkspace,
  templateSequence,
  engineProvenance,
  saveSuccess,
  onOpenUpdates
}) {
  const [exportOpen, setExportOpen] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const handleExportCsv = () => {
    if (!pairs || pairs.length === 0) return;
    const csvData = exportPrimersToCsv(pairs, {
      engine: engineProvenance,
      templateId: sequenceName || 'BioNexus_Target',
      timestamp: new Date().toISOString()
    });
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BioNexus_Primers_${(sequenceName || 'target').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  const handleCopyFasta = () => {
    if (!selectedPair) return;
    const fasta = [
      `>Forward_Primer_${selectedPair.rank} Tm=${selectedPair.forward.tm}C GC=${selectedPair.forward.gc}% coords=${selectedPair.forward.start}-${selectedPair.forward.end}`,
      selectedPair.forward.sequence,
      `>Reverse_Primer_${selectedPair.rank} Tm=${selectedPair.reverse.tm}C GC=${selectedPair.reverse.gc}% coords=${selectedPair.reverse.start}-${selectedPair.reverse.end}`,
      selectedPair.reverse.sequence,
      `>Amplicon_${selectedPair.rank} size=${selectedPair.amplicon?.size}bp Tm_diff=${selectedPair.tmDiff}C Ta=${selectedPair.recommendedTa}C`,
      selectedPair.amplicon?.sequence || ''
    ].join('\n');

    navigator.clipboard.writeText(fasta);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
    setExportOpen(false);
  };

  const handleExitToSuite = () => {
    if (window.opener) {
      window.close();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <header className="pd-topbar">
      {/* Left: Brand & Breadcrumb */}
      <div className="pd-topbar-left">
        <a href="/" className="pd-brand" onClick={(e) => { e.preventDefault(); handleExitToSuite(); }} title="Return to BioNexus Studio">
          <Dna size={20} color="var(--pd-accent)" />
          <span>BioNexus Studio</span>
          <span className="pd-brand-badge">Primer3</span>
        </a>

        <div className="pd-breadcrumbs">
          <span className="pd-crumb-sep">/</span>
          <span>Workspace</span>
          <span className="pd-crumb-sep">/</span>
          <span className="pd-crumb-active" title={sequenceName || 'Target Sequence'}>
            {sequenceName || 'Target Sequence'}
          </span>
        </div>
      </div>

      {/* Center: Presets */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '0.74rem', color: 'var(--pd-text-muted)', fontWeight: 600 }}>Preset:</span>
        {[
          { id: 'pcr', label: 'Standard PCR' },
          { id: 'qpcr', label: 'qPCR' },
          { id: 'cloning', label: 'Cloning' },
          { id: 'sequencing', label: 'Sequencing' }
        ].map(p => (
          <button
            key={p.id}
            type="button"
            className={`pd-btn pd-btn-sm ${activePreset === p.id ? 'pd-btn-primary' : 'pd-btn-ghost'}`}
            onClick={() => onSelectPreset(p.id)}
            style={{ fontSize: '0.72rem', padding: '3px 8px' }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Right: Actions */}
      <div className="pd-topbar-actions">
        {/* Run Design Button */}
        <button
          type="button"
          className="pd-btn pd-btn-primary"
          onClick={onRunDesign}
          disabled={!canDesign || isDesigning}
          id="btn-run-primer-design"
        >
          {isDesigning ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              <span>Designing...</span>
            </>
          ) : (
            <>
              <Play size={14} fill="currentColor" />
              <span>Run Design</span>
            </>
          )}
        </button>

        {/* Save Button */}
        <button
          type="button"
          className="pd-btn"
          onClick={onSaveToWorkspace}
          disabled={!pairs || pairs.length === 0}
          title="Save candidate set to BioNexus workspace records"
        >
          {saveSuccess ? (
            <>
              <Check size={14} color="#10b981" />
              <span style={{ color: '#10b981' }}>Saved!</span>
            </>
          ) : (
            <>
              <Save size={14} />
              <span>Save</span>
            </>
          )}
        </button>

        {/* Export Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="pd-btn"
            onClick={() => setExportOpen(!exportOpen)}
            disabled={!pairs || pairs.length === 0}
          >
            <Download size={14} />
            <span>Export</span>
            <ChevronDown size={12} />
          </button>

          {exportOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                background: 'var(--pd-surface)',
                border: '1px solid var(--pd-border)',
                borderRadius: '8px',
                padding: '6px',
                minWidth: '220px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
            >
              <button
                type="button"
                className="pd-btn pd-btn-ghost"
                onClick={handleExportCsv}
                style={{ justifyContent: 'flex-start', width: '100%' }}
              >
                <Download size={13} />
                <span>Download Candidate CSV</span>
              </button>

              <button
                type="button"
                className="pd-btn pd-btn-ghost"
                onClick={handleCopyFasta}
                style={{ justifyContent: 'flex-start', width: '100%' }}
              >
                <Copy size={13} />
                <span>Copy Selected Pair FASTA</span>
              </button>

              {copiedSuccess && (
                <div style={{ padding: '4px 8px', fontSize: '0.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={12} />
                  <span>Copied to clipboard!</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Updates Modal Button */}
        {onOpenUpdates && (
          <button
            type="button"
            className="pd-btn pd-btn-ghost pd-btn-sm"
            onClick={onOpenUpdates}
            style={{ color: '#c084fc', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            title="What's New in BioNexus Studio v2.1"
          >
            <Sparkles size={14} color="#c084fc" />
            <span style={{ fontSize: '0.74rem', fontWeight: 700 }}>Updates</span>
            <span style={{
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              color: '#ffffff',
              fontSize: '0.62rem',
              fontWeight: 800,
              padding: '1px 5px',
              borderRadius: '8px'
            }}>v2.1</span>
          </button>
        )}

        {/* Theme Toggle */}
        <button
          type="button"
          className="pd-btn pd-btn-ghost pd-btn-sm"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? <Sun size={15} color="#f59e0b" /> : <Moon size={15} color="#3b82f6" />}
        </button>

        {/* Back to Studio link */}
        <button
          type="button"
          className="pd-btn pd-btn-ghost pd-btn-sm"
          onClick={handleExitToSuite}
          title="Back to BioNexus Studio"
        >
          <ExternalLink size={14} />
          <span>Exit</span>
        </button>
      </div>
    </header>
  );
}
