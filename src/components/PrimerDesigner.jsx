import React, { useState, useEffect } from 'react';
import { Scissors, Play, Save, FileText, CheckCircle2, AlertTriangle, Info, RefreshCw, Dna, Zap } from 'lucide-react';
import { designPrimers } from '../utils/primerEngine';
import { validateDnaSequence } from '../utils/sequenceValidator';
import ValidationPanel from './ValidationPanel';
import { fetchFasta, parseFastaHeader, searchNcbi } from '../utils/ncbiService';
import { generateQuickPdfReport } from '../utils/pdfGenerator';
import { useWorkspace } from '../context/WorkspaceContext';

export default function PrimerDesigner({ savePrimerSet, setActiveTab }) {
  const { activeSequenceObj, setGlobalActiveSequence } = useWorkspace();
  const [sequenceInput, setSequenceInput] = useState(activeSequenceObj ? activeSequenceObj.sequence : '');
  const [accessionInput, setAccessionInput] = useState('');
  const [loadingNcbi, setLoadingNcbi] = useState(false);
  const [geneName, setGeneName] = useState(activeSequenceObj ? activeSequenceObj.name : 'Target Sequence');

  // Parameter Options
  const [minLen, setMinLen] = useState(18);
  const [maxLen, setMaxLen] = useState(24);
  const [optTm, setOptTm] = useState(60);
  const [minProductLen, setMinProductLen] = useState(40);
  const [maxProductLen, setMaxProductLen] = useState(300);

  const [results, setResults] = useState(null);
  const [selectedPair, setSelectedPair] = useState(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isDesigning, setIsDesigning] = useState(false);

  // Auto-fetch sequence from global workspace state on mount or active sequence change
  useEffect(() => {
    if (activeSequenceObj && activeSequenceObj.sequence) {
      if (!sequenceInput.trim() || sequenceInput !== activeSequenceObj.sequence) {
        setSequenceInput(activeSequenceObj.sequence);
        if (activeSequenceObj.name) {
          setGeneName(activeSequenceObj.name);
        }
      }
    }
  }, [activeSequenceObj]);

  // Live Sequence Validation (Memoized)
  const valResult = React.useMemo(() => {
    return validateDnaSequence(sequenceInput, {
      minLen: parseInt(minProductLen) || 30
    });
  }, [sequenceInput, minProductLen]);

  // Parameter Numbers & Safety Validation (Memoized)
  const { numMinLen, numMaxLen, numOptTm, numMinProd, numMaxProd, paramError } = React.useMemo(() => {
    const minL = parseInt(minLen) || 18;
    const maxL = parseInt(maxLen) || 24;
    const optT = parseFloat(optTm) || 60;
    const minP = parseInt(minProductLen) || 40;
    const maxP = parseInt(maxProductLen) || 300;

    let err = '';
    if (minL > maxL) {
      err = `Minimum primer length (${minL} bp) cannot be greater than maximum primer length (${maxL} bp).`;
    } else if (minP > maxP) {
      err = `Minimum product length (${minP} bp) cannot be greater than maximum product length (${maxP} bp).`;
    } else if (optT < 40 || optT > 85) {
      err = `Optimal Tm (${optT}°C) must be between 40°C and 85°C.`;
    }

    return {
      numMinLen: minL,
      numMaxLen: maxL,
      numOptTm: optT,
      numMinProd: minP,
      numMaxProd: maxP,
      paramError: err
    };
  }, [minLen, maxLen, optTm, minProductLen, maxProductLen]);

  const handleSequenceInputChange = (e) => {
    setSequenceInput(e.target.value);
  };

  const handleSequenceBlur = () => {
    if (sequenceInput.trim().length > 10) {
      setGlobalActiveSequence(sequenceInput, geneName);
    }
  };

  const handleFetchAccession = async () => {
    const rawQuery = accessionInput.trim();
    if (!rawQuery) return;
    setLoadingNcbi(true);
    try {
      let idToFetch = rawQuery;
      // Check if user entered accession (e.g. NM_007294, NC_000017, M13077) or numeric UID
      const isDirectAccession = /^[A-Z]{1,4}_[0-9]+(\.[0-9]+)?$/i.test(rawQuery) ||
                                /^[0-9]+$/.test(rawQuery) ||
                                /^[A-Z]{1,2}[0-9]{5,8}(\.[0-9]+)?$/i.test(rawQuery);

      if (!isDirectAccession) {
        // Query NCBI to resolve gene symbol (e.g., "BRCA1", "TP53") to top mRNA/cDNA transcript
        const searchRes = await searchNcbi('nucleotide', `${rawQuery} mRNA[Filter] OR ${rawQuery}[Title]`, 1);
        if (searchRes.ids && searchRes.ids.length > 0) {
          idToFetch = searchRes.ids[0];
        } else {
          // Fallback simple search
          const simpleSearch = await searchNcbi('nucleotide', rawQuery, 1);
          if (simpleSearch.ids && simpleSearch.ids.length > 0) {
            idToFetch = simpleSearch.ids[0];
          }
        }
      }

      const fasta = await fetchFasta('nucleotide', idToFetch);
      const parsed = parseFastaHeader(fasta);
      if (parsed.sequence) {
        setSequenceInput(parsed.sequence);
        const displayName = parsed.header ? parsed.header.split(',')[0].slice(0, 40) : rawQuery;
        setGeneName(displayName);
        setGlobalActiveSequence({
          name: displayName,
          accession: rawQuery,
          sequence: parsed.sequence,
          source: 'NCBI Fetch'
        });
      } else {
        alert(`No nucleotide sequence found for "${rawQuery}". Please verify the accession number or search NCBI Explorer.`);
      }
    } catch (_err) {
      alert('Failed to fetch sequence from NCBI. Check your accession/gene symbol or internet connection.');
    } finally {
      setLoadingNcbi(false);
    }
  };

  const handleConvertProteinToDna = async () => {
    setLoadingNcbi(true);
    try {
      const searchRes = await searchNcbi('nucleotide', `${geneName} mRNA cDNA[Title]`, 1);
      if (searchRes.ids && searchRes.ids.length > 0) {
        const fasta = await fetchFasta('nucleotide', searchRes.ids[0]);
        const parsed = parseFastaHeader(fasta);
        if (parsed.sequence) {
          setSequenceInput(parsed.sequence);
          setGlobalActiveSequence({
            name: `${geneName} cDNA`,
            accession: searchRes.ids[0],
            sequence: parsed.sequence,
            source: 'NCBI mRNA'
          });
          alert(`Fetched matching cDNA nucleotide sequence (${parsed.sequence.length} bp) from NCBI!`);
        }
      } else {
        alert('Could not auto-find mRNA sequence. Please enter an NCBI Accession ID (e.g., NM_007294).');
      }
    } catch {
      alert('NCBI Search Error.');
    } finally {
      setLoadingNcbi(false);
    }
  };

  const handleRunDesign = () => {
    if (!valResult.isValid) return;
    if (paramError) return;

    setIsDesigning(true);
    setTimeout(() => {
      try {
        const res = designPrimers(valResult.cleanDna, {
          minLen: numMinLen,
          maxLen: numMaxLen,
          optTm: numOptTm,
          minProductLen: numMinProd,
          maxProductLen: numMaxProd
        });

        setResults(res);
        if (res.pairs && res.pairs.length > 0) {
          setSelectedPair(res.pairs[0]);
        }
        setSavedSuccess(false);

        setGlobalActiveSequence({
          name: geneName,
          sequence: valResult.cleanDna,
          source: 'Primer Designer'
        });
      } finally {
        setIsDesigning(false);
      }
    }, 40);
  };


  const handleSavePair = () => {
    if (!selectedPair) return;
    savePrimerSet({
      name: geneName,
      ...selectedPair
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleExportPdf = () => {
    if (!selectedPair) return;
    generateQuickPdfReport({
      title: `Primer Design Report - ${geneName}`,
      sectionData: [
        { label: 'Gene / Target Name', value: geneName },
        { label: 'Forward Primer (5\'-3\')', value: selectedPair.forward.sequence },
        { label: 'Forward Length / Tm / GC%', value: `${selectedPair.forward.length} bp | ${selectedPair.forward.tm} °C | ${selectedPair.forward.gc}%` },
        { label: 'Reverse Primer (5\'-3\')', value: selectedPair.reverse.sequence },
        { label: 'Reverse Length / Tm / GC%', value: `${selectedPair.reverse.length} bp | ${selectedPair.reverse.tm} °C | ${selectedPair.reverse.gc}%` },
        { label: 'Amplicon Product Length', value: `${selectedPair.productLength} bp` },
        { label: 'Recommended Annealing Temp (Ta)', value: `${selectedPair.recommendedTa} °C` },
        { label: 'Hairpin / Dimer Status', value: `Fwd Hairpin: ${selectedPair.forward.hairpin.score} | Cross Dimer Risk: ${selectedPair.crossDimer.risk}` }
      ]
    });
  };

  const isButtonDisabled = !valResult.isValid || !!paramError;

  return (
    <div className="page-fade-in">
      <div className="card-header">
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>PCR Primer Designer</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            High-precision thermodynamic primer design engine calculating Tm, GC%, Hairpins, and Self/Cross-Dimers.
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
            <span>Auto-Fetched Active Sequence: <strong>{activeSequenceObj.name}</strong> ({activeSequenceObj.accession !== 'Custom Sequence' ? activeSequenceObj.accession : `${activeSequenceObj.length} nt`})</span>
          </div>
          <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Auto-Loaded</span>
        </div>
      )}
      {/* Benchling-Style Workspace Launcher Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(59, 130, 246, 0.15))',
        border: '1px solid rgba(6, 182, 212, 0.4)',
        borderRadius: '10px',
        padding: '14px 18px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Zap size={20} color="var(--accent-cyan)" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#fff' }}>
              Benchling-Style Primer Design Workspace
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Full-page interactive sequence map, native Primer3 thermodynamic C-engine, hairpin ΔG analysis, and in-silico PCR specificity checks.
            </div>
          </div>
        </div>
        <button
          type="button"
          className="btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          onClick={() => window.open('/primer-design', '_blank')}
        >
          <span>Launch Full Workspace</span>
          <span style={{ fontSize: '1rem' }}>↗</span>
        </button>
      </div>

      <div className="grid-2" style={{ marginBottom: '24px' }}>
        {/* Input Card */}
        <div className="glass-card">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>
            <Scissors size={18} color="var(--accent-cyan)" /> 1. Input Target DNA Sequence
          </h3>

          <div className="form-group">
            <label className="form-label">Gene / Target Name</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. BRCA1, TP53, Target Gene"
              value={geneName}
              onChange={(e) => setGeneName(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Or enter NCBI Accession (e.g. NM_007294)"
              value={accessionInput}
              onChange={(e) => setAccessionInput(e.target.value)}
            />
            <button className="btn-secondary" style={{ flexShrink: 0 }} onClick={handleFetchAccession} disabled={loadingNcbi}>
              {loadingNcbi ? <RefreshCw className="spin" size={16} /> : 'Fetch NCBI'}
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Template DNA Sequence (FASTA or Raw DNA)</label>
            <textarea
              className="textarea-field"
              rows={5}
              placeholder="Paste template DNA sequence (A, T, G, C) or fetch accession..."
              value={sequenceInput}
              onChange={handleSequenceInputChange}
              onBlur={handleSequenceBlur}
            />
          </div>

          {/* Live Validation Panel */}
          <ValidationPanel validation={valResult} />

          {/* Protein Sequence Recovery Button */}
          {valResult.isProtein && (
            <div style={{ marginTop: '10px' }}>
              <button className="btn-secondary" style={{ fontSize: '0.82rem', width: '100%' }} onClick={handleConvertProteinToDna} disabled={loadingNcbi}>
                <Dna size={14} /> Search NCBI for Target cDNA Nucleotide Sequence
              </button>
            </div>
          )}

          <button
            className="btn-primary"
            style={{ width: '100%', marginTop: '16px', opacity: isButtonDisabled || isDesigning ? 0.6 : 1, cursor: isButtonDisabled || isDesigning ? 'not-allowed' : 'pointer' }}
            onClick={handleRunDesign}
            disabled={isButtonDisabled || isDesigning}
          >
            {isDesigning ? (
              <>
                <RefreshCw className="spin" size={18} /> Designing Optimal Primers...
              </>
            ) : (
              <>
                <Play size={18} /> Design Optimal Primers
              </>
            )}
          </button>
        </div>

        {/* Parameters Options */}
        <div className="glass-card">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>
            <Info size={18} color="var(--accent-emerald)" /> 2. Thermodynamic Parameters
          </h3>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Min Primer Length (bp)</label>
              <input type="number" className="input-field" value={minLen} onChange={(e) => setMinLen(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Max Primer Length (bp)</label>
              <input type="number" className="input-field" value={maxLen} onChange={(e) => setMaxLen(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Optimal Tm (°C)</label>
              <input type="number" className="input-field" value={optTm} onChange={(e) => setOptTm(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Min Product Length (bp)</label>
              <input type="number" className="input-field" value={minProductLen} onChange={(e) => setMinProductLen(e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Max Product Length (bp)</label>
              <input type="number" className="input-field" value={maxProductLen} onChange={(e) => setMaxProductLen(e.target.value)} />
            </div>
          </div>

          {/* Parameter Error Alert */}
          {paramError && (
            <div style={{ background: 'rgba(244, 63, 94, 0.12)', border: '1px solid var(--accent-rose)', padding: '12px', borderRadius: '8px', color: 'var(--accent-rose)', fontSize: '0.83rem', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} /> {paramError}
            </div>
          )}
        </div>
      </div>

      {/* Results Output */}
      {results && (
        <div className="glass-card page-fade-in" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">
              <CheckCircle2 color="var(--accent-emerald)" size={20} />
              Designed Primer Candidates ({results.pairs?.length || 0} pairs found)
            </h3>

            {selectedPair && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-secondary" onClick={() => setActiveTab('blast')}>
                  <Zap size={16} color="var(--accent-amber)" /> Check Specificity (BLAST)
                </button>
                <button className="btn-secondary" onClick={handleSavePair}>
                  <Save size={16} color="var(--accent-cyan)" /> Save Pair
                </button>
                <button className="btn-secondary" onClick={handleExportPdf}>
                  <FileText size={16} color="var(--accent-emerald)" /> Export PDF
                </button>
              </div>
            )}
          </div>

          {savedSuccess && (
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--accent-emerald)', padding: '10px 16px', borderRadius: '8px', color: 'var(--accent-emerald)', marginBottom: '16px', fontSize: '0.85rem' }}>
              ✓ Primer pair saved to Workspace Dashboard!
            </div>
          )}

          {results.error ? (
            <div style={{ color: 'var(--accent-rose)', fontSize: '0.9rem' }}>{results.error}</div>
          ) : (
            <div className="table-container">
              <table className="bio-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Forward Primer (5'-3')</th>
                    <th>Fwd Tm / GC%</th>
                    <th>Reverse Primer (5'-3')</th>
                    <th>Rev Tm / GC%</th>
                    <th>Product</th>
                    <th>Recommended Ta</th>
                    <th>Select</th>
                  </tr>
                </thead>
                <tbody>
                  {results.pairs.map((pair, idx) => (
                    <tr
                      key={idx}
                      style={{ background: selectedPair === pair ? 'rgba(6, 182, 212, 0.1)' : 'transparent', cursor: 'pointer' }}
                      onClick={() => setSelectedPair(pair)}
                    >
                      <td style={{ fontWeight: 700 }}>#{idx + 1}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>{pair.forward.sequence}</td>
                      <td>{pair.forward.tm} °C / {pair.forward.gc}%</td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: '#34d399' }}>{pair.reverse.sequence}</td>
                      <td>{pair.reverse.tm} °C / {pair.reverse.gc}%</td>
                      <td>{pair.productLength} bp</td>
                      <td style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>{pair.recommendedTa} °C</td>
                      <td>
                        <input
                          type="radio"
                          name="selectedPairRadio"
                          checked={selectedPair === pair}
                          onChange={() => setSelectedPair(pair)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Selected Pair Detailed Breakdown */}
      {selectedPair && (
        <div className="glass-card page-fade-in">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>Detailed Thermodynamic & Structure Analysis</h3>
          <div className="grid-3">
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ color: '#38bdf8', marginBottom: '8px' }}>Forward Primer Details</h4>
              <p><strong>Sequence:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedPair.forward.sequence}</span></p>
              <p><strong>Length:</strong> {selectedPair.forward.length} bp</p>
              <p><strong>Melting Temp (Tm):</strong> {selectedPair.forward.tm} °C</p>
              <p><strong>GC Content:</strong> {selectedPair.forward.gc}%</p>
              <p><strong>Hairpin Risk:</strong> {selectedPair.forward.hairpin.score}</p>
              <p><strong>3' GC Clamp:</strong> {selectedPair.forward.gcClamp.isGood ? 'Good (2-3 GC)' : 'Moderate'}</p>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ color: '#34d399', marginBottom: '8px' }}>Reverse Primer Details</h4>
              <p><strong>Sequence:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedPair.reverse.sequence}</span></p>
              <p><strong>Length:</strong> {selectedPair.reverse.length} bp</p>
              <p><strong>Melting Temp (Tm):</strong> {selectedPair.reverse.tm} °C</p>
              <p><strong>GC Content:</strong> {selectedPair.reverse.gc}%</p>
              <p><strong>Hairpin Risk:</strong> {selectedPair.reverse.hairpin.score}</p>
              <p><strong>3' GC Clamp:</strong> {selectedPair.reverse.gcClamp.isGood ? 'Good (2-3 GC)' : 'Moderate'}</p>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ color: 'var(--accent-amber)', marginBottom: '8px' }}>Amplicon & Dimer Metrics</h4>
              <p><strong>Product Size:</strong> {selectedPair.productLength} bp</p>
              <p><strong>Tm Difference (ΔTm):</strong> {selectedPair.tmDiff} °C</p>
              <p><strong>Cross-Dimer Risk:</strong> {selectedPair.crossDimer.risk}</p>
              <p><strong>Rec. Annealing (Ta):</strong> {selectedPair.recommendedTa} °C</p>
            </div>
          </div>
        </div>
      )}

      {/* Educational & Scientific Documentation Section */}
      <div className="glass-card" style={{ marginTop: '24px', borderTop: '2px solid var(--accent-cyan)' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={18} color="var(--accent-cyan)" /> PCR Primer Designer — Scientific & Usage Guide
        </h3>
        <div className="grid-2" style={{ gap: '20px', fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
          <div>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>What this tool does</h4>
            <p style={{ marginBottom: '12px' }}>
              Computes optimal forward and reverse oligonucleotide primers for target DNA amplification using thermodynamic nearest-neighbor Tm models, GC clamp analysis, and secondary structure risk evaluations.
            </p>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Who it is for</h4>
            <p style={{ marginBottom: '12px' }}>
              Molecular biologists, geneticists, diagnostic assay developers, and researchers preparing quantitative PCR (qPCR) or conventional cloning experiments.
            </p>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Accepted Inputs</h4>
            <p>
              Raw DNA sequences (A, T, C, G), formatted FASTA files, or NCBI Accession numbers (e.g. NM_007294) fetched directly via Entrez APIs.
            </p>
          </div>
          <div>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Produced Outputs</h4>
            <p style={{ marginBottom: '12px' }}>
              Ranked primer pair candidates, calculated melting temperatures (Tm), recommended annealing temperatures (Ta), GC content %, amplicon sizes, and exportable PDF bench protocols.
            </p>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Scientific Background</h4>
            <p>
              Polymerase Chain Reaction (PCR) specificity depends on balanced primer melting temperatures (ΔTm &lt; 2°C) and the avoidance of self-complementary hairpin loops or primer-dimers, ensuring efficient DNA polymerase extension.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

