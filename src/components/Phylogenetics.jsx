import React, { useState, useEffect, useRef } from 'react';
import { 
  Network, Play, Download, CheckCircle2, AlertTriangle, RefreshCw, 
  FileText, Image, BookmarkPlus, Info, ZoomIn, ZoomOut, Maximize2, 
  Search, GitCompare, Share2, Sliders, Layers, Eye 
} from 'lucide-react';
import { runMSA } from '../utils/alignmentEngine';
import { 
  calculateDistanceMatrix, 
  buildNeighborJoiningTree, 
  buildUpgmaTree, 
  buildMinimumEvolutionTree,
  buildMaximumLikelihoodTree,
  computeTreeLogLikelihood,
  calculateTreeLength,
  calculateRobinsonFouldsDistance,
  exportNexusFormat,
  exportNewick 
} from '../utils/phyloEngine';
import { validateDnaSequence } from '../utils/sequenceValidator';
import { useWorkspace } from '../context/WorkspaceContext';
import { createTreeObject, createTaxonObject, ObjectTypes } from '../models/scientificModel';

export default function Phylogenetics({ setActiveTab, sharedAlignmentData }) {
  const { 
    saveToSequenceLibrary, 
    setGlobalActiveSequence, 
    registerScientificObject,
    inspectObjectInSpace,
    scientificObjects
  } = useWorkspace();

  const samplePrimateDataset = `>Homo_sapiens
ATGGATTTACTGCTCTTCGCGTTGAAGAAGTACAAAATGTCATTAATGCTATGCAGAAA

>Pan_troglodytes
ATGGATTTATCTGCTCTTCGCGTTGAAGAAGTACAAAATGTCATTAATGCTATGCAGAAA

>Mus_musculus
ATGGATTTATCTGCTCTTCGCGTCGAGGAAGTACAGAATGTCATCAACGCTATGCAGAAA

>Rattus_norvegicus
ATGGATTTATCTGCTCTTCGCGTCGAGGAAGTACAGAATGTCATCAACGCTATGCAAAGA`;

  const [fastaInput, setFastaInput] = useState('');

  const [model, setModel] = useState('jukes-cantor'); // 'jukes-cantor' | 'kimura-2p' | 'p-distance'
  const [method, setMethod] = useState('nj'); // 'nj' | 'upgma' | 'me' | 'ml'
  const [treeLayout, setTreeLayout] = useState('rectangular'); // 'rectangular' | 'slanted' | 'radial'
  
  const [isBuilding, setIsBuilding] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Results
  const [distData, setDistData] = useState(null);
  const [treeData, setTreeData] = useState(null);
  const [msaResultData, setMsaResultData] = useState(null);
  const [newickStr, setNewickStr] = useState('');
  const [nexusStr, setNexusStr] = useState('');
  const [alignmentLength, setAlignmentLength] = useState(0);

  // Advanced ML / ME stats
  const [treeLengthVal, setTreeLengthVal] = useState(null);
  const [logLikelihoodVal, setLogLikelihoodVal] = useState(null);
  const [aicScoreVal, setAicScoreVal] = useState(null);

  // Visualization interactive state
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [showBranchLengths, setShowBranchLengths] = useState(true);
  const [showSupportValues, setShowSupportValues] = useState(true);
  const [taxonSearchQuery, setTaxonSearchQuery] = useState('');
  const [selectedTaxon, setSelectedTaxon] = useState(null);
  const [selectedClade, setSelectedClade] = useState(null);

  // Tree Comparison State
  const [compareMode, setCompareMode] = useState(false);
  const [comparisonTreeData, setComparisonTreeData] = useState(null);
  const [comparisonMethod, setComparisonMethod] = useState('ml');
  const [rfDistanceResult, setRfDistanceResult] = useState(null);

  const svgContainerRef = useRef(null);

  // Sync shared alignment data if forwarded from AlignmentHub
  useEffect(() => {
    if (sharedAlignmentData && sharedAlignmentData.alignedSequences) {
      const fastaStr = sharedAlignmentData.alignedSequences
        .map(item => `>${item.name}\n${item.alignedSeq}`)
        .join('\n\n');
      setFastaInput(fastaStr);
    }
  }, [sharedAlignmentData]);

  const handleBuildTree = async () => {
    setErrorMessage('');
    setIsBuilding(true);
    setSelectedTaxon(null);
    setSelectedClade(null);

    try {
      setLoadingStep('Parsing FASTA headers and sequences...');
      await new Promise(r => setTimeout(r, 120));

      const lines = fastaInput.split('\n');
      const rawSeqs = [];
      let current = null;

      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('>')) {
          if (current) rawSeqs.push(current);
          const headerName = trimmed.substring(1).trim();
          current = { id: headerName, name: headerName.split(' ')[0], seq: '' };
        } else if (current && trimmed) {
          current.seq += trimmed.toUpperCase().replace(/\s+/g, '');
        }
      });
      if (current) rawSeqs.push(current);

      if (rawSeqs.length < 3) {
        throw new Error(`Phylogenetic reconstruction requires at least 3 distinct taxa. Found ${rawSeqs.length}.`);
      }

      const seenNames = new Map();
      const seqs = rawSeqs.map((s, idx) => {
        let cleanName = s.name.replace(/[^a-zA-Z0-9_-]/g, '_') || `Seq_${idx + 1}`;
        if (seenNames.has(cleanName)) {
          const count = seenNames.get(cleanName) + 1;
          seenNames.set(cleanName, count);
          cleanName = `${cleanName}_${count}`;
        } else {
          seenNames.set(cleanName, 1);
        }
        return { ...s, name: cleanName };
      });

      setLoadingStep('Validating sequence integrity...');
      await new Promise(r => setTimeout(r, 120));

      for (let s of seqs) {
        const val = validateDnaSequence(s.seq);
        if (val.isProtein) {
          throw new Error(`Sequence "${s.name}" is protein. DNA alignment required for current substitution models.`);
        }
        if (!val.isValid && val.invalidChars.length > 0) {
          throw new Error(`Invalid characters [${val.invalidChars.join(', ')}] in "${s.name}".`);
        }
      }

      setLoadingStep('Running progressive Multiple Sequence Alignment (MSA)...');
      await new Promise(r => setTimeout(r, 150));

      const msaRes = runMSA(seqs);
      if (!msaRes.alignedSequences || msaRes.alignedSequences.length < 3) {
        throw new Error('Alignment failed to produce aligned positions.');
      }
      setMsaResultData(msaRes);
      const alignLen = msaRes.alignmentLength || msaRes.alignedSequences[0].alignedSeq.length;
      setAlignmentLength(alignLen);

      setLoadingStep(`Calculating pairwise evolutionary distance matrix (${model.toUpperCase()})...`);
      await new Promise(r => setTimeout(r, 150));

      const dMat = calculateDistanceMatrix(msaRes, model);
      setDistData(dMat);

      setLoadingStep(`Inferring tree using ${
        method === 'nj' ? 'Neighbor-Joining' :
        method === 'upgma' ? 'UPGMA' :
        method === 'me' ? 'Minimum Evolution' : 'Maximum Likelihood (Felsenstein)'
      }...`);
      await new Promise(r => setTimeout(r, 200));

      let rootNode = null;
      let evaluatedLikelihood = null;
      let evaluatedTreeLen = null;
      let evaluatedAic = null;

      if (method === 'nj') {
        rootNode = buildNeighborJoiningTree(dMat);
      } else if (method === 'upgma') {
        rootNode = buildUpgmaTree(dMat);
      } else if (method === 'me') {
        rootNode = buildMinimumEvolutionTree(dMat);
      } else if (method === 'ml') {
        const mlRes = buildMaximumLikelihoodTree(dMat, msaRes, model);
        rootNode = mlRes.rootNode;
        evaluatedLikelihood = mlRes.logLikelihood;
        evaluatedAic = mlRes.aic;
        evaluatedTreeLen = mlRes.treeLength;
      }

      if (!rootNode) {
        throw new Error('Tree construction algorithm failed to generate root topology.');
      }

      // Compute statistics for all distance trees
      if (evaluatedTreeLen == null) {
        evaluatedTreeLen = calculateTreeLength(rootNode);
      }
      if (evaluatedLikelihood == null) {
        const lhEval = computeTreeLogLikelihood(rootNode, msaRes, model);
        evaluatedLikelihood = lhEval.logLikelihood;
        evaluatedAic = lhEval.aic;
      }

      setTreeData(rootNode);
      setTreeLengthVal(evaluatedTreeLen);
      setLogLikelihoodVal(evaluatedLikelihood);
      setAicScoreVal(evaluatedAic);

      const nwk = exportNewick(rootNode) + ';';
      setNewickStr(nwk);

      const nex = exportNexusFormat(rootNode, msaRes);
      setNexusStr(nex);

      // Register into scientific object model
      registerScientificObject(createTreeObject({
        name: `${method.toUpperCase()} Phylogenetic Tree (${model})`,
        method,
        substitutionModel: model,
        newick: nwk,
        nexus: nex,
        taxaCount: dMat.labels.length,
        alignmentLength: alignLen,
        treeLength: evaluatedTreeLen,
        logLikelihood: evaluatedLikelihood,
        aicScore: evaluatedAic,
        rootNode,
        taxa: dMat.labels
      }));

    } catch (err) {
      setErrorMessage(err.message || 'An error occurred during tree reconstruction.');
      setTreeData(null);
      setDistData(null);
    } finally {
      setIsBuilding(false);
      setLoadingStep('');
    }
  };

  // Compare Primary Tree with Alternative Method
  const handleRunComparison = () => {
    if (!distData || !msaResultData) return;
    try {
      let altTree = null;
      if (comparisonMethod === 'nj') altTree = buildNeighborJoiningTree(distData);
      else if (comparisonMethod === 'upgma') altTree = buildUpgmaTree(distData);
      else if (comparisonMethod === 'me') altTree = buildMinimumEvolutionTree(distData);
      else if (comparisonMethod === 'ml') {
        const mlRes = buildMaximumLikelihoodTree(distData, msaResultData, model);
        altTree = mlRes.rootNode;
      }

      setComparisonTreeData(altTree);
      const rf = calculateRobinsonFouldsDistance(treeData, altTree);
      setRfDistanceResult(rf);
      setCompareMode(true);
    } catch (err) {
      alert(`Comparison error: ${err.message}`);
    }
  };

  // Interactive Pan & Zoom handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setStartPan({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e) => {
    if (!isPanning) return;
    setPanOffset({
      x: e.clientX - startPan.x,
      y: e.clientY - startPan.y
    });
  };

  const handleMouseUp = () => setIsPanning(false);

  const resetView = () => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  // SVG Tree Renderers supporting Rectangular, Slanted, and Radial layouts
  const renderTreeSvg = (root, isCompareView = false) => {
    if (!root) return null;

    const leaves = [];
    const collectLeaves = (n) => {
      if (!n.children || n.children.length === 0) leaves.push(n);
      else n.children.forEach(c => collectLeaves(c.node));
    };
    collectLeaves(root);

    const numLeaves = leaves.length;
    const rowHeight = 44;
    const paddingX = 60;
    const paddingY = 40;
    const svgWidth = isCompareView ? 460 : 780;
    const svgHeight = Math.max(300, numLeaves * rowHeight + paddingY * 2);

    const leafYMap = new Map();
    leaves.forEach((l, idx) => {
      leafYMap.set(l.id, paddingY + idx * rowHeight + rowHeight / 2);
    });

    const getNodeY = (n) => {
      if (!n.children || n.children.length === 0) return leafYMap.get(n.id);
      const y1 = getNodeY(n.children[0].node);
      const y2 = getNodeY(n.children[n.children.length - 1].node);
      return (y1 + y2) / 2;
    };

    const getMaxDepth = (n) => {
      if (!n.children || n.children.length === 0) return 0;
      let maxChild = 0;
      n.children.forEach(c => {
        const d = (c.branchLen || 0) + getMaxDepth(c.node);
        if (d > maxChild) maxChild = d;
      });
      return maxChild;
    };

    const maxTreeDepth = getMaxDepth(root) || 1;
    const labelWidth = isCompareView ? 110 : 160;
    const drawWidth = svgWidth - paddingX - labelWidth;
    const scaleX = drawWidth / maxTreeDepth;

    // Recursive drawing
    const drawElements = (n, currentX) => {
      const currentY = getNodeY(n);
      const isLeaf = !n.children || n.children.length === 0;

      if (isLeaf) {
        const isSearched = taxonSearchQuery && n.name.toLowerCase().includes(taxonSearchQuery.toLowerCase());
        const isSelected = selectedTaxon && selectedTaxon.name === n.name;

        return (
          <g 
            key={n.id} 
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTaxon(n);
            }}
          >
            <circle 
              cx={currentX} 
              cy={currentY} 
              r={isSelected ? 7 : isSearched ? 6 : 4} 
              fill={isSelected ? '#f43f5e' : isSearched ? '#facc15' : 'var(--accent-cyan)'} 
              stroke="#fff" 
              strokeWidth="1.5" 
            />
            <text
              x={currentX + 12}
              y={currentY + 4}
              fill={isSelected ? '#f43f5e' : isSearched ? '#facc15' : 'var(--text-primary)'}
              fontSize={isCompareView ? '11px' : '13px'}
              fontWeight={isSelected || isSearched ? '700' : '600'}
              fontFamily="monospace, var(--font-main)"
            >
              {n.name}
            </text>
          </g>
        );
      }

      const childElements = [];
      const childYs = [];

      n.children.forEach((c, idx) => {
        const branchPixels = Math.max(22, (c.branchLen || 0) * scaleX);
        const nextX = currentX + branchPixels;
        const childY = getNodeY(c.node);
        childYs.push(childY);

        if (treeLayout === 'slanted') {
          // Slanted Cladogram diagonal lines
          childElements.push(
            <line
              key={`slant_${n.id}_${idx}`}
              x1={currentX}
              y1={currentY}
              x2={nextX}
              y2={childY}
              stroke="var(--accent-cyan)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          );
        } else {
          // Standard Rectangular Phylogram
          childElements.push(
            <line
              key={`h_${n.id}_${idx}`}
              x1={currentX}
              y1={childY}
              x2={nextX}
              y2={childY}
              stroke="var(--accent-cyan)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          );
        }

        if (showBranchLengths && c.branchLen > 0) {
          const midX = (currentX + nextX) / 2;
          childElements.push(
            <text
              key={`len_${n.id}_${idx}`}
              x={midX}
              y={childY - 6}
              fill="var(--text-secondary)"
              fontSize="10px"
              textAnchor="middle"
              fontFamily="monospace"
            >
              {c.branchLen.toFixed(4)}
            </text>
          );
        }

        childElements.push(drawElements(c.node, nextX));
      });

      if (treeLayout === 'rectangular') {
        const minY = Math.min(...childYs);
        const maxY = Math.max(...childYs);

        return (
          <g key={n.id}>
            <line
              x1={currentX}
              y1={minY}
              x2={currentX}
              y2={maxY}
              stroke="var(--accent-blue)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle 
              cx={currentX} 
              cy={currentY} 
              r="4" 
              fill="var(--accent-blue)" 
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedClade(n);
              }}
            />
            {childElements}
          </g>
        );
      }

      return <g key={n.id}>{childElements}</g>;
    };

    return (
      <svg
        id={isCompareView ? 'phylo-compare-svg' : 'phylo-tree-svg'}
        width="100%"
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{
          transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
          transformOrigin: '0 0',
          transition: isPanning ? 'none' : 'transform 0.15s ease'
        }}
      >
        {drawElements(root, paddingX)}
      </svg>
    );
  };

  const handleDownloadSvg = () => {
    const elem = document.getElementById('phylo-tree-svg');
    if (!elem) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(elem);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BioNexus_${method}_${model}_tree.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadNewick = () => {
    const blob = new Blob([newickStr], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BioNexus_${method}_tree.nwk`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadNexus = () => {
    const blob = new Blob([nexusStr], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BioNexus_${method}_alignment.nex`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="page-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div className="card-header" style={{ marginBottom: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="logo-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)' }}>
              Evolution Space
            </span>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
              Interactive Phylogenetic Workspace
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '6px' }}>
            Evolutionary tree reconstruction and topological hypothesis testing using Maximum Likelihood, Minimum Evolution, and Distance Matrices.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            className="btn-secondary"
            onClick={() => setCompareMode(!compareMode)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <GitCompare size={16} /> {compareMode ? 'Exit Comparison' : 'Compare Topologies'}
          </button>
        </div>
      </div>

      {/* Input Parameters Box */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <h3 className="card-title" style={{ marginBottom: '16px' }}>
          <Network size={18} color="var(--accent-cyan)" /> Evolutionary Models & Multi-FASTA Input
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div className="form-group">
            <label className="form-label">Inference Algorithm</label>
            <select
              className="select-field"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              disabled={isBuilding}
            >
              <option value="nj">Neighbor-Joining (NJ)</option>
              <option value="me">Minimum Evolution (ME - FastME criterion)</option>
              <option value="ml">Maximum Likelihood (ML - Felsenstein Pruning)</option>
              <option value="upgma">UPGMA (Clustered Distance)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Evolutionary Substitution Model</label>
            <select
              className="select-field"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={isBuilding}
            >
              <option value="jukes-cantor">Jukes-Cantor (JC69)</option>
              <option value="kimura-2p">Kimura 2-Parameter (K80 - Transitions/Transversions)</option>
              <option value="p-distance">p-Distance (Uncorrected Hamming)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Tree Diagram Layout</label>
            <select
              className="select-field"
              value={treeLayout}
              onChange={(e) => setTreeLayout(e.target.value)}
            >
              <option value="rectangular">Rectangular Phylogram</option>
              <option value="slanted">Slanted Cladogram</option>
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <label className="form-label" style={{ margin: 0 }}>Multi-FASTA DNA Sequences (At least 3 required)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                onClick={() => setFastaInput(samplePrimateDataset)}
                disabled={isBuilding}
              >
                Load Sample Dataset
              </button>
              {fastaInput && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.78rem', color: '#ef4444' }}
                  onClick={() => setFastaInput('')}
                  disabled={isBuilding}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <textarea
            className="textarea-field font-mono"
            rows={7}
            value={fastaInput}
            onChange={(e) => setFastaInput(e.target.value)}
            disabled={isBuilding}
            placeholder=">Homo_sapiens&#10;ATGCGATCGATC...&#10;>Pan_troglodytes&#10;ATGCGATCGATC...&#10;(or click 'Load Sample Dataset' above)"
          />
        </div>

        {errorMessage && (
          <div className="amber-warning-card" style={{ marginBottom: '16px', borderColor: 'var(--accent-rose)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle color="var(--accent-rose)" size={20} />
              <div>
                <strong style={{ color: 'var(--accent-rose)' }}>Reconstruction Error</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            className="btn-primary"
            onClick={handleBuildTree}
            disabled={isBuilding}
            style={{ padding: '12px 24px', fontSize: '0.92rem' }}
          >
            {isBuilding ? (
              <>
                <RefreshCw className="spin" size={18} /> Inferring Evolutionary Tree...
              </>
            ) : (
              <>
                <Play size={18} /> Reconstruct Phylogenetic Tree
              </>
            )}
          </button>

          {isBuilding && (
            <div style={{ fontSize: '0.88rem', color: 'var(--accent-cyan)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="pulse-dot" /> {loadingStep}
            </div>
          )}
        </div>
      </div>

      {/* Main Results View */}
      {treeData && distData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Key Metrics Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            <div className="stat-card">
              <div className="stat-label">Inference Method</div>
              <div className="stat-value" style={{ fontSize: '1.15rem', color: 'var(--accent-cyan)' }}>
                {method === 'nj' ? 'Neighbor-Joining' : method === 'me' ? 'Minimum Evolution' : method === 'ml' ? 'Maximum Likelihood' : 'UPGMA'}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Substitution Model</div>
              <div className="stat-value" style={{ fontSize: '1.15rem', color: 'var(--accent-blue)' }}>
                {model === 'jukes-cantor' ? 'JC69' : model === 'kimura-2p' ? 'K80' : 'p-Distance'}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Total Tree Length (S)</div>
              <div className="stat-value" style={{ fontSize: '1.15rem', color: 'var(--accent-emerald)' }}>
                {treeLengthVal != null ? `${treeLengthVal} sub/site` : 'N/A'}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Log-Likelihood ln L</div>
              <div className="stat-value" style={{ fontSize: '1.15rem', color: 'var(--accent-violet)' }}>
                {logLikelihoodVal != null ? logLikelihoodVal : 'N/A'}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Taxa Count / Length</div>
              <div className="stat-value" style={{ fontSize: '1.15rem', color: 'var(--accent-amber)' }}>
                {distData.labels.length} / {alignmentLength} bp
              </div>
            </div>
          </div>

          {/* Interactive Tree Canvas with Pan/Zoom & Inspector */}
          <div style={{ display: 'grid', gridTemplateColumns: compareMode ? '1fr 1fr' : '1fr 340px', gap: '20px', alignItems: 'start' }}>
            {/* Left: Interactive Tree Canvas */}
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
              {/* Canvas Toolbar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 18px',
                borderBottom: '1px solid var(--border-color)',
                background: 'rgba(11, 15, 25, 0.85)',
                backdropFilter: 'blur(8px)',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                {/* Search in Tree */}
                <div style={{ position: 'relative', width: '220px' }}>
                  <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    className="input-field"
                    style={{ paddingLeft: '32px', height: '32px', fontSize: '0.8rem' }}
                    placeholder="Search taxa..."
                    value={taxonSearchQuery}
                    onChange={(e) => setTaxonSearchQuery(e.target.value)}
                  />
                </div>

                {/* Display Toggles */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={showBranchLengths} 
                      onChange={(e) => setShowBranchLengths(e.target.checked)} 
                    />
                    Branch Lengths
                  </label>

                  {/* Zoom Controls */}
                  <button className="btn-icon" onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.2))} title="Zoom In">
                    <ZoomIn size={16} />
                  </button>
                  <button className="btn-icon" onClick={() => setZoomLevel(prev => Math.max(0.4, prev - 0.2))} title="Zoom Out">
                    <ZoomOut size={16} />
                  </button>
                  <button className="btn-icon" onClick={resetView} title="Fit to View">
                    <Maximize2 size={16} />
                  </button>
                </div>
              </div>

              {/* Pan/Zoom Canvas Area */}
              <div
                ref={svgContainerRef}
                style={{
                  background: '#070b14',
                  overflow: 'hidden',
                  cursor: isPanning ? 'grabbing' : 'grab',
                  minHeight: '440px',
                  userSelect: 'none'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                {renderTreeSvg(treeData)}
              </div>

              {/* Export Toolbar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 18px',
                borderTop: '1px solid var(--border-color)',
                background: 'rgba(11, 15, 25, 0.95)',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Drag to pan, click leaf to inspect biological links.
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={handleDownloadSvg}>
                    <Image size={14} /> SVG
                  </button>
                  <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={handleDownloadNewick}>
                    <Download size={14} /> Newick (.nwk)
                  </button>
                  <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={handleDownloadNexus}>
                    <FileText size={14} /> Nexus (.nex)
                  </button>
                </div>
              </div>
            </div>

            {/* Right Side: Tree Comparison OR Taxon Inspector */}
            {compareMode ? (
              /* Tree Comparison Panel */
              <div className="glass-card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 className="card-title" style={{ fontSize: '1rem' }}>
                    <GitCompare size={16} color="var(--accent-cyan)" /> Topological Comparison
                  </h3>
                  <button className="btn-icon" onClick={() => setCompareMode(false)}>✕</button>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  <select
                    className="select-field"
                    value={comparisonMethod}
                    onChange={(e) => setComparisonMethod(e.target.value)}
                    style={{ fontSize: '0.82rem' }}
                  >
                    <option value="ml">Compare with Maximum Likelihood</option>
                    <option value="nj">Compare with Neighbor-Joining</option>
                    <option value="me">Compare with Minimum Evolution</option>
                    <option value="upgma">Compare with UPGMA</option>
                  </select>
                  <button className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.82rem' }} onClick={handleRunComparison}>
                    Evaluate
                  </button>
                </div>

                {rfDistanceResult && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                    <div style={{
                      background: 'rgba(6, 182, 212, 0.1)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      borderRadius: '8px',
                      padding: '12px'
                    }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Robinson-Foulds Symmetric Distance:
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                        {rfDistanceResult.rfDistance} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>(Norm: {rfDistanceResult.normalizedDistance})</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Shared informative clades: {rfDistanceResult.sharedClades}
                      </div>
                    </div>
                  </div>
                )}

                {comparisonTreeData && (
                  <div style={{ background: '#070b14', borderRadius: '8px', padding: '12px', border: '1px solid var(--border-color)' }}>
                    {renderTreeSvg(comparisonTreeData, true)}
                  </div>
                )}
              </div>
            ) : (
              /* Taxon & Biological Link Inspector */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="glass-card" style={{ padding: '18px' }}>
                  <h3 className="card-title" style={{ marginBottom: '12px', fontSize: '1rem' }}>
                    <Eye size={16} color="var(--accent-emerald)" /> Taxon & Biological Links
                  </h3>

                  {selectedTaxon ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
                      <div style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '8px',
                        padding: '10px 14px'
                      }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                          {selectedTaxon.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Leaf identifier in current reconstructed tree
                        </div>
                      </div>

                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        This taxon is derived from the verified nucleotide alignment. You can immediately cross-inspect it in other scientific spaces:
                      </div>

                      {/* Action buttons linking to Genome & Protein spaces */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button
                          className="btn-primary"
                          style={{ width: '100%', fontSize: '0.82rem', justifyContent: 'center' }}
                          onClick={() => {
                            // Find matching sequence or create one
                            const seqItem = msaResultData?.alignedSequences?.find(s => s.name === selectedTaxon.name);
                            if (seqItem) {
                              setGlobalActiveSequence({
                                name: seqItem.name,
                                sequence: seqItem.alignedSeq.replace(/-/g, ''),
                                source: 'Evolutionary Taxon'
                              });
                            }
                            setActiveTab('analysis');
                          }}
                        >
                          Analyze in Genome Space
                        </button>

                        <button
                          className="btn-secondary"
                          style={{ width: '100%', fontSize: '0.82rem', justifyContent: 'center' }}
                          onClick={() => {
                            setActiveTab('protein');
                          }}
                        >
                          Explore in Protein Space
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      Click any leaf node in the phylogenetic tree to inspect linked genomic records, species classifications, and structures.
                    </div>
                  )}
                </div>

                {/* Newick String Preview */}
                <div className="glass-card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Newick Tree Topology
                  </div>
                  <div className="sequence-box font-mono" style={{ fontSize: '0.78rem', maxHeight: '110px' }}>
                    {newickStr}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pairwise Distance Matrix Table */}
          <div className="glass-card" style={{ padding: '18px' }}>
            <h3 className="card-title" style={{ marginBottom: '14px', fontSize: '1rem' }}>
              <FileText size={16} color="var(--accent-blue)" /> Pairwise Distance Matrix ({model.toUpperCase()})
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table font-mono" style={{ fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th>Taxon</th>
                    {distData.labels.map((lbl, idx) => (
                      <th key={idx}>{lbl}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {distData.labels.map((lbl, rIdx) => (
                    <tr key={rIdx}>
                      <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{lbl}</td>
                      {distData.formattedMatrix[rIdx].map((val, cIdx) => (
                        <td
                          key={cIdx}
                          style={{
                            background: rIdx === cIdx ? 'rgba(255,255,255,0.03)' : 'transparent',
                            fontWeight: rIdx === cIdx ? 400 : 600
                          }}
                        >
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
