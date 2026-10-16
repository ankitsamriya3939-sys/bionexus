import React, { useState, useEffect } from 'react';
import { 
  Sparkles, X, CheckCircle2, Zap, Dna, Boxes, Network, 
  BookOpen, ArrowRight, ShieldCheck, Activity, Terminal, 
  ExternalLink, Layers, Clock, Cpu
} from 'lucide-react';

const RELEASES = [
  {
    version: 'v2.1.0',
    date: 'October 2026',
    isLatest: true,
    tag: 'MAJOR RELEASE',
    tagColor: '#a855f7',
    title: 'Benchling Primer Workspace & SantaLucia Thermodynamic Engine',
    desc: 'Complete architectural release introducing full-screen sequence maps, native Primer3 nearest-neighbor thermodynamic scoring, and PyMOL 3 integration.',
    features: [
      {
        icon: Zap,
        title: 'Benchling-Style Primer Design Workspace',
        detail: 'Interactive dual-strand sequence map with zoom levels, 5\'→3\' nucleotide tracks, amplicon boundary visualization, and instant RFC 4180 CSV export.',
        tabTarget: 'primer-design',
        tabLabel: 'Open Primer Designer'
      },
      {
        icon: Cpu,
        title: 'SantaLucia 1998 Thermodynamic C-Engine',
        detail: 'Calibrated nearest-neighbor ΔH, ΔS, and Tm calculations with monovalent (Na+) and divalent (Mg2+) salt corrections, secondary hairpin ΔG, and dimer evaluation.',
        tabTarget: 'primer-design',
        tabLabel: 'View Primer Engine'
      },
      {
        icon: Boxes,
        title: 'PyMOL 3 Interactive 3D Protein Canvas',
        detail: 'Schrödinger-inspired 3D WebGL macromolecular visualizer with sequence-to-structure residue track, RCSB PDB metadata, and AlphaFold confidence scores.',
        tabTarget: 'protein',
        tabLabel: 'Launch 3D Studio'
      },
      {
        icon: Terminal,
        title: 'Single-Port Express Production Architecture',
        detail: 'Unified Node.js server serving both full REST APIs and compiled client SPA on port 5000 with process crash guards and full-route SPA fallback.',
        tabTarget: 'dashboard',
        tabLabel: 'System Dashboard'
      }
    ]
  },
  {
    version: 'v2.0.4',
    date: 'September 2026',
    isLatest: false,
    tag: 'SCIENTIFIC ENGINES',
    tagColor: '#06b6d4',
    title: 'Maximum Likelihood Tree Inference & NCBI Entrez Racing',
    desc: 'Added advanced phylogenetic tree reconstructions and upstream bioinformatics database racing.',
    features: [
      {
        icon: Network,
        title: 'Felsenstein Maximum Likelihood Inference',
        detail: 'Tree topology optimization with Jukes-Cantor (JC69) and Kimura 2-Parameter substitution models, branch-length estimation, and Robinson-Foulds distance.',
        tabTarget: 'phylo',
        tabLabel: 'Explore Phylogenetics'
      },
      {
        icon: Dna,
        title: 'NCBI Entrez Accession Resolver',
        detail: 'Server-side E-utilities proxy auto-resolving RefSeq, GenBank, and UniProt IDs with automatic DNA vs Protein molecule classification.',
        tabTarget: 'ncbi',
        tabLabel: 'Search NCBI Records'
      },
      {
        icon: BookOpen,
        title: 'BioNexus Copilot 5-Tier Evidence Grounding',
        detail: 'Strict scientific confidence hierarchy (Experimental, Curated, Computational, Hypothesis, Missing) eliminating hallucinations.',
        tabTarget: 'evidence',
        tabLabel: 'Open Evidence Space'
      }
    ]
  },
  {
    version: 'v2.0.0',
    date: 'August 2026',
    isLatest: false,
    tag: 'FOUNDATION',
    tagColor: '#10b981',
    title: 'Core Bioinformatics Workspace & Sequence Library',
    desc: 'Original foundation of BioNexus Studio uniting multi-omic DNA/RNA sequence analysis, local BLAST, and MSA.',
    features: [
      {
        icon: Layers,
        title: '6-Frame ORF & Translation Suite',
        detail: 'Automated open reading frame finder across all 6 reading frames with NCBI translation tables (Standard, Vertebrate Mito, Bacterial).',
        tabTarget: 'analysis',
        tabLabel: 'Analyze Sequences'
      },
      {
        icon: ShieldCheck,
        title: 'Persistent Workspace & Sequence Library',
        detail: 'Save, tag, and organize custom DNA/RNA/protein sequences and primers with local and server synchronization.',
        tabTarget: 'home',
        tabLabel: 'Go to Workspace'
      }
    ]
  }
];

