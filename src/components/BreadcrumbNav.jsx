import React from 'react';
import { ChevronRight, FolderGit2, Dna, Wrench } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

const toolNames = {
  home: 'Home',
  genome: 'Genome Space',
  dashboard: 'Dashboard',
  primer: 'Primer Designer',
  ncbi: 'NCBI Explorer',
  blast: 'BLAST Center',
  analysis: 'Sequence Analysis',
  alignment: 'Alignment Hub (MSA)',
  phylo: 'Evolution Space (Phylogenetics)',
  protein: 'Protein Space (Molecular Canvas)',
  evidence: 'Evidence Space',
  utilities: 'Lab Utilities'
};

export default function BreadcrumbNav({ activeTab, onOpenProjects }) {
  const { activeProject, activeSequenceObj, clearGlobalActiveSequence } = useWorkspace();

  if (activeTab === 'home') return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '0.8rem',
      color: 'var(--text-muted)',
      marginBottom: '16px',
      background: 'rgba(20, 9, 40, 0.65)',
      padding: '6px 14px',
      borderRadius: '8px',
      border: '1px solid var(--border-color)',
      width: 'fit-content'
    }}>
      {/* Project Node */}
      <div
        onClick={onOpenProjects}
        style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', color: '#c084fc' }}
        title="Click to view/switch project"
      >
        <FolderGit2 size={14} color="#c084fc" />
        <span>Project: <strong style={{ color: '#ffffff' }}>{activeProject ? activeProject.name : 'General Workspace'}</strong></span>
      </div>

      <ChevronRight size={13} color="var(--text-muted)" />

      {/* Active Sequence Node (only if present) */}
      {activeSequenceObj && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#fbbf24' }}>
            <Dna size={14} color="#fbbf24" />
            <span>Sequence: <strong style={{ color: '#ffffff' }}>{activeSequenceObj.name}</strong> ({activeSequenceObj.accession !== 'Custom Sequence' ? activeSequenceObj.accession : `${activeSequenceObj.length?.toLocaleString()} nt`})</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearGlobalActiveSequence();
              }}
              title="Remove sequence from breadcrumb"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0 2px',
                fontSize: '0.75rem',
                lineHeight: 1
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              ✕
            </button>
          </div>
          <ChevronRight size={13} color="var(--text-muted)" />
        </>
      )}

      {/* Tool Node */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ffffff', fontWeight: 600 }}>
        <Wrench size={13} color="#c084fc" />
        <span>{toolNames[activeTab] || activeTab}</span>
      </div>
    </div>
  );
}
