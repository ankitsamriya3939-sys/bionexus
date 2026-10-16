import React from 'react';
import { AlertCircle, Dna, ArrowRight, X } from 'lucide-react';

export default function SequenceConflictModal({ activeSequenceObj, toolName, onUseActive, onKeepCurrent, onClose }) {
  if (!activeSequenceObj) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 1100,
      display: 'flex',
      alignItems: 'center',
      justify: 'center',
      padding: '24px'
    }}>
      <div className="glass-card page-fade-in" style={{
        width: '100%',
        maxWidth: '480px',
        border: '1px solid rgba(6, 182, 212, 0.4)',
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.8)'
      }}>
        <div className="card-header" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(6, 182, 212, 0.15)', padding: '8px', borderRadius: '10px' }}>
              <Dna size={22} color="var(--accent-cyan)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Use Active Sequence in {toolName}?</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                BioNexus has an active sequence loaded in your global workspace.
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{
          background: 'rgba(6, 182, 212, 0.06)',
          border: '1px solid rgba(6, 182, 212, 0.2)',
          borderRadius: '8px',
          padding: '14px',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '4px' }}>
            {activeSequenceObj.name}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', gap: '12px' }}>
            <span>Accession: <code>{activeSequenceObj.accession}</code></span>
            <span>Length: <strong>{activeSequenceObj.length.toLocaleString()} {activeSequenceObj.moleculeType === 'protein' ? 'aa' : 'nt'}</strong></span>
          </div>
          {activeSequenceObj.organism && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Organism: {activeSequenceObj.organism}
            </div>
          )}
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          You have current input in <strong>{toolName}</strong>. Would you like to replace it with <strong>{activeSequenceObj.name}</strong> or keep your current work?
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onKeepCurrent}>
            Keep Current Input
          </button>
          <button className="btn-primary" onClick={onUseActive}>
            <ArrowRight size={16} /> Use Sequence ({activeSequenceObj.name})
          </button>
        </div>
      </div>
    </div>
  );
}
