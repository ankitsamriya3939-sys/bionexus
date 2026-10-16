import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Binary, Dna, Save, BarChart2, Activity, Info, Scissors, 
  Zap, GitMerge, Search, Database, Copy, Check, Download, 
  RefreshCw, FileText, ChevronDown, ChevronUp, AlertTriangle, 
  Layers, ArrowRight, ShieldCheck, HelpCircle, Eye
} from 'lucide-react';
import { 
  calculateNucleotideStatistics, 
  calculateReverseComplement, 
  findORFs, 
  translateNucleotideSequence, 
  calculateProteinStatistics, 
  calculateProteinMolecularWeight, 
  calculateProteinIsoelectricPoint, 
  calculateKyteDoolittleProfile,
  GENETIC_CODES
} from '../utils/sequenceEngine';
import { 
  validateNucleotideInput, 
  validateProteinInput, 
  validateAccessionFormat, 
  parseFasta 
} from '../utils/sequenceValidator';
import { resolveAccessionRecord } from '../utils/ncbiService';
import ValidationPanel from './ValidationPanel';
import { useWorkspace } from '../context/WorkspaceContext';

// Standard Sample Sequences for Instant Scientific Demonstration
const SAMPLE_DNA = `>NM_000546.6:150-269 Homo sapiens TP53 exon 4 (120 bp)
ATGGAGGAGCCGCAGTCAGATCCTAGCGTCGAGCCCCCTCTGAGTCAGGAAACATTTTCAGACCTATGGAAA
CTACTTCCTGAAAACAACGTTCTGTCCCCCTTGCCGTCCCAAGCAATGGATGAT`;

const SAMPLE_RNA = `>tRNA-Ala-AGC Homo sapiens (75 nt)
GGGGGUAUAGCUCAGUGGUAGAGCGCUCGCUUAGCAUGCGAGAGGUACCGGGAUCGAUACCCGGCACCUCCA
CCA`;

const SAMPLE_PROTEIN = `>NP_000537.3:1-60 cellular tumor antigen p53 isoform a [Homo sapiens] (60 aa)
MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPSQAMDDLMLSPDDIEQWFTEDPGP`;

