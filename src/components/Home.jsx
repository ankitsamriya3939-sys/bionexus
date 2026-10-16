import React, { useState } from 'react';
import { 
  Scissors, Zap, Binary, Network, Boxes, 
  ArrowRight, Dna, Activity, 
  BookOpen, CheckCircle2, Play, Sparkles
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

export default function Home({ setActiveTab, onOpenProjects, onOpenLibrary: _onOpenLibrary, onOpenUpdates }) {
  const { 
    activeSequenceObj, 
    setGlobalActiveSequence 
  } = useWorkspace();

  const [activeScene, setActiveScene] = useState('overall');

  const universeSpaces = [
    {
      id: 'genome',
      title: 'Genome Space',
      desc: 'Multi-omic genomic suite uniting ORF finder, translation, multi-source NCBI/UniProt racing, local BLAST, and primer design.',
      icon: Dna,
      color: 'var(--accent-cyan)',
      tags: ['Sequence Analysis', 'NCBI Entrez', 'BLAST', 'MSA', 'Primers']
    },
    {
      id: 'protein',
      title: 'Protein Space (PyMOL 3D)',
      desc: 'Interactive 3D macromolecular interaction canvas with sequence-to-structure residue track, RCSB metadata, and PyMOL representations.',
      icon: Boxes,
      color: 'var(--accent-blue)',
      tags: ['PyMOL 3 Engine', '3D WebGL Canvas', 'RCSB PDB', 'AlphaFold']
    },
    {
      id: 'phylo',
      title: 'Evolution Space',
      desc: 'Evolutionary tree inference with Maximum Likelihood (Felsenstein pruning), Minimum Evolution, Neighbor-Joining, and Robinson-Foulds comparison.',
      icon: Network,
      color: 'var(--accent-emerald)',
      tags: ['Maximum Likelihood', 'FastME', 'NJ / UPGMA', 'Newick / Nexus']
    },
    {
      id: 'evidence',
      title: 'Evidence Space',
      desc: 'Empirical literature and database annotation repository grounding computational findings in verified citations and confidence tiers.',
      icon: BookOpen,
      color: 'var(--accent-violet)',
      tags: ['PubMed PMID', 'Swiss-Prot', 'Confidence Tiers', 'BibTeX']
    }
  ];

  const [localSeqText, setLocalSeqText] = React.useState(activeSequenceObj ? activeSequenceObj.sequence : '');

  React.useEffect(() => {
    if (activeSequenceObj && activeSequenceObj.sequence) {
      setLocalSeqText(activeSequenceObj.sequence);
    }
  }, [activeSequenceObj]);

  const handleSyncGlobal = () => {
    if (localSeqText && (!activeSequenceObj || localSeqText !== activeSequenceObj.sequence)) {
      setGlobalActiveSequence(localSeqText, 'Workspace Input');
    }
  };

  const handleNavigate = (tabId) => {
    handleSyncGlobal();
    setActiveTab(tabId);
  };

  return (
    <div className="page-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Schrödinger PyMOL 3 Hero Banner */}
      <div className="home-hero-banner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '32px', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: '780px' }}>
            <div 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(0, 132, 214, 0.18)',
                color: 'var(--pymol-cyan)',
                padding: '6px 16px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 800,
                marginBottom: '16px',
                border: '1px solid rgba(0, 132, 214, 0.45)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 0 20px rgba(0, 132, 214, 0.25)',
                letterSpacing: '0.5px',
                cursor: onOpenUpdates ? 'pointer' : 'default'
              }}
              onClick={onOpenUpdates}
              title="Click to view What's New & System Updates"
            >
              <Sparkles size={14} /> SCHRÖDINGER ARCHITECTURE • PYMOL 3
              {onOpenUpdates && (
                <span style={{
                  background: 'rgba(168, 85, 247, 0.35)',
                  border: '1px solid rgba(168, 85, 247, 0.6)',
                  color: '#ffffff',
                  padding: '1px 8px',
                  borderRadius: '12px',
                  fontSize: '0.7rem',
                  marginLeft: '4px'
                }}>
                  WHAT'S NEW IN v2.1 ↗
                </span>
              )}
            </div>
            
            {/* EXACT SINGLE H1 REQUIRED BY SEO */}
            <h1 style={{ fontSize: '2.8rem', fontWeight: 800, marginBottom: '14px', letterSpacing: '-0.8px', lineHeight: 1.15, color: '#ffffff' }}>
              BioNexus Studio 3
            </h1>

            <p style={{ color: 'var(--text-secondary)', fontSize: '1.25rem', fontWeight: 500, lineHeight: 1.5, marginBottom: '28px', maxWidth: '680px' }}>
              A modern advance in molecular visualization, structural biophysics and synchronized genomic intelligence.
            </p>

            {/* Signature PyMOL 3 Action Pill Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <button 
                className="btn-pymol-pill" 
                onClick={() => handleNavigate('protein')}
                title="Launch 3D Macromolecular Viewer"
              >
                <span>LAUNCH STUDIO</span>
                <span className="pill-arrow"><ArrowRight size={13} /></span>
              </button>

              <button 
                className="btn-pymol-outline" 
                onClick={onOpenProjects}
                title="Manage Project Workspaces"
              >
                <span>EXPLORE WORKSPACES</span>
                <span className="pill-arrow"><ArrowRight size={13} /></span>
              </button>

              {onOpenUpdates && (
                <button 
                  type="button"
                  className="btn-pymol-outline" 
                  onClick={onOpenUpdates}
                  style={{
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.18), rgba(192, 132, 252, 0.08))',
                    borderColor: 'rgba(168, 85, 247, 0.5)',
                    color: '#ffffff'
                  }}
                  title="View What's New & System Updates"
                >
                  <Sparkles size={14} color="#c084fc" />
                  <span>UPDATES (v2.1)</span>
                  <span className="pill-arrow"><ArrowRight size={13} /></span>
                </button>
              )}

              <div 
                className="pymol-video-pill"
                onClick={() => handleNavigate('protein')}
                title="Explore 3D PyMOL interactive canvas"
              >
                <div className="pymol-play-ring">
                  <Play size={18} fill="#070b1a" color="#070b1a" style={{ marginLeft: '2px' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.6px', color: '#ffffff', textTransform: 'uppercase' }}>
                    WATCH DEMO
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    1min 12sec
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PyMOL 3 Feature Showcase: "Simplify editing with scenes" (Screenshot 2 Style) */}
      <div className="glass-card" style={{ padding: '36px', border: '1px solid rgba(99, 128, 220, 0.22)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '36px', alignItems: 'center' }}>
          
          {/* Left Column: PyMOL Studio Interactive App Window Frame */}
          <div className="pymol-app-frame">
            <div className="pymol-app-header">
              <div className="pymol-window-dots">
                <div className="pymol-dot red" />
                <div className="pymol-dot yellow" />
                <div className="pymol-dot green" />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                PyMOL 3 — [bionexus_session.pse]
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--pymol-cyan)', fontWeight: 700 }}>WebGL 2.0</span>
              </div>
            </div>

            {/* Inner Workspace Canvas */}
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 110px', height: '260px', background: '#050713', position: 'relative' }}>
              {/* Scene Thumbnails Sidebar */}
              <div style={{ borderRight: '1px solid rgba(255, 255, 255, 0.08)', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(10, 14, 30, 0.7)' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                  SCENES
                </div>

                {[
                  { id: 'overall', name: '01_overall', label: 'Global Complex' },
                  { id: 'pocket', name: '02_pocket', label: 'Active Site' },
                  { id: 'ligand', name: '03_ligand', label: 'Ligand Polar' }
                ].map(scene => (
                  <div
                    key={scene.id}
                    onClick={() => setActiveScene(scene.id)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      background: activeScene === scene.id ? 'rgba(0, 132, 214, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid',
                      borderColor: activeScene === scene.id ? 'var(--schrodinger-blue)' : 'rgba(255, 255, 255, 0.06)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: activeScene === scene.id ? 'var(--pymol-cyan)' : 'var(--text-primary)' }}>
                      {scene.name}
                    </div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                      {scene.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Center 3D Molecular Graphics Preview */}
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `radial-gradient(circle at center, rgba(0, 132, 214, 0.15) 0%, #050713 70%), url('/pymol-hero.jpg') center/cover no-repeat`,
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(5, 7, 19, 0.45)',
                  backdropFilter: 'blur(2px)'
                }} />

                <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '12px' }}>
                  <div style={{
                    display: 'inline-block',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    background: 'rgba(7, 11, 26, 0.85)',
                    border: '1px solid rgba(0, 132, 214, 0.4)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
                  }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff' }}>
                      {activeScene === 'overall' && 'Tetrameric Ribbon & Surface Potentials'}
                      {activeScene === 'pocket' && 'Catalytic Triad Residue Coordination (Asp-His-Ser)'}
                      {activeScene === 'ligand' && 'Receptor-Inhibitor Hydrogen Bond Network'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--pymol-cyan)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                      {activeScene === 'overall' && '2.2 Å Resolution • PDB: 1TUP (p53-DNA Complex)'}
                      {activeScene === 'pocket' && 'Distance: 2.85 Å • Zinc Finger Coordination'}
                      {activeScene === 'ligand' && 'Binding Affinity: Ki 1.4 nM • 4 H-Bonds Active'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Object Control Matrix (Iconic A S C H L) */}
              <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.08)', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(10, 14, 30, 0.7)' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                  OBJECTS
                </div>

                {['all', 'protein', 'ligand', 'dna'].map(obj => (
                  <div key={obj} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 4px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px' }}>
                    <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ffffff' }}>{obj}</span>
                    <div className="pymol-aschel-group">
                      <button className="pymol-btn-action" title="Action">A</button>
                      <button className="pymol-btn-action active" title="Show">S</button>
                      <button className="pymol-btn-action" title="Color">C</button>
                      <button className="pymol-btn-action" title="Hide">H</button>
                      <button className="pymol-btn-action" title="Label">L</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom PyMOL Command Line */}
            <div className="pymol-cmd-bar">
              <span className="pymol-cmd-prompt">PyMOL&gt;</span>
              <span>fetch 1TUP; show cartoon, protein; color cyan, chain A; preset ligand_sites</span>
            </div>
          </div>

          {/* Right Column: PyMOL 3 Headline and Bullet Points (Screenshot 2 Match) */}
          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '20px', letterSpacing: '-0.4px', lineHeight: 1.25, color: '#ffffff' }}>
              Simplify editing with scenes
            </h2>

            <ul className="pymol-bullet-list">
              <li className="pymol-bullet-item">
                <div className="pymol-bullet-dot" />
                <span>Store snapshots of the current workspace to easily recall molecular conformations later</span>
              </li>
              <li className="pymol-bullet-item">
                <div className="pymol-bullet-dot" />
                <span>Use the thumbnails to easily distinguish between distinct binding poses &amp; mutational variants</span>
              </li>
              <li className="pymol-bullet-item">
                <div className="pymol-bullet-dot" />
                <span>Add scenes to the timeline to analyze conformational shifts and create structural figures in only a few clicks</span>
              </li>
              <li className="pymol-bullet-item">
                <div className="pymol-bullet-dot" />
                <span>Create publication-grade figures with consistent Ray-tracing, shadow rendering, and camera matrices</span>
              </li>
            </ul>

            <div style={{ marginTop: '28px' }}>
              <button 
                className="btn-schrodinger" 
                onClick={() => handleNavigate('protein')}
                style={{ padding: '12px 24px', fontSize: '0.92rem' }}
              >
                <Boxes size={18} />
                Open PyMOL 3D Protein Space
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Universe Workspaces 6-Card Grid */}
      <div>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
            Connected Research Spaces
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            Seamlessly navigate between integrated scientific domains with synchronized project memory.
          </p>
        </div>

        <div className="grid-3" style={{ gap: '20px' }}>
          {universeSpaces.map(space => {
            const Icon = space.icon;
            return (
              <div
                key={space.id}
                className="glass-card"
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  borderTop: `3px solid ${space.color}`
                }}
                onClick={() => handleNavigate(space.id)}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                      background: `${space.color}20`,
                      padding: '10px',
                      borderRadius: '10px',
                      display: 'flex'
                    }}>
                      <Icon size={22} color={space.color} />
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                      {space.title}
                    </h3>
                  </div>

                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                    {space.desc}
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    {space.tags.map(t => (
                      <span
                        key={t}
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-muted)'
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: space.color, fontWeight: 700, fontSize: '0.84rem' }}>
                    <span>Enter Workspace</span>
                    <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Launchpad & Sequence Bridge */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 className="card-title" style={{ marginBottom: '12px' }}>
          <Activity size={18} color="var(--accent-cyan)" /> Quick Sequence Bridge & Instant Launch
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: '16px' }}>
          Paste DNA or RNA nucleotide coordinates below to initialize your global sequence across all spaces.
        </p>

        <textarea
          className="textarea-field font-mono"
          rows={4}
          placeholder="Paste FASTA or raw nucleotide sequence here (e.g. ATGGAGGAGCCGCAGTCAGATCCT...)..."
          value={localSeqText}
          onChange={(e) => setLocalSeqText(e.target.value)}
          style={{ marginBottom: '14px', fontSize: '0.85rem' }}
        />

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => handleNavigate('analysis')}>
              <Binary size={15} /> Analyze Sequence
            </button>
            <button className="btn-secondary" onClick={() => handleNavigate('primer')}>
              <Scissors size={15} /> Design Primers
            </button>
            <button className="btn-secondary" onClick={() => handleNavigate('blast')}>
              <Zap size={15} /> Run BLAST
            </button>
            <button className="btn-secondary" onClick={() => handleNavigate('protein')}>
              <Boxes size={15} /> View 3D Structure
            </button>
          </div>

          <button className="btn-secondary" onClick={handleSyncGlobal}>
            <CheckCircle2 size={15} color="var(--accent-emerald)" /> Set as Global Target
          </button>
        </div>
      </div>
    </div>
  );
}
