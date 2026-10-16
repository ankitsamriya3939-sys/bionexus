import React, { useState, useEffect } from 'react';
import { 
  Dna, Database, Zap, GitMerge, Scissors, Binary, 
  ExternalLink, ArrowRight, Layers 
} from 'lucide-react';
import SequenceAnalysis from './SequenceAnalysis';
import NcbiExplorer from './NcbiExplorer';
import BlastCenter from './BlastCenter';
import AlignmentHub from './AlignmentHub';
import PrimerDesigner from './PrimerDesigner';
import { useWorkspace } from '../context/WorkspaceContext';

export default function GenomeSpace({ 
  initialTool = 'analysis', 
  setActiveTab, 
  globalSearch, 
  saveAnalysis, 
  savePrimerSet,
  sharedAlignmentData,
  setSharedAlignmentData 
}) {
  const { selectedScientificObject } = useWorkspace();
  const [activeGenomeTool, setActiveGenomeTool] = useState(initialTool || 'analysis');

  useEffect(() => {
    if (initialTool) {
      setActiveGenomeTool(initialTool);
    }
  }, [initialTool]);

  const genomeTools = [
    { id: 'analysis', label: 'Sequence Analysis', icon: Binary, desc: 'ORF detection, GC distribution, translations & motifs' },
    { id: 'ncbi', label: 'Global Bio-Explorer', icon: Database, desc: 'Federated NCBI Entrez, UniProt Knowledgebase & ENA' },
    { id: 'blast', label: 'BLAST Alignment', icon: Zap, desc: 'Local heuristic sequence alignment with Smith-Waterman' },
    { id: 'alignment', label: 'Alignment Hub (MSA)', icon: GitMerge, desc: 'Progressive Needleman-Wunsch multiple alignment' },
    { id: 'primer', label: 'PCR Primer Designer', icon: Scissors, desc: 'Thermodynamic Tm calculation and GC clamp analysis' },
  ];

  const handleToolSwitch = (toolId) => {
    if (toolId === 'primer') {
      window.open('/primer-design', '_blank');
      return;
    }
    setActiveGenomeTool(toolId);
    if (setActiveTab) {
      setActiveTab(toolId);
    }
  };

  return (
    <div className="page-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Genome Space Header Navigation Tabs */}
      <div className="glass-card" style={{ padding: '14px 18px', marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="logo-badge" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' }}>
                Genome Space
              </span>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
                Genomic & Sequence Suite
              </h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '4px 0 0' }}>
              Unified sequence investigation, database streaming, local BLAST, alignment, and oligonucleotide design.
            </p>
          </div>
        </div>

        {/* Sub-tool switcher bar */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginTop: '14px',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '12px',
          overflowX: 'auto'
        }}>
          {genomeTools.map(tool => {
            const Icon = tool.icon;
            const isActive = activeGenomeTool === tool.id;
            return (
              <button
                key={tool.id}
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 14px',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 700 : 500,
                  borderColor: isActive ? 'var(--accent-cyan)' : 'var(--border-color)',
                  background: isActive ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
                  color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  whiteSpace: 'nowrap'
                }}
                onClick={() => handleToolSwitch(tool.id)}
              >
                <Icon size={15} color={isActive ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
                <span>{tool.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Active Genomic Module */}
      <div style={{ flex: 1 }}>
        {activeGenomeTool === 'analysis' && (
          <SequenceAnalysis
            saveAnalysisReport={saveAnalysis}
            setActiveTab={setActiveTab}
          />
        )}

        {activeGenomeTool === 'ncbi' && (
          <NcbiExplorer
            globalSearch={globalSearch}
            setActiveTab={setActiveTab}
          />
        )}

        {activeGenomeTool === 'blast' && (
          <BlastCenter
            setActiveTab={setActiveTab}
          />
        )}

        {activeGenomeTool === 'alignment' && (
          <AlignmentHub
            setActiveTab={setActiveTab}
            setSharedAlignmentData={setSharedAlignmentData}
          />
        )}

        {activeGenomeTool === 'primer' && (
          <PrimerDesigner
            savePrimerSet={savePrimerSet}
            setActiveTab={setActiveTab}
          />
        )}
      </div>
    </div>
  );
}
