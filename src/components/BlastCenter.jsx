import React, { useState, useEffect } from 'react';
import { Zap, Play, CheckCircle2, Layers, BookmarkPlus, ArrowRight, GitMerge, Dna, Info } from 'lucide-react';
import { runBlast, BLAST_LOCAL_DATABASE } from '../utils/blastEngine';
import { validateDnaSequence } from '../utils/sequenceValidator';
import ValidationPanel from './ValidationPanel';
import { useWorkspace } from '../context/WorkspaceContext';

export default function BlastCenter({ setActiveTab }) {
  const { activeSequenceObj, setGlobalActiveSequence, saveToSequenceLibrary } = useWorkspace();
  const [querySeq, setQuerySeq] = useState(activeSequenceObj ? activeSequenceObj.sequence : '');
  const [program, setProgram] = useState('blastn');
  const [blastResults, setBlastResults] = useState(null);
  const [selectedHit, setSelectedHit] = useState(null);
  const [savedHitSuccess, setSavedHitSuccess] = useState(false);

  // Live Validation for Nucleotide Programs (Memoized)
  const isNucleotideQuery = program === 'blastn' || program === 'blastx' || program === 'tblastx';
  const valResult = React.useMemo(() => {
    return isNucleotideQuery ? validateDnaSequence(querySeq, { minLen: 15 }) : null;
  }, [isNucleotideQuery, querySeq]);

  // Auto-fetch sequence from global workspace state on mount or active sequence change
  useEffect(() => {
    if (activeSequenceObj && activeSequenceObj.sequence) {
      if (!querySeq.trim() || querySeq !== activeSequenceObj.sequence) {
        setQuerySeq(activeSequenceObj.sequence);
      }
    }
  }, [activeSequenceObj]);

  const handleQueryChange = (e) => {
    setQuerySeq(e.target.value);
  };

  const handleQueryBlur = () => {
    if (querySeq.trim().length > 10) {
      setGlobalActiveSequence(querySeq, 'BLAST Query');
    }
  };

  const handleRunBlast = () => {
    if (!querySeq.trim()) return;
    if (isNucleotideQuery && valResult && !valResult.isValid) return;

    const res = runBlast(valResult ? valResult.cleanDna : querySeq, program, BLAST_LOCAL_DATABASE);
    setBlastResults(res);
    if (res.hits && res.hits.length > 0) {
      setSelectedHit(res.hits[0]);
    }

    setGlobalActiveSequence({
      name: activeSequenceObj ? activeSequenceObj.name : 'BLAST Query',
      sequence: valResult ? valResult.cleanDna : querySeq,
      source: 'BLAST Search'
    });
  };

  const handleSaveHitToLibrary = (hit) => {
    if (!hit) return;
    saveToSequenceLibrary({
      name: hit.title,
      accession: hit.accession,
      organism: hit.organism,
      sequence: hit.sequence || (valResult ? valResult.cleanDna : querySeq),
      source: `BLAST Hit (${hit.accession})`
    });
    setSavedHitSuccess(true);
    setTimeout(() => setSavedHitSuccess(false), 2500);
  };

  const handleSetHitActive = (hit) => {
    if (!hit) return;
    setGlobalActiveSequence({
      name: hit.title,
      accession: hit.accession,
      organism: hit.organism,
      sequence: hit.sequence || (valResult ? valResult.cleanDna : querySeq),
      source: 'BLAST Hit'
    });
  };

  const getScoreColor = (bitScore) => {
    if (bitScore >= 200) return '#ef4444'; // Red
    if (bitScore >= 80) return '#ec4899';  // Pink/Magenta
    if (bitScore >= 50) return '#10b981';  // Green
    if (bitScore >= 40) return '#3b82f6';  // Blue
    return '#64748b';                      // Grey
  };

  const isButtonDisabled = isNucleotideQuery && valResult && !valResult.isValid;

  return (
    <div className="page-fade-in">
      <div className="card-header">
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>BLAST Alignment Center</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Compare nucleotide or protein queries against sequence databases using BLAST algorithms.
          </p>
        </div>
      </div>

      {activeSequenceObj && (
        <div style={{
          background: 'rgba(6, 182, 212, 0.08)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '16px',
          fontSize: '0.83rem',
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Dna size={16} color="var(--accent-cyan)" />
            <span>Auto-Fetched Query Sequence: <strong>{activeSequenceObj.name}</strong> ({activeSequenceObj.accession !== 'Custom Sequence' ? activeSequenceObj.accession : `${activeSequenceObj.length} nt`})</span>
          </div>
          <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Loaded</span>
        </div>
      )}

      <div className="glass-card" style={{ marginBottom: '24px' }}>
        <h3 className="card-title" style={{ marginBottom: '16px' }}><Zap size={18} color="var(--accent-amber)" /> Configure BLAST Search</h3>

        <div className="grid-2" style={{ marginBottom: '16px' }}>
          <div className="form-group">
            <label className="form-label">BLAST Program</label>
            <select className="select-field" value={program} onChange={(e) => setProgram(e.target.value)}>
              <option value="blastn">BLASTN (Nucleotide vs Nucleotide)</option>
              <option value="blastp">BLASTP (Protein vs Protein)</option>
              <option value="blastx">BLASTX (Translated Nucleotide vs Protein)</option>
              <option value="tblastn">TBLASTN (Protein vs Translated Nucleotide)</option>
              <option value="tblastx">TBLASTX (Translated Nucleotide vs Translated Nucleotide)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Target Database</label>
            <select className="select-field" disabled>
              <option>Reference Genomes (Homo sapiens, SARS-CoV-2, ACTB, TP53)</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Query Sequence (FASTA or Raw Sequence)</label>
          <textarea
            className="textarea-field"
            rows={4}
            placeholder="Paste nucleotide or protein query sequence..."
            value={querySeq}
            onChange={handleQueryChange}
            onBlur={handleQueryBlur}
          />
        </div>

        {/* Validation Panel for Nucleotide Queries */}
        {isNucleotideQuery && <ValidationPanel validation={valResult} />}

        <button
          className="btn-primary"
          style={{ marginTop: '16px', opacity: isButtonDisabled ? 0.6 : 1, cursor: isButtonDisabled ? 'not-allowed' : 'pointer' }}
          onClick={handleRunBlast}
          disabled={isButtonDisabled}
        >
          <Play size={18} /> Execute {program.toUpperCase()} Search
        </button>
      </div>

      {/* Graphical Overview Map */}
      {blastResults && blastResults.hits.length > 0 && (
        <div className="glass-card page-fade-in" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">
              <Layers color="var(--accent-cyan)" size={20} />
              Graphical Overview of Alignment Hits
            </h3>

            {/* Score Legend */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.78rem', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Color Key for Alignment Scores:</span>
              <span style={{ background: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>&ge;200</span>
              <span style={{ background: '#ec4899', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>80-200</span>
              <span style={{ background: '#10b981', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>50-80</span>
              <span style={{ background: '#3b82f6', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>40-50</span>
              <span style={{ background: '#64748b', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>&lt;40</span>
            </div>
          </div>

          <div style={{ background: '#060913', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
              Query Sequence Scale (1 to {blastResults.queryLength} bp/aa)
            </div>

            {/* SVG Ruler & Hit Tracks */}
            <svg width="100%" height={60 + blastResults.hits.length * 28} viewBox={`0 0 800 ${60 + blastResults.hits.length * 28}`}>
              {/* Query Ruler Line */}
              <line x1="120" y1="25" x2="760" y2="25" stroke="var(--text-secondary)" strokeWidth="3" />
              <text x="120" y="15" fill="var(--text-muted)" fontSize="11">1</text>
              <text x="740" y="15" fill="var(--text-muted)" fontSize="11">{blastResults.queryLength}</text>
              <text x="430" y="15" fill="var(--accent-cyan)" fontSize="11" fontWeight="700">Query Ruler</text>

              {/* Hit Alignment Bars */}
              {blastResults.hits.map((hit, idx) => {
                const qLen = blastResults.queryLength || 1;
                const startX = 120 + ((hit.alignment.queryStart - 1) / qLen) * 640;
                const endX = 120 + (hit.alignment.queryEnd / qLen) * 640;
                const barWidth = Math.max(endX - startX, 8);
                const barY = 45 + idx * 28;
                const barColor = getScoreColor(hit.alignment.bitScore);
                const isSelected = selectedHit === hit;

                return (
                  <g key={idx} style={{ cursor: 'pointer' }} onClick={() => setSelectedHit(hit)}>
                    {/* Label */}
                    <text x="5" y={barY + 12} fill={isSelected ? 'var(--accent-cyan)' : 'var(--text-secondary)'} fontSize="11" fontWeight={isSelected ? '800' : '500'}>
                      {hit.accession}
                    </text>
                    {/* Background track */}
                    <rect x="120" y={barY} width="640" height="14" fill="rgba(255,255,255,0.04)" rx="3" />
                    {/* Alignment hit bar */}
                    <rect
                      x={startX}
                      y={barY}
                      width={barWidth}
                      height="14"
                      fill={barColor}
                      rx="3"
                      stroke={isSelected ? '#ffffff' : 'none'}
                      strokeWidth="2"
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* BLAST Hits Table */}
      {blastResults && (
        <div className="glass-card page-fade-in" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">
              <CheckCircle2 color="var(--accent-emerald)" size={20} />
              BLAST Hits Summary Table ({blastResults.hits.length} matches)
            </h3>
          </div>

          {savedHitSuccess && (
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--accent-emerald)', padding: '10px 16px', borderRadius: '8px', color: 'var(--accent-emerald)', marginBottom: '16px', fontSize: '0.85rem' }}>
              ✓ Selected BLAST Hit saved to your Sequence Library!
            </div>
          )}

          {blastResults.hits.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No significant sequence hits found for query.</p>
          ) : (
            <div className="table-container">
              <table className="bio-table">
                <thead>
                  <tr>
                    <th>Accession</th>
                    <th>Description / Organism</th>
                    <th>Max Score</th>
                    <th>Bit Score</th>
                    <th>E-Value</th>
                    <th>Identity</th>
                    <th>Query Cover</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {blastResults.hits.map((hit, idx) => (
                    <tr
                      key={idx}
                      style={{ background: selectedHit === hit ? 'rgba(245, 158, 11, 0.1)' : 'transparent', cursor: 'pointer' }}
                      onClick={() => setSelectedHit(hit)}
                    >
                      <td style={{ fontWeight: 700, color: getScoreColor(hit.alignment.bitScore) }}>{hit.accession}</td>
                      <td>
                        <strong>{hit.title}</strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{hit.organism}</div>
                      </td>
                      <td>{hit.alignment.maxScore}</td>
                      <td style={{ fontWeight: 600 }}>{hit.alignment.bitScore}</td>
                      <td style={{ color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>{hit.alignment.evalue}</td>
                      <td>{hit.alignment.identityPercent}%</td>
                      <td>{hit.alignment.queryCoverage}%</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.78rem' }} onClick={() => handleSaveHitToLibrary(hit)}>
                            <BookmarkPlus size={13} color="var(--accent-emerald)" /> Save Hit
                          </button>
                          <button className="btn-primary" style={{ padding: '4px 8px', fontSize: '0.78rem' }} onClick={() => handleSetHitActive(hit)}>
                            <ArrowRight size={13} /> Active
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Selected Hit Alignment Visualizer */}
      {selectedHit && (
        <div className="glass-card page-fade-in">
          <div className="card-header">
            <h3 className="card-title">
              Alignment View: {selectedHit.accession} - {selectedHit.title}
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.82rem' }} onClick={() => handleSaveHitToLibrary(selectedHit)}>
                <BookmarkPlus size={14} color="var(--accent-emerald)" /> Save Hit to Library
              </button>
              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.82rem' }} onClick={() => setActiveTab('alignment')}>
                <GitMerge size={14} color="#ec4899" /> Add to MSA Alignment
              </button>
            </div>
          </div>

          <div style={{ background: '#060913', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', overflowX: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>
              Query: {selectedHit.alignment.queryStart} to {selectedHit.alignment.queryEnd} | Subject: {selectedHit.alignment.subjectStart} to {selectedHit.alignment.subjectEnd} | Bit Score: {selectedHit.alignment.bitScore} | E-Value: {selectedHit.alignment.evalue}
            </div>
            <div style={{ color: '#38bdf8' }}>Query  {selectedHit.alignment.queryStart.toString().padStart(4, ' ')}  {selectedHit.alignment.alignQ}  {selectedHit.alignment.queryEnd}</div>
            <div style={{ color: '#94a3b8' }}>             {selectedHit.alignment.alignSym}</div>
            <div style={{ color: '#34d399' }}>Sbjct  {selectedHit.alignment.subjectStart.toString().padStart(4, ' ')}  {selectedHit.alignment.alignS}  {selectedHit.alignment.subjectEnd}</div>
          </div>
        </div>
      )}

      {/* Educational & Scientific Documentation Section */}
      <div className="glass-card" style={{ marginTop: '24px', borderTop: '2px solid var(--accent-amber)' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={18} color="var(--accent-amber)" /> BLAST Center — Scientific & Usage Guide
        </h3>
        <div className="grid-2" style={{ gap: '20px', fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
          <div>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>What this tool does</h4>
            <p style={{ marginBottom: '12px' }}>
              Executes Basic Local Alignment Search Tool (BLAST) algorithms—including BLASTN (nucleotide-nucleotide), BLASTP (protein-protein), and BLASTX (translated nucleotide-protein)—to detect regions of local sequence similarity.
            </p>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Who it is for</h4>
            <p style={{ marginBottom: '12px' }}>
              Computational biologists, evolutionary geneticists, biopharma researchers, and annotators searching for homologous genes, novel mutations, or species lineage relationships.
            </p>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Accepted Inputs</h4>
            <p>
              FASTA sequences, query accession IDs, or target reference databases (e.g. Human RefSeq, Viral Genomes, Bacteria, Custom FASTA sets).
            </p>
          </div>
          <div>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Produced Outputs</h4>
            <p style={{ marginBottom: '12px' }}>
              High-scoring Segment Pairs (HSPs), Expectation Values (E-values), percentage identity, bit-scores, query/subject sequence alignments, and match graphics.
            </p>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Scientific Background</h4>
            <p>
              BLAST uses heuristic seed-matching and dynamic local alignment (Smith-Waterman variation) to evaluate statistical significance (E-value), indicating whether sequence similarity is due to common evolutionary ancestry or random chance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

