import React, { useState } from 'react';
import './bionexus-tokens.css';
import PreviewTopToolbar from './components/PreviewTopToolbar';
import PreviewSidebar from './components/PreviewSidebar';
import EvolutionSpacePreview from './views/EvolutionSpacePreview';
import ProteinSpacePreview from './views/ProteinSpacePreview';
import GenomeSpacePreview from './views/GenomeSpacePreview';
import ResultsPanelPreview from './views/ResultsPanelPreview';

import { 
  Monitor, Laptop, Tablet, Moon, Sun, ArrowLeft, 
  Layers, CheckCircle2, Sliders, Dna, Boxes, Network, FileText 
} from 'lucide-react';

export default function RedesignPreviewApp({ onExitPreview }) {
  const [theme, setTheme] = useState('dark');
  const [activeWorkspace, setActiveWorkspace] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('view') || 'protein';
    } catch {
      return 'protein';
    }
  }); // 'protein' | 'phylo' | 'genome' | 'results'
  const [viewportMode, setViewportMode] = useState('full'); // 'full' | '1280' | '1024'
  const [showTokensGuide, setShowTokensGuide] = useState(false);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const getContainerWidth = () => {
    if (viewportMode === '1280') return '1280px';
    if (viewportMode === '1024') return '1024px';
    return '100%';
  };

  return (
    <div 
      className="bn-preview-root" 
      data-bn-theme={theme}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        background: '#04060a'
      }}
    >
      {/* Outer Viewport Framing Box (Supports 100%, 1280px, 1024px responsive testing) */}
      <div style={{
        width: getContainerWidth(),
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bn-surface-0)',
        boxShadow: viewportMode !== 'full' ? '0 0 50px rgba(0, 0, 0, 0.8)' : 'none',
        borderLeft: viewportMode !== 'full' ? '1px solid var(--bn-border-default)' : 'none',
        borderRight: viewportMode !== 'full' ? '1px solid var(--bn-border-default)' : 'none',
        transition: 'width 200ms ease',
        overflow: 'hidden'
      }}>
        
        {/* 1. Global Redesigned Top Toolbar */}
        <PreviewTopToolbar 
          currentTheme={theme}
          toggleTheme={toggleTheme}
          activeProject={{ name: 'TP53 Oncogene Investigation' }}
          activeSequence={{ name: 'TP53 CDS', length: 1179 }}
          onOpenProjects={() => alert('Project Manager Modal would open here.')}
          onOpenLibrary={() => alert('Sequence Library Modal would open here.')}
        />

        {/* 2. Main Workspace Layout (Sidebar + Active View) */}
        <div className="bn-workspace-shell">
          <PreviewSidebar 
            activeWorkspace={activeWorkspace}
            setActiveWorkspace={setActiveWorkspace}
            onOpenProjects={() => alert('Project Manager Modal')}
            onOpenLibrary={() => alert('Sequence Library Modal')}
          />

          <main className="bn-main-canvas-area">
            {activeWorkspace === 'phylo' && <EvolutionSpacePreview />}
            {activeWorkspace === 'protein' && <ProteinSpacePreview />}
            {activeWorkspace === 'genome' && <GenomeSpacePreview />}
            {activeWorkspace === 'analysis' && <GenomeSpacePreview />}
            {activeWorkspace === 'blast' && <ResultsPanelPreview />}
            {activeWorkspace === 'alignment' && <GenomeSpacePreview />}
            {activeWorkspace === 'primer' && <ResultsPanelPreview />}
            {activeWorkspace === 'results' && <ResultsPanelPreview />}
            {activeWorkspace === 'dashboard' && <ResultsPanelPreview />}
            {['evidence', 'graph', 'ncbi', 'utilities'].includes(activeWorkspace) && (
              <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="bn-badge bn-badge-cyan">{activeWorkspace.toUpperCase()}</span>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
                    {activeWorkspace === 'evidence' ? 'Evidence Space & Citation Repository' :
                     activeWorkspace === 'graph' ? 'Research Relationship Graph' :
                     activeWorkspace === 'ncbi' ? 'NCBI Explorer & Entrez Data Stream' : 'Lab Utilities & Precision Calculators'}
                  </h2>
                </div>
                <p style={{ color: 'var(--bn-text-secondary)', fontSize: '0.85rem' }}>
                  Demonstrating cohesive scientific design language with information-dense controls, deep graphite surfaces, and strict evidence provenance.
                </p>
                <div style={{ background: 'var(--bn-surface-2)', border: '1px solid var(--bn-border-default)', padding: '20px', borderRadius: 'var(--bn-radius-md)' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--bn-text-muted)' }}>
                    Switch to <strong>Evolution Space</strong>, <strong>Protein Space</strong>, <strong>Genome Space</strong>, or <strong>Results Panel</strong> in the bottom preview ribbon to explore the interactive workstation layouts.
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* 3. Floating Interactive Preview Control HUD */}
      <div className="bn-preview-hud">
        {/* Workspace Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--bn-cyan)', textTransform: 'uppercase', marginRight: '4px' }}>
            Preview View:
          </span>
          <button 
            className={`bn-btn bn-btn-ghost ${activeWorkspace === 'phylo' ? 'bn-btn-active' : ''}`}
            onClick={() => setActiveWorkspace('phylo')}
            style={{ height: '26px', fontSize: '0.72rem' }}
          >
            <Network size={12} color="var(--bn-emerald)" />
            Evolution Space
          </button>
          <button 
            className={`bn-btn bn-btn-ghost ${activeWorkspace === 'protein' ? 'bn-btn-active' : ''}`}
            onClick={() => setActiveWorkspace('protein')}
            style={{ height: '26px', fontSize: '0.72rem' }}
          >
            <Boxes size={12} color="var(--bn-amber)" />
            Protein Space
          </button>
          <button 
            className={`bn-btn bn-btn-ghost ${activeWorkspace === 'genome' ? 'bn-btn-active' : ''}`}
            onClick={() => setActiveWorkspace('genome')}
            style={{ height: '26px', fontSize: '0.72rem' }}
          >
            <Dna size={12} color="var(--bn-cyan)" />
            Genome Space
          </button>
          <button 
            className={`bn-btn bn-btn-ghost ${activeWorkspace === 'results' ? 'bn-btn-active' : ''}`}
            onClick={() => setActiveWorkspace('results')}
            style={{ height: '26px', fontSize: '0.72rem' }}
          >
            <FileText size={12} />
            Results Panel
          </button>
        </div>

        <div style={{ width: '1px', height: '18px', background: 'var(--bn-border-default)' }} />

        {/* Viewport Simulation Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button 
            className={`bn-btn bn-btn-ghost bn-btn-icon ${viewportMode === 'full' ? 'bn-btn-active' : ''}`}
            onClick={() => setViewportMode('full')}
            style={{ width: '26px', height: '26px' }}
            title="Desktop Fullscreen (100%)"
          >
            <Monitor size={13} />
          </button>
          <button 
            className={`bn-btn bn-btn-ghost bn-btn-icon ${viewportMode === '1280' ? 'bn-btn-active' : ''}`}
            onClick={() => setViewportMode('1280')}
            style={{ width: '26px', height: '26px' }}
            title="Scientific Laptop (1280px)"
          >
            <Laptop size={13} />
          </button>
          <button 
            className={`bn-btn bn-btn-ghost bn-btn-icon ${viewportMode === '1024' ? 'bn-btn-active' : ''}`}
            onClick={() => setViewportMode('1024')}
            style={{ width: '26px', height: '26px' }}
            title="Field Tablet (1024px)"
          >
            <Tablet size={13} />
          </button>
        </div>

        <div style={{ width: '1px', height: '18px', background: 'var(--bn-border-default)' }} />

        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="bn-btn bn-btn-ghost" 
          style={{ height: '26px', fontSize: '0.72rem', gap: '4px' }}
          title="Toggle Dark / Light Theme"
        >
          {theme === 'dark' ? <Sun size={12} color="var(--bn-amber)" /> : <Moon size={12} color="var(--bn-violet)" />}
          <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
        </button>

        {/* Return / Exit Button to Landing Page */}
        {onExitPreview && (
          <button 
            onClick={onExitPreview}
            className="bn-btn bn-btn-primary" 
            style={{ height: '26px', fontSize: '0.72rem', marginLeft: '6px' }}
            title="Switch to Landing Page"
          >
            <ArrowLeft size={12} />
            <span>Landing Page</span>
          </button>
        )}
      </div>
    </div>
  );
}
