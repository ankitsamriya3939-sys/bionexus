import React, { useState } from 'react';
import { Bookmark, Search, Dna, Trash2, Binary, Scissors, Zap, GitMerge, Plus, X, ArrowRight } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

export default function SequenceLibraryModal({ isOpen, onClose, setActiveTab }) {
  const { sequenceLibrary, setGlobalActiveSequence, removeFromSequenceLibrary, saveToSequenceLibrary, clearAllSequences } = useWorkspace();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSeqName, setNewSeqName] = useState('');
  const [newSeqAccession, setNewSeqAccession] = useState('');
  const [newSeqOrganism, setNewSeqOrganism] = useState('');
  const [newSeqContent, setNewSeqContent] = useState('');

  if (!isOpen) return null;

  const filteredSequences = sequenceLibrary.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      (item.name && item.name.toLowerCase().includes(term)) ||
      (item.accession && item.accession.toLowerCase().includes(term)) ||
      (item.organism && item.organism.toLowerCase().includes(term))
    );
  });

  const handleOpenAndSetActive = (seqItem, targetTab) => {
    setGlobalActiveSequence(seqItem, seqItem.name);
    if (targetTab) {
      setActiveTab(targetTab);
    }
    onClose();
  };

  const handleCreateSequence = (e) => {
    e.preventDefault();
    if (!newSeqContent.trim()) return;
    saveToSequenceLibrary({
      name: newSeqName || 'Custom Sequence',
      accession: newSeqAccession || 'Custom',
      organism: newSeqOrganism || 'Unspecified',
      sequence: newSeqContent
    });
    setNewSeqName('');
    setNewSeqAccession('');
    setNewSeqOrganism('');
    setNewSeqContent('');
    setShowAddModal(false);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 1150,
      display: 'flex',
      alignItems: 'center',
      justify: 'center',
      padding: '24px'
    }}>
      <div className="glass-card page-fade-in" style={{
        width: '100%',
        maxWidth: '850px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid rgba(168, 85, 247, 0.4)'
      }}>
        {/* Header */}
        <div className="card-header" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(168, 85, 247, 0.18)', padding: '8px', borderRadius: '10px' }}>
              <Bookmark size={22} color="#c084fc" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Sequence Library</h2>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: 0 }}>
                Manage saved DNA/RNA/Protein sequences across your BioNexus workspace ({sequenceLibrary.length} sequences stored)
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Controls Bar */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '36px', height: '38px', fontSize: '0.85rem' }}
              placeholder="Search by Name, Accession (e.g., NM_007294), or Organism..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Add Sequence
            </button>
            {sequenceLibrary.length > 0 && (
              <button
                className="btn-secondary"
                style={{ padding: '8px 14px', fontSize: '0.85rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete all saved sequences from the library?')) {
                    clearAllSequences();
                  }
                }}
                title="Purge all sequences from local storage library"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Add Sequence Sub-modal */}
        {showAddModal && (
          <form onSubmit={handleCreateSequence} style={{
            background: 'rgba(6, 182, 212, 0.05)',
            border: '1px dashed rgba(6, 182, 212, 0.3)',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', color: 'var(--accent-cyan)' }}>
              Save New Sequence to Library
            </h4>
            <div className="grid-3" style={{ gap: '10px', marginBottom: '10px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Sequence Name (e.g. BRCA1)"
                value={newSeqName}
                onChange={(e) => setNewSeqName(e.target.value)}
                required
              />
              <input
                type="text"
                className="input-field"
                placeholder="Accession (e.g. NM_007294.4)"
                value={newSeqAccession}
                onChange={(e) => setNewSeqAccession(e.target.value)}
              />
              <input
                type="text"
                className="input-field"
                placeholder="Organism (e.g. Homo sapiens)"
                value={newSeqOrganism}
                onChange={(e) => setNewSeqOrganism(e.target.value)}
              />
            </div>
            <textarea
              className="textarea-field"
              placeholder="Paste FASTA header & raw sequence here..."
              style={{ height: '80px', marginBottom: '10px', fontSize: '0.82rem' }}
              value={newSeqContent}
              onChange={(e) => setNewSeqContent(e.target.value)}
              required
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>Save to Library</button>
            </div>
          </form>
        )}

        {/* Sequence List */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {filteredSequences.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <Dna size={36} color="var(--text-muted)" style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p style={{ fontSize: '0.95rem' }}>No sequences found in your library.</p>
              <p style={{ fontSize: '0.8rem' }}>Fetch sequences from NCBI Explorer or click "Add Sequence" above to get started.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredSequences.map(item => (
                <div key={item.id} className="glass-card" style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{item.name}</span>
                        <span className="logo-badge" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' }}>
                          {item.accession}
                        </span>
                        <span className="logo-badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc' }}>
                          {item.moleculeType}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Organism: <strong>{item.organism}</strong> • Length: <strong>{item.length.toLocaleString()} {item.moleculeType === 'protein' ? 'aa' : 'nt'}</strong>
                      </div>
                    </div>

                    <button
                      className="btn-icon"
                      style={{ color: '#ef4444' }}
                      title="Delete from Library"
                      onClick={() => removeFromSequenceLibrary(item.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Actions toolbar */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                    <button className="btn-primary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => handleOpenAndSetActive(item, null)}>
                      <ArrowRight size={13} /> Set Active
                    </button>
                    <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => handleOpenAndSetActive(item, 'analysis')}>
                      <Binary size={13} color="#8b5cf6" /> Analyze
                    </button>
                    <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => handleOpenAndSetActive(item, 'primer')}>
                      <Scissors size={13} color="#06b6d4" /> Primer
                    </button>
                    <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => handleOpenAndSetActive(item, 'blast')}>
                      <Zap size={13} color="#f59e0b" /> BLAST
                    </button>
                    <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => handleOpenAndSetActive(item, 'alignment')}>
                      <GitMerge size={13} color="#ec4899" /> Add to MSA
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
