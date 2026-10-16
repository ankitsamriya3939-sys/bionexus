import React, { useState } from 'react';
import { 
  Sliders, Copy, Check, Info, AlertTriangle, 
  ExternalLink, ArrowRight, Dna, ShieldCheck, Thermometer
} from 'lucide-react';

export default function SelectedPairPane({
  selectedPair,
  engineProvenance,
  onRunSpecificityCheck,
  specificityResult,
  loadingSpecificity
}) {
  const [copiedFwd, setCopiedFwd] = useState(false);
  const [copiedRev, setCopiedRev] = useState(false);
  const [copiedAmp, setCopiedAmp] = useState(false);

  if (!selectedPair) {
    return (
      <aside className="pd-pane-right">
        <div className="pd-pane-header">
          <span className="pd-pane-title">
            <Sliders size={16} color="var(--pd-accent)" />
            Selected Pair Details
          </span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center', color: 'var(--pd-text-muted)' }}>
          <Dna size={36} color="var(--pd-border)" style={{ marginBottom: '12px' }} />
          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--pd-text)' }}>No Pair Selected</span>
          <p style={{ fontSize: '0.76rem', lineHeight: 1.5, marginTop: '6px' }}>
            Run primer design or select a candidate pair from the bottom table to inspect thermodynamic metrics, GC clamps, and hairpin stability.
          </p>
        </div>
      </aside>
    );
  }

  const fwd = selectedPair.forward;
  const rev = selectedPair.reverse;
  const amplicon = selectedPair.amplicon;

  const copyToClipboard = (text, setFn) => {
    navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
  };

  return (
    <aside className="pd-pane-right">
      <div className="pd-pane-header">
        <span className="pd-pane-title">
          <Sliders size={16} color="var(--pd-accent)" />
          Candidate #{selectedPair.rank} Overview
        </span>
        <span className="pd-chip pd-chip-cyan">
          {selectedPair.statusLabel || 'Meets configured constraints'}
        </span>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Pair Summary Highlights */}
        <div className="pd-stat-grid">
          <div className="pd-stat-card">
            <span className="pd-stat-title">Recommended Ta</span>
            <span className="pd-stat-value" style={{ color: 'var(--pd-accent)' }}>
              {selectedPair.recommendedTa}°C
            </span>
          </div>

          <div className="pd-stat-card">
            <span className="pd-stat-title">Amplicon Size</span>
            <span className="pd-stat-value">
              {amplicon?.size || selectedPair.productLength || 0} bp
            </span>
          </div>

          <div className="pd-stat-card">
            <span className="pd-stat-title">ΔTm (|Fwd - Rev|)</span>
            <span className="pd-stat-value">
              {selectedPair.tmDiff}°C
            </span>
          </div>

          <div className="pd-stat-card">
            <span className="pd-stat-title">Primer3 Penalty</span>
            <span className="pd-stat-value" style={{ fontSize: '0.88rem' }}>
              {selectedPair.pairPenalty || selectedPair.score || 0}
            </span>
          </div>
        </div>

        {/* Forward Primer Card */}
        <div
          style={{
            background: 'var(--pd-surface-card)',
            border: '1px solid var(--pd-border)',
            borderLeft: '4px solid var(--pd-fwd-primer)',
            borderRadius: '8px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--pd-fwd-primer)' }}>
              Forward Primer (5' → 3')
            </span>
            <button
              type="button"
              className="pd-btn pd-btn-ghost pd-btn-sm"
              onClick={() => copyToClipboard(fwd.sequence, setCopiedFwd)}
              title="Copy Forward Sequence"
            >
              {copiedFwd ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
              <span>{copiedFwd ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Sequence with Monospace Wrap */}
          <div
            style={{
              fontFamily: 'var(--pd-font-mono)',
              fontSize: '0.82rem',
              letterSpacing: '0.08em',
              background: 'var(--pd-surface)',
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid var(--pd-border-subtle)',
              wordBreak: 'break-all'
            }}
          >
            {fwd.sequence}
          </div>

          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', fontSize: '0.72rem' }}>
            <div>
              <span style={{ color: 'var(--pd-text-muted)' }}>Length:</span>
              <div className="pd-mono"><strong>{fwd.length} bp</strong></div>
            </div>
            <div>
              <span style={{ color: 'var(--pd-text-muted)' }}>Tm:</span>
              <div className="pd-mono"><strong>{fwd.tm}°C</strong></div>
            </div>
            <div>
              <span style={{ color: 'var(--pd-text-muted)' }}>GC%:</span>
              <div className="pd-mono"><strong>{fwd.gc}%</strong></div>
            </div>
            <div>
              <span style={{ color: 'var(--pd-text-muted)' }}>Pos:</span>
              <div className="pd-mono"><strong>{fwd.start}–{fwd.end}</strong></div>
            </div>
          </div>

          {/* Forward Thermodynamics */}
          <div style={{ borderTop: '1px solid var(--pd-border-subtle)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.72rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--pd-text-muted)' }}>3' GC Clamp:</span>
              <span>
                {fwd.gcClampCount >= 1 && fwd.gcClampCount <= 3 ? (
                  <strong style={{ color: '#10b981' }}>{fwd.gcClampCount} G/C (Optimal)</strong>
                ) : (
                  <span>{fwd.gcClampCount} G/C</span>
                )}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--pd-text-muted)' }}>Hairpin ΔG:</span>
              <span className="pd-mono">
                {fwd.hairpin?.structureFound ? (
                  <strong style={{ color: fwd.hairpin.dg < -3 ? '#f43f5e' : '#f59e0b' }}>
                    {fwd.hairpin.dg} kcal/mol ({fwd.hairpin.tm}°C)
                  </strong>
                ) : (
                  <span style={{ color: '#10b981' }}>None detected</span>
                )}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--pd-text-muted)' }}>Self-Dimer ΔG:</span>
              <span className="pd-mono">
                {fwd.selfDimer?.structureFound ? (
                  <strong style={{ color: fwd.selfDimer.dg < -5 ? '#f43f5e' : 'var(--pd-text)' }}>
                    {fwd.selfDimer.dg} kcal/mol
                  </strong>
                ) : (
                  <span style={{ color: '#10b981' }}>None detected</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Reverse Primer Card */}
        <div
          style={{
            background: 'var(--pd-surface-card)',
            border: '1px solid var(--pd-border)',
            borderLeft: '4px solid var(--pd-rev-primer)',
            borderRadius: '8px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--pd-rev-primer)' }}>
              Reverse Primer (5' → 3')
            </span>
            <button
              type="button"
              className="pd-btn pd-btn-ghost pd-btn-sm"
              onClick={() => copyToClipboard(rev.sequence, setCopiedRev)}
              title="Copy Reverse Sequence"
            >
              {copiedRev ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
              <span>{copiedRev ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Sequence */}
          <div
            style={{
              fontFamily: 'var(--pd-font-mono)',
              fontSize: '0.82rem',
              letterSpacing: '0.08em',
              background: 'var(--pd-surface)',
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid var(--pd-border-subtle)',
              wordBreak: 'break-all'
            }}
          >
            {rev.sequence}
          </div>

          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', fontSize: '0.72rem' }}>
            <div>
              <span style={{ color: 'var(--pd-text-muted)' }}>Length:</span>
              <div className="pd-mono"><strong>{rev.length} bp</strong></div>
            </div>
            <div>
              <span style={{ color: 'var(--pd-text-muted)' }}>Tm:</span>
              <div className="pd-mono"><strong>{rev.tm}°C</strong></div>
            </div>
            <div>
              <span style={{ color: 'var(--pd-text-muted)' }}>GC%:</span>
              <div className="pd-mono"><strong>{rev.gc}%</strong></div>
            </div>
            <div>
              <span style={{ color: 'var(--pd-text-muted)' }}>Pos:</span>
              <div className="pd-mono"><strong>{rev.start}–{rev.end}</strong></div>
            </div>
          </div>

          {/* Reverse Thermodynamics */}
          <div style={{ borderTop: '1px solid var(--pd-border-subtle)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.72rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--pd-text-muted)' }}>3' GC Clamp:</span>
              <span>
                {rev.gcClampCount >= 1 && rev.gcClampCount <= 3 ? (
                  <strong style={{ color: '#10b981' }}>{rev.gcClampCount} G/C (Optimal)</strong>
                ) : (
                  <span>{rev.gcClampCount} G/C</span>
                )}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--pd-text-muted)' }}>Hairpin ΔG:</span>
              <span className="pd-mono">
                {rev.hairpin?.structureFound ? (
                  <strong style={{ color: rev.hairpin.dg < -3 ? '#f43f5e' : '#f59e0b' }}>
                    {rev.hairpin.dg} kcal/mol ({rev.hairpin.tm}°C)
                  </strong>
                ) : (
                  <span style={{ color: '#10b981' }}>None detected</span>
                )}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--pd-text-muted)' }}>Self-Dimer ΔG:</span>
              <span className="pd-mono">
                {rev.selfDimer?.structureFound ? (
                  <strong style={{ color: rev.selfDimer.dg < -5 ? '#f43f5e' : 'var(--pd-text)' }}>
                    {rev.selfDimer.dg} kcal/mol
                  </strong>
                ) : (
                  <span style={{ color: '#10b981' }}>None detected</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Pair Cross-Reactivity & Heterodimer */}
        <div
          style={{
            background: 'var(--pd-surface-card)',
            border: '1px solid var(--pd-border)',
            borderRadius: '8px',
            padding: '12px 14px',
            fontSize: '0.74rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--pd-text-muted)' }}>
            Pair Cross-Dimer Stability
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Cross-Dimer ΔG:</span>
            <span className="pd-mono">
              {selectedPair.heterodimer?.structureFound ? (
                <strong style={{ color: selectedPair.heterodimer.dg < -5 ? '#f43f5e' : 'var(--pd-accent)' }}>
                  {selectedPair.heterodimer.dg} kcal/mol ({selectedPair.heterodimer.tm}°C)
                </strong>
              ) : (
                <span style={{ color: '#10b981' }}>None detected (&gt; -1.5 kcal/mol)</span>
              )}
            </span>
          </div>
        </div>

        {/* Specificity Quick Action */}
        <div
          style={{
            background: 'var(--pd-surface-card)',
            border: '1px solid var(--pd-border)',
            borderRadius: '8px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--pd-text-muted)' }}>
              Binding Specificity
            </span>
            <span className={`pd-chip ${specificityResult?.isSpecific ? 'pd-chip-emerald' : 'pd-chip-amber'}`} style={{ fontSize: '0.68rem' }}>
              {specificityResult?.status === 'completed' 
                ? (specificityResult.isSpecific ? 'Specific in template' : 'Off-targets detected')
                : 'Specificity not yet checked'}
            </span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--pd-text-subtle)', margin: 0, lineHeight: 1.4 }}>
            Verify that this primer pair does not create unwanted secondary amplicons or misprime elsewhere in the template.
          </p>
          <button
            type="button"
            className="pd-btn pd-btn-sm"
            onClick={onRunSpecificityCheck}
            disabled={loadingSpecificity}
            style={{ justifyContent: 'center' }}
          >
            <ShieldCheck size={13} color="var(--pd-accent)" />
            <span>{loadingSpecificity ? 'Checking Specificity...' : 'Run Specificity Check'}</span>
          </button>
        </div>

        {/* Scientific Honesty Disclaimer Banner */}
        <div className="pd-advisory">
          <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Laboratory Validation Advisory:</strong>
            <br />
            BioNexus Studio provides computational in silico candidate predictions using thermodynamic nearest-neighbor models. Primers require experimental wet-lab optimization (annealing gradient PCR, magnesium titration) before diagnostic or synthesis use.
          </div>
        </div>
      </div>
    </aside>
  );
}
