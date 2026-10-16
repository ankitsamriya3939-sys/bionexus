import React, { useState, useRef, useEffect } from 'react';
import { Dna, Scissors, Zap, Binary, GitMerge, BookmarkPlus, Trash2, ChevronDown, CheckCircle2, X } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

export default function ActiveSequenceBar({ setActiveTab }) {
  const { activeSequenceObj, clearGlobalActiveSequence, clearAllSequences, saveToSequenceLibrary, autoSaveStatus } = useWorkspace();
  const [panelOpen, setPanelOpen] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setPanelOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!activeSequenceObj) {
    return null;
  }

  const handleAction = (tabName) => {
    setActiveTab(tabName);
    setPanelOpen(false);
  };

  const handleSaveToLibrary = () => {
    saveToSequenceLibrary(activeSequenceObj);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      {/* Compact Global Indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.22), rgba(245, 158, 11, 0.12))',
          border: '1px solid rgba(168, 85, 247, 0.45)',
          color: 'var(--text-primary)',
          padding: '4px 8px 4px 12px',
          borderRadius: '20px',
          fontSize: '0.82rem',
          fontWeight: 600,
          boxShadow: panelOpen ? '0 0 14px rgba(168, 85, 247, 0.4)' : 'none',
          transition: 'all 0.2s ease'
        }}
      >
        <div
          onClick={() => setPanelOpen(!panelOpen)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          title="Click to view Active Sequence panel & actions"
        >
          <Dna size={15} color="#c084fc" className="pulse-slow" />
          <span style={{ color: '#c084fc', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Active
          </span>
          <span style={{ color: 'var(--text-muted)' }}>|</span>
          <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
            {activeSequenceObj.name}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            ({activeSequenceObj.accession !== 'Custom Sequence' ? activeSequenceObj.accession : `${activeSequenceObj.length?.toLocaleString()} nt`})
          </span>
          <ChevronDown size={14} color="var(--text-muted)" style={{ transform: panelOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
        </div>

        {/* Quick Close / Unload Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            clearGlobalActiveSequence();
            setPanelOpen(false);
          }}
          title="Unload / remove active sequence"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            marginLeft: '4px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <X size={11} />
        </button>
      </div>

      {/* Popover Panel */}
      {panelOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 10px)',
          right: 0,
          width: '320px',
          background: 'var(--bg-card, #140928)',
          border: '1px solid rgba(168, 85, 247, 0.35)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
          zIndex: 1000,
          backdropFilter: 'blur(16px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Dna size={18} color="#c084fc" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Active Sequence</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: autoSaveStatus === 'saving' ? '#f59e0b' : '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {autoSaveStatus === 'saving' ? 'Saving...' : '✓ Saved'}
            </span>
          </div>

          {/* Details list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.83rem', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Name:</span>
              <strong style={{ color: '#c084fc', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeSequenceObj.name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Accession:</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{activeSequenceObj.accession}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Organism:</span>
              <span style={{ color: 'var(--text-secondary)' }}>{activeSequenceObj.organism}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Molecule Type:</span>
              <span className="logo-badge" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                {activeSequenceObj.moleculeType}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Length:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{activeSequenceObj.length?.toLocaleString()} {activeSequenceObj.moleculeType === 'protein' ? 'aa' : 'nt'}</strong>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Actions
            </div>

            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.85rem' }} onClick={() => handleAction('analysis')}>
              <Binary size={15} color="#8b5cf6" /> Sequence Analysis
            </button>

            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.85rem' }} onClick={() => handleAction('primer')}>
              <Scissors size={15} color="#c084fc" /> Design Primers
            </button>

            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.85rem' }} onClick={() => handleAction('blast')}>
              <Zap size={15} color="#f59e0b" /> Run BLAST
            </button>

            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.85rem' }} onClick={() => handleAction('alignment')}>
              <GitMerge size={15} color="#ec4899" /> Add to Alignment
            </button>

            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.85rem', color: savedSuccess ? '#10b981' : 'var(--text-primary)' }} onClick={handleSaveToLibrary}>
              {savedSuccess ? <CheckCircle2 size={15} color="#10b981" /> : <BookmarkPlus size={15} color="#10b981" />}
              {savedSuccess ? 'Saved to Library!' : 'Save to Project / Library'}
            </button>

            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <button
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '4px 8px', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' }}
                onClick={() => {
                  if (window.confirm('Clear all stored sequences from library?')) {
                    clearAllSequences();
                    setPanelOpen(false);
                  }
                }}
                title="Wipe all pre-added and cached sequences"
              >
                Clear All
              </button>

              <button
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '4px 8px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                onClick={() => {
                  clearGlobalActiveSequence();
                  setPanelOpen(false);
                }}
              >
                <Trash2 size={13} /> Unload Sequence
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
