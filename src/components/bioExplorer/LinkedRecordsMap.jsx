import React, { useState, useEffect } from 'react';
import { 
  Network, ExternalLink, Info, CheckCircle2, AlertTriangle, 
  Dna, Boxes, GitFork, ArrowRight, RefreshCw, Layers 
} from 'lucide-react';
import { fetchLinkedRecordsMap } from '../../services/bioDatabaseService';

export default function LinkedRecordsMap({ record, onSendToTool }) {
  const [loading, setLoading] = useState(true);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [error, setError] = useState(null);

  const loadGraph = async () => {
    if (!record) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLinkedRecordsMap(record);
      setGraphData(data);
      if (data.nodes.length > 0) {
        setSelectedNode(data.nodes.find(n => n.isRoot) || data.nodes[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to construct linked records graph');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraph();
  }, [record?.id, record?.accession]);

  if (loading) {
    return (
      <div style={{
        padding: '36px',
        textAlign: 'center',
        background: 'rgba(15, 23, 42, 0.6)',
        borderRadius: '12px',
        border: '1px solid rgba(56, 189, 248, 0.15)'
      }}>
        <RefreshCw className="spin" size={24} style={{ color: '#06b6d4', marginBottom: '10px' }} />
        <p style={{ fontSize: '0.86rem', color: '#94a3b8', margin: 0 }}>
          Querying NCBI ELink, UniProt cross-references, and ENA linkages for {record?.accession}...
        </p>
      </div>
    );
  }

  if (error || graphData.nodes.length === 0) {
    return (
      <div style={{
        padding: '24px',
        background: 'rgba(15, 23, 42, 0.5)',
        borderRadius: '12px',
        border: '1px solid rgba(148, 163, 184, 0.15)',
        color: '#94a3b8',
        fontSize: '0.85rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', marginBottom: '6px' }}>
          <AlertTriangle size={16} />
          <strong>No Cross-Reference Graph Available</strong>
        </div>
        <p style={{ margin: 0 }}>
          This record does not have verified cross-references available via NCBI ELink or UniProt. BioNexus never guesses or fabricates hypothetical relationships.
        </p>
      </div>
    );
  }

  const { nodes, edges } = graphData;

  // Lay out nodes sequentially horizontally
  const nodeWidth = 200;
  const nodeHeight = 74;
  const gapX = 80;
  const startX = 40;
  const centerY = 90;

  const positionedNodes = nodes.map((node, idx) => ({
    ...node,
    x: startX + idx * (nodeWidth + gapX),
    y: centerY - nodeHeight / 2
  }));

  const svgWidth = Math.max(760, startX + nodes.length * (nodeWidth + gapX) + 40);
  const svgHeight = 200;

  return (
    <div style={{
      background: '#0c1322',
      borderRadius: '12px',
      border: '1px solid rgba(56, 189, 248, 0.2)',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px'
    }}>
      {/* Header & Provenance rule badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Network size={16} color="#06b6d4" /> Linked Records Provenance Map
          </h4>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Strict real cross-reference traversal: Gene → Transcript → Protein → UniProt → 3D Structure
          </span>
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(6, 182, 212, 0.1)',
          border: '1px solid rgba(6, 182, 212, 0.25)',
          padding: '3px 10px',
          borderRadius: '20px',
          fontSize: '0.74rem',
          color: '#38bdf8'
        }}>
          <CheckCircle2 size={13} color="#38bdf8" />
          <span>Real API Backed • 0 Fabricated Edges</span>
        </div>
      </div>

      {/* SVG Canvas for Nodes and Edges */}
      <div style={{
        overflowX: 'auto',
        background: '#090f1d',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '10px'
      }}>
        <svg width={svgWidth} height={svgHeight} style={{ display: 'block' }}>
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#06b6d4" />
            </marker>
            <marker
              id="arrowhead-hover"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#facc15" />
            </marker>
          </defs>

          {/* Render Edges */}
          {edges.map((edge, idx) => {
            const sourceNode = positionedNodes.find(n => n.id === edge.source);
            const targetNode = positionedNodes.find(n => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;

            const x1 = sourceNode.x + nodeWidth;
            const y1 = sourceNode.y + nodeHeight / 2;
            const x2 = targetNode.x;
            const y2 = targetNode.y + nodeHeight / 2;
            const isHovered = hoveredEdge === idx;

            return (
              <g 
                key={`edge_${idx}`}
                onMouseEnter={() => setHoveredEdge(idx)}
                onMouseLeave={() => setHoveredEdge(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Thick invisible hit target */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="transparent"
                  strokeWidth="16"
                />
                {/* Visible Line */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isHovered ? '#facc15' : targetNode.status === 'missing' ? '#64748b' : '#06b6d4'}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  strokeDasharray={targetNode.status === 'missing' ? '4,4' : 'none'}
                  markerEnd={isHovered ? 'url(#arrowhead-hover)' : 'url(#arrowhead)'}
                  style={{ transition: 'stroke 0.15s ease' }}
                />
                {/* Edge Label badge */}
                <rect
                  x={(x1 + x2) / 2 - 42}
                  y={(y1 + y2) / 2 - 11}
                  width="84"
                  height="22"
                  rx="4"
                  fill="#0c1322"
                  stroke={isHovered ? '#facc15' : 'rgba(56, 189, 248, 0.3)'}
                  strokeWidth="1"
                />
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 + 4}
                  fill={isHovered ? '#facc15' : '#94a3b8'}
                  fontSize="9"
                  fontFamily="'Inter', sans-serif"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {edge.label || 'Linked'}
                </text>
              </g>
            );
          })}

          {/* Render Nodes */}
          {positionedNodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            const isMissing = node.status === 'missing';

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => setSelectedNode(node)}
                style={{ cursor: 'pointer' }}
              >
                {/* Node Box */}
                <rect
                  width={nodeWidth}
                  height={nodeHeight}
                  rx="10"
                  fill={isMissing ? '#101626' : isSelected ? '#16223b' : '#111b2f'}
                  stroke={isMissing ? '#475569' : isSelected ? '#38bdf8' : 'rgba(56, 189, 248, 0.2)'}
                  strokeWidth={isSelected ? 2 : 1}
                  strokeDasharray={isMissing ? '4,4' : 'none'}
                  style={{ transition: 'all 0.15s ease' }}
                />

                {/* Node Header Pill */}
                <rect
                  x="8"
                  y="8"
                  width="60"
                  height="16"
                  rx="3"
                  fill={isMissing ? 'rgba(100, 116, 139, 0.2)' : 'rgba(6, 182, 212, 0.18)'}
                />
                <text
                  x="38"
                  y="19"
                  fill={isMissing ? '#94a3b8' : '#38bdf8'}
                  fontSize="8"
                  fontFamily="'Inter', sans-serif"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {node.sublabel || 'NODE'}
                </text>

                {/* Node Source Label */}
                <text
                  x={nodeWidth - 10}
                  y="19"
                  fill="#64748b"
                  fontSize="8"
                  fontFamily="'Inter', sans-serif"
                  textAnchor="end"
                >
                  {node.source}
                </text>

                {/* Node Label (Accession / Title) */}
                <text
                  x="10"
                  y="42"
                  fill={isMissing ? '#94a3b8' : '#f8fafc'}
                  fontSize="12"
                  fontFamily="'JetBrains Mono', monospace"
                  fontWeight="700"
                >
                  {node.label.length > 20 ? `${node.label.slice(0, 18)}…` : node.label}
                </text>

                {/* Node Status / Subtext */}
                <text
                  x="10"
                  y="60"
                  fill={isMissing ? '#ef4444' : '#94a3b8'}
                  fontSize="9"
                  fontFamily="'Inter', sans-serif"
                >
                  {isMissing ? 'No Cross-Ref Found' : node.isRoot ? 'Focus Query Record' : 'Verified Real Link'}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Edge Hover Tooltip / Provenance Explanation */}
      {hoveredEdge !== null && edges[hoveredEdge] && (
        <div style={{
          background: 'rgba(250, 204, 21, 0.08)',
          border: '1px solid rgba(250, 204, 21, 0.3)',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '0.8rem',
          color: '#fef08a',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Info size={15} color="#facc15" />
          <span>
            <strong>Edge Provenance:</strong> {edges[hoveredEdge].provenance}
          </span>
        </div>
      )}

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div style={{
          background: '#090f1d',
          border: '1px solid rgba(56, 189, 248, 0.15)',
          borderRadius: '8px',
          padding: '12px 14px',
          fontSize: '0.82rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <span style={{ fontWeight: 700, color: '#f8fafc', fontFamily: "'JetBrains Mono', monospace" }}>
                {selectedNode.label}
              </span>
              <span style={{
                background: selectedNode.status === 'missing' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                color: selectedNode.status === 'missing' ? '#ef4444' : '#38bdf8',
                padding: '1px 6px',
                borderRadius: '4px',
                fontSize: '0.72rem',
                fontWeight: 600
              }}>
                {selectedNode.sublabel}
              </span>
            </div>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.78rem' }}>
              Source: {selectedNode.source} {selectedNode.reason ? `• ${selectedNode.reason}` : ''}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {selectedNode.url && (
              <a
                href={selectedNode.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#cbd5e1',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '0.76rem',
                  textDecoration: 'none'
                }}
              >
                <span>Official Record</span>
                <ExternalLink size={12} />
              </a>
            )}

            {selectedNode.pdbId && onSendToTool && (
              <button
                type="button"
                onClick={() => onSendToTool('protein', { pdbId: selectedNode.pdbId })}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(6, 182, 212, 0.18)',
                  border: '1px solid rgba(6, 182, 212, 0.4)',
                  color: '#06b6d4',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                <Boxes size={13} />
                <span>Open in Protein Space</span>
              </button>
            )}

            {(selectedNode.type === 'transcript' || selectedNode.type === 'nucleotide') && onSendToTool && (
              <button
                type="button"
                onClick={() => onSendToTool('analysis', selectedNode)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(139, 92, 246, 0.18)',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  color: '#a78bfa',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                <Dna size={13} />
                <span>Analyze Sequence</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
