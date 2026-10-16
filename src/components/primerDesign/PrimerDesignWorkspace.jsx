import React, { useState, useEffect, useMemo } from 'react';
import './primerDesignTheme.css';
import PrimerTopBar from './PrimerTopBar';
import SequenceInputPane from './SequenceInputPane';
import SequenceMapPane from './SequenceMapPane';
import SelectedPairPane from './SelectedPairPane';
import CandidateTablePanel from './CandidateTablePanel';
import UpdatesModal from '../UpdatesModal';

import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  PRIMER_PRESETS, 
  designPrimersWithPrimer3, 
  checkPrimerSpecificity 
} from '../../utils/primerEngine';
import { cleanSequence } from '../../utils/sequenceEngine';
import { validateDnaSequence } from '../../utils/sequenceValidator';
import { searchNcbi, fetchFasta, parseFastaHeader } from '../../utils/ncbiService';

// Default representative TP53 reference sequence (Exon 4-5 cDNA region) for instant workflow testing
const DEFAULT_DEMO_SEQUENCE = 'ATGGAGGAGCCGCAGTCAGATCCTAGCGTCGAGCCCCCTCTGAGTCAGGAAACATTTTCAGACCTATGGAAACTACTTCCTGAAAACAACGTTCTGTCCCCCTTGCCGTCCCAAGCAATGGATGATTTGATGCTGTCCCCGGACGATATTGAACAATGGTTCACTGAAGACCCAGGTCCAGATGAAGCTCCCAGAATGCCAGAGGCTGCTCCCCGCGTGGCCCCTGCACCAGCAGCTCCTACACCGGCGGCCCCTGCACCAGCCCCCTCCTGGCCCCTGTCATCT';

