import React, { useState } from 'react';
import { GitMerge, Play, CheckCircle2, Plus, Network, Dna, Info } from 'lucide-react';
import { runMSA, NUC_COLORS, AA_COLORS } from '../utils/alignmentEngine';
import { useWorkspace } from '../context/WorkspaceContext';

export default function AlignmentHub({ setActiveTab, setSharedAlignmentData }) {
  const { activeSequenceObj } = useWorkspace();
  const [fastaInput, setFastaInput] = useState('');

  const [msaResult, setMsaResult] = useState(null);

  const samplePrimateDataset = `>Homo_sapiens_HBA1
ATGGTGCTGTCTCCTGCCGACAAGACCAACGTCAAGGCCGCCTGGGGTAAGGTCGGCGCG
>Pan_troglodytes_HBA1
ATGGTGCTGTCTCCTGCCGACAAGACCAACGTCAAGGCCGCCTGGGGTAAGGTCGGCGCG
>Gorilla_gorilla_HBA1
ATGGTGCTGTCTCCTGCCGACAAGACCAACGTCAAGGCCGCCTGGGGTAAGGTCGGCGCG
>Macaca_mulatta_HBA1
ATGGTGCTGTCTCCTGCCGACAAGACCAACGTCAAGGCCGCCTGGGGTAAGGTCGGCGCG`;

  const handleAddActiveSequence = () => {
    if (!activeSequenceObj) return;
    const header = `>${activeSequenceObj.name.replace(/\s+/g, '_')}_${activeSequenceObj.accession}`;
    setFastaInput(prev => prev.trim() ? `${prev.trim()}\n${header}\n${activeSequenceObj.sequence}` : `${header}\n${activeSequenceObj.sequence}`);
  };

  const handleLoadSample = () => {
    setFastaInput(samplePrimateDataset);
  };

  const handleClear = () => {
    setFastaInput('');
    setMsaResult(null);
  };

  const handleRunMsa = () => {
    if (!fastaInput.trim()) return;
    const lines = fastaInput.split('\n');
    const seqs = [];
    let current = null;

    lines.forEach(line => {
      line = line.trim();
      if (line.startsWith('>')) {
        if (current) seqs.push(current);
        current = { id: line.substring(1), name: line.substring(1).split(' ')[0], seq: '' };
      } else if (current) {
        current.seq += line;
      }
    });
    if (current) seqs.push(current);

    const res = runMSA(seqs);
    setMsaResult(res);
  };

  const handleBuildPhyloTree = () => {
    if (!msaResult) return;
    if (setSharedAlignmentData) {
      setSharedAlignmentData(msaResult);
    }
    setActiveTab('phylo');
  };

  return (
    <div className="page-fade-in">
      <div className="card-header">
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Multiple Sequence Alignment (MSA)</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Progressive Needleman-Wunsch alignment engine with Clustal color scheme and conservation plot.
          </p>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            <GitMerge size={18} color="var(--accent-rose)" /> Input Sequences (Multi-FASTA)
          </h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {activeSequenceObj && (
              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.82rem' }} onClick={handleAddActiveSequence}>
                <Plus size={14} /> Add Active Sequence ({activeSequenceObj.name})
              </button>
            )}
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.82rem' }} onClick={handleLoadSample} title="Load clean curated primate dataset">
              Load Curated Dataset
            </button>
            {fastaInput && (
              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.82rem', color: '#ef4444' }} onClick={handleClear}>
                Clear
              </button>
            )}
          </div>
        </div>

        <textarea
          className="textarea-field font-mono"
          rows={6}
          placeholder="Paste multi-FASTA format sequences here (e.g. >Species_1\nATGC...\n>Species_2\nATGC...)... or click 'Load Curated Dataset' above."
          value={fastaInput}
          onChange={(e) => setFastaInput(e.target.value)}
        />

        <button className="btn-primary" style={{ marginTop: '14px' }} onClick={handleRunMsa} disabled={!fastaInput.trim()}>
          <Play size={18} /> Run Multiple Sequence Alignment
        </button>
      </div>

      {msaResult && msaResult.alignedSequences.length > 0 && (
        <div className="glass-card page-fade-in">
          <div className="card-header">
            <h3 className="card-title">
              <CheckCircle2 color="var(--accent-emerald)" size={20} />
              Alignment Result (Length: {msaResult.alignmentLength} bp/aa)
            </h3>

            <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={handleBuildPhyloTree}>
              <Network size={16} /> Build Phylogenetic Tree
            </button>
          </div>

          {/* Alignment Visualizer */}
          <div style={{ background: '#060913', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', overflowX: 'auto', marginBottom: '20px' }}>
            {msaResult.alignedSequences.map((item, sIdx) => (
              <div key={sIdx} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                <div style={{ width: '180px', flexShrink: 0, fontWeight: 700, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </div>
                <div style={{ display: 'flex', letterSpacing: '1px' }}>
                  {item.alignedSeq.split('').map((char, cIdx) => {
                    const bgColor = msaResult.isProtein ? (AA_COLORS[char] || '#64748b') : (NUC_COLORS[char] || '#64748b');
                    return (
                      <span
                        key={cIdx}
                        style={{
                          background: bgColor,
                          color: '#ffffff',
                          padding: '2px 4px',
                          borderRadius: '2px',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          marginRight: '1px'
                        }}
                      >
                        {char}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Consensus Row */}
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed var(--border-color)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
              <div style={{ width: '180px', flexShrink: 0, fontWeight: 800, color: 'var(--accent-amber)' }}>
                Consensus
              </div>
              <div style={{ display: 'flex', letterSpacing: '1px' }}>
                {msaResult.consensus.split('').map((char, cIdx) => (
                  <span key={cIdx} style={{ color: 'var(--accent-amber)', fontWeight: 800, padding: '2px 4px' }}>
                    {char}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Educational & Scientific Documentation Section */}
      <div className="glass-card" style={{ marginTop: '24px', borderTop: '2px solid #ec4899' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={18} color="#ec4899" /> Multiple Sequence Alignment (MSA) — Scientific Guide
        </h3>
        <div className="grid-2" style={{ gap: '20px', fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
          <div>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>What this tool does</h4>
            <p style={{ marginBottom: '12px' }}>
              Aligns three or more biological sequences (DNA, RNA, or Protein) simultaneously using progressive global alignment heuristics to highlight conserved residue motifs, insertions, and deletions.
            </p>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Who it is for</h4>
            <p style={{ marginBottom: '12px' }}>
              Evolutionary biologists, structural bioinformaticians, geneticists, and protein chemists comparing gene families across divergent species.
            </p>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Accepted Inputs</h4>
            <p>
              Multi-FASTA files or raw text input containing multiple named nucleotide or amino acid sequences.
            </p>
          </div>
          <div>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Produced Outputs</h4>
            <p style={{ marginBottom: '12px' }}>
              Color-coded alignment viewer (Clustal/Zappo color schemes), consensus sequence track, percentage identity distance matrix, FASTA alignment downloads, and phylogenetic tree pipeline passing.
            </p>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Scientific Background</h4>
            <p>
              Multiple sequence alignment is fundamental for identifying active site catalytic residues, structural domain boundaries, and calculating pairwise evolutionary distances used in phylogenetic tree construction.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

