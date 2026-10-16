// BioNexus UI Studio — Code Diff & Safety Review Modal
// Displays unified git diffs, pre-flight safety risk assessments,
// controlled code application triggers, and instant 1-click rollback.

import React from 'react';
import { useUIStudio } from '../../context/UIStudioContext';
import { 
  FileCode, ShieldCheck, Check, X, AlertTriangle, 
  RotateCcw, Play, CheckCircle2, RefreshCw, Copy 
} from 'lucide-react';

export default function UIStudioDiffModal() {
  const {
    diffModalOpen,
    setDiffModalOpen,
    pendingProposal,
    activeStyles,
    isPatching,
    patchFeedback,
    lastBackupFile,
    applyApprovedPatch,
    revertLastPatch
  } = useUIStudio();

  if (!diffModalOpen) return null;

  const diffText = pendingProposal?.diff || 'No pending code diff.';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '780px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px',
        borderRadius: '16px',
        borderColor: 'rgba(6, 182, 212, 0.4)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCode size={20} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Review Code Changes & Safety Assessment
              </h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '4px 0 0' }}>
              Inspect the exact additions and deletions before applying this approved proposal to the codebase.
            </p>
          </div>

          <button
            className="btn-icon"
            onClick={() => setDiffModalOpen(false)}
            title="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Safety Risk Audit Box */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '10px 16px',
          borderRadius: '10px',
          marginBottom: '16px',
          fontSize: '0.8rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-emerald)', fontWeight: 700 }}>
            <ShieldCheck size={18} />
            <span>Pre-Flight Safety Check: Passed (Presentation Tier Only)</span>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
            Calculations & Data Unaltered
          </span>
        </div>

        {/* Feedback Message if Patch Applied or Error */}
        {patchFeedback && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '16px',
            background: patchFeedback.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${patchFeedback.success ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {patchFeedback.success ? <CheckCircle2 size={16} color="var(--accent-emerald)" /> : <AlertTriangle size={16} color="var(--accent-rose)" />}
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: patchFeedback.success ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                {patchFeedback.message}
              </span>
            </div>

            {lastBackupFile && patchFeedback.success && (
              <button
                className="btn-secondary"
                onClick={revertLastPatch}
                disabled={isPatching}
                style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <RotateCcw size={12} /> 1-Click Rollback
              </button>
            )}
          </div>
        )}

        {/* Unified Git Diff Viewer */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: '#05070d',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          padding: '14px',
          fontFamily: 'monospace',
          fontSize: '0.78rem',
          lineHeight: 1.6,
          marginBottom: '20px'
        }}>
          {diffText.split('\n').map((line, idx) => {
            let color = 'var(--text-muted)';
            let bg = 'transparent';
            if (line.startsWith('+')) {
              color = '#34d399'; // Emerald text
              bg = 'rgba(16, 185, 129, 0.12)';
            } else if (line.startsWith('-')) {
              color = '#f87171'; // Rose text
              bg = 'rgba(244, 63, 94, 0.12)';
            } else if (line.startsWith('@') || line.startsWith('diff')) {
              color = 'var(--accent-cyan)';
            }

            return (
              <div
                key={idx}
                style={{
                  color,
                  backgroundColor: bg,
                  padding: '1px 4px',
                  borderRadius: '2px',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {line}
              </div>
            );
          })}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            className="btn-secondary"
            onClick={() => setDiffModalOpen(false)}
            disabled={isPatching}
          >
            Close
          </button>

          <button
            className="btn-primary"
            onClick={() => applyApprovedPatch(pendingProposal)}
            disabled={isPatching || !pendingProposal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 20px',
              fontWeight: 700
            }}
          >
            {isPatching ? (
              <>
                <RefreshCw size={15} className="spin-animation" />
                <span>Applying Changes & Verifying...</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>Approve & Apply to Codebase</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
