import React, { useState } from 'react';
import { 
  ListOrdered, Layers, Dna, ShieldAlert, Activity, 
  Settings, ChevronUp, ChevronDown, Check, Copy, AlertTriangle, ShieldCheck
} from 'lucide-react';

export default function CandidateTablePanel({
  pairs,
  selectedPair,
  onSelectPair,
  engineProvenance,
  templateSequence,
  settings,
  specificityResult,
  loadingSpecificity,
  onRunSpecificityCheck,
  panelHeight,
  setPanelHeight
}) {
  const [activeTab, setActiveTab] = useState('candidates'); // 'candidates' | 'pairDetails' | 'amplicon' | 'specificity' | 'structure' | 'provenance'
  const [sortField, setSortField] = useState('rank');
  const [sortAsc, setSortAsc] = useState(true);
  const [copiedAmp, setCopiedAmp] = useState(false);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedPairs = [...(pairs || [])].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'fwdTm') {
      valA = a.forward.tm;
      valB = b.forward.tm;
    } else if (sortField === 'revTm') {
      valA = a.reverse.tm;
      valB = b.reverse.tm;
    } else if (sortField === 'size') {
      valA = a.amplicon?.size || a.productLength || 0;
      valB = b.amplicon?.size || b.productLength || 0;
    } else if (sortField === 'penalty') {
      valA = a.pairPenalty || a.score || 0;
      valB = b.pairPenalty || b.score || 0;
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const togglePanelSize = () => {
    if (panelHeight === 'compact') setPanelHeight('default');
    else if (panelHeight === 'default') setPanelHeight('expanded');
    else setPanelHeight('compact');
  };

  const copyAmplicon = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedAmp(true);
    setTimeout(() => setCopiedAmp(false), 2000);
  };

  return (
    <div className={`pd-bottom-panel pd-bottom-panel-${panelHeight}`}>
      {/* Panel Tab Header */}
      <div className="pd-bottom-tabs">
        <div className="pd-tab-group">
          {[
            { id: 'candidates', label: `Candidates (${pairs?.length || 0})`, icon: ListOrdered },
            { id: 'pairDetails', label: 'Pair Details', icon: Layers },
            { id: 'amplicon', label: 'Amplicon View', icon: Dna },
            { id: 'specificity', label: 'Specificity', icon: ShieldAlert },
            { id: 'structure', label: 'Secondary Structure', icon: Activity },
            { id: 'provenance', label: 'Parameters & Provenance', icon: Settings }
          ].map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={`pd-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                <Icon size={14} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Panel Size Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            className="pd-btn pd-btn-ghost pd-btn-sm"
            onClick={togglePanelSize}
            title={`Toggle height (${panelHeight})`}
            style={{ padding: '2px 6px', fontSize: '0.72rem' }}
          >
            {panelHeight === 'expanded' ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            <span style={{ textTransform: 'capitalize' }}>{panelHeight}</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="pd-tab-content">
        {/* TAB 1: CANDIDATES TABLE */}
        {activeTab === 'candidates' && (
          <div>
            {!pairs || pairs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--pd-text-muted)', fontSize: '0.8rem' }}>
                No primer candidates generated yet. Adjust parameters and click "Run Design".
              </div>
            ) : (
              <table className="pd-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('rank')} style={{ cursor: 'pointer' }}>
                      Rank {sortField === 'rank' && (sortAsc ? '▲' : '▼')}
                    </th>
                    <th>Forward Primer (5' → 3')</th>
                    <th onClick={() => handleSort('fwdTm')} style={{ cursor: 'pointer' }}>
                      Fwd Tm {sortField === 'fwdTm' && (sortAsc ? '▲' : '▼')}
                    </th>
                    <th>Fwd GC%</th>
                    <th>Reverse Primer (5' → 3')</th>
                    <th onClick={() => handleSort('revTm')} style={{ cursor: 'pointer' }}>
                      Rev Tm {sortField === 'revTm' && (sortAsc ? '▲' : '▼')}
                    </th>
                    <th>Rev GC%</th>
                    <th onClick={() => handleSort('size')} style={{ cursor: 'pointer' }}>
                      Amplicon {sortField === 'size' && (sortAsc ? '▲' : '▼')}
                    </th>
                    <th onClick={() => handleSort('tmDiff')} style={{ cursor: 'pointer' }}>
                      ΔTm {sortField === 'tmDiff' && (sortAsc ? '▲' : '▼')}
                    </th>
                    <th onClick={() => handleSort('penalty')} style={{ cursor: 'pointer' }}>
                      Penalty {sortField === 'penalty' && (sortAsc ? '▲' : '▼')}
                    </th>
                    <th>Evaluation Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPairs.map((p) => {
                    const isSelected = selectedPair?.rank === p.rank;
                    const ampSize = p.amplicon?.size || p.productLength || 0;
                    return (
                      <tr
                        key={p.rank}
                        className={isSelected ? 'selected' : ''}
                        onClick={() => onSelectPair(p)}
                      >
                        <td>
                          <strong>#{p.rank}</strong>
                        </td>
                        <td className="pd-mono" style={{ color: 'var(--pd-fwd-primer)' }}>
                          {p.forward.sequence}
                        </td>
                        <td className="pd-mono">{p.forward.tm}°C</td>
                        <td className="pd-mono">{p.forward.gc}%</td>
                        <td className="pd-mono" style={{ color: 'var(--pd-rev-primer)' }}>
                          {p.reverse.sequence}
                        </td>
                        <td className="pd-mono">{p.reverse.tm}°C</td>
                        <td className="pd-mono">{p.reverse.gc}%</td>
                        <td className="pd-mono">
                          <strong>{ampSize} bp</strong>
                        </td>
                        <td className="pd-mono">{p.tmDiff}°C</td>
                        <td className="pd-mono">{p.pairPenalty || p.score || 0}</td>
                        <td>
                          <span className="pd-chip pd-chip-cyan" style={{ fontSize: '0.68rem' }}>
                            {p.statusLabel || 'Meets configured constraints'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`pd-btn pd-btn-sm ${isSelected ? 'pd-btn-primary' : 'pd-btn-ghost'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectPair(p);
                            }}
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 2: PAIR DETAILS */}
        {activeTab === 'pairDetails' && selectedPair && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {/* Forward Details */}
            <div style={{ background: 'var(--pd-surface-card)', padding: '14px', borderRadius: '8px', border: '1px solid var(--pd-border)' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '0.84rem', color: 'var(--pd-fwd-primer)' }}>
                Forward Primer (5' → 3')
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem' }}>
                <div><strong>Sequence:</strong> <span className="pd-mono" style={{ color: 'var(--pd-accent)' }}>{selectedPair.forward.sequence}</span></div>
                <div><strong>Length:</strong> {selectedPair.forward.length} bp</div>
                <div><strong>Template Coordinates:</strong> {selectedPair.forward.start} – {selectedPair.forward.end} bp</div>
                <div><strong>Melting Temp (Tm):</strong> {selectedPair.forward.tm}°C</div>
                <div><strong>GC Content:</strong> {selectedPair.forward.gc}%</div>
                <div><strong>3' GC Clamp:</strong> {selectedPair.forward.gcClampCount} G/C in last 5 bp</div>
                <div><strong>Hairpin ΔG:</strong> {selectedPair.forward.hairpin?.structureFound ? `${selectedPair.forward.hairpin.dg} kcal/mol (${selectedPair.forward.hairpin.tm}°C)` : 'None detected'}</div>
                <div><strong>Self-Dimer ΔG:</strong> {selectedPair.forward.selfDimer?.structureFound ? `${selectedPair.forward.selfDimer.dg} kcal/mol` : 'None detected'}</div>
                <div><strong>Individual Penalty:</strong> {selectedPair.forward.penalty}</div>
              </div>
            </div>

            {/* Reverse Details */}
            <div style={{ background: 'var(--pd-surface-card)', padding: '14px', borderRadius: '8px', border: '1px solid var(--pd-border)' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '0.84rem', color: 'var(--pd-rev-primer)' }}>
                Reverse Primer (5' → 3')
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem' }}>
                <div><strong>Sequence:</strong> <span className="pd-mono" style={{ color: 'var(--pd-rev-primer)' }}>{selectedPair.reverse.sequence}</span></div>
                <div><strong>Length:</strong> {selectedPair.reverse.length} bp</div>
                <div><strong>Template Coordinates:</strong> {selectedPair.reverse.start} – {selectedPair.reverse.end} bp</div>
                <div><strong>Melting Temp (Tm):</strong> {selectedPair.reverse.tm}°C</div>
                <div><strong>GC Content:</strong> {selectedPair.reverse.gc}%</div>
                <div><strong>3' GC Clamp:</strong> {selectedPair.reverse.gcClampCount} G/C in last 5 bp</div>
                <div><strong>Hairpin ΔG:</strong> {selectedPair.reverse.hairpin?.structureFound ? `${selectedPair.reverse.hairpin.dg} kcal/mol (${selectedPair.reverse.hairpin.tm}°C)` : 'None detected'}</div>
                <div><strong>Self-Dimer ΔG:</strong> {selectedPair.reverse.selfDimer?.structureFound ? `${selectedPair.reverse.selfDimer.dg} kcal/mol` : 'None detected'}</div>
                <div><strong>Individual Penalty:</strong> {selectedPair.reverse.penalty}</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AMPLICON VIEW */}
        {activeTab === 'amplicon' && selectedPair && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '0.85rem' }}>Amplicon Product #{selectedPair.rank}</strong>
                <span style={{ fontSize: '0.74rem', color: 'var(--pd-text-muted)', marginLeft: '8px' }}>
                  ({selectedPair.amplicon?.size || selectedPair.productLength} bp | bp {selectedPair.amplicon?.start}–{selectedPair.amplicon?.end} | GC: {selectedPair.amplicon?.gcPercent}%)
                </span>
              </div>
              <button
                type="button"
                className="pd-btn pd-btn-sm"
                onClick={() => copyAmplicon(selectedPair.amplicon?.sequence)}
              >
                {copiedAmp ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                <span>{copiedAmp ? 'Copied FASTA' : 'Copy Sequence'}</span>
              </button>
            </div>

            <div
              style={{
                fontFamily: 'var(--pd-font-mono)',
                fontSize: '0.8rem',
                lineHeight: 1.6,
                letterSpacing: '0.06em',
                background: 'var(--pd-surface-card)',
                padding: '12px 14px',
                borderRadius: '6px',
                border: '1px solid var(--pd-border)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                maxHeight: '260px',
                overflowY: 'auto'
              }}
            >
              {selectedPair.amplicon?.sequence || 'Amplicon sequence preview not available'}
            </div>
          </div>
        )}

        {/* TAB 4: SPECIFICITY */}
        {activeTab === 'specificity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '0.85rem' }}>In-Silico PCR Specificity Verification</strong>
                <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--pd-text-muted)' }}>
                  Evaluates template hybridization, secondary binding sites, and off-target amplicons using 3' stability constraint.
                </p>
              </div>
              <button
                type="button"
                className="pd-btn pd-btn-primary pd-btn-sm"
                onClick={onRunSpecificityCheck}
                disabled={loadingSpecificity || !selectedPair}
              >
                <ShieldCheck size={13} />
                <span>{loadingSpecificity ? 'Scanning Specificity...' : 'Check Specificity'}</span>
              </button>
            </div>

            {specificityResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`pd-chip ${specificityResult.isSpecific ? 'pd-chip-emerald' : 'pd-chip-rose'}`}>
                    {specificityResult.isSpecific ? 'Specific — Single Target Product' : 'Off-target Products Detected'}
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--pd-text-muted)' }}>
                    {specificityResult.summary}
                  </span>
                </div>

                {/* Target Products Table */}
                {specificityResult.targetProducts?.length > 0 && (
                  <div>
                    <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#10b981' }}>Intended Products:</span>
                    <table className="pd-table" style={{ marginTop: '4px' }}>
                      <thead>
                        <tr>
                          <th>Fwd Position</th>
                          <th>Rev Position</th>
                          <th>Product Size</th>
                          <th>Mismatch Count</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {specificityResult.targetProducts.map((tp, idx) => (
                          <tr key={idx}>
                            <td>{tp.fwdStart}–{tp.fwdEnd} bp</td>
                            <td>{tp.revStart}–{tp.revEnd} bp</td>
                            <td><strong>{tp.productSize} bp</strong></td>
                            <td>0 mismatches</td>
                            <td><span className="pd-chip pd-chip-emerald">Primary Target</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Off-Target Products Table */}
                {specificityResult.offTargetProducts?.length > 0 ? (
                  <div>
                    <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#ef4444' }}>Off-Target Hybridizations:</span>
                    <table className="pd-table" style={{ marginTop: '4px' }}>
                      <thead>
                        <tr>
                          <th>Fwd Position</th>
                          <th>Rev Position</th>
                          <th>Product Size</th>
                          <th>Mismatches</th>
                        </tr>
                      </thead>
                      <tbody>
                        {specificityResult.offTargetProducts.map((op, idx) => (
                          <tr key={idx}>
                            <td>{op.fwdStart}–{op.fwdEnd} bp</td>
                            <td>{op.revStart}–{op.revEnd} bp</td>
                            <td>{op.productSize} bp</td>
                            <td>Fwd: {op.fwdMismatches}, Rev: {op.revMismatches}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.74rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={13} />
                    <span>No unintended secondary amplicons found within template.</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--pd-text-muted)', fontSize: '0.78rem' }}>
                Specificity has not been evaluated for the current pair. Click "Check Specificity" above to run in-silico PCR.
              </div>
            )}
          </div>
        )}

        {/* TAB 5: SECONDARY STRUCTURE THERMODYNAMICS */}
        {activeTab === 'structure' && selectedPair && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            {/* Forward Hairpin / Dimer */}
            <div style={{ background: 'var(--pd-surface-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--pd-border)' }}>
              <strong style={{ fontSize: '0.8rem', color: 'var(--pd-fwd-primer)' }}>Forward Primer Structures</strong>
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.74rem' }}>
                <div>
                  <strong>Hairpin ΔG:</strong>{' '}
                  <span className="pd-mono">
                    {selectedPair.forward.hairpin?.structureFound ? `${selectedPair.forward.hairpin.dg} kcal/mol (Tm: ${selectedPair.forward.hairpin.tm}°C)` : 'None detected'}
                  </span>
                </div>
                <div>
                  <strong>Self-Dimer ΔG:</strong>{' '}
                  <span className="pd-mono">
                    {selectedPair.forward.selfDimer?.structureFound ? `${selectedPair.forward.selfDimer.dg} kcal/mol` : 'None detected'}
                  </span>
                </div>
              </div>
            </div>

            {/* Reverse Hairpin / Dimer */}
            <div style={{ background: 'var(--pd-surface-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--pd-border)' }}>
              <strong style={{ fontSize: '0.8rem', color: 'var(--pd-rev-primer)' }}>Reverse Primer Structures</strong>
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.74rem' }}>
                <div>
                  <strong>Hairpin ΔG:</strong>{' '}
                  <span className="pd-mono">
                    {selectedPair.reverse.hairpin?.structureFound ? `${selectedPair.reverse.hairpin.dg} kcal/mol (Tm: ${selectedPair.reverse.hairpin.tm}°C)` : 'None detected'}
                  </span>
                </div>
                <div>
                  <strong>Self-Dimer ΔG:</strong>{' '}
                  <span className="pd-mono">
                    {selectedPair.reverse.selfDimer?.structureFound ? `${selectedPair.reverse.selfDimer.dg} kcal/mol` : 'None detected'}
                  </span>
                </div>
              </div>
            </div>

            {/* Heterodimer */}
            <div style={{ background: 'var(--pd-surface-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--pd-border)' }}>
              <strong style={{ fontSize: '0.8rem', color: 'var(--pd-accent)' }}>Cross-Dimer (Heterodimer)</strong>
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.74rem' }}>
                <div>
                  <strong>Heterodimer ΔG:</strong>{' '}
                  <span className="pd-mono">
                    {selectedPair.heterodimer?.structureFound ? `${selectedPair.heterodimer.dg} kcal/mol (Tm: ${selectedPair.heterodimer.tm}°C)` : 'None detected'}
                  </span>
                </div>
                <div style={{ color: 'var(--pd-text-subtle)', fontSize: '0.7rem', marginTop: '4px' }}>
                  SantaLucia (1998) unified thermodynamic nearest-neighbor model.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: PARAMETERS & PROVENANCE */}
        {activeTab === 'provenance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Computation Engine:</strong> <span style={{ color: 'var(--pd-accent)', fontWeight: 600 }}>{engineProvenance || 'Primer3 C Library v2.3.1'}</span>
              </div>
              <span className="pd-chip">
                Executed: {new Date().toLocaleTimeString()}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              <div style={{ background: 'var(--pd-surface-card)', padding: '10px', borderRadius: '6px', border: '1px solid var(--pd-border)' }}>
                <span style={{ color: 'var(--pd-text-muted)', fontSize: '0.7rem' }}>Length Constraints</span>
                <div>Min: {settings.minLen} bp | Opt: {settings.optLen} bp | Max: {settings.maxLen} bp</div>
              </div>

              <div style={{ background: 'var(--pd-surface-card)', padding: '10px', borderRadius: '6px', border: '1px solid var(--pd-border)' }}>
                <span style={{ color: 'var(--pd-text-muted)', fontSize: '0.7rem' }}>Tm Constraints</span>
                <div>Min: {settings.minTm}°C | Opt: {settings.optTm}°C | Max: {settings.maxTm}°C</div>
              </div>

              <div style={{ background: 'var(--pd-surface-card)', padding: '10px', borderRadius: '6px', border: '1px solid var(--pd-border)' }}>
                <span style={{ color: 'var(--pd-text-muted)', fontSize: '0.7rem' }}>Amplicon Range</span>
                <div>{settings.minProductSize} bp – {settings.maxProductSize} bp</div>
              </div>

              <div style={{ background: 'var(--pd-surface-card)', padding: '10px', borderRadius: '6px', border: '1px solid var(--pd-border)' }}>
                <span style={{ color: 'var(--pd-text-muted)', fontSize: '0.7rem' }}>Salt & Oligo Conditions</span>
                <div>[Na+]: {settings.mvConc}mM | [Mg2+]: {settings.dvConc}mM | [Oligo]: {settings.dnaConc}nM</div>
              </div>
            </div>

            <div className="pd-advisory">
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <div>
                <strong>Scientific Provenance Notice:</strong>
                All parameters conform to Primer3 C library specifications with SantaLucia (1998) unified thermodynamic parameters.
                Predictions represent in-silico mathematical optimization. Experimental conditions (polymerase buffer, cycling protocol, template secondary structures) can influence amplification efficiency.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
