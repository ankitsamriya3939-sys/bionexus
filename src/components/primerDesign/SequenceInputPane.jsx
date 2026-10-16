import React, { useState } from 'react';
import { 
  FileText, Upload, Database, ChevronDown, ChevronRight, 
  HelpCircle, AlertTriangle, CheckCircle2, RefreshCw, X
} from 'lucide-react';
import { cleanSequence } from '../../utils/sequenceEngine';
import { parseFastaHeader } from '../../utils/ncbiService';

export default function SequenceInputPane({
  sequence,
  setSequence,
  sequenceName,
  setSequenceName,
  accessionInput,
  setAccessionInput,
  loadingAccession,
  onFetchAccession,
  accessionError,
  targetRegion,
  setTargetRegion,
  excludedRegion,
  setExcludedRegion,
  settings,
  setSettings,
  validation
}) {
  const [inputTab, setInputTab] = useState('paste'); // 'paste' | 'fasta' | 'accession'
  const [openSections, setOpenSections] = useState({
    regions: true,
    primerSize: true,
    primerTm: true,
    primerGc: false,
    productSize: true,
    reactionConditions: false
  });

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text !== 'string') return;

      const lines = text.split(/\r?\n/);
      let header = '';
      const seqLines = [];

      for (let line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('>')) {
          if (!header) header = trimmed.substring(1).trim();
        } else {
          seqLines.push(trimmed);
        }
      }

      const seq = cleanSequence(seqLines.join(''));
      setSequence(seq);
      if (header) {
        setSequenceName(parseFastaHeader(header).title || header.split(/\s+/)[0]);
      } else {
        setSequenceName(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsText(file);
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <aside className="pd-pane-left">
      <div className="pd-pane-header">
        <span className="pd-pane-title">
          <FileText size={16} color="var(--pd-accent)" />
          Sequence & Design Parameters
        </span>
      </div>

      {/* Input Mode Selector Tabs */}
      <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--pd-border)' }}>
        <div style={{ display: 'flex', gap: '4px', background: 'var(--pd-surface-card)', padding: '3px', borderRadius: '6px' }}>
          {[
            { id: 'paste', label: 'Paste DNA', icon: FileText },
            { id: 'fasta', label: 'FASTA File', icon: Upload },
            { id: 'accession', label: 'NCBI Accession', icon: Database }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = inputTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`pd-btn pd-btn-sm ${isActive ? 'pd-btn-primary' : 'pd-btn-ghost'}`}
                style={{ flex: 1, justifyContent: 'center', fontSize: '0.73rem', padding: '4px 6px' }}
                onClick={() => setInputTab(tab.id)}
              >
                <Icon size={12} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Input Details depending on selected tab */}
        <div style={{ marginTop: '10px' }}>
          {inputTab === 'paste' && (
            <div className="pd-form-group">
              <div className="pd-label">
                <span>DNA Template Sequence</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--pd-text-subtle)' }}>Whitespace ignored</span>
              </div>
              <textarea
                className="pd-textarea"
                rows={5}
                value={sequence}
                onChange={(e) => setSequence(cleanSequence(e.target.value))}
                placeholder="Paste DNA template sequence (e.g., ATGCGATCGATC...)"
                id="input-template-sequence"
              />
            </div>
          )}

          {inputTab === 'fasta' && (
            <div className="pd-form-group">
              <div className="pd-label">
                <span>Upload FASTA (.fasta, .fa, .txt)</span>
              </div>
              <label
                style={{
                  border: '2px dashed var(--pd-border)',
                  borderRadius: '6px',
                  padding: '16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--pd-surface-card)',
                  transition: 'border-color 0.15s ease'
                }}
              >
                <Upload size={20} color="var(--pd-accent)" />
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Click to select FASTA file</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--pd-text-muted)' }}>Headers stripped automatically from calculation</span>
                <input
                  type="file"
                  accept=".fasta,.fa,.fna,.txt"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          )}

          {inputTab === 'accession' && (
            <div className="pd-form-group">
              <div className="pd-label">
                <span>Accession or Gene Symbol</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--pd-text-subtle)' }}>RefSeq / GenBank / Gene</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  className="pd-input"
                  placeholder="e.g. NM_007294, NC_000017, TP53"
                  value={accessionInput}
                  onChange={(e) => setAccessionInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') onFetchAccession(); }}
                  id="input-accession-id"
                />
                <button
                  type="button"
                  className="pd-btn pd-btn-primary pd-btn-sm"
                  onClick={onFetchAccession}
                  disabled={loadingAccession || !accessionInput.trim()}
                >
                  {loadingAccession ? <RefreshCw size={13} className="animate-spin" /> : 'Fetch'}
                </button>
              </div>
              {accessionError && (
                <div style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle size={12} />
                  <span>{accessionError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Sequence Metrics Summary */}
        <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          <span className="pd-chip">
            Length: <strong className="pd-mono" style={{ color: 'var(--pd-text)', marginLeft: '3px' }}>{sequence.length} bp</strong>
          </span>
          <span className="pd-chip">
            GC: <strong className="pd-mono" style={{ color: 'var(--pd-text)', marginLeft: '3px' }}>{validation.gcPercent}%</strong>
          </span>
          <span className="pd-chip pd-chip-cyan">
            dsDNA Template
          </span>
          {validation.ambiguousCount > 0 && (
            <span className="pd-chip pd-chip-amber" title={`${validation.ambiguousCount} degenerate IUPAC bases`}>
              {validation.ambiguousCount} IUPAC bases
            </span>
          )}
          {validation.error && (
            <span className="pd-chip pd-chip-rose">
              {validation.error}
            </span>
          )}
        </div>
      </div>

      {/* Target & Excluded Regions Section */}
      <div className="pd-section">
        <div className="pd-section-header" onClick={() => toggleSection('regions')}>
          <span>Target & Excluded Regions</span>
          {openSections.regions ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
        {openSections.regions && (
          <div className="pd-section-body">
            {/* Target Region */}
            <div className="pd-form-group">
              <div className="pd-label">
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Target Region (1-based)
                  <span className="pd-tooltip-target" title="Primers will flank this region. Specified as Start and Length in base pairs.">
                    <HelpCircle size={11} />
                  </span>
                </span>
                {targetRegion && (
                  <button
                    type="button"
                    className="pd-btn pd-btn-ghost pd-btn-sm"
                    style={{ padding: '0 4px', height: '18px' }}
                    onClick={() => setTargetRegion(null)}
                  >
                    <X size={11} /> Clear
                  </button>
                )}
              </div>
              <div className="pd-row-inputs">
                <div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--pd-text-muted)' }}>Start bp</span>
                  <input
                    type="number"
                    min={1}
                    max={sequence.length || 1}
                    className="pd-input"
                    value={targetRegion ? targetRegion.start : ''}
                    placeholder="e.g. 50"
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setTargetRegion(prev => ({
                        start: isNaN(v) ? 1 : v,
                        len: prev ? prev.len : 50
                      }));
                    }}
                  />
                </div>
                <div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--pd-text-muted)' }}>Length bp</span>
                  <input
                    type="number"
                    min={10}
                    max={sequence.length || 100}
                    className="pd-input"
                    value={targetRegion ? targetRegion.len : ''}
                    placeholder="e.g. 100"
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setTargetRegion(prev => ({
                        start: prev ? prev.start : 1,
                        len: isNaN(v) ? 50 : v
                      }));
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Excluded Region */}
            <div className="pd-form-group">
              <div className="pd-label">
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Excluded Region
                  <span className="pd-tooltip-target" title="Region where primer binding is prohibited (e.g. repeat region or polymorphism).">
                    <HelpCircle size={11} />
                  </span>
                </span>
                {excludedRegion && (
                  <button
                    type="button"
                    className="pd-btn pd-btn-ghost pd-btn-sm"
                    style={{ padding: '0 4px', height: '18px' }}
                    onClick={() => setExcludedRegion(null)}
                  >
                    <X size={11} /> Clear
                  </button>
                )}
              </div>
              <div className="pd-row-inputs">
                <div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--pd-text-muted)' }}>Start bp</span>
                  <input
                    type="number"
                    min={1}
                    max={sequence.length || 1}
                    className="pd-input"
                    value={excludedRegion ? excludedRegion.start : ''}
                    placeholder="Start"
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setExcludedRegion(prev => ({
                        start: isNaN(v) ? 1 : v,
                        len: prev ? prev.len : 20
                      }));
                    }}
                  />
                </div>
                <div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--pd-text-muted)' }}>Length bp</span>
                  <input
                    type="number"
                    min={5}
                    max={sequence.length || 100}
                    className="pd-input"
                    value={excludedRegion ? excludedRegion.len : ''}
                    placeholder="Length"
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setExcludedRegion(prev => ({
                        start: prev ? prev.start : 1,
                        len: isNaN(v) ? 20 : v
                      }));
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Primer Size Section */}
      <div className="pd-section">
        <div className="pd-section-header" onClick={() => toggleSection('primerSize')}>
          <span>Primer Length (bp)</span>
          {openSections.primerSize ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
        {openSections.primerSize && (
          <div className="pd-section-body">
            <div className="pd-row-inputs">
              <div className="pd-form-group">
                <span className="pd-label">Min</span>
                <input
                  type="number"
                  className="pd-input"
                  value={settings.minLen}
                  onChange={(e) => updateSetting('minLen', parseInt(e.target.value, 10) || 18)}
                />
              </div>
              <div className="pd-form-group">
                <span className="pd-label">Opt</span>
                <input
                  type="number"
                  className="pd-input"
                  value={settings.optLen}
                  onChange={(e) => updateSetting('optLen', parseInt(e.target.value, 10) || 20)}
                />
              </div>
              <div className="pd-form-group">
                <span className="pd-label">Max</span>
                <input
                  type="number"
                  className="pd-input"
                  value={settings.maxLen}
                  onChange={(e) => updateSetting('maxLen', parseInt(e.target.value, 10) || 24)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Melting Temperature (Tm) Section */}
      <div className="pd-section">
        <div className="pd-section-header" onClick={() => toggleSection('primerTm')}>
          <span>Melting Temperature Tm (°C)</span>
          {openSections.primerTm ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
        {openSections.primerTm && (
          <div className="pd-section-body">
            <div className="pd-row-inputs">
              <div className="pd-form-group">
                <span className="pd-label">Min (°C)</span>
                <input
                  type="number"
                  step="0.5"
                  className="pd-input"
                  value={settings.minTm}
                  onChange={(e) => updateSetting('minTm', parseFloat(e.target.value) || 57.0)}
                />
              </div>
              <div className="pd-form-group">
                <span className="pd-label">Opt (°C)</span>
                <input
                  type="number"
                  step="0.5"
                  className="pd-input"
                  value={settings.optTm}
                  onChange={(e) => updateSetting('optTm', parseFloat(e.target.value) || 60.0)}
                />
              </div>
              <div className="pd-form-group">
                <span className="pd-label">Max (°C)</span>
                <input
                  type="number"
                  step="0.5"
                  className="pd-input"
                  value={settings.maxTm}
                  onChange={(e) => updateSetting('maxTm', parseFloat(e.target.value) || 63.0)}
                />
              </div>
            </div>
            <div className="pd-form-group">
              <span className="pd-label">
                Max Pair Tm Difference (°C)
                <span className="pd-tooltip-target" title="Maximum allowable difference between Forward and Reverse primer Tm.">
                  <HelpCircle size={11} />
                </span>
              </span>
              <input
                type="number"
                step="0.5"
                className="pd-input"
                value={settings.maxTmDiff}
                onChange={(e) => updateSetting('maxTmDiff', parseFloat(e.target.value) || 3.0)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Amplicon Size Section */}
      <div className="pd-section">
        <div className="pd-section-header" onClick={() => toggleSection('productSize')}>
          <span>Amplicon Product Size (bp)</span>
          {openSections.productSize ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
        {openSections.productSize && (
          <div className="pd-section-body">
            <div className="pd-row-inputs">
              <div className="pd-form-group">
                <span className="pd-label">Min Product (bp)</span>
                <input
                  type="number"
                  className="pd-input"
                  value={settings.minProductSize}
                  onChange={(e) => updateSetting('minProductSize', parseInt(e.target.value, 10) || 100)}
                />
              </div>
              <div className="pd-form-group">
                <span className="pd-label">Max Product (bp)</span>
                <input
                  type="number"
                  className="pd-input"
                  value={settings.maxProductSize}
                  onChange={(e) => updateSetting('maxProductSize', parseInt(e.target.value, 10) || 500)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* GC Content & Clamp Section */}
      <div className="pd-section">
        <div className="pd-section-header" onClick={() => toggleSection('primerGc')}>
          <span>GC% & Clamp</span>
          {openSections.primerGc ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
        {openSections.primerGc && (
          <div className="pd-section-body">
            <div className="pd-row-inputs">
              <div className="pd-form-group">
                <span className="pd-label">Min GC%</span>
                <input
                  type="number"
                  className="pd-input"
                  value={settings.minGc}
                  onChange={(e) => updateSetting('minGc', parseFloat(e.target.value) || 20.0)}
                />
              </div>
              <div className="pd-form-group">
                <span className="pd-label">Max GC%</span>
                <input
                  type="number"
                  className="pd-input"
                  value={settings.maxGc}
                  onChange={(e) => updateSetting('maxGc', parseFloat(e.target.value) || 80.0)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reaction Conditions Section */}
      <div className="pd-section">
        <div className="pd-section-header" onClick={() => toggleSection('reactionConditions')}>
          <span>Reaction Chemistry (Salts & Oligos)</span>
          {openSections.reactionConditions ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
        {openSections.reactionConditions && (
          <div className="pd-section-body">
            <div className="pd-row-inputs">
              <div className="pd-form-group">
                <span className="pd-label">Monovalent [Na+] (mM)</span>
                <input
                  type="number"
                  className="pd-input"
                  value={settings.mvConc}
                  onChange={(e) => updateSetting('mvConc', parseFloat(e.target.value) || 50.0)}
                />
              </div>
              <div className="pd-form-group">
                <span className="pd-label">Divalent [Mg2+] (mM)</span>
                <input
                  type="number"
                  step="0.1"
                  className="pd-input"
                  value={settings.dvConc}
                  onChange={(e) => updateSetting('dvConc', parseFloat(e.target.value) || 1.5)}
                />
              </div>
            </div>
            <div className="pd-row-inputs">
              <div className="pd-form-group">
                <span className="pd-label">Primer Oligo (nM)</span>
                <input
                  type="number"
                  className="pd-input"
                  value={settings.dnaConc}
                  onChange={(e) => updateSetting('dnaConc', parseFloat(e.target.value) || 50.0)}
                />
              </div>
              <div className="pd-form-group">
                <span className="pd-label">dNTPs (mM)</span>
                <input
                  type="number"
                  step="0.1"
                  className="pd-input"
                  value={settings.dntpConc}
                  onChange={(e) => updateSetting('dntpConc', parseFloat(e.target.value) || 0.8)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Number of pairs to return */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--pd-border)' }}>
        <div className="pd-form-group">
          <div className="pd-label">
            <span>Pairs to Return</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--pd-text-muted)' }}>Top ranked candidates</span>
          </div>
          <select
            className="pd-select"
            value={settings.numReturn}
            onChange={(e) => updateSetting('numReturn', parseInt(e.target.value, 10) || 10)}
          >
            <option value={5}>5 candidate pairs</option>
            <option value={10}>10 candidate pairs (default)</option>
            <option value={15}>15 candidate pairs</option>
            <option value={20}>20 candidate pairs</option>
          </select>
        </div>
      </div>
    </aside>
  );
}
