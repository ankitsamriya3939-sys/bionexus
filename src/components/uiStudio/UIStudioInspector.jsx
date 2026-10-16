// BioNexus UI Studio — Visual Property Inspector Panel
// Exposes visual presentation properties, design tokens, responsive constraints,
// and specialized scientific controls (3Dmol representations, tree topologies).

import React, { useState } from 'react';
import { useUIStudio } from '../../context/UIStudioContext';
import { getComponentById, DESIGN_TOKENS, DESIGN_PRESETS } from '../../services/uiStudioRegistry';
import { 
  Sliders, Palette, Square, RotateCcw, 
  Boxes, Network, ChevronDown, ChevronRight 
} from 'lucide-react';

export default function UIStudioInspector() {
  const {
    selectedComponentId,
    activeStyles,
    updateComponentStyle,
    resetComponentStyles,
    applyPreset
  } = useUIStudio();

  const component = getComponentById(selectedComponentId);
  const currentStyles = {
    ...(component?.defaultStyles || {}),
    ...(activeStyles[selectedComponentId] || {})
  };

  // Section collapse states
  const [openSections, setOpenSections] = useState({
    layout: true,
    appearance: true,
    borders: true,
    typography: false,
    scientific: true
  });

  const toggleSection = (sec) => {
    setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  if (!component) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Sliders size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
        <h4 style={{ color: 'var(--text-primary)', marginBottom: '6px' }}>No Component Selected</h4>
        <p style={{ fontSize: '0.82rem' }}>
          Click an element in the live canvas or choose one from the left hierarchy tree to inspect its visual properties.
        </p>
      </div>
    );
  }

  const isScientific = component.scientificProperties || component.id.includes('protein') || component.id.includes('phylo');

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border-color)',
      overflowY: 'auto'
    }}>
      {/* Component Header Pill */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'rgba(255, 255, 255, 0.02)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {component.category}
            </span>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '2px 0 0', color: 'var(--text-primary)' }}>
              {component.name}
            </h3>
          </div>
          <button
            className="btn-icon"
            onClick={() => resetComponentStyles(component.id)}
            title="Reset component to production default styles"
            style={{ color: 'var(--text-muted)' }}
          >
            <RotateCcw size={15} />
          </button>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'monospace' }}>
          Target: {component.targetFile}
        </div>
      </div>

      {/* Accordion Sections */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* 1. SCIENTIFIC PRESENTATION CONTROLS (IF APPLICABLE) */}
        {isScientific && (
          <div className="glass-card" style={{ padding: '14px', borderColor: 'rgba(6, 182, 212, 0.3)' }}>
            <div
              onClick={() => toggleSection('scientific')}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: openSections.scientific ? '12px' : 0 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
                {component.id.includes('protein') ? <Boxes size={16} /> : <Network size={16} />}
                <span>Scientific Presentation</span>
              </div>
              {openSections.scientific ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>

            {openSections.scientific && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8rem' }}>
                {/* Protein Specific Controls */}
                {component.id === 'protein-canvas-container' && (
                  <>
                    <div>
                      <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px' }}>Viewer Height</label>
                      <input
                        type="range"
                        min="380"
                        max="760"
                        step="20"
                        value={parseInt(currentStyles.height || '560', 10)}
                        onChange={(e) => updateComponentStyle(component.id, 'height', `${e.target.value}px`)}
                        style={{ width: '100%' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <span>380px</span>
                        <span>{currentStyles.height || '560px'}</span>
                        <span>760px</span>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px' }}>Default Representation</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                        {['cartoon', 'stick', 'sphere', 'surface', 'trace'].map(style => (
                          <button
                            key={style}
                            className="btn-secondary"
                            style={{
                              padding: '4px 6px',
                              fontSize: '0.74rem',
                              borderColor: currentStyles.defaultStyle === style ? 'var(--accent-cyan)' : 'var(--border-color)',
                              color: currentStyles.defaultStyle === style ? 'var(--accent-cyan)' : 'inherit'
                            }}
                            onClick={() => updateComponentStyle(component.id, 'defaultStyle', style)}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px' }}>Panel Arrangement</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <button
                          className="btn-secondary"
                          style={{
                            padding: '6px',
                            fontSize: '0.74rem',
                            borderColor: currentStyles.panelArrangement === 'side-by-side' ? 'var(--accent-cyan)' : 'var(--border-color)'
                          }}
                          onClick={() => updateComponentStyle(component.id, 'panelArrangement', 'side-by-side')}
                        >
                          Side-by-Side
                        </button>
                        <button
                          className="btn-secondary"
                          style={{
                            padding: '6px',
                            fontSize: '0.74rem',
                            borderColor: currentStyles.panelArrangement === 'stacked' ? 'var(--accent-cyan)' : 'var(--border-color)'
                          }}
                          onClick={() => updateComponentStyle(component.id, 'panelArrangement', 'stacked')}
                        >
                          Stacked Full
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Phylo Specific Controls */}
                {component.id === 'phylo-canvas-container' && (
                  <>
                    <div>
                      <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px' }}>Canvas Height</label>
                      <input
                        type="range"
                        min="380"
                        max="740"
                        step="20"
                        value={parseInt(currentStyles.height || '520', 10)}
                        onChange={(e) => updateComponentStyle(component.id, 'height', `${e.target.value}px`)}
                        style={{ width: '100%' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <span>380px</span>
                        <span>{currentStyles.height || '520px'}</span>
                        <span>740px</span>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px' }}>Taxon Label Typography</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                        {['11px', '13px', '15px'].map(size => (
                          <button
                            key={size}
                            className="btn-secondary"
                            style={{
                              padding: '4px',
                              fontSize: '0.74rem',
                              borderColor: currentStyles.labelSize === size ? 'var(--accent-emerald)' : 'var(--border-color)'
                            }}
                            onClick={() => updateComponentStyle(component.id, 'labelSize', size)}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px' }}>Tree Topology Layout</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <button
                          className="btn-secondary"
                          style={{
                            padding: '6px',
                            fontSize: '0.74rem',
                            borderColor: currentStyles.treeLayout === 'phylogram' ? 'var(--accent-emerald)' : 'var(--border-color)'
                          }}
                          onClick={() => updateComponentStyle(component.id, 'treeLayout', 'phylogram')}
                        >
                          Phylogram (Rect)
                        </button>
                        <button
                          className="btn-secondary"
                          style={{
                            padding: '6px',
                            fontSize: '0.74rem',
                            borderColor: currentStyles.treeLayout === 'cladogram' ? 'var(--accent-emerald)' : 'var(--border-color)'
                          }}
                          onClick={() => updateComponentStyle(component.id, 'treeLayout', 'cladogram')}
                        >
                          Cladogram (Slanted)
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* 2. LAYOUT & SPACING */}
        <div className="glass-card" style={{ padding: '14px' }}>
          <div
            onClick={() => toggleSection('layout')}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: openSections.layout ? '12px' : 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.85rem' }}>
              <Sliders size={15} />
              <span>Layout & Dimensions</span>
            </div>
            {openSections.layout ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>

          {openSections.layout && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8rem' }}>
              {component.safeProperties.includes('padding') && (
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px' }}>Padding</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                    {['8px 12px', '16px', '24px', '32px'].map(p => (
                      <button
                        key={p}
                        className="btn-secondary"
                        style={{
                          padding: '4px 6px',
                          fontSize: '0.72rem',
                          borderColor: currentStyles.padding === p ? 'var(--accent-cyan)' : 'var(--border-color)'
                        }}
                        onClick={() => updateComponentStyle(component.id, 'padding', p)}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {component.safeProperties.includes('gap') && (
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px' }}>Flex/Grid Gap</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                    {['6px', '12px', '18px', '24px'].map(g => (
                      <button
                        key={g}
                        className="btn-secondary"
                        style={{
                          padding: '4px 6px',
                          fontSize: '0.72rem',
                          borderColor: currentStyles.gap === g ? 'var(--accent-cyan)' : 'var(--border-color)'
                        }}
                        onClick={() => updateComponentStyle(component.id, 'gap', g)}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. APPEARANCE & COLORS */}
        <div className="glass-card" style={{ padding: '14px' }}>
          <div
            onClick={() => toggleSection('appearance')}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: openSections.appearance ? '12px' : 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.85rem' }}>
              <Palette size={15} />
              <span>Background & Colors</span>
            </div>
            {openSections.appearance ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>

          {openSections.appearance && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8rem' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '6px' }}>Surface Background Token</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {DESIGN_TOKENS.backgrounds.map(bg => (
                    <button
                      key={bg.name}
                      onClick={() => updateComponentStyle(component.id, 'backgroundColor', bg.value)}
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        border: currentStyles.backgroundColor === bg.value ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                        background: bg.value,
                        color: '#f8fafc',
                        fontSize: '0.7rem',
                        textAlign: 'center',
                        cursor: 'pointer'
                      }}
                      title={bg.value}
                    >
                      {bg.name}
                    </button>
                  ))}
                </div>
              </div>

              {component.safeProperties.includes('backdropBlur') && (
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px' }}>Glassmorphism Blur</label>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="2"
                    value={parseInt(currentStyles.backdropBlur || '12', 10)}
                    onChange={(e) => updateComponentStyle(component.id, 'backdropBlur', `${e.target.value}px`)}
                    style={{ width: '100%' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span>None (0px)</span>
                    <span>{currentStyles.backdropBlur || '12px'}</span>
                    <span>Deep (24px)</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. BORDERS, CORNERS & SHADOWS */}
        <div className="glass-card" style={{ padding: '14px' }}>
          <div
            onClick={() => toggleSection('borders')}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: openSections.borders ? '12px' : 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.85rem' }}>
              <Square size={15} />
              <span>Borders & Elevation</span>
            </div>
            {openSections.borders ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>

          {openSections.borders && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8rem' }}>
              {component.safeProperties.includes('borderRadius') && (
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px' }}>Corner Radius</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                    {DESIGN_TOKENS.radii.map(r => (
                      <button
                        key={r.name}
                        className="btn-secondary"
                        style={{
                          padding: '4px',
                          fontSize: '0.72rem',
                          borderColor: currentStyles.borderRadius === r.value ? 'var(--accent-cyan)' : 'var(--border-color)'
                        }}
                        onClick={() => updateComponentStyle(component.id, 'borderRadius', r.value)}
                      >
                        {r.value}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {component.safeProperties.includes('borderColor') && (
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '6px' }}>Border Accent Color</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {DESIGN_TOKENS.colors.map(c => (
                      <div
                        key={c.name}
                        onClick={() => updateComponentStyle(component.id, 'borderColor', c.hex)}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: c.hex,
                          cursor: 'pointer',
                          border: currentStyles.borderColor === c.hex ? '2px solid #fff' : '2px solid transparent',
                          boxShadow: '0 0 6px rgba(0,0,0,0.4)'
                        }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              )}

              {component.safeProperties.includes('boxShadow') && (
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px' }}>Elevation & Glow</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    {DESIGN_TOKENS.shadows.map(s => (
                      <button
                        key={s.name}
                        className="btn-secondary"
                        style={{
                          padding: '4px 8px',
                          fontSize: '0.72rem',
                          borderColor: currentStyles.boxShadow === s.value ? 'var(--accent-cyan)' : 'var(--border-color)'
                        }}
                        onClick={() => updateComponentStyle(component.id, 'boxShadow', s.value)}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Presets Applicator */}
        <div style={{ marginTop: '8px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Quick Style Presets
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {DESIGN_PRESETS.map(preset => (
              <button
                key={preset.id}
                className="btn-secondary"
                style={{
                  padding: '8px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  borderRadius: '8px'
                }}
                onClick={() => applyPreset(preset.id)}
              >
                <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{preset.name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{preset.description}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
