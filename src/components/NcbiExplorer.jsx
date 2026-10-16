import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Database, Search, Eye, RefreshCw, Dna, ArrowRight, Binary, 
  Scissors, Zap, Pin, Info, CheckCircle2, Globe, Gauge, 
  ExternalLink, Layers, Boxes, GitFork, AlertTriangle, Filter, 
  Check, Copy, ShieldCheck, Sliders, Moon, Sun, Minimize2, 
  Maximize2, X, ChevronDown, ChevronRight, Share2 
} from 'lucide-react';
import { 
  classifyQuery, 
  searchAllDatabases, 
  searchNcbiDatabase, 
  searchUniProtDatabase, 
  searchEnaDatabase, 
  calculateContrastRatio,
  NCBI_API_KEY,
  NCBI_RATE_LIMIT
} from '../services/bioDatabaseService';
import { useWorkspace } from '../context/WorkspaceContext';

import RecordDetailModal from './bioExplorer/RecordDetailModal';
import BioCompareModal from './bioExplorer/BioCompareModal';
import PinnedRecordsTray from './bioExplorer/PinnedRecordsTray';
import ProvenanceDrawer from './bioExplorer/ProvenanceDrawer';
import CommandPaletteModal from './bioExplorer/CommandPaletteModal';

export default function NcbiExplorer({ globalSearch, setActiveTab }) {
  const { 
    setGlobalActiveSequence, 
    saveToSequenceLibrary, 
    registerScientificObject, 
    inspectObjectInSpace 
  } = useWorkspace();

  // Search Input State
  const [query, setQuery] = useState(globalSearch || '');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('auto'); // 'auto' | 'gene' | 'nucleotide' | 'protein' | 'organism' | 'accession'
  const [activeSourceTab, setActiveSourceTab] = useState('all'); // 'all' | 'ncbi' | 'uniprot' | 'ena'
  const [organismFilter, setOrganismFilter] = useState('');
  const [limit, setLimit] = useState(15);
  const [groupBy, setGroupBy] = useState('source'); // 'source' | 'type'

  // Results State
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResponse, setSearchResponse] = useState({
    query: '',
    sources: {
      ncbi: { status: 'idle', records: [], total: 0, latencyMs: null, error: null },
      uniprot: { status: 'idle', records: [], total: 0, latencyMs: null, error: null },
      ena: { status: 'idle', records: [], total: 0, latencyMs: null, error: null }
    },
    allRecords: [],
    counts: { total: 0, ncbi: 0, uniprot: 0, ena: 0 },
    isPartial: false,
    failedSources: []
  });

  // Facet filtering in sidebar
  const [facetFilters, setFacetFilters] = useState({
    organism: 'all',
    recordType: 'all',
    curation: 'all',
    moleculeType: 'all'
  });
  const [facetSidebarOpen, setFacetSidebarOpen] = useState(false);

  // UI Workbench Polish State
  const [density, setDensity] = useState('comfortable'); // 'comfortable' | 'compact'
  const [copiedAccId, setCopiedAccId] = useState(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Modals & Panels State
  const [selectedDetailRecord, setSelectedDetailRecord] = useState(null);
  const [provenanceRecord, setProvenanceRecord] = useState(null);
  const [pinnedRecords, setPinnedRecords] = useState(() => {
    try {
      const stored = localStorage.getItem('bionexus_pinned_records');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  // Search History State
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const stored = localStorage.getItem('bionexus_search_history');
      return stored ? JSON.parse(stored) : ['BRCA1', 'TP53', 'Homo sapiens'];
    } catch {
      return ['BRCA1', 'TP53', 'Homo sapiens'];
    }
  });

  // Contrast Verification check (automated WCAG AA 4.5:1 check)
  const contrastCheck = useMemo(() => {
    // Check contrast between UI text (#e2e8f0) and navy card background (#131e34)
    return calculateContrastRatio('#e2e8f0', '#131e34');
  }, []);

  // Sync Pinned Records to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('bionexus_pinned_records', JSON.stringify(pinnedRecords));
    } catch {}
  }, [pinnedRecords]);

  // Sync Search History to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('bionexus_search_history', JSON.stringify(searchHistory));
    } catch {}
  }, [searchHistory]);

  // URL State Synchronization (Shareable Search State)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const qParam = params.get('q');
    const tabParam = params.get('tab');
    const typeParam = params.get('type');
    const orgParam = params.get('org');

    if (qParam && qParam !== query) {
      setQuery(qParam);
      if (tabParam) setActiveSourceTab(tabParam);
      if (typeParam) setSelectedTypeFilter(typeParam);
      if (orgParam) setOrganismFilter(orgParam);
      executeSearch(qParam, {
        sourceTab: tabParam || 'all',
        typeFilter: typeParam || 'auto',
        org: orgParam || ''
      });
    }
  }, []);

  const updateUrlState = (q, tab, type, org) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (q) url.searchParams.set('q', q);
    else url.searchParams.delete('q');

    if (tab && tab !== 'all') url.searchParams.set('tab', tab);
    else url.searchParams.delete('tab');

    if (type && type !== 'auto') url.searchParams.set('type', type);
    else url.searchParams.delete('type');

    if (org) url.searchParams.set('org', org);
    else url.searchParams.delete('org');

    window.history.replaceState({}, '', url.toString());
  };

  // Keyboard shortcut listener for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Live Query Understanding Classification
  const queryClassification = useMemo(() => {
    return classifyQuery(query);
  }, [query]);

  // Execute Search
  const executeSearch = async (searchTerm, overrides = {}) => {
    const term = (typeof searchTerm === 'string' ? searchTerm : query).trim();
    if (!term) return;

    const sourceTab = overrides.sourceTab !== undefined ? overrides.sourceTab : activeSourceTab;
    const typeFilter = overrides.typeFilter !== undefined ? overrides.typeFilter : selectedTypeFilter;
    const org = overrides.org !== undefined ? overrides.org : organismFilter;

    setLoading(true);
    setHasSearched(true);
    updateUrlState(term, sourceTab, typeFilter, org);

    // Save to search history (deduplicated, max 12)
    setSearchHistory(prev => [term, ...prev.filter(t => t.toLowerCase() !== term.toLowerCase())].slice(0, 12));

    try {
      const response = await searchAllDatabases(term, {
        activeSource: sourceTab,
        recordType: typeFilter === 'auto' ? 'all' : typeFilter,
        organism: org,
        limit
      });

      setSearchResponse(response);
    } catch (err) {
      console.error('Bio-Database Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Single Source Retry (One failed source never blocks others)
  const retrySource = async (providerId) => {
    if (!query) return;
    try {
      let res = null;
      if (providerId === 'ncbi') {
        res = await searchNcbiDatabase(query, {
          limit,
          recordType: selectedTypeFilter === 'auto' ? 'all' : selectedTypeFilter,
          organism: organismFilter
        });
      } else if (providerId === 'uniprot') {
        res = await searchUniProtDatabase(query, {
          limit,
          reviewedOnly: false,
          organism: organismFilter
        });
      } else if (providerId === 'ena') {
        res = await searchEnaDatabase(query, {
          limit,
          organism: organismFilter
        });
      }

      if (res) {
        setSearchResponse(prev => {
          const updatedSources = {
            ...prev.sources,
            [providerId]: {
              status: res.records.length > 0 ? 'results' : 'no_results',
              records: res.records,
              total: res.total,
              latencyMs: res.latencyMs,
              error: null,
              endpoint: res.endpoint
            }
          };

          const newAllRecords = [
            ...(updatedSources.ncbi?.records || []),
            ...(updatedSources.uniprot?.records || []),
            ...(updatedSources.ena?.records || [])
          ];

          const newFailed = prev.failedSources.filter(s => s !== providerId);

          return {
            ...prev,
            sources: updatedSources,
            allRecords: newAllRecords,
            counts: {
              total: newAllRecords.length,
              ncbi: updatedSources.ncbi.records.length,
              uniprot: updatedSources.uniprot.records.length,
              ena: updatedSources.ena.records.length,
              reportedTotals: {
                ncbi: updatedSources.ncbi.total,
                uniprot: updatedSources.uniprot.total,
                ena: updatedSources.ena.total
              }
            },
            isPartial: newFailed.length > 0,
            failedSources: newFailed
          };
        });
      }
    } catch (err) {
      alert(`Retry for ${providerId.toUpperCase()} failed: ${err.message}`);
    }
  };

  // Ambiguity Resolver Organism Chips (Extracted from real returned results)
  const realOrganisms = useMemo(() => {
    const orgMap = new Map();
    searchResponse.allRecords.forEach(r => {
      if (r.organism && r.organism !== 'Unknown organism' && r.organism !== 'Unspecified Organism') {
        orgMap.set(r.organism, (orgMap.get(r.organism) || 0) + 1);
      }
    });
    return Array.from(orgMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [searchResponse.allRecords]);

  // Facet Calculation (Computed only from loaded results)
  const computedFacets = useMemo(() => {
    const orgs = {};
    const types = {};
    const curations = {};
    const molecules = {};

    searchResponse.allRecords.forEach(r => {
      // Organism
      if (r.organism) {
        orgs[r.organism] = (orgs[r.organism] || 0) + 1;
      }
      // Record type
      if (r.recordType) {
        types[r.recordType] = (types[r.recordType] || 0) + 1;
      }
      // Curation status
      const cur = r.curationStatus || (r.source === 'NCBI' ? 'ncbi_curated' : 'ena_standard');
      curations[cur] = (curations[cur] || 0) + 1;
      // Molecule type
      if (r.moleculeType) {
        molecules[r.moleculeType] = (molecules[r.moleculeType] || 0) + 1;
      }
    });

    return { orgs, types, curations, molecules };
  }, [searchResponse.allRecords]);

  // Filtered Records based on Active Tab and Facet selections
  const displayedRecords = useMemo(() => {
    let list = searchResponse.allRecords;

    // Filter by Database Tab
    if (activeSourceTab === 'ncbi') {
      list = searchResponse.sources.ncbi.records;
    } else if (activeSourceTab === 'uniprot') {
      list = searchResponse.sources.uniprot.records;
    } else if (activeSourceTab === 'ena') {
      list = searchResponse.sources.ena.records;
    }

    // Apply Facet Filters
    return list.filter(r => {
      if (facetFilters.organism !== 'all' && r.organism !== facetFilters.organism) {
        return false;
      }
      if (facetFilters.recordType !== 'all' && r.recordType !== facetFilters.recordType) {
        return false;
      }
      if (facetFilters.curation !== 'all') {
        const cur = r.curationStatus || (r.source === 'NCBI' ? 'ncbi_curated' : 'ena_standard');
        if (cur !== facetFilters.curation) return false;
      }
      if (facetFilters.moleculeType !== 'all' && r.moleculeType !== facetFilters.moleculeType) {
        return false;
      }
      return true;
    });
  }, [searchResponse, activeSourceTab, facetFilters]);

  // Grouping for "All Sources" tab
  const groupedSections = useMemo(() => {
    if (activeSourceTab !== 'all') return null;

    if (groupBy === 'source') {
      return [
        {
          id: 'ncbi_group',
          title: 'NCBI Entrez (GenBank / RefSeq / Gene)',
          source: 'NCBI',
          color: '#2563eb',
          records: displayedRecords.filter(r => r.source === 'NCBI')
        },
        {
          id: 'uniprot_group',
          title: 'UniProt Knowledgebase (Swiss-Prot / TrEMBL)',
          source: 'UniProt',
          color: '#0d9488',
          records: displayedRecords.filter(r => r.source === 'UniProt')
        },
        {
          id: 'ena_group',
          title: 'European Nucleotide Archive (ENA / EMBL-Bank)',
          source: 'ENA',
          color: '#d97706',
          records: displayedRecords.filter(r => r.source === 'ENA')
        }
      ].filter(g => g.records.length > 0);
    } else {
      return [
        {
          id: 'gene_group',
          title: 'Gene Records',
          icon: GitFork,
          records: displayedRecords.filter(r => r.recordType === 'gene')
        },
        {
          id: 'protein_group',
          title: 'Protein Sequences & Structures',
          icon: Boxes,
          records: displayedRecords.filter(r => r.recordType === 'protein')
        },
        {
          id: 'nuc_group',
          title: 'Nucleotide Transcripts & Genomic DNA',
          icon: Dna,
          records: displayedRecords.filter(r => r.recordType === 'nucleotide')
        }
      ].filter(g => g.records.length > 0);
    }
  }, [activeSourceTab, groupBy, displayedRecords]);

  // Pinning Handler
  const togglePin = (rec) => {
    setPinnedRecords(prev => {
      const exists = prev.some(p => p.id === rec.id);
      if (exists) {
        return prev.filter(p => p.id !== rec.id);
      }
      if (prev.length >= 8) {
        alert('Pinned tray limit is 8 records. Please remove a record before pinning another.');
        return prev;
      }
      return [...prev, rec];
    });
  };

  const handleCopyAccession = (acc, id) => {
    navigator.clipboard.writeText(acc);
    setCopiedAccId(id);
    setTimeout(() => setCopiedAccId(null), 2000);
  };

  // Send to Tool Integration
  const handleSendToTool = (toolId, payload) => {
    if (toolId === 'protein') {
      const pdbId = payload.pdbId || (payload.pdbRefs?.[0]?.pdbId);
      if (pdbId) {
        inspectObjectInSpace({
          id: `struct_${pdbId}`,
          pdbId,
          type: 'structure',
          title: `PDB: ${pdbId}`
        }, 'protein');
        if (setActiveTab) setActiveTab('protein');
      }
      return;
    }

    if (toolId === 'primer') {
      window.open('/primer-design', '_blank');
      return;
    }

    if (payload.sequence) {
      const seqObj = {
        name: payload.geneSymbol || payload.accession || payload.title,
        accession: payload.accession,
        description: payload.description || payload.title,
        organism: payload.organism,
        sequence: payload.sequence,
        source: `${payload.source || 'Bio-Database'} Explorer`
      };
      setGlobalActiveSequence(seqObj);
      saveToSequenceLibrary(seqObj);
    }

    if (setActiveTab) {
      setActiveTab(toolId);
    }
  };

  // Save Pinned Collection to Project
  const handleSaveCollectionToProject = (collection) => {
    collection.forEach(rec => {
      registerScientificObject({
        id: `bionexus_${rec.source.toLowerCase()}_${rec.accession}`,
        name: rec.title || rec.accession,
        accession: rec.accession,
        organism: rec.organism,
        type: rec.recordType === 'protein' ? 'protein' : 'sequence',
        source: `${rec.source} Bio-Explorer`
      });
    });
  };

  return (
    <div className="page-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#cbd5e1' }}>
      {/* Top Workbench Header */}
      <div style={{
        background: '#0c1322',
        borderRadius: '12px',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid rgba(6, 182, 212, 0.35)',
              color: '#38bdf8',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.5px'
            }}>
              RESEARCH WORKBENCH
            </span>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={22} color="#06b6d4" /> Global Bio-Database Explorer
            </h1>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '4px 0 0' }}>
            Federated biological queries across NCBI Entrez, UniProt Knowledgebase, and European Nucleotide Archive (ENA).
          </p>
        </div>

        {/* Workbench Utility Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Automated Contrast Check Indicator */}
          <div 
            title={`Automated WCAG 2.1 AA Contrast Ratio Check: ${contrastCheck.ratio}:1 against workbench surfaces (${contrastCheck.standard})`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.74rem',
              color: '#34d399',
              fontWeight: 600
            }}
          >
            <ShieldCheck size={14} color="#10b981" />
            <span>Contrast {contrastCheck.ratio}:1 (WCAG AA)</span>
          </div>

          {/* NCBI Rate Limiter Queue Badge */}
          <div 
            title={NCBI_API_KEY 
              ? `NCBI Entrez API Key Active: Rate limit is unlocked to ${NCBI_RATE_LIMIT} requests/second with token-bucket queuing.` 
              : `NCBI Entrez Unauthenticated: Limit capped at ${NCBI_RATE_LIMIT} req/s. Add NCBI_API_KEY to backend .env to unlock 10 req/s.`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: NCBI_API_KEY ? 'rgba(56, 189, 248, 0.12)' : 'rgba(234, 179, 8, 0.12)',
              border: `1px solid ${NCBI_API_KEY ? 'rgba(56, 189, 248, 0.35)' : 'rgba(234, 179, 8, 0.35)'}`,
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.74rem',
              color: NCBI_API_KEY ? '#38bdf8' : '#facc15',
              fontWeight: 600
            }}
          >
            <Zap size={13} color={NCBI_API_KEY ? '#38bdf8' : '#facc15'} />
            <span>NCBI Queue: {NCBI_RATE_LIMIT} req/s {NCBI_API_KEY ? '(Key Active)' : '(3 req/s limit)'}</span>
          </div>

          {/* Density Switcher */}
          <button
            type="button"
            onClick={() => setDensity(density === 'comfortable' ? 'compact' : 'comfortable')}
            title="Toggle compact/comfortable density"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '0.76rem',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
          >
            {density === 'comfortable' ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span>{density === 'comfortable' ? 'Compact' : 'Comfortable'}</span>
          </button>

          {/* Command Palette Button (Ctrl+K) */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(6, 182, 212, 0.12)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              color: '#38bdf8',
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Sliders size={13} />
            <span>Command Palette</span>
            <kbd style={{
              background: 'rgba(6, 182, 212, 0.2)',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              borderRadius: '4px',
              padding: '1px 5px',
              fontSize: '0.68rem',
              marginLeft: '4px'
            }}>
              Ctrl+K
            </kbd>
          </button>
        </div>
      </div>

      {/* Source Health Strip (Real State Only - Never Fabricated) */}
      <div style={{
        background: '#090f1d',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '10px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '0.8rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
          <Gauge size={16} color="#06b6d4" />
          <span style={{ fontWeight: 600 }}>Source Connection Health:</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* NCBI Chip */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: searchResponse.sources.ncbi.status === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(37, 99, 235, 0.12)',
            border: `1px solid ${searchResponse.sources.ncbi.status === 'error' ? '#ef4444' : 'rgba(37, 99, 235, 0.3)'}`,
            padding: '3px 10px',
            borderRadius: '6px',
            fontSize: '0.76rem'
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: searchResponse.sources.ncbi.status === 'error' ? '#ef4444' : '#2563eb'
            }} />
            <strong style={{ color: '#f8fafc' }}>NCBI Entrez:</strong>
            <span style={{ color: searchResponse.sources.ncbi.status === 'error' ? '#ef4444' : '#94a3b8' }}>
              {searchResponse.sources.ncbi.status === 'searching' ? 'Searching...' :
                searchResponse.sources.ncbi.status === 'results' ? `${searchResponse.sources.ncbi.records.length} records (${searchResponse.sources.ncbi.latencyMs}ms)` :
                searchResponse.sources.ncbi.status === 'no_results' ? '0 records' :
                searchResponse.sources.ncbi.status === 'error' ? 'Connection Error' : 'Ready'}
            </span>
            {searchResponse.sources.ncbi.status === 'error' && (
              <button
                type="button"
                onClick={() => retrySource('ncbi')}
                style={{
                  background: 'transparent',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                  borderRadius: '4px',
                  padding: '1px 6px',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  marginLeft: '4px'
                }}
              >
                Retry
              </button>
            )}
          </div>

          {/* UniProt Chip */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: searchResponse.sources.uniprot.status === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(13, 148, 136, 0.12)',
            border: `1px solid ${searchResponse.sources.uniprot.status === 'error' ? '#ef4444' : 'rgba(13, 148, 136, 0.3)'}`,
            padding: '3px 10px',
            borderRadius: '6px',
            fontSize: '0.76rem'
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: searchResponse.sources.uniprot.status === 'error' ? '#ef4444' : '#0d9488'
            }} />
            <strong style={{ color: '#f8fafc' }}>UniProt KB:</strong>
            <span style={{ color: searchResponse.sources.uniprot.status === 'error' ? '#ef4444' : '#94a3b8' }}>
              {searchResponse.sources.uniprot.status === 'searching' ? 'Searching...' :
                searchResponse.sources.uniprot.status === 'results' ? `${searchResponse.sources.uniprot.records.length} records (${searchResponse.sources.uniprot.latencyMs}ms)` :
                searchResponse.sources.uniprot.status === 'no_results' ? '0 records' :
                searchResponse.sources.uniprot.status === 'error' ? 'Connection Error' : 'Ready'}
            </span>
            {searchResponse.sources.uniprot.status === 'error' && (
              <button
                type="button"
                onClick={() => retrySource('uniprot')}
                style={{
                  background: 'transparent',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                  borderRadius: '4px',
                  padding: '1px 6px',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  marginLeft: '4px'
                }}
              >
                Retry
              </button>
            )}
          </div>

          {/* ENA / EMBL Chip */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: searchResponse.sources.ena.status === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(217, 119, 6, 0.12)',
            border: `1px solid ${searchResponse.sources.ena.status === 'error' ? '#ef4444' : 'rgba(217, 119, 6, 0.3)'}`,
            padding: '3px 10px',
            borderRadius: '6px',
            fontSize: '0.76rem'
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: searchResponse.sources.ena.status === 'error' ? '#ef4444' : '#d97706'
            }} />
            <strong style={{ color: '#f8fafc' }}>ENA / EMBL:</strong>
            <span style={{ color: searchResponse.sources.ena.status === 'error' ? '#ef4444' : '#94a3b8' }}>
              {searchResponse.sources.ena.status === 'searching' ? 'Searching...' :
                searchResponse.sources.ena.status === 'results' ? `${searchResponse.sources.ena.records.length} records (${searchResponse.sources.ena.latencyMs}ms)` :
                searchResponse.sources.ena.status === 'no_results' ? '0 records' :
                searchResponse.sources.ena.status === 'error' ? 'Connection Error' : 'Ready'}
            </span>
            {searchResponse.sources.ena.status === 'error' && (
              <button
                type="button"
                onClick={() => retrySource('ena')}
                style={{
                  background: 'transparent',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                  borderRadius: '4px',
                  padding: '1px 6px',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  marginLeft: '4px'
                }}
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Smart Search Bar Component */}
      <div style={{
        background: '#0c1322',
        borderRadius: '12px',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {/* Main Search Input & Query Understanding */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Type Selector (User overrideable, never assumptions) */}
          <select
            value={selectedTypeFilter}
            onChange={e => setSelectedTypeFilter(e.target.value)}
            style={{
              background: '#090f1d',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#38bdf8',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="auto">Auto (Heuristic Detection)</option>
            <option value="gene">Gene</option>
            <option value="nucleotide">Nucleotide</option>
            <option value="protein">Protein</option>
            <option value="organism">Organism</option>
            <option value="accession">Accession</option>
          </select>

          {/* Large Search Input */}
          <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && executeSearch()}
              placeholder="Search gene, accession, protein, organism, or sequence..."
              style={{
                width: '100%',
                background: '#090f1d',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '0.94rem',
                color: '#f8fafc',
                outline: 'none',
                fontFamily: "'Inter', sans-serif"
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => executeSearch()}
            disabled={loading}
            style={{
              background: '#06b6d4',
              color: '#08101e',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {loading ? <RefreshCw className="spin" size={16} /> : <Search size={16} />}
            <span>Search Databases</span>
          </button>
        </div>

        {/* Query Understanding Chips */}
        {query && query.trim() && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.78rem',
            background: 'rgba(6, 182, 212, 0.08)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            borderRadius: '6px',
            padding: '6px 12px'
          }}>
            <Sparkles size={14} color="#06b6d4" />
            <strong style={{ color: '#38bdf8' }}>Suggestion:</strong>
            <span style={{ color: '#cbd5e1' }}>{queryClassification.suggestion}</span>
            <span style={{ color: '#64748b', marginLeft: 'auto' }}>
              Targeting: {queryClassification.targetDatabases.map(d => d.toUpperCase()).join(' • ')} (can override via Type selector)
            </span>
          </div>
        )}

        {/* Ambiguity Resolver (When a symbol matches multiple organisms) */}
        {realOrganisms.length > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            padding: '6px 0',
            fontSize: '0.78rem'
          }}>
            <span style={{ color: '#94a3b8', fontWeight: 600 }}>Ambiguity Resolver (Narrow by Organism):</span>
            {realOrganisms.map(([orgName, count]) => {
              const isSelected = organismFilter.toLowerCase() === orgName.toLowerCase();
              return (
                <button
                  key={orgName}
                  type="button"
                  onClick={() => {
                    const newOrg = isSelected ? '' : orgName;
                    setOrganismFilter(newOrg);
                    executeSearch(query, { org: newOrg });
                  }}
                  style={{
                    background: isSelected ? 'rgba(6, 182, 212, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${isSelected ? '#06b6d4' : 'rgba(255, 255, 255, 0.1)'}`,
                    color: isSelected ? '#38bdf8' : '#cbd5e1',
                    borderRadius: '12px',
                    padding: '2px 10px',
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    fontStyle: 'italic',
                    fontWeight: isSelected ? 700 : 500
                  }}
                >
                  {orgName} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Advanced Filter Row & Benchmarks */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          paddingTop: '10px',
          fontSize: '0.78rem'
        }}>
          {/* Quick Example Benchmarks */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ color: '#64748b' }}>Benchmark Queries:</span>
            {['BRCA1', 'TP53', 'Homo sapiens', 'NM_000546.6', 'P04637'].map(term => (
              <button
                key={term}
                type="button"
                onClick={() => {
                  setQuery(term);
                  executeSearch(term);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#cbd5e1',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                {term}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setOrganismFilter('');
                setSelectedTypeFilter('auto');
                setSearchResponse({
                  query: '',
                  sources: {
                    ncbi: { status: 'idle', records: [], total: 0, latencyMs: null, error: null },
                    uniprot: { status: 'idle', records: [], total: 0, latencyMs: null, error: null },
                    ena: { status: 'idle', records: [], total: 0, latencyMs: null, error: null }
                  },
                  allRecords: [],
                  counts: { total: 0, ncbi: 0, uniprot: 0, ena: 0 },
                  isPartial: false,
                  failedSources: []
                });
                setHasSearched(false);
                updateUrlState('', 'all', 'auto', '');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: '0.74rem'
              }}
            >
              Clear Search
            </button>
          </div>
        </div>
      </div>

      {/* Partial Results Banner (Explicitly warns if a source failed) */}
      {searchResponse.isPartial && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '8px',
          padding: '10px 16px',
          fontSize: '0.82rem',
          color: '#fbbf24',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} color="#f59e0b" />
            <span>
              <strong>Partial Results:</strong> Some remote biological providers encountered timeouts or errors ({searchResponse.failedSources.join(', ').toUpperCase()}). Loaded results from available sources are displayed below.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {searchResponse.failedSources.map(s => (
              <button
                key={`retry_${s}`}
                type="button"
                onClick={() => retrySource(s)}
                style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  border: '1px solid #f59e0b',
                  color: '#fbbf24',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Retry {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Database Navigation Tabs Strip */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: '8px'
      }}>
        {/* Source Tabs with Distinct Counts (Never Summed as unique records) */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
          {[
            { id: 'all', label: 'All Sources', count: searchResponse.counts.total, color: '#38bdf8' },
            { id: 'ncbi', label: 'NCBI Entrez', count: searchResponse.counts.ncbi, color: '#2563eb' },
            { id: 'uniprot', label: 'UniProt KB', count: searchResponse.counts.uniprot, color: '#0d9488' },
            { id: 'ena', label: 'ENA / EMBL-EBI', count: searchResponse.counts.ena, color: '#d97706' }
          ].map(tab => {
            const isActive = activeSourceTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveSourceTab(tab.id);
                  updateUrlState(query, tab.id, selectedTypeFilter, organismFilter);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: isActive ? '#131e34' : 'transparent',
                  border: '1px solid',
                  borderColor: isActive ? 'rgba(56, 189, 248, 0.3)' : 'transparent',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  color: isActive ? '#f8fafc' : '#94a3b8',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  background: isActive ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  color: isActive ? '#38bdf8' : '#64748b',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Group By Selector for "All Sources" */}
        {activeSourceTab === 'all' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
            <span style={{ color: '#64748b' }}>Group Results By:</span>
            <button
              type="button"
              onClick={() => setGroupBy('source')}
              style={{
                background: groupBy === 'source' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                border: `1px solid ${groupBy === 'source' ? '#06b6d4' : 'rgba(255, 255, 255, 0.1)'}`,
                color: groupBy === 'source' ? '#38bdf8' : '#94a3b8',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.74rem',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Database Source
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('type')}
              style={{
                background: groupBy === 'type' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                border: `1px solid ${groupBy === 'type' ? '#06b6d4' : 'rgba(255, 255, 255, 0.1)'}`,
                color: groupBy === 'type' ? '#38bdf8' : '#94a3b8',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.74rem',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Record Type
            </button>
          </div>
        )}
      </div>

      {/* Main Body Layout: Facets Sidebar + Results List */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        {/* Facet Sidebar (Loaded Results Breakdown) */}
        {hasSearched && searchResponse.allRecords.length > 0 && (
          <aside style={{
            width: '240px',
            background: '#0c1322',
            borderRadius: '12px',
            border: '1px solid rgba(56, 189, 248, 0.15)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Filter size={14} color="#06b6d4" /> Facet Filters
              </span>
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                (from loaded results)
              </span>
            </div>

            {/* Record Type Facet */}
            <div>
              <span style={{ color: '#94a3b8', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                Record Type
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', color: facetFilters.recordType === 'all' ? '#38bdf8' : '#cbd5e1' }}>
                  <span><input type="radio" name="ftype" checked={facetFilters.recordType === 'all'} onChange={() => setFacetFilters(f => ({ ...f, recordType: 'all' }))} style={{ marginRight: '6px' }} />All Types</span>
                  <span>{searchResponse.allRecords.length}</span>
                </label>
                {Object.entries(computedFacets.types).map(([type, count]) => (
                  <label key={type} style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', color: facetFilters.recordType === type ? '#38bdf8' : '#cbd5e1' }}>
                    <span><input type="radio" name="ftype" checked={facetFilters.recordType === type} onChange={() => setFacetFilters(f => ({ ...f, recordType: type }))} style={{ marginRight: '6px' }} />{type.toUpperCase()}</span>
                    <span>{count}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Molecule Type Facet */}
            <div>
              <span style={{ color: '#94a3b8', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                Molecule Type
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', color: facetFilters.moleculeType === 'all' ? '#38bdf8' : '#cbd5e1' }}>
                  <span><input type="radio" name="fmol" checked={facetFilters.moleculeType === 'all'} onChange={() => setFacetFilters(f => ({ ...f, moleculeType: 'all' }))} style={{ marginRight: '6px' }} />All Molecules</span>
                  <span>{searchResponse.allRecords.length}</span>
                </label>
                {Object.entries(computedFacets.molecules).map(([mol, count]) => (
                  <label key={mol} style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', color: facetFilters.moleculeType === mol ? '#38bdf8' : '#cbd5e1' }}>
                    <span><input type="radio" name="fmol" checked={facetFilters.moleculeType === mol} onChange={() => setFacetFilters(f => ({ ...f, moleculeType: mol }))} style={{ marginRight: '6px' }} />{mol}</span>
                    <span>{count}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Clear Filters Button */}
            {(facetFilters.organism !== 'all' || facetFilters.recordType !== 'all' || facetFilters.moleculeType !== 'all') && (
              <button
                type="button"
                onClick={() => setFacetFilters({ organism: 'all', recordType: 'all', curation: 'all', moleculeType: 'all' })}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  padding: '6px',
                  fontSize: '0.74rem',
                  color: '#cbd5e1',
                  cursor: 'pointer'
                }}
              >
                Reset Facets
              </button>
            )}
          </aside>
        )}

        {/* Results Stream Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Loading Skeleton */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3].map(n => (
                <div key={n} style={{
                  background: '#0c1322',
                  borderRadius: '12px',
                  border: '1px solid rgba(56, 189, 248, 0.15)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ width: '140px', height: '16px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '4px' }} />
                  <div style={{ width: '60%', height: '20px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px' }} />
                  <div style={{ width: '85%', height: '14px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '4px' }} />
                </div>
              ))}
            </div>
          )}

          {/* Empty / No Results State */}
          {!loading && hasSearched && displayedRecords.length === 0 && (
            <div style={{
              background: '#0c1322',
              borderRadius: '12px',
              border: '1px solid rgba(56, 189, 248, 0.15)',
              padding: '48px 24px',
              textAlign: 'center',
              color: '#94a3b8'
            }}>
              <Database size={32} color="#64748b" style={{ marginBottom: '12px' }} />
              <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', color: '#f8fafc', fontWeight: 700 }}>
                No Records Matched Query
              </h3>
              <p style={{ margin: 0, fontSize: '0.84rem' }}>
                No matches found in {activeSourceTab === 'all' ? 'any database' : activeSourceTab.toUpperCase()} for "{query}".
                Try a standard symbol (e.g. <code>BRCA1</code>, <code>TP53</code>) or RefSeq accession (<code>NM_000546.6</code>).
              </p>
            </div>
          )}

          {/* Initial Pre-Search State */}
          {!loading && !hasSearched && (
            <div style={{
              background: '#0c1322',
              borderRadius: '12px',
              border: '1px solid rgba(56, 189, 248, 0.15)',
              padding: '40px 24px',
              textAlign: 'center'
            }}>
              <Globe size={36} color="#06b6d4" style={{ marginBottom: '14px' }} />
              <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', color: '#f8fafc', fontWeight: 700 }}>
                Global Bio-Database Research Explorer
              </h3>
              <p style={{ margin: '0 auto 20px', maxWidth: '580px', fontSize: '0.86rem', color: '#94a3b8', lineHeight: 1.6 }}>
                Federated biological search engine. Query NCBI Entrez, UniProt Knowledgebase, and ENA concurrently. Select an example query or type a gene symbol to begin.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {['BRCA1', 'TP53', 'Homo sapiens', 'NM_000546.6', 'P04637'].map(term => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      setQuery(term);
                      executeSearch(term);
                    }}
                    style={{
                      background: 'rgba(6, 182, 212, 0.12)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      color: '#38bdf8',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Search {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Grouped Sections (All Sources Tab) */}
          {!loading && hasSearched && groupedSections && groupedSections.map(group => (
            <div key={group.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                paddingBottom: '6px'
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: group.color || '#38bdf8'
                }} />
                <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#f8fafc' }}>
                  {group.title} ({group.records.length})
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: density === 'compact' ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))', gap: '12px' }}>
                {group.records.map(rec => renderResultCard(rec))}
              </div>
            </div>
          ))}

          {/* Flat Grid for Individual Source Tabs */}
          {!loading && hasSearched && !groupedSections && displayedRecords.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: density === 'compact' ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))', gap: '12px' }}>
              {displayedRecords.map(rec => renderResultCard(rec))}
            </div>
          )}
        </div>
      </div>

      {/* RESULT CARD RENDERER */}
      {function renderResultCard(item) {
        const isPinned = pinnedRecords.some(p => p.id === item.id);
        const IconComponent = item.recordType === 'gene' ? GitFork : item.recordType === 'protein' ? Boxes : Dna;

        return (
          <div
            key={item.id}
            style={{
              background: '#0c1322',
              borderRadius: '12px',
              border: `1px solid ${isPinned ? '#06b6d4' : 'rgba(56, 189, 248, 0.15)'}`,
              padding: density === 'compact' ? '12px 16px' : '18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'border-color 0.15s ease'
            }}
          >
            <div>
              {/* Card Badges Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {/* Source Badge with Paired Text Label */}
                  <span style={{
                    background: `${item.sourceColor || '#2563eb'}22`,
                    border: `1px solid ${item.sourceColor || '#2563eb'}55`,
                    color: item.sourceColor || '#38bdf8',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}>
                    {item.sourceBadge || item.source}
                  </span>

                  {/* Record-Type Icon & Badge */}
                  <span style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#f8fafc',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    textTransform: 'uppercase'
                  }}>
                    <IconComponent size={12} color={item.sourceColor || '#38bdf8'} />
                    <span>{item.recordType || 'Record'}</span>
                  </span>

                  {/* Curation Badge (UniProt Reviewed vs Unreviewed) */}
                  {item.curationLabel && (
                    <span style={{
                      background: item.curationStatus === 'reviewed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      border: `1px solid ${item.curationStatus === 'reviewed' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                      color: item.curationStatus === 'reviewed' ? '#34d399' : '#fbbf24',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.68rem',
                      fontWeight: 600
                    }}>
                      {item.curationLabel}
                    </span>
                  )}
                </div>

                {/* Pin Button */}
                <button
                  type="button"
                  onClick={() => togglePin(item)}
                  title={isPinned ? 'Unpin record' : 'Pin to comparison tray'}
                  style={{
                    background: isPinned ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                    border: `1px solid ${isPinned ? '#06b6d4' : 'rgba(255, 255, 255, 0.1)'}`,
                    color: isPinned ? '#38bdf8' : '#64748b',
                    borderRadius: '6px',
                    padding: '4px 6px',
                    cursor: 'pointer'
                  }}
                >
                  <Pin size={13} />
                </button>
              </div>

              {/* Accession Header with Copy Action */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 800,
                  fontSize: '0.94rem',
                  color: '#f8fafc'
                }}>
                  {item.accession}
                </span>

                <button
                  type="button"
                  onClick={() => handleCopyAccession(item.accession, item.id)}
                  title="Copy Accession"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: copiedAccId === item.id ? '#10b981' : '#64748b',
                    cursor: 'pointer',
                    padding: '2px'
                  }}
                >
                  {copiedAccId === item.id ? <Check size={13} /> : <Copy size={13} />}
                </button>

                {item.length && (
                  <span style={{
                    fontSize: '0.74rem',
                    color: '#94a3b8',
                    marginLeft: 'auto',
                    fontFamily: "'JetBrains Mono', monospace"
                  }}>
                    {item.length.toLocaleString()} {item.lengthUnit || ''}
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <h4 style={{
                fontSize: '0.88rem',
                fontWeight: 700,
                color: '#e2e8f0',
                margin: '0 0 6px',
                lineHeight: 1.4
              }}>
                {item.title}
              </h4>

              <p style={{
                fontSize: '0.78rem',
                color: '#94a3b8',
                margin: '0 0 10px',
                lineHeight: 1.5,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {item.description}
              </p>

              {/* Source-Specific Biological Metadata Fields */}
              <div style={{
                background: '#090f1d',
                borderRadius: '6px',
                padding: '6px 10px',
                marginBottom: '12px',
                fontSize: '0.74rem',
                color: '#94a3b8',
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <div>
                  <span>Organism: </span>
                  <strong style={{ color: '#cbd5e1', fontStyle: 'italic' }}>{item.organism}</strong>
                </div>

                {item.geneId && (
                  <div>
                    <span>GeneID: </span>
                    <strong style={{ color: '#38bdf8', fontFamily: "'JetBrains Mono', monospace" }}>{item.geneId}</strong>
                  </div>
                )}

                {item.pdbRefs && item.pdbRefs.length > 0 && (
                  <div>
                    <span>Structures: </span>
                    <strong style={{ color: '#38bdf8' }}>{item.pdbRefs.length} PDB</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              paddingTop: '10px'
            }}>
              <button
                type="button"
                onClick={() => setProvenanceRecord(item)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.72rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <ShieldCheck size={12} />
                <span>Provenance</span>
              </button>

              <div style={{ display: 'flex', gap: '6px' }}>
                <a
                  href={item.originalUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Open original database record"
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#94a3b8',
                    borderRadius: '6px',
                    padding: '5px 8px',
                    fontSize: '0.74rem',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <ExternalLink size={12} />
                </a>

                <button
                  type="button"
                  onClick={() => setSelectedDetailRecord(item)}
                  style={{
                    background: 'rgba(6, 182, 212, 0.15)',
                    border: '1px solid rgba(6, 182, 212, 0.35)',
                    color: '#38bdf8',
                    borderRadius: '6px',
                    padding: '5px 12px',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Eye size={12} />
                  <span>View Record</span>
                </button>
              </div>
            </div>
          </div>
        );
      }}

      {/* Floating Bottom Pinned Records Tray */}
      <PinnedRecordsTray
        pinnedRecords={pinnedRecords}
        onUnpinRecord={(id) => setPinnedRecords(prev => prev.filter(p => p.id !== id))}
        onClearAll={() => setPinnedRecords([])}
        onOpenCompare={() => setCompareModalOpen(true)}
        onSaveToProject={handleSaveCollectionToProject}
      />

      {/* Record Detail Full-Width Modal */}
      {selectedDetailRecord && (
        <RecordDetailModal
          record={selectedDetailRecord}
          isOpen={Boolean(selectedDetailRecord)}
          onClose={() => setSelectedDetailRecord(null)}
          onSendToTool={handleSendToTool}
          isPinned={pinnedRecords.some(p => p.id === selectedDetailRecord.id)}
          onTogglePin={togglePin}
        />
      )}

      {/* Side-by-Side Comparison Matrix Modal */}
      {compareModalOpen && (
        <BioCompareModal
          records={pinnedRecords}
          onClose={() => setCompareModalOpen(false)}
          onUnpin={(id) => setPinnedRecords(prev => prev.filter(p => p.id !== id))}
        />
      )}

      {/* Provenance Audit Drawer */}
      {provenanceRecord && (
        <ProvenanceDrawer
          record={provenanceRecord}
          isOpen={Boolean(provenanceRecord)}
          onClose={() => setProvenanceRecord(null)}
        />
      )}

      {/* Ctrl+K Command Palette Modal */}
      <CommandPaletteModal
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectSourceTab={(tab) => {
          setActiveSourceTab(tab);
          updateUrlState(query, tab, selectedTypeFilter, organismFilter);
        }}
        onExecuteSearch={(searchTerm) => {
          setQuery(searchTerm);
          executeSearch(searchTerm);
        }}
        recentSearches={searchHistory}
        pinnedRecords={pinnedRecords}
        onOpenRecord={(r) => setSelectedDetailRecord(r)}
      />
    </div>
  );
}