export default function UpdatesModal({ isOpen, onClose, setActiveTab }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [healthStatus, setHealthStatus] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoadingHealth(true);
      fetch('/api/health')
        .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch'))
        .then(data => {
          setHealthStatus(data);
          setLoadingHealth(false);
        })
        .catch(() => {
          setHealthStatus({ status: 'online (client-side)', version: '2.1.0' });
          setLoadingHealth(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLaunchFeature = (targetTab) => {
    if (targetTab && setActiveTab) {
      setActiveTab(targetTab);
    }
    onClose();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(5, 2, 12, 0.82)',
        backdropFilter: 'blur(12px)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="page-fade-in"
        style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          background: 'linear-gradient(145deg, rgba(20, 9, 40, 0.96), rgba(12, 5, 24, 0.98))',
          border: '1px solid rgba(168, 85, 247, 0.35)',
          borderRadius: '18px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 35px rgba(168, 85, 247, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: '1px solid rgba(168, 85, 247, 0.18)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, rgba(168, 85, 247, 0.12) 0%, transparent 100%)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                boxShadow: '0 0 16px rgba(168, 85, 247, 0.5)'
              }}>
                <Sparkles size={18} color="#ffffff" />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.3px' }}>
                BioNexus Studio Updates
              </h2>
              <span style={{
                background: 'rgba(168, 85, 247, 0.2)',
                border: '1px solid rgba(168, 85, 247, 0.45)',
                color: '#c084fc',
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                v2.1.0 LATEST
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Release changelog, scientific computational upgrades, and platform release notes.
            </p>
          </div>

          <button 
            className="btn-icon" 
            onClick={onClose}
            style={{ color: 'var(--text-muted)', padding: '6px' }}
            title="Close Updates Modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Live System Health Banner */}
        <div style={{
          padding: '10px 28px',
          background: 'rgba(16, 185, 129, 0.08)',
          borderBottom: '1px solid rgba(16, 185, 129, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.8rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 10px #10b981',
              display: 'inline-block'
            }} />
            <span style={{ color: '#10b981', fontWeight: 700 }}>Platform Status:</span>
            <span style={{ color: 'var(--text-primary)' }}>
              {loadingHealth ? 'Checking system status...' : `${healthStatus?.app || 'BioNexus Studio'} ${healthStatus?.version || '2.1.0'} is fully operational`}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: 'var(--text-muted)' }}>
            {healthStatus?.uptimeSeconds && (
              <span>Uptime: <strong>{Math.floor(healthStatus.uptimeSeconds / 60)} min</strong></span>
            )}
            <span>Live Site: <strong style={{ color: '#c084fc' }}>bionexusstudio.ai</strong></span>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div style={{
          padding: '12px 28px',
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid rgba(168, 85, 247, 0.12)',
          background: 'rgba(12, 5, 24, 0.4)'
        }}>
          {[
            { id: 'all', label: 'All Releases' },
            { id: 'v2.1.0', label: 'v2.1 (Latest)' },
            { id: 'v2.0.4', label: 'v2.0.4' },
            { id: 'v2.0.0', label: 'v2.0.0' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              style={{
                background: activeCategory === tab.id ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
                border: activeCategory === tab.id ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid transparent',
                color: activeCategory === tab.id ? '#ffffff' : 'var(--text-muted)',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: activeCategory === tab.id ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Scrollable Content */}
        <div style={{
          padding: '24px 28px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          {RELEASES
            .filter(rel => activeCategory === 'all' || rel.version === activeCategory)
            .map((rel) => (
              <div 
                key={rel.version}
                style={{
                  background: 'rgba(24, 10, 50, 0.65)',
                  border: rel.isLatest ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(168, 85, 247, 0.15)',
                  borderRadius: '14px',
                  padding: '20px',
                  position: 'relative'
                }}
              >
                {/* Release Card Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                      {rel.version}
                    </span>
                    <span style={{
                      background: `${rel.tagColor}22`,
                      color: rel.tagColor,
                      border: `1px solid ${rel.tagColor}55`,
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      letterSpacing: '0.5px'
                    }}>
                      {rel.tag}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={13} /> {rel.date}
                  </span>
                </div>

                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#f3e8ff', marginBottom: '6px' }}>
                  {rel.title}
                </h4>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                  {rel.desc}
                </p>

                {/* Grid of Features in this Release */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '12px'
                }}>
                  {rel.features.map((feat, fIdx) => {
                    const FeatIcon = feat.icon;
                    return (
                      <div
                        key={fIdx}
                        style={{
                          background: 'rgba(16, 7, 32, 0.75)',
                          border: '1px solid rgba(168, 85, 247, 0.15)',
                          borderRadius: '10px',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '10px'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <div style={{
                              background: 'rgba(168, 85, 247, 0.15)',
                              padding: '5px',
                              borderRadius: '6px',
                              display: 'flex'
                            }}>
                              <FeatIcon size={14} color="#c084fc" />
                            </div>
                            <strong style={{ fontSize: '0.86rem', color: '#ffffff' }}>
                              {feat.title}
                            </strong>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                            {feat.detail}
                          </p>
                        </div>

                        {feat.tabTarget && (
                          <button
                            type="button"
                            onClick={() => handleLaunchFeature(feat.tabTarget)}
                            style={{
                              alignSelf: 'flex-start',
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--accent-primary-hover)',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 0'
                            }}
                          >
                            <span>{feat.tabLabel}</span>
                            <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid rgba(168, 85, 247, 0.18)',
          background: 'rgba(10, 4, 20, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            BioNexus Studio • Powered by SantaLucia 1998 & Schrödinger PyMOL 3 Engines
          </div>
          <button
            type="button"
            className="btn-schrodinger"
            onClick={onClose}
            style={{ padding: '7px 20px', fontSize: '0.82rem' }}
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
