// BioNexus UI Studio — Live Preview Canvas
// Renders the real application page inside a sandboxed viewport container,
// applies dynamic style overrides, supports desktop/tablet/mobile framing,
// and provides interactive click-to-select overlays and before-and-after split view.

import React, { useMemo } from 'react';
import { useUIStudio } from '../../context/UIStudioContext';
import { COMPONENT_REGISTRY, getComponentById } from '../../services/uiStudioRegistry';

import ProteinStructure from '../ProteinStructure';
import Phylogenetics from '../Phylogenetics';
import Dashboard from '../Dashboard';
import Home from '../Home';
import GenomeSpace from '../GenomeSpace';
import EvidenceSpace from '../EvidenceSpace';

import { Monitor, Tablet, Smartphone, SplitSquareVertical, Eye, Layers } from 'lucide-react';

export default function UIStudioCanvas() {
  const {
    targetPage,
    viewportMode,
    splitCompare,
    selectedComponentId,
    setSelectedComponentId,
    hoveredComponentId,
    setHoveredComponentId,
    activeStyles
  } = useUIStudio();

  // Generate dynamic CSS overrides for the preview container
  const dynamicCss = useMemo(() => {
    let css = '';
    for (const [compId, styles] of Object.entries(activeStyles)) {
      const comp = getComponentById(compId);
      if (!comp || !comp.selector) continue;

      const rules = [];
      for (const [prop, val] of Object.entries(styles)) {
        if (!val) continue;
        // Map camelCase to kebab-case
        const kebabProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();

        if (prop === 'backdropBlur') {
          rules.push(`backdrop-filter: blur(${val}) !important;`);
          rules.push(`-webkit-backdrop-filter: blur(${val}) !important;`);
        } else if (prop === 'statPadding') {
          rules.push(`padding: ${val} !important;`);
        } else if (prop === 'statRadius') {
          rules.push(`border-radius: ${val} !important;`);
        } else if (prop === 'cardPadding') {
          rules.push(`padding: ${val} !important;`);
        } else if (prop === 'cardRadius') {
          rules.push(`border-radius: ${val} !important;`);
        } else if (prop === 'titleSize') {
          rules.push(`font-size: ${val} !important;`);
        } else if (prop === 'labelSize') {
          rules.push(`font-size: ${val} !important;`);
        } else {
          rules.push(`${kebabProp}: ${val} !important;`);
        }
      }

      if (rules.length > 0) {
        css += `.ui-studio-preview-surface ${comp.selector} { ${rules.join(' ')} }\n`;
      }
    }
    return css;
  }, [activeStyles]);

  // Determine viewport width constraint
  const viewportWidth = useMemo(() => {
    switch (viewportMode) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      case 'desktop':
      default: return '100%';
    }
  }, [viewportMode]);

  // Render the target page component
  const renderPageComponent = (isOriginal = false) => {
    switch (targetPage) {
      case 'protein':
        return <ProteinStructure />;
      case 'phylo':
        return <Phylogenetics />;
      case 'dashboard':
        return <Dashboard savedPrimers={[]} savedAnalyses={[]} savedFastas={[]} />;
      case 'home':
        return <Home setActiveTab={() => {}} onOpenProjects={() => {}} onOpenLibrary={() => {}} />;
      case 'genome':
        return <GenomeSpace initialTool="analysis" />;
      case 'evidence':
        return <EvidenceSpace />;
      default:
        return <ProteinStructure />;
    }
  };

  const selectedComp = getComponentById(selectedComponentId);
  const hoveredComp = getComponentById(hoveredComponentId);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#05070d',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Inject Scoped CSS for Modified Surface */}
      <style>{dynamicCss}</style>

      {/* Floating Canvas Meta Pill */}
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '16px',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(11, 15, 25, 0.85)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--border-color)',
        padding: '5px 12px',
        borderRadius: '20px',
        fontSize: '0.78rem',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
        <span>Canvas: <strong>{targetPage.toUpperCase()}</strong> ({viewportMode})</span>
        {selectedComp && (
          <span style={{ color: 'var(--accent-cyan)', marginLeft: '6px' }}>
            • Selected: <strong>{selectedComp.name}</strong>
          </span>
        )}
      </div>

      {/* Canvas Scroll Area */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: viewportMode === 'desktop' ? '16px 20px 40px' : '40px 20px',
        backgroundColor: '#070b14'
      }}>
        {splitCompare ? (
          // Side-by-Side Before & After Comparison Mode
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
            width: '100%',
            maxWidth: '1600px'
          }}>
            {/* ORIGINAL PRODUCTION VERSION */}
            <div style={{
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'var(--bg-primary)',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '8px 14px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderBottom: '1px solid var(--border-color)',
                fontSize: '0.76rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Eye size={13} /> ORIGINAL CODEBASE STYLES
              </div>
              <div style={{ padding: '16px', minHeight: '600px' }}>
                {renderPageComponent(true)}
              </div>
            </div>

            {/* PROPOSED REDESIGN DRAFT VERSION */}
            <div style={{
              borderRadius: '14px',
              border: '2px solid var(--accent-cyan)',
              background: 'var(--bg-primary)',
              overflow: 'hidden',
              boxShadow: '0 0 24px rgba(6, 182, 212, 0.2)'
            }}>
              <div style={{
                padding: '8px 14px',
                background: 'rgba(6, 182, 212, 0.15)',
                borderBottom: '1px solid var(--accent-cyan)',
                fontSize: '0.76rem',
                fontWeight: 700,
                color: 'var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <SplitSquareVertical size={13} /> PROPOSED DRAFT STYLES (PREVIEW)
              </div>
              <div className="ui-studio-preview-surface" style={{ padding: '16px', minHeight: '600px' }}>
                {renderPageComponent(false)}
              </div>
            </div>
          </div>
        ) : (
          // Single Viewport Frame (Desktop / Tablet / Mobile)
          <div style={{
            width: viewportWidth,
            transition: 'width 0.25s ease',
            margin: '0 auto',
            borderRadius: viewportMode === 'desktop' ? '0px' : '24px',
            border: viewportMode === 'desktop' ? 'none' : '10px solid #1e293b',
            boxShadow: viewportMode === 'desktop' ? 'none' : '0 20px 50px rgba(0, 0, 0, 0.8)',
            background: 'var(--bg-primary)',
            overflow: 'hidden'
          }}>
            {viewportMode !== 'desktop' && (
              <div style={{
                height: '24px',
                background: '#1e293b',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <div style={{ width: '48px', height: '4px', borderRadius: '4px', background: '#334155' }} />
              </div>
            )}

            <div className="ui-studio-preview-surface" style={{ padding: '16px', minHeight: '800px' }}>
              {renderPageComponent(false)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
