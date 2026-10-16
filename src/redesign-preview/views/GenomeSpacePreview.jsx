import React, { useState } from 'react';
import { 
  Binary, Dna, Database, Zap, GitMerge, Scissors, Play, Download, 
  Copy, FileText, CheckCircle2, AlertTriangle, ArrowRight, Layers 
} from 'lucide-react';

export default function GenomeSpacePreview() {
  const [activeSubTool, setActiveSubTool] = useState('analysis');
  const [minOrfLength, setMinOrfLength] = useState(60);
  const [codonTable, setCodonTable] = useState('standard');
  const [selectedOrf, setSelectedOrf] = useState(0);

  // Representative realistic nucleotide input
  const [seqInput, setSeqInput] = useState(`ATGGAGGAGCCGCAGTCAGATCCTAGCGTCGAGCCCCCTCTGAGTCAGGAAACATTTTCAGACCTATGGAAACTACTTCCTGAAAACAACGTTCTGTCCCCCTTGCCGTCCCAAGCAATGGATGATTTGATGCTGTCCCCGGACGATATTGAACAATGGTTCACTGAAGACCCAGGTCCAGATGAAGCTCCCAGAATGCCAGAGGCTGCTCCCCGCGTGGCCCCTGCACCAGCAGCTCCTACACCGGCGGCCCCTGCACCAGCCCCCTCCTGGCCC`);

  const subTools = [
    { id: 'analysis', label: 'Sequence Analysis', icon: Binary },
    { id: 'ncbi', label: 'NCBI Explorer', icon: Database },
    { id: 'blast', label: 'BLAST Center', icon: Zap },
    { id: 'alignment', label: 'Alignment (MSA)', icon: GitMerge },
    { id: 'primer', label: 'Primer Designer', icon: Scissors }
  ];

  // Calculated sequence properties
  const seqLength = seqInput.length;
  const gcCount = (seqInput.match(/[GCgc]/g) || []).length;
  const gcPercent = seqLength > 0 ? ((gcCount / seqLength) * 100).toFixed(1) : '0.0';

  // Realistic detected ORFs
  const detectedOrfs = [
    { frame: '+1', start: 1, end: 279, lengthBp: 279, lengthAa: 93, mwKDa: '10.24', pi: '4.12', preview: 'MEEPQSDPSVEPPLSQETFS...' },
    { frame: '+2', start: 164, end: 284, lengthBp: 120, lengthAa: 40, mwKDa: '4.35', pi: '8.90', preview: 'MDEADPALPPAAPAP...' },
    { frame: '+3', start: 93, end: 213, lengthBp: 120, lengthAa: 40, mwKDa: '4.18', pi: '5.62', preview: 'MMICCPTIISNGL...' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* 1. Sub-tool Navigation Ribbon */}
      <div className="bn-ribbon">
        <div className="bn-ribbon-group">
          {subTools.map(st => {
            const Icon = st.icon;
            const isActive = activeSubTool === st.id;
            return (
              <button
                key={st.id}
                onClick={() => setActiveSubTool(st.id)}
                className={`bn-btn bn-btn-ghost ${isActive ? 'bn-btn-active' : ''}`}
                style={{ height: '28px', fontSize: '0.74rem' }}
              >
                <Icon size={13} color={isActive ? 'var(--bn-cyan)' : 'currentColor'} />
                <span>{st.label}</span>
              </button>
            );
          })}
        </div>

        <div className="bn-ribbon-group">
          <span style={{ fontSize: '0.72rem', color: 'var(--bn-text-muted)' }}>
            TYPE: <strong style={{ color: 'var(--bn-emerald)' }}>DNA NUCLEOTIDE</strong>
          </span>
          <div className="bn-ribbon-divider" />
          <button className="bn-btn bn-btn-primary" style={{ height: '28px' }}>
            <Play size={12} fill="currentColor" />
            <span>Analyze Sequence</span>
          </button>
        </div>
      </div>

      {/* 2. Main Workbench Content (Input Pane + Parameters + Results) */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Input & Editor Pane */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--bn-border-default)', overflow: 'hidden' }}>
          
          {/* Sequence Header & HUD Bar */}
          <div style={{
            padding: '8px 14px',
            background: 'var(--bn-surface-2)',
            borderBottom: '1px solid var(--bn-border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.74rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="bn-badge bn-badge-cyan">5' → 3' Sense</span>
              <span style={{ color: 'var(--bn-text-secondary)', fontWeight: 600 }}>TP53 Partial Coding Sequence</span>
            </div>

            <div style={{ display: 'flex', gap: '14px', fontFamily: 'var(--bn-font-mono)', fontSize: '0.72rem', color: 'var(--bn-text-muted)' }}>
              <span>LEN: <strong style={{ color: 'var(--bn-text-primary)' }}>{seqLength} bp</strong></span>
              <span>GC: <strong style={{ color: 'var(--bn-cyan)' }}>{gcPercent}%</strong></span>
              <span>ORFs: <strong style={{ color: 'var(--bn-emerald)' }}>{detectedOrfs.length}</strong></span>
            </div>
          </div>

          {/* Monospace Code / Sequence Textarea */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: 'var(--bn-surface-0)' }}>
            {/* Line numbers */}
            <div style={{
              width: '40px',
              background: 'var(--bn-surface-1)',
              borderRight: '1px solid var(--bn-border-subtle)',
              padding: '12px 6px',
              fontFamily: 'var(--bn-font-mono)',
              fontSize: '0.72rem',
              color: 'var(--bn-text-muted)',
              textAlign: 'right',
              userSelect: 'none'
            }}>
              <div>001</div>
              <div>061</div>
              <div>121</div>
              <div>181</div>
              <div>241</div>
            </div>

            {/* Sequence Monospace Box */}
            <textarea
              className="bn-mono"
              value={seqInput}
              onChange={(e) => setSeqInput(e.target.value.replace(/[^ATCGUatcgu\n\r]/g, ''))}
              style={{
                flex: 1,
                padding: '12px 14px',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--bn-text-primary)',
                fontSize: '0.82rem',
                lineHeight: 1.6,
                letterSpacing: '0.08em',
                resize: 'none',
                fontFamily: 'JetBrains Mono, monospace'
              }}
              spellCheck={false}
            />
          </div>

          {/* Validation & Translation Strip */}
          <div style={{
            padding: '8px 14px',
            background: 'var(--bn-surface-1)',
            borderTop: '1px solid var(--bn-border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.74rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--bn-emerald)' }}>
              <CheckCircle2 size={13} />
              <span>Valid IUPAC DNA sequence verified (No degenerate or non-standard nucleotides)</span>
            </div>
            <button className="bn-btn bn-btn-ghost" style={{ height: '24px', fontSize: '0.7rem' }}>
              <Copy size={11} /> Copy FASTA
            </button>
          </div>
        </div>

        {/* Right Parameters & Live Results Panel */}
        <div style={{ width: '460px', display: 'flex', flexDirection: 'column', background: 'var(--bn-surface-1)', overflowY: 'auto' }}>
          
          {/* Parameters Header */}
          <div style={{ padding: '10px 14px', background: 'var(--bn-surface-2)', borderBottom: '1px solid var(--bn-border-default)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--bn-text-secondary)' }}>
            Analysis Parameters & Configuration
          </div>

          <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: '1px solid var(--bn-border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.76rem', color: 'var(--bn-text-secondary)' }}>Genetic Code Table:</label>
              <select 
                value={codonTable} 
                onChange={(e) => setCodonTable(e.target.value)}
                className="bn-select" 
                style={{ width: '210px', height: '28px', fontSize: '0.74rem' }}
              >
                <option value="standard">1. Standard Nuclear Genetic Code</option>
                <option value="vert_mito">2. Vertebrate Mitochondrial</option>
                <option value="yeast_mito">3. Yeast Mitochondrial</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.76rem', color: 'var(--bn-text-secondary)' }}>Min ORF Length (codons):</label>
              <input 
                type="number" 
                value={minOrfLength} 
                onChange={(e) => setMinOrfLength(e.target.value)}
                className="bn-input bn-mono" 
                style={{ width: '80px', height: '28px', textAlign: 'center' }} 
              />
            </div>
          </div>

          {/* Results: Detected Open Reading Frames (ORFs) */}
          <div style={{ padding: '10px 14px', background: 'var(--bn-surface-2)', borderBottom: '1px solid var(--bn-border-default)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--bn-text-secondary)' }}>
            Detected ORFs & Translation Products
          </div>

          <div style={{ padding: '12px 14px' }}>
            <div className="bn-table-container">
              <table className="bn-table">
                <thead>
                  <tr>
                    <th>Frame</th>
                    <th>Coordinates</th>
                    <th>Length</th>
                    <th>MW (kDa)</th>
                    <th>pI</th>
                  </tr>
                </thead>
                <tbody>
                  {detectedOrfs.map((orf, idx) => {
                    const isSelected = selectedOrf === idx;
                    return (
                      <tr 
                        key={idx} 
                        onClick={() => setSelectedOrf(idx)}
                        style={{ cursor: 'pointer', background: isSelected ? 'var(--bn-surface-3)' : 'transparent' }}
                      >
                        <td>
                          <span className={`bn-badge ${orf.frame === '+1' ? 'bn-badge-cyan' : 'bn-badge-amber'}`}>
                            {orf.frame}
                          </span>
                        </td>
                        <td className="bn-mono">{orf.start}..{orf.end}</td>
                        <td className="bn-mono">{orf.lengthAa} aa</td>
                        <td className="bn-mono">{orf.mwKDa}</td>
                        <td className="bn-mono">{orf.pi}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Selected ORF Translation Details */}
            {detectedOrfs[selectedOrf] && (
              <div style={{ marginTop: '14px', padding: '12px', background: 'var(--bn-surface-2)', border: '1px solid var(--bn-border-default)', borderRadius: 'var(--bn-radius-sm)' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--bn-cyan)', marginBottom: '6px' }}>
                  Translation Preview (ORF {selectedOrf + 1}):
                </div>
                <div className="bn-mono" style={{ fontSize: '0.74rem', color: 'var(--bn-text-primary)', wordBreak: 'break-all', background: 'var(--bn-surface-0)', padding: '8px', borderRadius: '4px' }}>
                  {detectedOrfs[selectedOrf].preview}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button className="bn-btn bn-btn-primary" style={{ flex: 1, justifyContent: 'center', height: '28px' }}>
                    <ArrowRight size={12} /> Send to Protein Space
                  </button>
                  <button className="bn-btn" style={{ flex: 1, justifyContent: 'center', height: '28px' }}>
                    <Zap size={12} /> BLAST Translation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Scientific Statusbar */}
      <footer className="bn-statusbar">
        <div className="bn-statusbar-item">
          <div className="bn-status-pill" />
          <span>ALGORITHM: 6-Frame Standard ORF Finder</span>
        </div>
        <div className="bn-statusbar-item">
          <span>SEQUENCE LENGTH: {seqLength} bp</span>
        </div>
        <div className="bn-statusbar-item">
          <span>GC SKEW: +0.084</span>
        </div>
        <div className="bn-statusbar-item" style={{ color: 'var(--bn-cyan)' }}>
          <span>ORFS IDENTIFIED: 3 CANDIDATES</span>
        </div>
      </footer>
    </div>
  );
}