export default function PrimerDesignWorkspace() {
  const { activeSequenceObj, setGlobalActiveSequence } = useWorkspace();

  // Theme State
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('bionexus_pd_theme') || 'dark';
  });

  // Updates Modal State
  const [updatesOpen, setUpdatesOpen] = useState(false);

  // Sequence State
  const [sequence, setSequence] = useState(() => {
    if (activeSequenceObj && activeSequenceObj.sequence) {
      return cleanSequence(activeSequenceObj.sequence);
    }
    return DEFAULT_DEMO_SEQUENCE;
  });

  const [sequenceName, setSequenceName] = useState(() => {
    if (activeSequenceObj && activeSequenceObj.name) {
      return activeSequenceObj.name;
    }
    return 'Human TP53 Target Region';
  });

  // Accession Search State
  const [accessionInput, setAccessionInput] = useState('');
  const [loadingAccession, setLoadingAccession] = useState(false);
  const [accessionError, setAccessionError] = useState('');

  // Target and Excluded Region Coordinates (1-based for user entry)
  const [targetRegion, setTargetRegion] = useState(null); // { start, len }
  const [excludedRegion, setExcludedRegion] = useState(null); // { start, len }

  // Application Preset & Settings State
  const [activePreset, setActivePreset] = useState('pcr');
  const [settings, setSettings] = useState(() => ({ ...PRIMER_PRESETS.pcr, numReturn: 10 }));

  // Results State
  const [isDesigning, setIsDesigning] = useState(false);
  const [designError, setDesignError] = useState('');
  const [pairs, setPairs] = useState(null);
  const [selectedPair, setSelectedPair] = useState(null);
  const [engineProvenance, setEngineProvenance] = useState('Primer3 C Library v2.3.1');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Specificity State
  const [specificityResult, setSpecificityResult] = useState(null);
  const [loadingSpecificity, setLoadingSpecificity] = useState(false);

  // Bottom Panel Size State ('compact', 'default', 'expanded')
  const [panelHeight, setPanelHeight] = useState('default');

  // Sync theme
  useEffect(() => {
    localStorage.setItem('bionexus_pd_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // SEO & Document Title
  useEffect(() => {
    document.title = 'Primer Design Workspace — BioNexus Studio';
  }, []);

  // Preset Selection Handler
  const handleSelectPreset = (presetId) => {
    const preset = PRIMER_PRESETS[presetId];
    if (preset) {
      setActivePreset(presetId);
      setSettings(prev => ({
        ...prev,
        ...preset,
        numReturn: prev.numReturn || 10
      }));
    }
  };

  // Sequence Validation (Memoized)
  const validation = useMemo(() => {
    if (!sequence) {
      return { isValid: false, error: 'Sequence is empty', gcPercent: 0, ambiguousCount: 0 };
    }
    const clean = cleanSequence(sequence);
    if (clean.length < 30) {
      return { isValid: false, error: 'Sequence too short (minimum 30 bp required)', gcPercent: 0, ambiguousCount: 0 };
    }
    const gcCount = (clean.match(/[GC]/g) || []).length;
    const gcPercent = parseFloat(((gcCount / clean.length) * 100).toFixed(1));
    const ambiguousCount = (clean.match(/[^ATGC]/g) || []).length;

    return {
      isValid: true,
      error: '',
      gcPercent,
      ambiguousCount
    };
  }, [sequence]);

  // Fetch from NCBI Accession
  const handleFetchAccession = async () => {
    const raw = accessionInput.trim();
    if (!raw) return;

    setLoadingAccession(true);
    setAccessionError('');

    try {
      // 1. Check if backend proxy endpoint is reachable
      const proxyRes = await fetch(`/api/ncbi/resolve-accession?accession=${encodeURIComponent(raw)}`);
      if (proxyRes.ok) {
        const data = await proxyRes.json();
        if (data && data.biologicalSequence) {
          const cleaned = cleanSequence(data.biologicalSequence);
          setSequence(cleaned);
          setSequenceName(data.title || data.accession || raw);
          setGlobalActiveSequence(cleaned, data.title || raw);
          setLoadingAccession(false);
          return;
        }
      }
    } catch {
      // Fallback to direct client NCBI E-Utilities
    }

    try {
      let idToFetch = raw;
      const isDirectAcc = /^[A-Z]{1,4}_[0-9]+(\.[0-9]+)?$/i.test(raw) || /^[0-9]+$/.test(raw);
      if (!isDirectAcc) {
        const sRes = await searchNcbi('nucleotide', `${raw} mRNA[Filter] OR ${raw}[Title]`, 1);
        if (sRes && sRes.ids && sRes.ids.length > 0) {
          idToFetch = sRes.ids[0];
        }
      }

      const fastaRaw = await fetchFasta('nucleotide', idToFetch);
      if (fastaRaw && fastaRaw.includes('>')) {
        const lines = fastaRaw.split('\n');
        const header = lines[0].replace('>', '').trim();
        const body = lines.slice(1).join('');
        const cleaned = cleanSequence(body);
        setSequence(cleaned);
        const parsed = parseFastaHeader(header);
        setSequenceName(parsed.title || header.split(/\s+/)[0]);
        setGlobalActiveSequence(cleaned, parsed.title || header);
      } else {
        setAccessionError(`Record '${raw}' returned empty sequence.`);
      }
    } catch (err) {
      setAccessionError(`Failed to fetch accession: ${err.message}`);
    } finally {
      setLoadingAccession(false);
    }
  };

  // Run Primer Design
  const handleRunDesign = async () => {
    if (!validation.isValid || isDesigning) return;

    setIsDesigning(true);
    setDesignError('');
    setSpecificityResult(null);

    try {
      const designPayload = {
        sequence,
        id: sequenceName || 'BioNexus_Target',
        targetRegion: targetRegion ? [targetRegion.start - 1, targetRegion.len] : null,
        excludedRegion: excludedRegion ? [excludedRegion.start - 1, excludedRegion.len] : null,
        minLen: settings.minLen,
        optLen: settings.optLen,
        maxLen: settings.maxLen,
        minTm: settings.minTm,
        optTm: settings.optTm,
        maxTm: settings.maxTm,
        maxTmDiff: settings.maxTmDiff,
        minGc: settings.minGc,
        maxGc: settings.maxGc,
        minProductSize: settings.minProductSize,
        maxProductSize: settings.maxProductSize,
        numReturn: settings.numReturn || 10,
        mvConc: settings.mvConc || 50.0,
        dvConc: settings.dvConc || 1.5,
        dnaConc: settings.dnaConc || 50.0,
        dntpConc: settings.dntpConc || 0.8
      };

      const result = await designPrimersWithPrimer3(designPayload);

      if (result && result.success && Array.isArray(result.pairs) && result.pairs.length > 0) {
        setPairs(result.pairs);
        setSelectedPair(result.pairs[0]);
        setEngineProvenance(result.engine || 'Primer3 C Library v2.3.1');
      } else {
        setPairs([]);
        setSelectedPair(null);
        setDesignError(result.error || 'No primer pairs found meeting the configured constraints. Try broadening Tm or product size limits.');
      }
    } catch (err) {
      console.error('Design invocation error:', err);
      setDesignError(`Design computation failed: ${err.message}`);
    } finally {
      setIsDesigning(false);
    }
  };

  // Specificity Check Handler
  const handleRunSpecificityCheck = async () => {
    if (!selectedPair || !sequence || loadingSpecificity) return;

    setLoadingSpecificity(true);
    try {
      const res = await checkPrimerSpecificity(
        sequence,
        selectedPair.forward.sequence,
        selectedPair.reverse.sequence
      );
      setSpecificityResult(res);
    } catch (err) {
      console.error('Specificity check failed:', err);
      setSpecificityResult({
        status: 'failed',
        error: err.message
      });
    } finally {
      setLoadingSpecificity(false);
    }
  };

  // Save to Workspace
  const handleSaveToWorkspace = () => {
    if (!selectedPair) return;
    try {
      const stored = localStorage.getItem('bionexus_primers');
      const list = stored ? JSON.parse(stored) : [];
      const newRecord = {
        id: `primer_${Date.now()}`,
        name: `${sequenceName || 'Target'} - Candidate #${selectedPair.rank}`,
        forward: selectedPair.forward,
        reverse: selectedPair.reverse,
        productLength: selectedPair.amplicon?.size || selectedPair.productLength,
        tmDiff: selectedPair.tmDiff,
        recommendedTa: selectedPair.recommendedTa,
        score: selectedPair.pairPenalty || selectedPair.score,
        engine: engineProvenance,
        date: new Date().toLocaleDateString(),
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('bionexus_primers', JSON.stringify([newRecord, ...list]));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save primer to workspace:', err);
    }
  };

  // Trigger design automatically on initial render if demo sequence is loaded
  useEffect(() => {
    if (sequence && !pairs && !isDesigning) {
      handleRunDesign();
    }
  }, []);

  return (
    <div className="pd-workspace" data-pd-theme={theme}>
      {/* Top Bar */}
      <PrimerTopBar
        sequenceName={sequenceName}
        theme={theme}
        toggleTheme={toggleTheme}
        isDesigning={isDesigning}
        onRunDesign={handleRunDesign}
        canDesign={validation.isValid}
        pairs={pairs}
        selectedPair={selectedPair}
        activePreset={activePreset}
        onSelectPreset={handleSelectPreset}
        onSaveToWorkspace={handleSaveToWorkspace}
        templateSequence={sequence}
        engineProvenance={engineProvenance}
        saveSuccess={saveSuccess}
        onOpenUpdates={() => setUpdatesOpen(true)}
      />

      {/* Main 3-Pane Area */}
      <div className="pd-main-grid">
        {/* Left: Sequence Input & Settings */}
        <SequenceInputPane
          sequence={sequence}
          setSequence={setSequence}
          sequenceName={sequenceName}
          setSequenceName={setSequenceName}
          accessionInput={accessionInput}
          setAccessionInput={setAccessionInput}
          loadingAccession={loadingAccession}
          onFetchAccession={handleFetchAccession}
          accessionError={accessionError}
          targetRegion={targetRegion}
          setTargetRegion={setTargetRegion}
          excludedRegion={excludedRegion}
          setExcludedRegion={setExcludedRegion}
          settings={settings}
          setSettings={setSettings}
          validation={validation}
        />

        {/* Center: Interactive Sequence Map & Amplicon Viewer */}
        <SequenceMapPane
          sequence={sequence}
          sequenceName={sequenceName}
          targetRegion={targetRegion}
          excludedRegion={excludedRegion}
          selectedPair={selectedPair}
          allPairs={pairs}
          onSelectPair={setSelectedPair}
        />

        {/* Right: Selected Pair Details */}
        <SelectedPairPane
          selectedPair={selectedPair}
          engineProvenance={engineProvenance}
          onRunSpecificityCheck={handleRunSpecificityCheck}
          specificityResult={specificityResult}
          loadingSpecificity={loadingSpecificity}
        />
      </div>

      {/* Bottom Panel: Candidate Table + Multi-Tab Panel */}
      <CandidateTablePanel
        pairs={pairs}
        selectedPair={selectedPair}
        onSelectPair={setSelectedPair}
        engineProvenance={engineProvenance}
        templateSequence={sequence}
        settings={settings}
        specificityResult={specificityResult}
        loadingSpecificity={loadingSpecificity}
        onRunSpecificityCheck={handleRunSpecificityCheck}
        panelHeight={panelHeight}
        setPanelHeight={setPanelHeight}
      />

      <UpdatesModal
        isOpen={updatesOpen}
        onClose={() => setUpdatesOpen(false)}
        setActiveTab={(tab) => {
          window.location.href = tab === 'home' ? '/' : `/${tab}`;
        }}
      />
    </div>
  );
}
