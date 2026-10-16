import React, { useState } from 'react';
import { 
  Dna, Search, FolderGit2, Bookmark, Moon, Sun, 
  User, CheckCircle2, Terminal, Shield, ChevronDown, 
  ExternalLink, Layers, Database 
} from 'lucide-react';

export default function PreviewTopToolbar({ 
  currentTheme, 
  toggleTheme, 
  activeProject, 
  activeSequence,
  onOpenProjects,
  onOpenLibrary 
}) {
  const [dbTarget, setDbTarget] = useState('ncbi');
  const [searchVal, setSearchVal] = useState('');

  return (
    <header className="bn-topbar">
      {/* Left: Branding & Project Anchor */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div className="bn-brand">
          <div className="bn-brand-icon">
            <Dna size={16} strokeWidth={2.4} />
          </div>
          <div className="bn-brand-title">
            <span>BIONEXUS</span>
            <span style={{ color: 'var(--bn-cyan)' }}>STUDIO</span>
            <span className="bn-brand-badge">PREVIEW 2.2</span>
          </div>
        </div>

        {/* Project Context Selector */}
        <div 
          onClick={onOpenProjects}
          className="bn-btn bn-btn-ghost" 
          style={{ height: '30px', padding: '0 8px', fontSize: '0.76rem', gap: '6px' }}
          title="Active Project: Click to switch project"
        >
          <FolderGit2 size={13} color="var(--bn-cyan)" />
          <span style={{ color: 'var(--bn-text-muted)' }}>Project:</span>
          <span style={{ fontWeight: 600 }}>{activeProject?.name || 'TP53 Oncogene Investigation'}</span>
          <ChevronDown size={11} color="var(--bn-text-muted)" />
        </div>

        {/* Active Sequence Context Indicator */}
        {activeSequence && (
          <div 
            className="bn-badge bn-badge-cyan" 
            style={{ height: '26px', padding: '0 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '5px' }}
            title="Active Sequence loaded in scientific memory"
          >
            <Dna size={12} />
            <span style={{ fontWeight: 700 }}>{activeSequence.name || 'TP53 CDS'}</span>
            <span style={{ opacity: 0.75 }}>({activeSequence.length || 1179} bp)</span>
          </div>
        )}
      </div>

      {/* Center: Global Biological Database Search */}
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, maxWidth: '440px', margin: '0 16px' }}>
        <div style={{ display: 'flex', width: '100%', position: 'relative' }}>
          <select 
            value={dbTarget}
            onChange={(e) => setDbTarget(e.target.value)}
            className="bn-select"
            style={{ 
              width: '90px', 
              height: '30px', 
              fontSize: '0.72rem', 
              borderTopRightRadius: 0, 
              borderBottomRightRadius: 0,
              borderRight: 'none',
              paddingRight: '18px'
            }}
          >
            <option value="ncbi">NCBI</option>
            <option value="uniprot">UniProt</option>
            <option value="pdb">PDB</option>
          </select>

          <div style={{ position: 'relative', flex: 1 }}>
            <Search 
              size={13} 
              color="var(--bn-text-muted)" 
              style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} 
            />
            <input 
              type="text" 
              className="bn-input" 
              style={{ 
                width: '100%', 
                height: '30px', 
                paddingLeft: '26px', 
                paddingRight: '56px',
                fontSize: '0.76rem',
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0
              }}
              placeholder="Search gene, taxon, accession, PDB (e.g. TP53, 1TUP)..." 
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
            />
            <span 
              className="bn-mono"
              style={{ 
                position: 'absolute', 
                right: '6px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                fontSize: '0.62rem', 
                color: 'var(--bn-text-muted)',
                background: 'var(--bn-surface-2)',
                padding: '1px 5px',
                borderRadius: '3px',
                border: '1px solid var(--bn-border-subtle)'
              }}
            >
              Ctrl+K
            </span>
          </div>
        </div>
      </div>

      {/* Right: Actions, Utilities, Theme & Account */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Sequence Library Button */}
        <button 
          onClick={onOpenLibrary}
          className="bn-btn bn-btn-ghost" 
          style={{ height: '30px', padding: '0 8px', fontSize: '0.74rem' }}
          title="Open Sequence Library"
        >
          <Bookmark size={13} color="var(--bn-emerald)" />
          <span>Library</span>
          <span className="bn-badge bn-badge-emerald" style={{ padding: '0 4px', fontSize: '0.65rem' }}>14</span>
        </button>

        {/* Theme Switcher */}
        <button 
          onClick={toggleTheme}
          className="bn-btn bn-btn-ghost bn-btn-icon" 
          style={{ width: '30px', height: '30px' }}
          title={currentTheme === 'dark' ? 'Switch to High-Contrast Light Mode' : 'Switch to Dark Graphite Mode'}
        >
          {currentTheme === 'dark' ? <Sun size={14} color="var(--bn-amber)" /> : <Moon size={14} color="var(--bn-violet)" />}
        </button>

        {/* User Account / Profile */}
        <div 
          className="bn-btn bn-btn-ghost" 
          style={{ height: '30px', padding: '0 8px', gap: '6px', fontSize: '0.74rem' }}
        >
          <div style={{ 
            width: '18px', 
            height: '18px', 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, var(--bn-cyan), var(--bn-emerald))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#07090e',
            fontSize: '0.65rem',
            fontWeight: 800
          }}>
            D
          </div>
          <span style={{ fontWeight: 600 }}>Dr. S. Thorne</span>
        </div>
      </div>
    </header>
  );
}