export default function SequenceAnalysis({ saveAnalysisReport, setActiveTab }) {
  const { activeSequenceObj, setGlobalActiveSequence } = useWorkspace();

  // Mode Selection: 'accession' | 'nucleotide' | 'protein'
  const [inputMode, setInputMode] = useState('nucleotide');
  
  // Input fields
  const [accessionQuery, setAccessionQuery] = useState('');
  const [sequenceInput, setSequenceInput] = useState(activeSequenceObj ? activeSequenceObj.sequence : '');
  const [rnaPreference, setRnaPreference] = useState('auto'); // 'auto' | 'DNA' | 'RNA'
  
  // Remote NCBI Accession Retrieval State
  const [accessionLoading, setAccessionLoading] = useState(false);
  const [accessionError, setAccessionError] = useState('');
  const [retrievedRecord, setRetrievedRecord] = useState(null);
  const [showRetrievedSeq, setShowRetrievedSeq] = useState(false);

  // Results Subtab: 'overview' | 'composition' | 'viewer' | 'orfs' | 'translation' | 'provenance'
  const [activeResultTab, setActiveResultTab] = useState('overview');
  
  // Translation Interactive Controls (for DNA/RNA)
  const [transStrand, setTransStrand] = useState('+');
  const [transFrame, setTransFrame] = useState(1);
  const [transCode, setTransCode] = useState('1');

  // ORF Controls
  const [minOrfCodons, setMinOrfCodons] = useState(15);

  // Protein Kyte-Doolittle Window
  const [kdWindowSize, setKdWindowSize] = useState(7);

  // UI state
  const [copiedSeq, setCopiedSeq] = useState(false);
  const [copiedTrans, setCopiedTrans] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  // Initialize from Workspace Context if present
  useEffect(() => {
    if (activeSequenceObj && activeSequenceObj.sequence) {
      if (!sequenceInput.trim() || sequenceInput !== activeSequenceObj.sequence) {
        setSequenceInput(activeSequenceObj.sequence);
        if (activeSequenceObj.moleculeType === 'protein') {
          setInputMode('protein');
        } else {
          setInputMode('nucleotide');
        }
      }
    }
  }, [activeSequenceObj]);

  // Validation based on inputMode and sequenceInput
  const validationResult = useMemo(() => {
    if (inputMode === 'accession') {
      return validateAccessionFormat(accessionQuery);
    }
    if (inputMode === 'protein') {
      return validateProteinInput(sequenceInput, { minLen: 1 });
    }
    // Nucleotide mode
    return validateNucleotideInput(sequenceInput, { moleculePreference: rnaPreference, minLen: 1 });
  }, [inputMode, accessionQuery, sequenceInput, rnaPreference]);

  // Active biological sequence to analyze (either from retrieved record or from direct sequence input)
  const activeBiologicalData = useMemo(() => {
    if (inputMode === 'accession') {
      if (retrievedRecord && retrievedRecord.sequence) {
        return {
          sequence: retrievedRecord.sequence,
          moleculeType: retrievedRecord.moleculeType,
          header: retrievedRecord.fastaHeader || retrievedRecord.title,
          isAccession: true,
          record: retrievedRecord
        };
      }
      return null;
    }

    if (inputMode === 'protein') {
      if (validationResult.isValid) {
        return {
          sequence: validationResult.cleanSequence,
          moleculeType: 'protein',
          header: validationResult.fastaHeader || 'Protein Sequence',
          isAccession: false,
          record: null
        };
      }
      return null;
    }

    // Nucleotide mode
    if (validationResult.isValid) {
      return {
        sequence: validationResult.cleanSequence,
        moleculeType: validationResult.moleculeType,
        header: validationResult.fastaHeader || `${validationResult.moleculeType} Sequence`,
        isAccession: false,
        record: null
      };
    }
    return null;
  }, [inputMode, retrievedRecord, validationResult]);

  // Execute Scientific Calculations (Strictly molecule-specific)
  const analysisOutput = useMemo(() => {
    if (!activeBiologicalData || !activeBiologicalData.sequence) {
      return null;
    }

    const { sequence, moleculeType } = activeBiologicalData;

    if (moleculeType === 'protein') {
      const stats = calculateProteinStatistics(sequence);
      const kdProfile = calculateKyteDoolittleProfile(sequence, kdWindowSize);
      return {
        isProtein: true,
        isNucleotide: false,
        moleculeType: 'protein',
        stats,
        kdProfile
      };
    }

    // DNA or RNA
    const nucStats = calculateNucleotideStatistics(sequence, moleculeType);
    const revComp = calculateReverseComplement(sequence, moleculeType);
    const orfList = findORFs(sequence, parseInt(minOrfCodons, 10) || 15, transCode);
    
    // Explicit translation computed on request parameters
    const translation = translateNucleotideSequence(sequence, {
      frame: transFrame,
      strand: transStrand,
      geneticCode: transCode
    });

    return {
      isProtein: false,
      isNucleotide: true,
      moleculeType,
      stats: nucStats,
      revComp,
      orfs: orfList,
      translation
    };
  }, [activeBiologicalData, minOrfCodons, kdWindowSize, transFrame, transStrand, transCode]);

  // Handle NCBI Accession Search
  const handleRetrieveAccession = async (targetAcc = accessionQuery) => {
    const accToFetch = (targetAcc || '').trim();
    if (!accToFetch) {
      setAccessionError('Please enter an accession ID.');
      return;
    }

    setAccessionLoading(true);
    setAccessionError('');
    setRetrievedRecord(null);

    try {
      const record = await resolveAccessionRecord(accToFetch);
      setRetrievedRecord(record);
      // Auto-switch results tab to overview
      setActiveResultTab('overview');
    } catch (err) {
      setAccessionError(err.message || `Failed to retrieve accession '${accToFetch}' from NCBI. Please verify format and network connectivity.`);
      setRetrievedRecord(null);
    } finally {
      setAccessionLoading(false);
    }
  };

  // Sample Loaders
  const handleLoadSampleAccession = (acc) => {
    setAccessionQuery(acc);
    handleRetrieveAccession(acc);
  };

  const handleLoadSampleDna = () => {
    setInputMode('nucleotide');
    setRnaPreference('DNA');
    setSequenceInput(SAMPLE_DNA);
  };

  const handleLoadSampleRna = () => {
    setInputMode('nucleotide');
    setRnaPreference('RNA');
    setSequenceInput(SAMPLE_RNA);
  };

  const handleLoadSampleProtein = () => {
    setInputMode('protein');
    setSequenceInput(SAMPLE_PROTEIN);
  };

  // Clipboard Paste Helper
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        if (inputMode === 'accession') {
          setAccessionQuery(text.trim());
        } else {
          setSequenceInput(text);
        }
      }
    } catch {
      alert('Unable to read clipboard directly. Please press Ctrl+V to paste.');
    }
  };

  // Copy Sequence Helper
  const handleCopySequence = (textToCopy) => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopiedSeq(true);
    setTimeout(() => setCopiedSeq(false), 2000);
  };

  // Download FASTA Helper
  const handleDownloadFasta = () => {
    if (!activeBiologicalData) return;
    const header = activeBiologicalData.header || 'BioNexus_Sequence';
    const content = `>${header}\n${activeBiologicalData.sequence}\n`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(activeBiologicalData.record?.accession || 'sequence')}.fasta`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Save Report Handler (Compatible with Workspace Dashboard)
  const handleSaveReport = () => {
    if (!analysisOutput || !activeBiologicalData) return;

    const reportName = activeBiologicalData.isAccession && activeBiologicalData.record
      ? `${activeBiologicalData.record.accession} Analysis`
      : activeSequenceObj
      ? `${activeSequenceObj.name} Analysis`
      : `${activeBiologicalData.moleculeType}_Analysis_${new Date().toISOString().slice(0, 10)}`;

    const reportData = {
      name: reportName,
      moleculeType: activeBiologicalData.moleculeType,
      isProtein: analysisOutput.isProtein,
      isNucleotide: analysisOutput.isNucleotide,
      sequenceLength: activeBiologicalData.sequence.length,
      gcData: analysisOutput.isNucleotide ? {
        length: analysisOutput.stats.length,
        gcPercent: analysisOutput.stats.gcPercent,
        aCount: analysisOutput.stats.counts.A,
        tCount: analysisOutput.stats.counts.T || analysisOutput.stats.counts.U || 0,
        gCount: analysisOutput.stats.counts.G,
        cCount: analysisOutput.stats.counts.C
      } : null,
      orfs: analysisOutput.orfs || [],
      proteinSeq: analysisOutput.isProtein ? activeBiologicalData.sequence : (analysisOutput.translation?.peptide || null),
      mw: analysisOutput.isProtein ? analysisOutput.stats.mwKDa : 0,
      pi: analysisOutput.isProtein ? analysisOutput.stats.pi : 7.0,
      fullStats: analysisOutput.stats,
      accessionRecord: activeBiologicalData.record || null,
      timestamp: new Date().toISOString()
    };

    saveAnalysisReport(reportData);
    alert('Sequence analysis report saved to Workspace Dashboard!');
  };

  // Propagate to Global Active Sequence
  const handleSetGlobal = (targetTab) => {
    if (activeBiologicalData && activeBiologicalData.sequence) {
      setGlobalActiveSequence({
        name: activeBiologicalData.record?.title || activeBiologicalData.header || 'Analyzed Sequence',
        accession: activeBiologicalData.record?.accession || 'Custom Sequence',
        sequence: activeBiologicalData.sequence,
        moleculeType: activeBiologicalData.moleculeType,
        source: activeBiologicalData.isAccession ? 'NCBI Entrez' : 'Sequence Analysis'
      });
    }
    if (targetTab && setActiveTab) {
      setActiveTab(targetTab);
    }
  };

  return (
    <div className="page-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* AREA 1: PAGE HEADER */}
      <div className="card-header" style={{ marginBottom: 0, padding: '4px 0' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Genome Space &rsaquo; Sequence Analysis
            </span>
            <span className="logo-badge" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)', fontSize: '0.72rem' }}>
              Verified Scientific Engine
            </span>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
            Sequence Analysis Suite
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '4px 0 0' }}>
            Rigorous nucleotide composition, 6-frame ORF scanning, translation, and polypeptide characterization.
          </p>
        </div>

        {/* Action Toolbar */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {analysisOutput?.isNucleotide && (
            <button className="btn-secondary" onClick={() => handleSetGlobal('primer')}>
              <Scissors size={15} color="var(--accent-cyan)" /> Design Primers
            </button>
          )}
          <button className="btn-secondary" onClick={() => handleSetGlobal('blast')}>
            <Zap size={15} color="#f59e0b" /> Run BLAST
          </button>
          <button className="btn-secondary" onClick={() => handleSetGlobal('alignment')}>
            <GitMerge size={15} color="#ec4899" /> Add to MSA
          </button>
          <button 
            className="btn-primary" 
            onClick={handleSaveReport} 
            disabled={!analysisOutput}
            style={{ opacity: analysisOutput ? 1 : 0.6 }}
          >
            <Save size={16} /> Save Analysis Report
          </button>
        </div>
      </div>

      {/* AREA 2: INPUT WORKSPACE */}
      <div className="glass-card" style={{ marginBottom: 0 }}>
        {/* Mode Selector Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`btn-secondary ${inputMode === 'accession' ? 'active' : ''}`}
              style={{
                background: inputMode === 'accession' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                borderColor: inputMode === 'accession' ? 'var(--accent-cyan)' : 'var(--border-color)',
                color: inputMode === 'accession' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontWeight: inputMode === 'accession' ? 700 : 500,
                fontSize: '0.85rem'
              }}
              onClick={() => { setInputMode('accession'); }}
            >
              <Database size={15} /> NCBI Accession
            </button>

            <button
              className={`btn-secondary ${inputMode === 'nucleotide' ? 'active' : ''}`}
              style={{
                background: inputMode === 'nucleotide' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                borderColor: inputMode === 'nucleotide' ? 'var(--accent-emerald)' : 'var(--border-color)',
                color: inputMode === 'nucleotide' ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                fontWeight: inputMode === 'nucleotide' ? 700 : 500,
                fontSize: '0.85rem'
              }}
              onClick={() => { setInputMode('nucleotide'); }}
            >
              <Dna size={15} /> DNA / RNA Sequence
            </button>

            <button
              className={`btn-secondary ${inputMode === 'protein' ? 'active' : ''}`}
              style={{
                background: inputMode === 'protein' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                borderColor: inputMode === 'protein' ? 'var(--accent-violet)' : 'var(--border-color)',
                color: inputMode === 'protein' ? 'var(--accent-violet)' : 'var(--text-secondary)',
                fontWeight: inputMode === 'protein' ? 700 : 500,
                fontSize: '0.85rem'
              }}
              onClick={() => { setInputMode('protein'); }}
            >
              <Activity size={15} /> Protein Sequence
            </button>
          </div>

          {/* Quick Sample Demonstrators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>Samples:</span>
            {inputMode === 'accession' && (
              <>
                <button className="badge-btn" onClick={() => handleLoadSampleAccession('NC_000913.3')}>
                  NC_000913.3 (E. coli)
                </button>
                <button className="badge-btn" onClick={() => handleLoadSampleAccession('NM_000546.6')}>
                  NM_000546.6 (TP53 mRNA)
                </button>
                <button className="badge-btn" onClick={() => handleLoadSampleAccession('NP_000537.3')}>
                  NP_000537.3 (TP53 Protein)
                </button>
              </>
            )}
            {inputMode === 'nucleotide' && (
              <>
                <button className="badge-btn" onClick={handleLoadSampleDna}>
                  DNA Exon (120 bp)
                </button>
                <button className="badge-btn" onClick={handleLoadSampleRna}>
                  RNA tRNA (75 nt)
                </button>
              </>
            )}
            {inputMode === 'protein' && (
              <button className="badge-btn" onClick={handleLoadSampleProtein}>
                TP53 Peptide (60 aa)
              </button>
            )}
          </div>
        </div>

        {/* MODE A: ACCESSION SEARCH WORKSPACE */}
        {inputMode === 'accession' && (
          <div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
              <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter NCBI Accession (e.g., NC_000913.3, NM_000546.6, NP_000537.3, P04637)..."
                  value={accessionQuery}
                  onChange={(e) => setAccessionQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRetrieveAccession(); }}
                  style={{ paddingLeft: '36px', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}
                />
                <Database size={16} color="var(--accent-cyan)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>

              <button 
                className="btn-primary" 
                onClick={() => handleRetrieveAccession()}
                disabled={accessionLoading || !accessionQuery.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {accessionLoading ? <RefreshCw size={15} className="spin-slow" /> : <Search size={15} />}
                <span>{accessionLoading ? 'Retrieving Entrez Record...' : 'Retrieve & Analyze'}</span>
              </button>

              <button className="btn-secondary" onClick={() => { setAccessionQuery(''); setRetrievedRecord(null); setAccessionError(''); }}>
                Clear
              </button>
            </div>

            {/* Error Banner */}
            {accessionError && (
              <div style={{ background: 'rgba(244, 63, 94, 0.12)', border: '1px solid var(--accent-rose)', borderRadius: '8px', padding: '12px 16px', marginTop: '10px' }} className="page-fade-in">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-rose)', fontWeight: 700, fontSize: '0.88rem' }}>
                  <AlertTriangle size={16} /> Accession Retrieval Error
                </div>
                <p style={{ color: 'var(--text-primary)', fontSize: '0.83rem', margin: '6px 0 0', lineHeight: 1.5 }}>
                  {accessionError}
                </p>
                <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Note: BioNexus Studio never silently treats accession IDs as sequences. You can retry with a valid accession or switch to Sequence mode.
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE B & C: SEQUENCE EDITOR WORKSPACE */}
        {inputMode !== 'accession' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <span>
                {inputMode === 'nucleotide' ? 'Nucleotide Sequence (A, T, G, C, U or IUPAC codes) or FASTA:' : 'Protein Sequence (20 standard amino acids + IUPAC extensions) or FASTA:'}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-text-sm" onClick={handlePasteClipboard}>Paste Clipboard</button>
                <button className="btn-text-sm" onClick={() => setSequenceInput('')}>Clear</button>
              </div>
            </div>

            <textarea
              className="textarea-field"
              rows={4}
              placeholder={inputMode === 'nucleotide' ? 'Paste DNA/RNA FASTA or raw nucleotide sequence...' : 'Paste Protein FASTA or raw amino acid sequence...'}
              value={sequenceInput}
              onChange={(e) => setSequenceInput(e.target.value)}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.86rem', lineHeight: 1.5 }}
            />

            {/* Nucleotide Molecule Selector (if ambiguous) */}
            {inputMode === 'nucleotide' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Molecule Mode:</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: rnaPreference === 'auto' ? 'var(--accent-cyan)' : 'inherit' }}>
                    <input type="radio" name="rnaPref" checked={rnaPreference === 'auto'} onChange={() => setRnaPreference('auto')} /> Auto-Detect
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: rnaPreference === 'DNA' ? 'var(--accent-cyan)' : 'inherit' }}>
                    <input type="radio" name="rnaPref" checked={rnaPreference === 'DNA'} onChange={() => setRnaPreference('DNA')} /> Force DNA
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: rnaPreference === 'RNA' ? 'var(--accent-cyan)' : 'inherit' }}>
                    <input type="radio" name="rnaPref" checked={rnaPreference === 'RNA'} onChange={() => setRnaPreference('RNA')} /> Force RNA
                  </label>
                </div>
                <span>{validationResult.length || 0} {inputMode === 'protein' ? 'residues' : 'bases'}</span>
              </div>
            )}

            {/* Validation Feedback Component */}
            <ValidationPanel validation={validationResult} mode={inputMode} />
          </div>
        )}
      </div>

      {/* AREA 3: RETRIEVED RECORD PANEL (When an accession record is active) */}
      {retrievedRecord && (
        <div className="glass-card page-fade-in" style={{ borderLeft: '4px solid var(--accent-cyan)', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(15, 23, 42, 0.6))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="logo-badge" style={{ background: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                  NCBI {retrievedRecord.database.toUpperCase()}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.05rem', color: '#ffffff' }}>
                  {retrievedRecord.accession}
                </span>
                <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600 }}>
                  <ShieldCheck size={14} /> Verified Entrez Record
                </span>
              </div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0' }}>
                {retrievedRecord.title}
              </h3>
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                <span>Organism: <strong style={{ color: 'var(--text-primary)' }}>{retrievedRecord.organism}</strong></span>
                <span>Type: <strong style={{ color: 'var(--accent-cyan)' }}>{retrievedRecord.moleculeType}</strong></span>
                <span>Length: <strong style={{ color: 'var(--text-primary)' }}>{retrievedRecord.length.toLocaleString()} {retrievedRecord.database === 'protein' ? 'aa' : 'nt'}</strong></span>
                {retrievedRecord.updateDate && <span>Updated: {retrievedRecord.updateDate}</span>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                onClick={() => setShowRetrievedSeq(!showRetrievedSeq)}
              >
                <Eye size={14} /> {showRetrievedSeq ? 'Hide Sequence' : 'Inspect Sequence'}
              </button>
              <button 
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                onClick={() => handleCopySequence(retrievedRecord.sequence)}
              >
                {copiedSeq ? <Check size={14} color="#10b981" /> : <Copy size={14} />} {copiedSeq ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Expandable Retrieved Sequence Drawer */}
          {showRetrievedSeq && (
            <div style={{ marginTop: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }} className="page-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <span>True Biological Sequence ({retrievedRecord.sequence.length.toLocaleString()} {retrievedRecord.database === 'protein' ? 'aa' : 'nt'})</span>
                <span>Pure Sequence (Header Excluded)</span>
              </div>
              <div className="sequence-box" style={{ maxHeight: '140px', overflowY: 'auto' }}>
                {retrievedRecord.sequence}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AREA 4: RESULTS WORKSPACE */}
      {analysisOutput && activeBiologicalData && (
        <div>
          {/* Navigation Subtabs */}
          <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px', overflowX: 'auto' }}>
            <button
              className={`nav-item ${activeResultTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveResultTab('overview')}
            >
              Overview
            </button>
            <button
              className={`nav-item ${activeResultTab === 'composition' ? 'active' : ''}`}
              onClick={() => setActiveResultTab('composition')}
            >
              Composition ({analysisOutput.isProtein ? 'Amino Acids' : 'Nucleotides'})
            </button>
            <button
              className={`nav-item ${activeResultTab === 'viewer' ? 'active' : ''}`}
              onClick={() => setActiveResultTab('viewer')}
            >
              Sequence Viewer
            </button>
            {analysisOutput.isNucleotide && (
              <button
                className={`nav-item ${activeResultTab === 'orfs' ? 'active' : ''}`}
                onClick={() => setActiveResultTab('orfs')}
              >
                6-Frame ORFs ({analysisOutput.orfs?.length || 0})
              </button>
            )}
            {analysisOutput.isNucleotide && (
              <button
                className={`nav-item ${activeResultTab === 'translation' ? 'active' : ''}`}
                onClick={() => setActiveResultTab('translation')}
                style={{ color: activeResultTab === 'translation' ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}
              >
                Translate to Protein
              </button>
            )}
            {analysisOutput.isProtein && (
              <button
                className={`nav-item ${activeResultTab === 'hydropathy' ? 'active' : ''}`}
                onClick={() => setActiveResultTab('hydropathy')}
              >
                Kyte-Doolittle Hydropathy
              </button>
            )}
            <button
              className={`nav-item ${activeResultTab === 'provenance' ? 'active' : ''}`}
              onClick={() => setActiveResultTab('provenance')}
            >
              Provenance & Audit
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeResultTab === 'overview' && (
            <div className="page-fade-in">
              {/* Primary Stat Cards */}
              {analysisOutput.isNucleotide ? (
                /* NUCLEOTIDE STATS ONLY */
                <div className="grid-4" style={{ marginBottom: '20px' }}>
                  <div className="stat-pill">
                    <div className="stat-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' }}>
                      <BarChart2 size={20} />
                    </div>
                    <div>
                      <div className="stat-value">{analysisOutput.stats.gcPercent}%</div>
                      <div className="stat-label">GC Content (Canonical)</div>
                    </div>
                  </div>

                  <div className="stat-pill">
                    <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)' }}>
                      <Dna size={20} />
                    </div>
                    <div>
                      <div className="stat-value">{analysisOutput.stats.length.toLocaleString()} nt</div>
                      <div className="stat-label">Sequence Length</div>
                    </div>
                  </div>

                  <div className="stat-pill">
                    <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' }}>
                      <Activity size={20} />
                    </div>
                    <div>
                      <div className="stat-value">
                        {analysisOutput.moleculeType === 'RNA' 
                          ? `${analysisOutput.stats.auPercent}%` 
                          : `${analysisOutput.stats.atPercent}%`}
                      </div>
                      <div className="stat-label">{analysisOutput.moleculeType === 'RNA' ? 'AU Content' : 'AT Content'}</div>
                    </div>
                  </div>

                  <div className="stat-pill">
                    <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-violet)' }}>
                      <Info size={20} />
                    </div>
                    <div>
                      <div className="stat-value">
                        {analysisOutput.stats.totalAmbiguous} ({analysisOutput.stats.ambiguousPercent}%)
                      </div>
                      <div className="stat-label">Ambiguous Bases (IUPAC)</div>
                    </div>
                  </div>
                </div>
              ) : (
                /* PROTEIN STATS ONLY */
                <div className="grid-4" style={{ marginBottom: '20px' }}>
                  <div className="stat-pill">
                    <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-violet)' }}>
                      <Activity size={20} />
                    </div>
                    <div>
                      <div className="stat-value">{analysisOutput.stats.mwKDa} kDa</div>
                      <div className="stat-label">Molecular Weight ({analysisOutput.stats.mwDa.toLocaleString()} Da)</div>
                    </div>
                  </div>

                  <div className="stat-pill">
                    <div className="stat-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' }}>
                      <BarChart2 size={20} />
                    </div>
                    <div>
                      <div className="stat-value">{analysisOutput.stats.pi}</div>
                      <div className="stat-label">Theoretical pI (Isoelectric)</div>
                    </div>
                  </div>

                  <div className="stat-pill">
                    <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)' }}>
                      <Dna size={20} />
                    </div>
                    <div>
                      <div className="stat-value">{analysisOutput.stats.length.toLocaleString()} aa</div>
                      <div className="stat-label">Total Amino Acids</div>
                    </div>
                  </div>

                  <div className="stat-pill">
                    <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' }}>
                      <Info size={20} />
                    </div>
                    <div>
                      <div className="stat-value">{analysisOutput.stats.gravy}</div>
                      <div className="stat-label">GRAVY Score (Hydropathy)</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Reverse Complement Box for DNA/RNA */}
              {analysisOutput.isNucleotide && (
                <div className="glass-card" style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 className="card-title" style={{ margin: 0 }}>
                      Reverse Complement (5' &rarr; 3')
                    </h3>
                    <button 
                      className="btn-secondary" 
                      style={{ fontSize: '0.78rem', padding: '4px 8px' }}
                      onClick={() => handleCopySequence(analysisOutput.revComp)}
                    >
                      {copiedSeq ? <Check size={13} color="#10b981" /> : <Copy size={13} />} Copy RevComp
                    </button>
                  </div>
                  <div className="sequence-box" style={{ maxHeight: '100px', overflowY: 'auto' }}>
                    {analysisOutput.revComp}
                  </div>
                </div>
              )}

              {/* Chemical Classification Cards for Protein */}
              {analysisOutput.isProtein && (
                <div className="glass-card" style={{ marginBottom: '20px' }}>
                  <h3 className="card-title" style={{ marginBottom: '12px' }}>
                    Residue Classification Breakdown
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#f87171' }}>Acidic (D, E)</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{analysisOutput.stats.groups.acidic.count}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{analysisOutput.stats.groups.acidic.percent}%</div>
                    </div>

                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#60a5fa' }}>Basic (K, R, H)</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{analysisOutput.stats.groups.basic.count}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{analysisOutput.stats.groups.basic.percent}%</div>
                    </div>

                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#34d399' }}>Neutral Polar</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{analysisOutput.stats.groups.neutralPolar.count}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{analysisOutput.stats.groups.neutralPolar.percent}%</div>
                    </div>

                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#fbbf24' }}>Hydrophobic Non-polar</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{analysisOutput.stats.groups.hydrophobic.count}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{analysisOutput.stats.groups.hydrophobic.percent}%</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COMPOSITION */}
          {activeResultTab === 'composition' && (
            <div className="page-fade-in glass-card">
              <h3 className="card-title" style={{ marginBottom: '14px' }}>
                {analysisOutput.isProtein ? 'Amino Acid Composition Profile' : 'Nucleotide Frequency & Base Counts'}
              </h3>

              {analysisOutput.isNucleotide ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                    {Object.entries(analysisOutput.stats.counts).map(([base, count]) => {
                      const total = analysisOutput.stats.length || 1;
                      const pct = ((count / total) * 100).toFixed(2);
                      return (
                        <div key={base} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>{base}</div>
                          <div style={{ fontSize: '1rem', fontWeight: 700 }}>{count.toLocaleString()}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pct}%</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Ambiguous IUPAC Breakdown if present */}
                  {analysisOutput.stats.totalAmbiguous > 0 && (
                    <div style={{ marginTop: '16px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-amber)', marginBottom: '8px' }}>
                        IUPAC Ambiguous Base Distribution ({analysisOutput.stats.totalAmbiguous} bases)
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {Object.entries(analysisOutput.stats.ambiguousCounts).filter(([_, c]) => c > 0).map(([code, count]) => (
                          <span key={code} style={{ background: 'rgba(0,0,0,0.4)', padding: '4px 8px', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                            <strong>{code}</strong>: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                  {analysisOutput.stats.composition.map(item => (
                    <div key={item.aa} style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--accent-violet)' }}>{item.aa}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.name}</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '2px' }}>{item.count} ({item.percent}%)</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SEQUENCE VIEWER */}
          {activeResultTab === 'viewer' && (
            <div className="page-fade-in glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 className="card-title" style={{ margin: 0 }}>Formatted Biological Sequence</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => handleCopySequence(activeBiologicalData.sequence)}>
                    {copiedSeq ? <Check size={14} color="#10b981" /> : <Copy size={14} />} Copy Sequence
                  </button>
                  <button className="btn-secondary" style={{ fontSize: '0.8rem' }} onClick={handleDownloadFasta}>
                    <Download size={14} /> Download FASTA
                  </button>
                </div>
              </div>

              {/* Formatted Block Display (60 chars per row, 10-char blocks) */}
              <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: 1.8, overflowX: 'auto' }}>
                {activeBiologicalData.sequence.match(/.{1,60}/g)?.map((row, rowIdx) => {
                  const startCoord = rowIdx * 60 + 1;
                  const chunks = row.match(/.{1,10}/g) || [];
                  return (
                    <div key={rowIdx} style={{ display: 'flex', gap: '16px' }}>
                      <span style={{ color: 'var(--text-muted)', width: '60px', textAlign: 'right', userSelect: 'none' }}>
                        {startCoord}
                      </span>
                      <span style={{ color: 'var(--text-primary)', letterSpacing: '1px' }}>
                        {chunks.join(' ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: 6-FRAME ORFS (DNA/RNA ONLY) */}
          {activeResultTab === 'orfs' && analysisOutput.isNucleotide && (
            <div className="page-fade-in glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <h3 className="card-title" style={{ margin: 0 }}>6-Frame Open Reading Frame (ORF) Finder</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '4px 0 0' }}>
                    Scans 3 forward (+1, +2, +3) and 3 reverse (-1, -2, -3) frames from ATG/AUG start to stop codons.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Min Codons:</span>
                  <input
                    type="number"
                    className="input-field"
                    value={minOrfCodons}
                    onChange={(e) => setMinOrfCodons(e.target.value)}
                    style={{ width: '70px', padding: '4px 8px' }}
                    min={5}
                  />
                </div>
              </div>

              {analysisOutput.orfs.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No candidate ORFs found exceeding minimum length ({minOrfCodons} codons).
                </p>
              ) : (
                <div className="table-container">
                  <table className="bio-table">
                    <thead>
                      <tr>
                        <th>Frame</th>
                        <th>Strand</th>
                        <th>Start (bp)</th>
                        <th>End (bp)</th>
                        <th>Length (DNA / AA)</th>
                        <th>Translated Peptide (5'-3')</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisOutput.orfs.map((orf, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 800, color: 'var(--accent-cyan)' }}>{orf.frame}</td>
                          <td>{orf.isReverse ? 'Reverse (-)' : 'Forward (+)'}</td>
                          <td>{orf.start}</td>
                          <td>{orf.end}</td>
                          <td>{orf.lengthDna} bp / {orf.lengthAa} aa</td>
                          <td style={{ fontFamily: 'var(--font-mono)', color: '#34d399', fontSize: '0.82rem' }}>
                            {orf.aaSeq.slice(0, 35)}{orf.aaSeq.length > 35 ? '...' : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: TRANSLATE TO PROTEIN (NUCLEOTIDE ONLY - EXPLICIT USER ACTION) */}
          {activeResultTab === 'translation' && analysisOutput.isNucleotide && (
            <div className="page-fade-in glass-card">
              <div className="card-header" style={{ marginBottom: '14px' }}>
                <div>
                  <h3 className="card-title" style={{ margin: 0 }}>Translate to Protein</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '4px 0 0' }}>
                    Translates the biological nucleotide sequence with explicit frame, strand, and genetic code selection.
                  </p>
                </div>

                <button 
                  className="btn-secondary" 
                  style={{ fontSize: '0.8rem' }}
                  onClick={() => {
                    handleCopySequence(analysisOutput.translation?.peptide);
                    setCopiedTrans(true);
                    setTimeout(() => setCopiedTrans(false), 2000);
                  }}
                >
                  {copiedTrans ? <Check size={14} color="#10b981" /> : <Copy size={14} />} Copy Peptide
                </button>
              </div>

              {/* Translation Controls Bar */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Strand</label>
                  <select className="select-field" value={transStrand} onChange={(e) => setTransStrand(e.target.value)}>
                    <option value="+">Forward (+)</option>
                    <option value="-">Reverse Complement (-)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Reading Frame</label>
                  <select className="select-field" value={transFrame} onChange={(e) => setTransFrame(Number(e.target.value))}>
                    <option value={1}>Frame 1 (+0 offset)</option>
                    <option value={2}>Frame 2 (+1 offset)</option>
                    <option value={3}>Frame 3 (+2 offset)</option>
                  </select>
                </div>

                <div style={{ flex: 1, minWidth: '220px' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Genetic Code</label>
                  <select className="select-field" value={transCode} onChange={(e) => setTransCode(e.target.value)}>
                    {Object.values(GENETIC_CODES).map(code => (
                      <option key={code.id} value={code.id}>{code.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Peptide Result */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                  <span>Translated Peptide: <strong>{analysisOutput.translation?.length || 0} residues</strong></span>
                  <span>Stop Codons (*): <strong style={{ color: 'var(--accent-rose)' }}>{analysisOutput.translation?.stopCodonCount || 0}</strong></span>
                </div>
                <div className="sequence-box" style={{ maxHeight: '180px', overflowY: 'auto', color: '#34d399' }}>
                  {analysisOutput.translation?.peptide || 'No peptide generated.'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: HYDROPATHY (PROTEIN ONLY) */}
          {activeResultTab === 'hydropathy' && analysisOutput.isProtein && (
            <div className="page-fade-in glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 className="card-title" style={{ margin: 0 }}>Kyte-Doolittle Hydropathy Profile</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '4px 0 0' }}>
                    Sliding-window evaluation of hydrophobic regions (&gt; 0) and hydrophilic regions (&lt; 0).
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Window Size:</span>
                  <select className="select-field" value={kdWindowSize} onChange={(e) => setKdWindowSize(Number(e.target.value))}>
                    <option value={5}>5 Residues</option>
                    <option value={7}>7 Residues (Default)</option>
                    <option value={9}>9 Residues</option>
                    <option value={11}>11 Residues</option>
                  </select>
                </div>
              </div>

              {/* Mini table of scores */}
              <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table className="bio-table">
                  <thead>
                    <tr>
                      <th>Position</th>
                      <th>Central Residue</th>
                      <th>Hydropathy Score</th>
                      <th>Characteristic</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisOutput.kdProfile.slice(0, 50).map(pt => (
                      <tr key={pt.position}>
                        <td>{pt.position}</td>
                        <td style={{ fontWeight: 800, color: 'var(--accent-cyan)' }}>{pt.residue}</td>
                        <td style={{ fontWeight: 700, color: pt.score > 0 ? '#f59e0b' : '#3b82f6' }}>{pt.score}</td>
                        <td style={{ fontSize: '0.8rem' }}>{pt.score > 0 ? 'Hydrophobic / Membrane' : 'Hydrophilic / Surface'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {analysisOutput.kdProfile.length > 50 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
                  Showing first 50 window centers of {analysisOutput.kdProfile.length} total.
                </div>
              )}
            </div>
          )}

          {/* TAB 7: PROVENANCE & AUDIT */}
          {activeResultTab === 'provenance' && (
            <div className="page-fade-in glass-card">
              <h3 className="card-title" style={{ marginBottom: '14px' }}>
                Record Provenance & Computation Audit
              </h3>
              <div className="grid-2" style={{ gap: '14px', fontSize: '0.85rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ color: 'var(--accent-cyan)', fontWeight: 700, marginBottom: '6px' }}>Input Specification</div>
                  <div>Mode: <strong>{inputMode.toUpperCase()}</strong></div>
                  <div>Molecule Type: <strong>{activeBiologicalData.moleculeType}</strong></div>
                  <div>Source: <strong>{activeBiologicalData.isAccession ? 'NCBI Entrez API' : 'User Sequence Input'}</strong></div>
                  {activeBiologicalData.record && (
                    <>
                      <div>Accession UID: {activeBiologicalData.record.uid}</div>
                      <div>Target Database: {activeBiologicalData.record.database}</div>
                    </>
                  )}
                </div>

                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ color: 'var(--accent-emerald)', fontWeight: 700, marginBottom: '6px' }}>Normalization & Calculation Basis</div>
                  <div>FASTA Headers: Excluded from computation</div>
                  <div>Ambiguity Handling: Strict IUPAC classification</div>
                  <div>Calculated At: {new Date().toISOString()}</div>
                  <div>Engine: BioNexus Scientific v2.5.0</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AREA 5: SCIENTIFIC DETAILS & DOCUMENTATION PANEL */}
      <div className="glass-card" style={{ borderTop: '2px solid var(--accent-violet)', marginTop: '8px' }}>
        <div 
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => setDetailsExpanded(!detailsExpanded)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.92rem' }}>
            <Info size={17} color="var(--accent-violet)" />
            <span>Scientific Calculation Methods, Formulas & Documentation</span>
          </div>
          {detailsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>

        {detailsExpanded && (
          <div className="page-fade-in" style={{ marginTop: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '12px', fontSize: '0.83rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            <div className="grid-2" style={{ gap: '20px' }}>
              <div>
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>GC Content Calculation</h4>
                <p style={{ marginBottom: '10px' }}>
                  Calculated as \(\frac{G + C}{A + C + G + T/U} \times 100\) over canonical bases. Ambiguous IUPAC bases (N, R, Y, etc.) are excluded from the canonical denominator and reported separately to prevent dilution artifacts.
                </p>

                <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Protein Molecular Weight</h4>
                <p>
                  Computed from standard average isotopic residue masses in a polypeptide chain plus 18.015 Da representing the terminal hydrogen (-H) at the N-terminus and hydroxyl group (-OH) at the C-terminus.
                </p>
              </div>

              <div>
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Theoretical Isoelectric Point (pI)</h4>
                <p style={{ marginBottom: '10px' }}>
                  Estimated via iterative bisection charge minimization across the pH 0.00 to 14.00 continuum using the Henderson-Hasselbalch equation and Bjellqvist / EMBOSS standard pKa values for the terminal carboxyl, amino, and seven ionizable side chains.
                </p>

                <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>NCBI Entrez Accession Discipline</h4>
                <p>
                  NCBI Accession strings are strictly validated and queried against remote Entrez E-utilities (nucleotide or protein databases). Accession identifiers are never counted, parsed, or treated as biological sequences.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
