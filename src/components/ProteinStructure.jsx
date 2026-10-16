import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Boxes, Search, Download, RefreshCw, Eye, Info, RotateCcw, Play, 
  Pause, Layers, Palette, BookmarkPlus, AlertCircle, FileUp, 
  ExternalLink, CheckCircle2, ChevronRight, Share2 
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { createStructureObject, ObjectTypes } from '../models/scientificModel';

const POPULAR_STRUCTURES = [
  { id: '1TUP', name: 'p53-DNA Complex', desc: 'Tumor suppressor p53 core domain bound to DNA (2.2 Å)' },
  { id: '6VXX', name: 'SARS-CoV-2 Spike', desc: 'Prefusion viral glycoprotein spike trimer (2.8 Å)' },
  { id: '4HHB', name: 'Hemoglobin (Deoxy)', desc: 'Human adult tetrameric hemoglobin (1.74 Å)' },
  { id: '1CAG', name: 'Collagen Model', desc: 'High-resolution collagen-like triple helix (1.59 Å)' },
  { id: '7BW4', name: 'CRISPR-Cas9 Complex', desc: 'Cas9 endonuclease with sgRNA and target duplex' }
];

export default function ProteinStructure() {
  const { 
    selectedScientificObject, 
    registerScientificObject, 
    inspectObjectInSpace 
  } = useWorkspace();

  const [pdbInput, setPdbInput] = useState('1TUP');
  const [activePdb, setActivePdb] = useState('1TUP');
  const [styleMode, setStyleMode] = useState('cartoon'); // cartoon, stick, sphere, surface, trace
  const [colorScheme, setColorScheme] = useState('spectrum'); // spectrum, ss, chain, bfactor, element
  const [surfaceOpacity, setSurfaceOpacity] = useState(0.7);
  const [isSpinning, setIsSpinning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Metadata state
  const [metadata, setMetadata] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(false);

  // Residue track & selection
  const [residues, setResidues] = useState([]);
  const [selectedResidue, setSelectedResidue] = useState(null);
  const [activeChain, setActiveChain] = useState('All');
  const [chainsList, setChainsList] = useState(['All']);

  const viewerRef = useRef(null);
  const viewerInstanceRef = useRef(null);

  // Auto-load if opened with a Protein or Structure selected object
  useEffect(() => {
    if (selectedScientificObject) {
      if (selectedScientificObject.type === ObjectTypes.STRUCTURE && selectedScientificObject.pdbId) {
        if (selectedScientificObject.pdbId !== activePdb) {
          setPdbInput(selectedScientificObject.pdbId);
          setActivePdb(selectedScientificObject.pdbId);
        }
      } else if (selectedScientificObject.type === ObjectTypes.PROTEIN && selectedScientificObject.associatedPdbIds?.length > 0) {
        const targetPdb = selectedScientificObject.associatedPdbIds[0];
        if (targetPdb !== activePdb) {
          setPdbInput(targetPdb);
          setActivePdb(targetPdb);
        }
      }
    }
  }, [selectedScientificObject]);

  // Fetch RCSB metadata for active structure
  useEffect(() => {
    let isCancelled = false;
    const fetchMetadata = async () => {
      if (!activePdb || activePdb.length !== 4) return;
      setLoadingMeta(true);
      let data = null;
      try {
        const res = await fetch(`/api/pdb/summary/${activePdb}`);
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          data = await res.json();
        }
      } catch {
        // Fall back to direct RCSB API
      }

      if (!data) {
        try {
          const rcsbRes = await fetch(`https://data.rcsb.org/rest/v1/core/entry/${encodeURIComponent(activePdb)}`);
          if (rcsbRes.ok) {
            const rData = await rcsbRes.json();
            data = {
              pdbId: activePdb,
              title: rData.struct?.title || `PDB Structure ${activePdb}`,
              method: rData.exptl?.[0]?.method || 'X-ray Crystallography',
              resolution: rData.rcsb_entry_info?.resolution_combined?.[0] || null,
              rFree: rData.refine?.[0]?.ls_R_factor_R_free || null,
              depositionDate: rData.rcsb_accession_info?.deposit_date?.split('T')[0] || null,
              authors: (rData.audit_author || []).map(a => a.name).slice(0, 4).join(', '),
              organism: rData.rcsb_entry_info?.polymer_entity_taxonomy_ids?.[0] ? 'Biological Specimen' : 'Synthetic / Recombinant',
              polymerCount: rData.rcsb_entry_info?.polymer_entity_count || 1,
              nonpolymerCount: rData.rcsb_entry_info?.nonpolymer_entity_count || 0
            };
          }
        } catch {
          // Both failed
        }
      }

      if (!isCancelled) {
        if (data) {
          setMetadata(data);
          registerScientificObject(createStructureObject({
            id: `struct_${activePdb}`,
            pdbId: activePdb,
            title: data.title,
            experimentalMethod: data.method,
            resolutionAngstrom: data.resolution,
            rValueFree: data.rFree,
            depositionDate: data.depositionDate,
            authors: data.authors,
            organism: data.organism
          }));
        } else {
          setMetadata({
            pdbId: activePdb,
            title: `Macromolecular Structure (PDB ${activePdb})`,
            method: 'X-ray Crystallography',
            resolution: null,
            authors: 'Deposited RCSB Authors',
            organism: 'Biological Specimen'
          });
        }
        setLoadingMeta(false);
      }
    };

    fetchMetadata();
    return () => { isCancelled = true; };
  }, [activePdb, registerScientificObject]);

  // Initialize and render 3Dmol viewer
  useEffect(() => {
    let isCancelled = false;
    let timer = null;

    const initViewer = () => {
      if (!window.$3Dmol) {
        timer = setTimeout(initViewer, 200);
        return;
      }
      if (!viewerRef.current || isCancelled) return;

      setLoading(true);
      setErrorMessage('');

      const element = viewerRef.current;
      element.innerHTML = '';

      try {
        const viewer = window.$3Dmol.createViewer(element, { 
          backgroundColor: '#070b14',
          antialias: true
        });
        viewerInstanceRef.current = viewer;

        // Download PDB coordinates
        window.$3Dmol.download(`pdb:${activePdb}`, viewer, {}, () => {
          if (isCancelled) return;

          applyStyles(viewer, styleMode, colorScheme, surfaceOpacity);
          viewer.zoomTo();
          viewer.render();

          // Extract chains and residues
          extractResidues(viewer);

          // Click handler on atoms
          viewer.setClickable({}, true, (atom) => {
            if (atom) {
              const resObj = {
                chain: atom.chain || 'A',
                resi: atom.resi,
                resn: atom.resn,
                atom: atom.atom
              };
              highlightResidue(viewer, resObj);
            }
          });

          setLoading(false);
        });
      } catch (err) {
        if (!isCancelled) {
          setErrorMessage(`Failed to load PDB ${activePdb}. Please verify the 4-character accession.`);
          setLoading(false);
        }
      }
    };

    initViewer();

    return () => {
      isCancelled = true;
      if (timer) clearTimeout(timer);
      if (viewerInstanceRef.current) {
        viewerInstanceRef.current.clear();
      }
    };
  }, [activePdb]);

  // Update styles and representation dynamically without reloading coordinates
  useEffect(() => {
    if (viewerInstanceRef.current) {
      applyStyles(viewerInstanceRef.current, styleMode, colorScheme, surfaceOpacity);
      if (selectedResidue) {
        applyResidueHighlight(viewerInstanceRef.current, selectedResidue);
      }
      viewerInstanceRef.current.render();
    }
  }, [styleMode, colorScheme, surfaceOpacity]);

  // Spin toggle
  useEffect(() => {
    if (viewerInstanceRef.current) {
      viewerInstanceRef.current.spin(isSpinning ? [0, 1, 0] : false);
    }
  }, [isSpinning]);

  const applyStyles = (viewer, mode, scheme, opacity) => {
    if (!viewer) return;
    viewer.removeAllSurfaces();
    viewer.removeAllLabels();

    const colorConfig = getColorStyle(scheme);

    const styleObj = {};
    if (mode === 'cartoon') {
      styleObj.cartoon = colorConfig;
    } else if (mode === 'stick') {
      styleObj.stick = { ...colorConfig, radius: 0.25 };
    } else if (mode === 'sphere') {
      styleObj.sphere = { ...colorConfig, scale: 0.85 };
    } else if (mode === 'trace') {
      styleObj.trace = { ...colorConfig, linewidth: 3 };
    }

    viewer.setStyle({}, styleObj);

    if (mode === 'surface') {
      viewer.setStyle({}, { cartoon: { color: 'spectrum', opacity: 0.3 } });
      viewer.addSurface(window.$3Dmol.SurfaceType.VDW, {
        opacity: opacity,
        color: 'spectrum'
      });
    }
  };

  const getColorStyle = (scheme) => {
    switch (scheme) {
      case 'spectrum':
        return { color: 'spectrum' };
      case 'ss':
        return { color: 'secondary' };
      case 'chain':
        return { color: 'chain' };
      case 'bfactor':
        return { colorscheme: 'bFactor' };
      case 'element':
        return { colorscheme: 'default' };
      default:
        return { color: 'spectrum' };
    }
  };

  const extractResidues = (viewer) => {
    try {
      const atoms = viewer.selectedAtoms({});
      if (!atoms || atoms.length === 0) return;

      const seen = new Set();
      const resList = [];
      const chains = new Set();

      atoms.forEach(atom => {
        const chain = atom.chain || 'A';
        chains.add(chain);
        const key = `${chain}_${atom.resi}`;
        if (!seen.has(key)) {
          seen.add(key);
          resList.push({
            chain,
            resi: atom.resi,
            resn: atom.resn || 'UNK',
            b: atom.b
          });
        }
      });

      resList.sort((a, b) => (a.chain === b.chain ? a.resi - b.resi : a.chain.localeCompare(b.chain)));
      setResidues(resList);
      setChainsList(['All', ...Array.from(chains).sort()]);
    } catch {
      // Graceful fallback
    }
  };

  const highlightResidue = (viewer, resObj) => {
    setSelectedResidue(resObj);
    applyResidueHighlight(viewer, resObj);
  };

  const applyResidueHighlight = (viewer, resObj) => {
    if (!viewer || !resObj) return;

    // Reset styles
    applyStyles(viewer, styleMode, colorScheme, surfaceOpacity);
    viewer.removeAllLabels();

    // Highlight selected residue with neon stick representation and glowing label
    viewer.addStyle(
      { chain: resObj.chain, resi: resObj.resi },
      { 
        stick: { color: '#f43f5e', radius: 0.4 },
        sphere: { color: '#f59e0b', scale: 0.3 }
      }
    );

    viewer.addLabel(`${resObj.resn} ${resObj.resi}:${resObj.chain}`, {
      position: { chain: resObj.chain, resi: resObj.resi },
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      fontColor: '#06b6d4',
      fontSize: 12,
      borderColor: '#06b6d4',
      borderThickness: 1
    });

    viewer.render();
  };

  const handleResetCamera = () => {
    if (viewerInstanceRef.current) {
      viewerInstanceRef.current.zoomTo();
      viewerInstanceRef.current.render();
    }
  };

  const handleSearchPdb = () => {
    const clean = pdbInput.trim().toUpperCase();
    if (!clean) return;
    if (clean.length !== 4) {
      setErrorMessage('PDB accession must be a 4-character identifier (e.g. 1TUP, 6VXX).');
      return;
    }
    setActivePdb(clean);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const contents = event.target?.result;
      if (contents && viewerInstanceRef.current && window.$3Dmol) {
        setLoading(true);
        try {
          viewerInstanceRef.current.clear();
          const format = file.name.endsWith('.cif') ? 'cif' : 'pdb';
          viewerInstanceRef.current.addModel(contents, format);
          applyStyles(viewerInstanceRef.current, styleMode, colorScheme, surfaceOpacity);
          viewerInstanceRef.current.zoomTo();
          viewerInstanceRef.current.render();
          extractResidues(viewerInstanceRef.current);
          setMetadata({
            pdbId: file.name.replace(/\.[^/.]+$/, '').toUpperCase(),
            title: `Custom Uploaded Coordinate Model (${file.name})`,
            method: 'Uploaded File Coordinates',
            resolution: null,
            authors: 'User Upload',
            organism: 'Local Workspace'
          });
          setLoading(false);
        } catch {
          setErrorMessage('Could not parse uploaded macromolecular coordinate file.');
          setLoading(false);
        }
      }
    };
    reader.readAsText(file);
  };

  const filteredResidues = activeChain === 'All' 
    ? residues 
    : residues.filter(r => r.chain === activeChain);

  return (
    <div className="page-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div className="card-header" style={{ marginBottom: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="logo-badge" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' }}>
              Protein Space
            </span>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
              Molecular Interaction Canvas
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '6px' }}>
            High-performance hardware-accelerated 3D macromolecular rendering with sequence-to-structure residue synchronization.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <label className="btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileUp size={16} /> Load PDB/CIF File
            <input type="file" accept=".pdb,.cif,.ent" style={{ display: 'none' }} onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      {/* Control Bar */}
      <div className="glass-card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* PDB Search Input */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, minWidth: '280px' }}>
            <input
              type="text"
              className="input-field font-mono"
              placeholder="Enter 4-character PDB ID (e.g. 1TUP, 6VXX)..."
              value={pdbInput}
              maxLength={4}
              onChange={(e) => setPdbInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchPdb()}
              style={{ maxWidth: '320px', textTransform: 'uppercase', letterSpacing: '1px' }}
            />
            <button className="btn-primary" onClick={handleSearchPdb}>
              <Search size={16} /> Load
            </button>
          </div>

          {/* Quick Select Buttons */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Quick Load:</span>
            {POPULAR_STRUCTURES.map(ps => (
              <button
                key={ps.id}
                className="btn-secondary"
                style={{
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  borderColor: activePdb === ps.id ? 'var(--accent-cyan)' : 'var(--border-color)',
                  color: activePdb === ps.id ? 'var(--accent-cyan)' : 'var(--text-secondary)'
                }}
                onClick={() => {
                  setPdbInput(ps.id);
                  setActivePdb(ps.id);
                }}
                title={ps.desc}
              >
                {ps.id}
              </button>
            ))}
          </div>
        </div>

        {errorMessage && (
          <div className="amber-warning-card" style={{ marginTop: '12px', borderColor: 'var(--accent-rose)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-rose)' }}>
              <AlertCircle size={16} />
              <span style={{ fontSize: '0.85rem' }}>{errorMessage}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main 3D Canvas + Inspector Grid - PyMOL 3 Studio Frame */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
        {/* Left: 3D Viewport Box */}
        <div className="glass-card pymol-app-frame" style={{ padding: '0', overflow: 'hidden', position: 'relative' }}>
          {/* Top PyMOL 3 Studio Header */}
          <div className="pymol-app-header">
            <div className="pymol-window-dots">
              <div className="pymol-dot red" />
              <div className="pymol-dot yellow" />
              <div className="pymol-dot green" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Boxes color="var(--pymol-cyan)" size={15} />
              <strong style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                PyMOL 3 Viewer — PDB: {activePdb}
              </strong>
              {loading && (
                <span style={{ fontSize: '0.75rem', color: 'var(--pymol-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RefreshCw className="spin" size={13} /> Loading coordinates...
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)' }}>PRESET:</span>
              <div className="pymol-aschel-group">
                <button 
                  className={`pymol-btn-action ${styleMode === 'cartoon' ? 'active' : ''}`} 
                  onClick={() => setStyleMode('cartoon')}
                  title="Action: Cartoon Ribbon"
                >A</button>
                <button 
                  className={`pymol-btn-action ${styleMode === 'surface' ? 'active' : ''}`} 
                  onClick={() => setStyleMode('surface')}
                  title="Show: Molecular Surface"
                >S</button>
                <button 
                  className={`pymol-btn-action ${colorScheme === 'spectrum' ? 'active' : ''}`} 
                  onClick={() => setColorScheme('spectrum')}
                  title="Color: Spectrum"
                >C</button>
                <button 
                  className={`pymol-btn-action`} 
                  onClick={() => setStyleMode('stick')}
                  title="Hide/Sticks: Atomic Sticks"
                >H</button>
                <button 
                  className={`pymol-btn-action`} 
                  onClick={() => handleResetCamera()}
                  title="Label/Center: Reset Orient"
                >L</button>
              </div>
            </div>
          </div>

          {/* Sub-toolbar with Selectors and Camera controls */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 16px',
            borderBottom: '1px solid rgba(99, 128, 220, 0.2)',
            background: 'rgba(10, 14, 34, 0.85)',
            backdropFilter: 'blur(10px)',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Representation Mode */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Layers size={14} color="var(--text-muted)" />
                <select 
                  className="select-field" 
                  style={{ width: '135px', padding: '4px 8px', fontSize: '0.8rem', background: '#070a1a' }}
                  value={styleMode} 
                  onChange={(e) => setStyleMode(e.target.value)}
                >
                  <option value="cartoon">Cartoon Ribbon</option>
                  <option value="stick">Atomic Sticks</option>
                  <option value="sphere">Spacefill VDW</option>
                  <option value="surface">Molecular Surface</option>
                  <option value="trace">Backbone Trace</option>
                </select>
              </div>

              {/* Color Scheme */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Palette size={14} color="var(--text-muted)" />
                <select 
                  className="select-field" 
                  style={{ width: '130px', padding: '4px 8px', fontSize: '0.8rem', background: '#070a1a' }}
                  value={colorScheme} 
                  onChange={(e) => setColorScheme(e.target.value)}
                >
                  <option value="spectrum">N→C Spectrum</option>
                  <option value="ss">Secondary Struct</option>
                  <option value="chain">Chain Color</option>
                  <option value="bfactor">B-Factor Temp</option>
                  <option value="element">Element CPK</option>
                </select>
              </div>

              {/* Camera Controls */}
              <button 
                className="btn-secondary" 
                style={{ padding: '4px 10px', fontSize: '0.8rem' }} 
                onClick={handleResetCamera}
                title="Reset Camera Zoom & Position (PyMOL orient)"
              >
                <RotateCcw size={14} /> Orient
              </button>

              <button 
                className="btn-secondary" 
                style={{ padding: '4px 10px', fontSize: '0.8rem', color: isSpinning ? 'var(--pymol-cyan)' : 'inherit', borderColor: isSpinning ? 'var(--pymol-cyan)' : 'var(--border-color)' }} 
                onClick={() => setIsSpinning(!isSpinning)}
                title="Toggle continuous rotation (PyMOL mplay)"
              >
                {isSpinning ? <Pause size={14} /> : <Play size={14} />} {isSpinning ? 'Stop' : 'Spin'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              {POPULAR_STRUCTURES.slice(0, 3).map(ps => (
                <button
                  key={ps.id}
                  style={{
                    background: activePdb === ps.id ? 'var(--schrodinger-blue)' : 'rgba(255, 255, 255, 0.04)',
                    color: activePdb === ps.id ? '#ffffff' : 'var(--text-secondary)',
                    border: '1px solid',
                    borderColor: activePdb === ps.id ? 'var(--schrodinger-blue)' : 'rgba(99, 128, 220, 0.2)',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setPdbInput(ps.id);
                    setActivePdb(ps.id);
                  }}
                >
                  {ps.id}
                </button>
              ))}
            </div>
          </div>

          {/* 3D WebGL Canvas */}
          <div
            ref={viewerRef}
            style={{
              width: '100%',
              height: '540px',
              backgroundColor: '#050713',
              position: 'relative',
              cursor: 'grab'
            }}
          />

          {/* PyMOL Interactive Command Bar */}
          <div className="pymol-cmd-bar">
            <span className="pymol-cmd-prompt">PyMOL&gt;</span>
            <span style={{ flex: 1 }}>fetch {activePdb}; show {styleMode}; color {colorScheme}; zoom</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ready</span>
          </div>

          {/* Bottom Synchronized Sequence Residue Track */}
          <div style={{
            borderTop: '1px solid var(--border-color)',
            background: 'rgba(11, 15, 25, 0.95)',
            padding: '10px 16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Sequence-To-Structure Residue Navigation
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                  ({filteredResidues.length} residues)
                </span>
              </div>

              {/* Chain filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Chain:</span>
                {chainsList.map(c => (
                  <button
                    key={c}
                    className="btn-secondary"
                    style={{
                      padding: '2px 8px',
                      fontSize: '0.72rem',
                      borderColor: activeChain === c ? 'var(--accent-cyan)' : 'var(--border-color)',
                      color: activeChain === c ? 'var(--accent-cyan)' : 'var(--text-secondary)'
                    }}
                    onClick={() => setActiveChain(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable amino acid ribbon */}
            <div style={{
              display: 'flex',
              gap: '4px',
              overflowX: 'auto',
              paddingBottom: '6px',
              scrollbarWidth: 'thin'
            }}>
              {filteredResidues.map(res => {
                const isSelected = selectedResidue && selectedResidue.resi === res.resi && selectedResidue.chain === res.chain;
                return (
                  <button
                    key={`${res.chain}_${res.resi}`}
                    onClick={() => highlightResidue(viewerInstanceRef.current, res)}
                    style={{
                      padding: '4px 6px',
                      borderRadius: '4px',
                      background: isSelected ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
                      color: isSelected ? '#0b0f19' : 'var(--text-primary)',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.08)',
                      fontSize: '0.72rem',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minWidth: '32px'
                    }}
                    title={`${res.resn} ${res.resi}:${res.chain} (B-factor: ${res.b || 'N/A'})`}
                  >
                    <span>{res.resn.slice(0, 3)}</span>
                    <span style={{ fontSize: '0.62rem', opacity: 0.8 }}>{res.resi}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Structure Metadata & Inspector Drawer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Metadata Card */}
          <div className="glass-card" style={{ padding: '18px' }}>
            <h3 className="card-title" style={{ marginBottom: '12px', fontSize: '1rem' }}>
              <Info size={16} color="var(--accent-cyan)" /> Structure Metadata
            </h3>

            {metadata ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Structure Title</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px', lineHeight: 1.4 }}>
                    {metadata.title}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                  <div className="stat-pill" style={{ padding: '8px' }}>
                    <div>
                      <div className="stat-label" style={{ fontSize: '0.7rem' }}>Method</div>
                      <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '0.82rem' }}>
                        {metadata.method}
                      </div>
                    </div>
                  </div>

                  <div className="stat-pill" style={{ padding: '8px' }}>
                    <div>
                      <div className="stat-label" style={{ fontSize: '0.7rem' }}>Resolution</div>
                      <div style={{ fontWeight: 700, color: 'var(--accent-emerald)', fontSize: '0.82rem' }}>
                        {metadata.resolution ? `${metadata.resolution} Å` : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {metadata.authors && (
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Authors</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>
                      {metadata.authors}
                    </div>
                  </div>
                )}

                {metadata.depositionDate && (
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Deposition Date</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {metadata.depositionDate}
                    </div>
                  </div>
                )}

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '4px', display: 'flex', gap: '8px' }}>
                  <a
                    href={`https://files.rcsb.org/download/${activePdb}.pdb`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary"
                    style={{ flex: 1, textDecoration: 'none', justifyContent: 'center', fontSize: '0.78rem', padding: '6px' }}
                  >
                    <Download size={14} /> PDB File
                  </a>
                  <a
                    href={`https://www.rcsb.org/structure/${activePdb}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary"
                    style={{ flex: 1, textDecoration: 'none', justifyContent: 'center', fontSize: '0.78rem', padding: '6px' }}
                  >
                    <ExternalLink size={14} /> RCSB Page
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Loading structure metadata...
              </div>
            )}
          </div>

          {/* Selected Residue Inspector */}
          <div className="glass-card" style={{ padding: '18px' }}>
            <h3 className="card-title" style={{ marginBottom: '10px', fontSize: '1rem' }}>
              <Eye size={16} color="var(--accent-emerald)" /> Residue Inspector
            </h3>

            {selectedResidue ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                      {selectedResidue.resn} {selectedResidue.resi}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Chain: {selectedResidue.chain}
                    </div>
                  </div>
                  <span className="logo-badge" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    Active Target
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Highlighted in 3D viewport with atomic sticks and 3D coordinate marker.
                </div>

                <button
                  className="btn-secondary"
                  style={{ width: '100%', fontSize: '0.8rem' }}
                  onClick={() => {
                    setSelectedResidue(null);
                    applyStyles(viewerInstanceRef.current, styleMode, colorScheme, surfaceOpacity);
                    viewerInstanceRef.current?.removeAllLabels();
                    viewerInstanceRef.current?.render();
                  }}
                >
                  Clear Selection Highlight
                </button>
              </div>
            ) : (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Click any atom in the 3D viewport or residue in the bottom track to inspect chemical coordinates.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
