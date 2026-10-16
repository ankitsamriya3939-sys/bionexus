import React, { useState } from 'react';
import { 
  Download, FileText, CheckCircle2, Copy, Filter, 
  ExternalLink, ArrowUpDown, ChevronDown, Check 
} from 'lucide-react';

export default function ResultsPanelPreview() {
  const [activeTab, setActiveTab] = useState('blast');
  const [copiedIdx, setCopiedIdx] = useState(null);

  // Representative BLAST Results
  const blastHits = [
    { acc: 'NP_000537.3', organism: 'Homo sapiens', desc: 'cellular tumor antigen p53 isoform a', score: 792, evalue: '0.0', identity: '100.0%', coverage: '100%' },
    { acc: 'NP_001119589.1', organism: 'Pan troglodytes', desc: 'cellular tumor antigen p53', score: 785, evalue: '0.0', identity: '99.2%', coverage: '100%' },
    { acc: 'NP_001178654.1', organism: 'Gorilla gorilla', desc: 'cellular tumor antigen p53', score: 780, evalue: '0.0', identity: '98.7%', coverage: '100%' },
    { acc: 'NP_035770.2', organism: 'Mus musculus', desc: 'cellular tumor antigen p53', score: 588, evalue: '2e-176', identity: '78.4%', coverage: '98%' },
    { acc: 'NP_112445.1', organism: 'Rattus norvegicus', desc: 'cellular tumor antigen p53', score: 574, evalue: '1e-171', identity: '77.2%', coverage: '98%' }
  ];

  // Representative Primer Pairs
  const primerPairs = [
    { pairNum: 1, fwdSeq: 'CCTCACCATCATCACACTGG', fwdTm: '60.4°C', fwdGc: '55.0%', revSeq: 'CTGACGCACACCTATTGCAA', revTm: '59.8°C', revGc: '50.0%', prodLen: '342 bp', rating: 'Optimal' },
    { pairNum: 2, fwdSeq: 'TTCCTACAGTACTCCCCTGC', fwdTm: '59.2°C', fwdGc: '50.0%', revSeq: 'AGCTGCTCACCATCGCTATC', revTm: '59.5°C', revGc: '55.0%', prodLen: '418 bp', rating: 'Good' },
    { pairNum: 3, fwdSeq: 'GAGGTTGGCTCTGACTGTAC', fwdTm: '58.8°C', fwdGc: '55.0%', revSeq: 'CCAGTCCTCTCACTTCAAGC', revTm: '58.6°C', revGc: '55.0%', prodLen: '286 bp', rating: 'Acceptable' }
  ];

  const handleCopy = (text, idx) => {
    navigator.clipboard?.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '16px 20px', gap: '16px', background: 'var(--bn-surface-0)' }}>
      {/* Panel Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="bn-badge bn-badge-cyan">Universal Scientific Results</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
              Analysis Output & Alignment Metrics
            </h2>
          </div>
          <p style={{ color: 'var(--bn-text-secondary)', fontSize: '0.8rem', margin: '4px 0 0' }}>
            Standardized data tables with statistical rigor, units, and citation provenance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="bn-btn">
            <Download size={13} /> Export CSV
          </button>
          <button className="bn-btn bn-btn-primary">
            <FileText size={13} /> Generate PDF Report
          </button>
        </div>
      </div>

      {/* View Switcher Ribbon */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--bn-border-default)', paddingBottom: '8px' }}>
        <button 
          className={`bn-btn bn-btn-ghost ${activeTab === 'blast' ? 'bn-btn-active' : ''}`}
          onClick={() => setActiveTab('blast')}
          style={{ height: '28px' }}
        >
          BLAST High-Scoring Pairs (HSPs)
        </button>
        <button 
          className={`bn-btn bn-btn-ghost ${activeTab === 'primers' ? 'bn-btn-active' : ''}`}
          onClick={() => setActiveTab('primers')}
          style={{ height: '28px' }}
        >
          PCR Primer Set Candidates
        </button>
      </div>

      {/* Main Results Data Table */}
      {activeTab === 'blast' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
          <div className="bn-table-container">
            <table className="bn-table">
              <thead>
                <tr>
                  <th>Accession</th>
                  <th>Organism</th>
                  <th>Description</th>
                  <th>Bit Score</th>
                  <th>E-Value</th>
                  <th>Identity</th>
                  <th>Coverage</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {blastHits.map((hit, idx) => (
                  <tr key={hit.acc}>
                    <td>
                      <span className="bn-badge bn-badge-cyan">{hit.acc}</span>
                    </td>
                    <td style={{ fontStyle: 'italic', fontWeight: 600 }}>{hit.organism}</td>
                    <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hit.desc}</td>
                    <td className="bn-mono" style={{ fontWeight: 700 }}>{hit.score}</td>
                    <td className="bn-mono" style={{ color: 'var(--bn-emerald)', fontWeight: 700 }}>{hit.evalue}</td>
                    <td className="bn-mono">{hit.identity}</td>
                    <td className="bn-mono">{hit.coverage}</td>
                    <td>
                      <button 
                        onClick={() => handleCopy(hit.acc, idx)}
                        className="bn-btn bn-btn-ghost" 
                        style={{ height: '24px', padding: '0 6px', fontSize: '0.7rem' }}
                      >
                        {copiedIdx === idx ? <Check size={11} color="var(--bn-emerald)" /> : <Copy size={11} />}
                        <span>{copiedIdx === idx ? 'Copied' : 'Accession'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Alignment Segment Graphic Preview */}
          <div style={{ background: 'var(--bn-surface-2)', border: '1px solid var(--bn-border-default)', borderRadius: 'var(--bn-radius-sm)', padding: '14px' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--bn-text-secondary)', marginBottom: '8px' }}>
              Pairwise Residue Alignment (Hit 1: NP_000537.3 vs Query):
            </div>
            <div className="bn-mono" style={{ fontSize: '0.74rem', background: 'var(--bn-surface-0)', padding: '10px 14px', borderRadius: '4px', lineHeight: 1.6, overflowX: 'auto' }}>
              <div>Query    1  MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPSQAMDDLMLSPDDIEQWFTEDPGP  60</div>
              <div style={{ color: 'var(--bn-emerald)' }}>          ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||</div>
              <div>Sbjct    1  MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPSQAMDDLMLSPDDIEQWFTEDPGP  60</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'primers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
          <div className="bn-table-container">
            <table className="bn-table">
              <thead>
                <tr>
                  <th>Set #</th>
                  <th>Forward Primer (5'→3')</th>
                  <th>Fwd Tm</th>
                  <th>Fwd GC</th>
                  <th>Reverse Primer (5'→3')</th>
                  <th>Rev Tm</th>
                  <th>Rev GC</th>
                  <th>Product</th>
                  <th>Quality</th>
                </tr>
              </thead>
              <tbody>
                {primerPairs.map((p) => (
                  <tr key={p.pairNum}>
                    <td className="bn-mono" style={{ fontWeight: 700 }}>#{p.pairNum}</td>
                    <td className="bn-mono" style={{ color: 'var(--bn-cyan)' }}>{p.fwdSeq}</td>
                    <td className="bn-mono">{p.fwdTm}</td>
                    <td className="bn-mono">{p.fwdGc}</td>
                    <td className="bn-mono" style={{ color: 'var(--bn-emerald)' }}>{p.revSeq}</td>
                    <td className="bn-mono">{p.revTm}</td>
                    <td className="bn-mono">{p.revGc}</td>
                    <td className="bn-mono" style={{ fontWeight: 700 }}>{p.prodLen}</td>
                    <td>
                      <span className={`bn-badge ${p.rating === 'Optimal' ? 'bn-badge-emerald' : 'bn-badge-amber'}`}>
                        {p.rating}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
