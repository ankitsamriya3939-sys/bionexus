import React, { useState } from 'react';
import { 
  Play, Download, ZoomIn, ZoomOut, 
  RotateCcw, Sliders 
} from 'lucide-react';

export default function EvolutionSpacePreview() {
  const [method, setMethod] = useState('ml'); // 'ml' | 'me' | 'nj' | 'upgma'
  const [model, setModel] = useState('jc69');  // 'jc69' | 'k80' | 'p-dist'
  const [layout, setLayout] = useState('rectangular'); // 'rectangular' | 'slanted' | 'radial'
  const [showBranchLengths, setShowBranchLengths] = useState(true);
  const [showSupport, setShowSupport] = useState(true);
  const [selectedTaxon, setSelectedTaxon] = useState('Homo_sapiens');
  const [zoom, setZoom] = useState(1.0);
  const [inspectorOpen, setInspectorOpen] = useState(true);

  // Representative scientific tree data
  const taxaList = [
    { name: 'Homo_sapiens', common: 'Human', branchLen: '0.0124', support: '99%', gc: '52.4%', distToOutgroup: '0.142' },
    { name: 'Pan_troglodytes', common: 'Chimpanzee', branchLen: '0.0141', support: '99%', gc: '52.1%', distToOutgroup: '0.145' },
    { name: 'Gorilla_gorilla', common: 'Western Gorilla', branchLen: '0.0210', support: '94%', gc: '51.9%', distToOutgroup: '0.151' },
    { name: 'Pongo_abelii', common: 'Sumatran Orangutan', branchLen: '0.0482', support: '98%', gc: '50.8%', distToOutgroup: '0.178' },
    { name: 'Macaca_mulatta', common: 'Rhesus Macaque', branchLen: '0.0894', support: '100%', gc: '49.6%', distToOutgroup: '0.210' },
    { name: 'Mus_musculus', common: 'House Mouse (Outgroup)', branchLen: '0.1840', support: '100%', gc: '48.2%', distToOutgroup: '0.000' }
  ];

  const activeTaxonObj = taxaList.find(t => t.name === selectedTaxon) || taxaList[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* 1. Scientific Ribbon Toolbar */}
      <div className="bn-ribbon">
        <div className="bn-ribbon-group">
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--bn-text-muted)', textTransform: 'uppercase' }}>
            Inference:
          </span>
          <select 
            value={method} 
            onChange={(e) => setMethod(e.target.value)} 
            className="bn-select"
            style={{ width: '190px' }}
          >
            <option value="ml">Maximum Likelihood (Felsenstein)</option>
            <option value="me">Minimum Evolution (FastME)</option>
            <option value="nj">Neighbor-Joining (Saitou-Nei)</option>
            <option value="upgma">UPGMA (Sneath-Sokal)</option>
          </select>

          <div className="bn-ribbon-divider" />

          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--bn-text-muted)', textTransform: 'uppercase' }}>
            Model:
          </span>
          <select 
            value={model} 
            onChange={(e) => setModel(e.target.value)} 
            className="bn-select"
            style={{ width: '150px' }}
          >
            <option value="jc69">Jukes-Cantor (JC69)</option>
            <option value="k80">Kimura 2-Parameter (K80)</option>
            <option value="p-dist">Uncorrected p-distance</option>
          </select>

          <div className="bn-ribbon-divider" />

          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--bn-text-muted)', textTransform: 'uppercase' }}>
            Layout:
          </span>
          <div style={{ display: 'flex', gap: '2px' }}>
            <button 
              className={`bn-btn bn-btn-ghost ${layout === 'rectangular' ? 'bn-btn-active' : ''}`}
              onClick={() => setLayout('rectangular')}
              style={{ height: '26px', padding: '0 8px', fontSize: '0.72rem' }}
            >
              Rectangular
            </button>
            <button 
              className={`bn-btn bn-btn-ghost ${layout === 'slanted' ? 'bn-btn-active' : ''}`}
              onClick={() => setLayout('slanted')}
              style={{ height: '26px', padding: '0 8px', fontSize: '0.72rem' }}
            >
              Slanted
            </button>
            <button 
              className={`bn-btn bn-btn-ghost ${layout === 'radial' ? 'bn-btn-active' : ''}`}
              onClick={() => setLayout('radial')}
              style={{ height: '26px', padding: '0 8px', fontSize: '0.72rem' }}
            >
              Radial
            </button>
          </div>
        </div>

        {/* View Controls & Action */}
        <div className="bn-ribbon-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', color: 'var(--bn-text-secondary)', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={showBranchLengths} 
              onChange={(e) => setShowBranchLengths(e.target.checked)} 
            />
            <span>Lengths</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', color: 'var(--bn-text-secondary)', cursor: 'pointer', marginLeft: '6px' }}>
            <input 
              type="checkbox" 
              checked={showSupport} 
              onChange={(e) => setShowSupport(e.target.checked)} 
            />
            <span>Support</span>
          </label>

          <div className="bn-ribbon-divider" />

          <button className="bn-btn bn-btn-ghost bn-btn-icon" onClick={() => setZoom(prev => Math.min(2.0, prev + 0.1))} title="Zoom In">
            <ZoomIn size={14} />
          </button>
          <button className="bn-btn bn-btn-ghost bn-btn-icon" onClick={() => setZoom(prev => Math.max(0.6, prev - 0.1))} title="Zoom Out">
            <ZoomOut size={14} />
          </button>
          <button className="bn-btn bn-btn-ghost bn-btn-icon" onClick={() => setZoom(1.0)} title="Reset View">
            <RotateCcw size={13} />
          </button>

          <div className="bn-ribbon-divider" />

          <button className="bn-btn bn-btn-primary" style={{ height: '28px' }}>
            <Play size={12} fill="currentColor" />
            <span>Re-estimate Tree</span>
          </button>

          <button 
            className={`bn-btn bn-btn-ghost bn-btn-icon ${inspectorOpen ? 'bn-btn-active' : ''}`}
            onClick={() => setInspectorOpen(!inspectorOpen)}
            title="Toggle Taxon Inspector Drawer"
          >
            <Sliders size={14} />
          </button>
        </div>
      </div>

      {/* 2. Main Workstation Area (Canvas + Right Inspector) */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Center SVG Phylogram Canvas */}
        <div style={{ flex: 1, position: 'relative', background: '#05070d', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          
          {/* Subtle Vector Background Grid */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            pointerEvents: 'none'
          }} />

          {/* Scale Bar Overlay */}
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '20px',
            background: 'var(--bn-surface-2)',
            border: '1px solid var(--bn-border-default)',
            borderRadius: 'var(--bn-radius-sm)',
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.72rem',
            color: 'var(--bn-text-secondary)',
            fontFamily: 'var(--bn-font-mono)'
          }}>
            <div style={{ width: '60px', height: '3px', background: 'var(--bn-cyan)', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: '-3px', width: '1px', height: '9px', background: 'var(--bn-cyan)' }} />
              <div style={{ position: 'absolute', right: 0, top: '-3px', width: '1px', height: '9px', background: 'var(--bn-cyan)' }} />
            </div>
            <span>0.05 substitutions / site</span>
          </div>

          {/* Crisp Vector Tree Visualization */}
          <svg 
            width="780" 
            height="440" 
            viewBox="0 0 780 440"
            style={{ 
              transform: `scale(${zoom})`, 
              transition: 'transform 120ms ease-out',
              maxWidth: '95%',
              maxHeight: '90%'
            }}
          >
            <defs>
              <linearGradient id="treeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0891b2" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>

            {/* Tree Cladogram Paths */}
            {/* Root to Internal 1 */}
            <line x1="80" y1="220" x2="180" y2="220" stroke="var(--bn-cyan)" strokeWidth="2" />
            {showBranchLengths && <text x="120" y="212" fill="var(--bn-text-muted)" fontSize="9" fontFamily="JetBrains Mono">0.082</text>}

            {/* Internal 1 vertical fork */}
            <line x1="180" y1="90" x2="180" y2="360" stroke="var(--bn-cyan)" strokeWidth="2" />
            {showSupport && (
              <g transform="translate(186, 216)">
                <rect x="0" y="-10" width="34" height="14" rx="2" fill="var(--bn-surface-3)" stroke="var(--bn-border-subtle)" />
                <text x="4" y="0" fill="var(--bn-emerald)" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold">100%</text>
              </g>
            )}

            {/* Outgroup branch (Mus musculus) */}
            <line x1="180" y1="360" x2="520" y2="360" stroke="#475569" strokeWidth="2" />
            <circle cx="520" cy="360" r="4" fill={selectedTaxon === 'Mus_musculus' ? 'var(--bn-cyan)' : '#475569'} />
            <text 
              x="532" 
              y="364" 
              fill={selectedTaxon === 'Mus_musculus' ? 'var(--bn-cyan)' : 'var(--bn-text-secondary)'} 
              fontSize="12" 
              fontFamily="JetBrains Mono" 
              fontWeight={selectedTaxon === 'Mus_musculus' ? 'bold' : 'normal'}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedTaxon('Mus_musculus')}
            >
              Mus_musculus (Outgroup)
            </text>
            {showBranchLengths && <text x="320" y="352" fill="var(--bn-text-muted)" fontSize="9" fontFamily="JetBrains Mono">0.184</text>}

            {/* Primate ancestor fork */}
            <line x1="180" y1="90" x2="300" y2="90" stroke="var(--bn-cyan)" strokeWidth="2" />
            <line x1="300" y1="70" x2="300" y2="270" stroke="var(--bn-cyan)" strokeWidth="2" />
            
            {/* Macaque branch */}
            <line x1="300" y1="270" x2="520" y2="270" stroke="var(--bn-cyan)" strokeWidth="2" />
            <circle cx="520" cy="270" r="4" fill={selectedTaxon === 'Macaca_mulatta' ? 'var(--bn-cyan)' : 'var(--bn-emerald)'} />
            <text 
              x="532" 
              y="274" 
              fill={selectedTaxon === 'Macaca_mulatta' ? 'var(--bn-cyan)' : 'var(--bn-text-primary)'} 
              fontSize="12" 
              fontFamily="JetBrains Mono" 
              fontWeight={selectedTaxon === 'Macaca_mulatta' ? 'bold' : 'normal'}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedTaxon('Macaca_mulatta')}
            >
              Macaca_mulatta
            </text>
            {showBranchLengths && <text x="380" y="262" fill="var(--bn-text-muted)" fontSize="9" fontFamily="JetBrains Mono">0.089</text>}

            {/* Hominoid fork */}
            <line x1="300" y1="70" x2="390" y2="70" stroke="var(--bn-cyan)" strokeWidth="2" />
            <line x1="390" y1="60" x2="390" y2="200" stroke="var(--bn-cyan)" strokeWidth="2" />
            
            {/* Orangutan branch */}
            <line x1="390" y1="200" x2="520" y2="200" stroke="var(--bn-cyan)" strokeWidth="2" />
            <circle cx="520" cy="200" r="4" fill={selectedTaxon === 'Pongo_abelii' ? 'var(--bn-cyan)' : 'var(--bn-emerald)'} />
            <text 
              x="532" 
              y="204" 
              fill={selectedTaxon === 'Pongo_abelii' ? 'var(--bn-cyan)' : 'var(--bn-text-primary)'} 
              fontSize="12" 
              fontFamily="JetBrains Mono" 
              fontWeight={selectedTaxon === 'Pongo_abelii' ? 'bold' : 'normal'}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedTaxon('Pongo_abelii')}
            >
              Pongo_abelii
            </text>
            {showBranchLengths && <text x="440" y="192" fill="var(--bn-text-muted)" fontSize="9" fontFamily="JetBrains Mono">0.048</text>}

            {/* African Ape fork */}
            <line x1="390" y1="60" x2="440" y2="60" stroke="var(--bn-cyan)" strokeWidth="2" />
            <line x1="440" y1="50" x2="440" y2="140" stroke="var(--bn-cyan)" strokeWidth="2" />
            
            {/* Gorilla branch */}
            <line x1="440" y1="140" x2="520" y2="140" stroke="var(--bn-cyan)" strokeWidth="2" />
            <circle cx="520" cy="140" r="4" fill={selectedTaxon === 'Gorilla_gorilla' ? 'var(--bn-cyan)' : 'var(--bn-emerald)'} />
            <text 
              x="532" 
              y="144" 
              fill={selectedTaxon === 'Gorilla_gorilla' ? 'var(--bn-cyan)' : 'var(--bn-text-primary)'} 
              fontSize="12" 
              fontFamily="JetBrains Mono" 
              fontWeight={selectedTaxon === 'Gorilla_gorilla' ? 'bold' : 'normal'}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedTaxon('Gorilla_gorilla')}
            >
              Gorilla_gorilla
            </text>
            {showBranchLengths && <text x="470" y="132" fill="var(--bn-text-muted)" fontSize="9" fontFamily="JetBrains Mono">0.021</text>}

            {/* Human-Chimp terminal fork */}
            <line x1="440" y1="50" x2="480" y2="50" stroke="var(--bn-cyan)" strokeWidth="2" />
            <line x1="480" y1="40" x2="480" y2="80" stroke="var(--bn-cyan)" strokeWidth="2" />

            {/* Human terminal branch */}
            <line x1="480" y1="40" x2="520" y2="40" stroke="var(--bn-cyan)" strokeWidth="2" />
            <circle cx="520" cy="40" r="5" fill={selectedTaxon === 'Homo_sapiens' ? '#ffffff' : 'var(--bn-cyan)'} stroke="var(--bn-cyan)" strokeWidth="2" />
            <text 
              x="532" 
              y="44" 
              fill={selectedTaxon === 'Homo_sapiens' ? 'var(--bn-cyan)' : 'var(--bn-text-primary)'} 
              fontSize="12" 
              fontFamily="JetBrains Mono" 
              fontWeight="bold"
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedTaxon('Homo_sapiens')}
            >
              Homo_sapiens ★
            </text>
            {showBranchLengths && <text x="492" y="32" fill="var(--bn-text-muted)" fontSize="9" fontFamily="JetBrains Mono">0.012</text>}

            {/* Chimp terminal branch */}
            <line x1="480" y1="80" x2="520" y2="80" stroke="var(--bn-cyan)" strokeWidth="2" />
            <circle cx="520" cy="80" r="4" fill={selectedTaxon === 'Pan_troglodytes' ? 'var(--bn-cyan)' : 'var(--bn-emerald)'} />
            <text 
              x="532" 
              y="84" 
              fill={selectedTaxon === 'Pan_troglodytes' ? 'var(--bn-cyan)' : 'var(--bn-text-primary)'} 
              fontSize="12" 
              fontFamily="JetBrains Mono" 
              fontWeight={selectedTaxon === 'Pan_troglodytes' ? 'bold' : 'normal'}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedTaxon('Pan_troglodytes')}
            >
              Pan_troglodytes
            </text>
            {showBranchLengths && <text x="492" y="72" fill="var(--bn-text-muted)" fontSize="9" fontFamily="JetBrains Mono">0.014</text>}
          </svg>
        </div>

        {/* Right Collapsible Scientific Inspector */}
        {inspectorOpen && (
          <aside className="bn-inspector">
            <div className="bn-inspector-header">
              <span className="bn-inspector-title">
                <Sliders size={13} color="var(--bn-cyan)" />
                Taxon Inspector
              </span>
              <button className="bn-btn bn-btn-ghost bn-btn-icon" onClick={() => setInspectorOpen(false)}>
                ✕
              </button>
            </div>

            {/* Selected Node Details */}
            <div className="bn-inspector-section">
              <div className="bn-inspector-section-label">Selected Biological Entity</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--bn-text-primary)' }}>
                {activeTaxonObj.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--bn-text-muted)', marginTop: '2px' }}>
                {activeTaxonObj.common}
              </div>

              <div style={{ marginTop: '12px' }} className="bn-kv-grid">
                <span className="bn-kv-label">Branch Length:</span>
                <span className="bn-kv-value bn-mono">{activeTaxonObj.branchLen}</span>

                <span className="bn-kv-label">Clade Support:</span>
                <span className="bn-kv-value bn-mono" style={{ color: 'var(--bn-emerald)' }}>{activeTaxonObj.support}</span>

                <span className="bn-kv-label">GC Content:</span>
                <span className="bn-kv-value bn-mono">{activeTaxonObj.gc}</span>

                <span className="bn-kv-label">Dist to Outgroup:</span>
                <span className="bn-kv-value bn-mono">{activeTaxonObj.distToOutgroup}</span>
              </div>
            </div>

            {/* Tree Evaluation Summary */}
            <div className="bn-inspector-section">
              <div className="bn-inspector-section-label">Statistical Rigor (Log L)</div>
              <div className="bn-kv-grid">
                <span className="bn-kv-label">Likelihood (ln L):</span>
                <span className="bn-kv-value bn-mono" style={{ color: 'var(--bn-cyan)' }}>-1428.42</span>

                <span className="bn-kv-label">AIC Score:</span>
                <span className="bn-kv-value bn-mono">2876.84</span>

                <span className="bn-kv-label">Total Tree Length:</span>
                <span className="bn-kv-value bn-mono">0.360 subst/site</span>

                <span className="bn-kv-label">RF Distance:</span>
                <span className="bn-kv-value bn-mono" style={{ color: 'var(--bn-emerald)' }}>0 (Congruent)</span>
              </div>
            </div>

            {/* Export & Actions */}
            <div className="bn-inspector-section" style={{ borderBottom: 'none' }}>
              <div className="bn-inspector-section-label">Tree Formats</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button className="bn-btn" style={{ justifyContent: 'center' }}>
                  <Download size={13} /> Export Newick String (.nwk)
                </button>
                <button className="bn-btn" style={{ justifyContent: 'center' }}>
                  <Download size={13} /> Export NEXUS Alignment (.nex)
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* 3. Scientific Statusbar */}
      <footer className="bn-statusbar">
        <div className="bn-statusbar-item">
          <div className="bn-status-pill" />
          <span>METHOD: ML (Felsenstein Pruning)</span>
        </div>
        <div className="bn-statusbar-item">
          <span>MODEL: JC69</span>
        </div>
        <div className="bn-statusbar-item">
          <span>TAXA: 6</span>
        </div>
        <div className="bn-statusbar-item">
          <span>ALIGNMENT: 482 bp</span>
        </div>
        <div className="bn-statusbar-item" style={{ color: 'var(--bn-cyan)' }}>
          <span>ln L = -1428.42</span>
        </div>
      </footer>
    </div>
  );
}
