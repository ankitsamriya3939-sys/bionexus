import React, { useState } from 'react';
import { FolderGit2, Plus, Dna, Scissors, Zap, GitMerge, Network, FileText, Trash2, CheckCircle, FolderOpen } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

export default function ProjectManager({ isOpen, onClose, setActiveTab, savedPrimers, savedAnalyses }) {
  const { activeProject, setActiveProject, projects, setProjects, sequenceLibrary, setGlobalActiveSequence } = useWorkspace();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');

  if (!isOpen) return null;

  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    const newProj = {
      id: `proj_${Date.now()}`,
      name: newProjName,
      description: newProjDesc || 'User defined research project',
      createdAt: new Date().toISOString()
    };
    setProjects(prev => [newProj, ...prev]);
    setActiveProject(newProj);
    setNewProjName('');
    setNewProjDesc('');
    setShowCreateModal(false);
  };

  const handleDeleteProject = (projId) => {
    if (projects.length <= 1) {
      alert('Cannot delete the last project.');
      return;
    }
    setProjects(prev => prev.filter(p => p.id !== projId));
    if (activeProject && activeProject.id === projId) {
      const remaining = projects.filter(p => p.id !== projId);
      setActiveProject(remaining[0]);
    }
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
        maxWidth: '900px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid rgba(6, 182, 212, 0.4)'
      }}>
        {/* Header */}
        <div className="card-header" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(6, 182, 212, 0.15)', padding: '8px', borderRadius: '10px' }}>
              <FolderGit2 size={22} color="var(--accent-cyan)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Project Workspaces</h2>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: 0 }}>
                Organize sequences, primer designs, BLAST hits, alignments, and reports in dedicated research projects
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Action bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Current Active Project: <strong style={{ color: 'var(--accent-cyan)' }}>{activeProject?.name}</strong>
          </div>
          <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Create New Project
          </button>
        </div>

        {/* Create Form */}
        {showCreateModal && (
          <form onSubmit={handleCreateProject} style={{
            background: 'rgba(6, 182, 212, 0.05)',
            border: '1px dashed rgba(6, 182, 212, 0.3)',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', color: 'var(--accent-cyan)' }}>
              Create New Research Project
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Project Name (e.g. BRCA1 PCR Analysis)"
                value={newProjName}
                onChange={(e) => setNewProjName(e.target.value)}
                required
              />
              <input
                type="text"
                className="input-field"
                placeholder="Project Description / Target Organism"
                value={newProjDesc}
                onChange={(e) => setNewProjDesc(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>Create & Switch</button>
            </div>
          </form>
        )}

        {/* Content Tree & Projects Grid */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div className="grid-2" style={{ gap: '16px' }}>
            {projects.map(proj => {
              const isActive = activeProject && activeProject.id === proj.id;
              return (
                <div
                  key={proj.id}
                  className="glass-card"
                  style={{
                    padding: '20px',
                    borderColor: isActive ? 'var(--accent-cyan)' : 'var(--border-color)',
                    background: isActive ? 'rgba(6, 182, 212, 0.04)' : 'rgba(255, 255, 255, 0.02)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FolderOpen size={18} color={isActive ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{proj.name}</h3>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{proj.description}</p>
                    </div>

                    {isActive ? (
                      <span className="logo-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-emerald)', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                        <CheckCircle size={12} /> Active Project
                      </span>
                    ) : (
                      <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => setActiveProject(proj)}>
                        Switch Project
                      </button>
                    )}
                  </div>

                  {/* Structured Project Asset Tree */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '0.82rem',
                    fontFamily: 'monospace',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6
                  }}>
                    <div style={{ fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '4px' }}>
                      📁 {proj.name} Workspace Tree:
                    </div>
                    <div>├── 🧬 Sequences ({sequenceLibrary.length} stored)</div>
                    <div>├── ✂️ Primer Designs ({savedPrimers ? savedPrimers.length : 0} sets)</div>
                    <div>├── ⚡ BLAST Analyses ({savedAnalyses ? savedAnalyses.filter(a => a.type === 'BLAST').length : 0})</div>
                    <div>├── 🔀 MSA Alignments</div>
                    <div>├── 🌳 Phylogenetic Trees</div>
                    <div>└── 📄 Reports ({savedAnalyses ? savedAnalyses.length : 0} generated)</div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Created {new Date(proj.createdAt).toLocaleDateString()}</span>
                    {projects.length > 1 && (
                      <button
                        className="btn-icon"
                        style={{ color: '#ef4444', fontSize: '0.8rem' }}
                        title="Delete project"
                        onClick={() => handleDeleteProject(proj.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
