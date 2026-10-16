import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, FileCode, Info } from 'lucide-react';

export default function ValidationPanel({ validation, mode = 'nucleotide' }) {
  if (!validation) return null;

  if (validation.isEmpty) {
    const emptyMsg = mode === 'protein'
      ? 'Enter or paste an amino acid sequence (single-letter codes) or FASTA record above.'
      : mode === 'accession'
      ? 'Enter an NCBI accession ID (e.g., NC_000913.3, NM_000546.6, NP_000537.3) to retrieve the official record.'
      : 'Enter or paste a DNA/RNA nucleotide sequence (A, T, G, C, U or IUPAC codes) or FASTA record above.';

    return (
      <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 16px', marginTop: '10px', fontSize: '0.83rem', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={16} /> {emptyMsg}
        </div>
      </div>
    );
  }

  const molType = validation.moleculeType || (validation.isProtein ? 'protein' : 'DNA');
  const isProt = molType === 'protein';
  const isRna = molType === 'RNA';

  if (!validation.isValid) {
    const errorTitle = isProt
      ? '✕ Invalid Protein Sequence'
      : molType === 'hybrid'
      ? '✕ Mixed DNA/RNA Input'
      : '✕ Invalid Sequence Input';

    return (
      <div style={{ background: 'rgba(244, 63, 94, 0.12)', border: '1px solid var(--accent-rose)', borderRadius: '10px', padding: '14px 16px', marginTop: '10px' }} className="page-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--accent-rose)', marginBottom: '8px', fontSize: '0.92rem' }}>
          <XCircle size={18} /> {errorTitle}
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '10px', lineHeight: 1.5 }}>
          {validation.errorMessage}
        </p>

        {validation.invalidChars && validation.invalidChars.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.82rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--accent-rose)' }}>Invalid characters:</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#ffffff', fontWeight: 700 }}>
              {validation.invalidChars.join(', ')}
            </span>
            {validation.offendingPositions && validation.offendingPositions.length > 0 && (
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                (Found at position{validation.offendingPositions.length > 1 ? 's' : ''}: {validation.offendingPositions.slice(0, 4).map(p => `#${p.position}`).join(', ')}{validation.offendingPositions.length > 4 ? ` +${validation.offendingPositions.length - 4} more` : ''})
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  const validTitle = isProt
    ? '✓ Valid Protein Sequence'
    : isRna
    ? '✓ Valid RNA Sequence'
    : '✓ Valid DNA Sequence';

  return (
    <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '14px 16px', marginTop: '10px' }} className="page-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--accent-emerald)', fontSize: '0.92rem' }}>
          <CheckCircle2 size={18} /> {validTitle}
        </div>

        {validation.isFasta && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600 }}>
            <FileCode size={14} /> FASTA: {validation.fastaHeader || 'Header Valid'}
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' }}>
        <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Length</div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {(validation.length || 0).toLocaleString()} {isProt ? 'aa' : 'nt'}
          </div>
        </div>

        {!isProt && (
          <>
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GC Content</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                {validation.gcPercent !== undefined ? `${validation.gcPercent}%` : '—'}
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{isRna ? 'AU Content' : 'AT Content'}</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                {validation.atPercent !== undefined ? `${validation.atPercent}%` : '—'}
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ambiguous Bases</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: (validation.ambigCount || validation.totalAmbiguous) > 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>
                {validation.ambigCount || validation.totalAmbiguous || 0}
              </div>
            </div>
          </>
        )}

        {isProt && (
          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Molecule</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-violet)' }}>
              Polypeptide
            </div>
          </div>
        )}
      </div>

      {validation.warningMessage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '0.8rem', color: 'var(--accent-amber)' }}>
          <AlertTriangle size={14} /> {validation.warningMessage}
        </div>
      )}
    </div>
  );
}
