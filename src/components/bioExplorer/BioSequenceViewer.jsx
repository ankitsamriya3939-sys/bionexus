import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Copy, Check, Download, Info, RefreshCw, ZoomIn, 
  ZoomOut, FileText, Bookmark, Sliders 
} from 'lucide-react';
import { fetchRecordFasta } from '../../services/bioDatabaseService';

export default function BioSequenceViewer({ record, initialFasta = null }) {
  const [fastaData, setFastaData] = useState(initialFasta);
  const [loading, setLoading] = useState(!initialFasta);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);

  // Virtual windowing state
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const LINE_LENGTH = 60; // 60 bases/residues per line
  const ROW_HEIGHT = 24;  // px per line

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (initialFasta?.sequence) {
        setFastaData(initialFasta);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await fetchRecordFasta(record);
        if (isMounted) {
          setFastaData(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to download FASTA sequence');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [record?.id, record?.accession, initialFasta]);

  const sequence = fastaData?.sequence || '';
  const seqLength = sequence.length;

  // Split sequence into 60-char lines
  const lines = useMemo(() => {
    if (!sequence) return [];
    const res = [];
    for (let i = 0; i < sequence.length; i += LINE_LENGTH) {
      res.push({
        startCoord: i + 1,
        text: sequence.slice(i, i + LINE_LENGTH)
      });
    }
    return res;
  }, [sequence]);

  // Virtual windowing calculation
  const totalLines = lines.length;
  const containerHeight = 360;
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT);
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 5);
  const endIndex = Math.min(totalLines, startIndex + visibleCount + 10);
  const visibleLines = lines.slice(startIndex, endIndex);

  const handleCopy = () => {
    if (!sequence) return;
    navigator.clipboard.writeText(sequence);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFasta = () => {
    if (!fastaData?.rawFasta) return;
    const blob = new Blob([fastaData.rawFasta], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${record?.accession || 'sequence'}.fasta`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleScroll = (e) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const handleMinimapClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const targetLine = Math.floor(percent * totalLines);
    if (containerRef.current) {
      containerRef.current.scrollTop = targetLine * ROW_HEIGHT;
    }
  };

  if (loading) {
    return (
      <div style={{
        padding: '48px',
        textAlign: 'center',
        background: '#090f1d',
        borderRadius: '12px',
        border: '1px solid rgba(56, 189, 248, 0.15)'
      }}>
        <RefreshCw className="spin" size={24} style={{ color: '#06b6d4', marginBottom: '10px' }} />
        <p style={{ fontSize: '0.86rem', color: '#94a3b8', margin: 0 }}>
          Streaming verified coordinates from {record?.source} for {record?.accession}...
        </p>
      </div>
    );
  }

  if (error || !sequence) {
    return (
      <div style={{
        padding: '24px',
        background: 'rgba(239, 68, 68, 0.08)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '12px',
        color: '#f87171',
        fontSize: '0.85rem'
      }}>
        <strong>Sequence Unavailable:</strong> {error || 'No FASTA sequence could be parsed for this record.'}
      </div>
    );
  }

  const metrics = fastaData?.metrics;
  const isProtein = record?.moleculeType === 'protein' || record?.recordType === 'protein';
  const features = record?.features || [];

  return (
    <div style={{
      background: '#0c1322',
      borderRadius: '12px',
      border: '1px solid rgba(56, 189, 248, 0.2)',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      {/* Top Header Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: '10px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              fontSize: '0.92rem',
              color: '#38bdf8'
            }}>
              {record?.accession}
            </span>
            <span style={{
              background: 'rgba(56, 189, 248, 0.12)',
              color: '#38bdf8',
              fontSize: '0.74rem',
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 600
            }}>
              {seqLength.toLocaleString()} {isProtein ? 'aa' : 'bp'}
            </span>
            <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
              ({isProtein ? 'Amino Acid Residues' : 'Nucleotide Bases'})
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={handleCopy}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${copied ? '#10b981' : 'rgba(255, 255, 255, 0.15)'}`,
              color: copied ? '#10b981' : '#cbd5e1',
              borderRadius: '6px',
              padding: '5px 12px',
              fontSize: '0.78rem',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.15s ease'
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy Sequence'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadFasta}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid rgba(6, 182, 212, 0.35)',
              color: '#38bdf8',
              borderRadius: '6px',
              padding: '5px 12px',
              fontSize: '0.78rem',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            <Download size={13} />
            <span>Download FASTA</span>
          </button>
        </div>
      </div>

      {/* Feature Track Annotation Strip (if real features exist) */}
      {features.length > 0 && (
        <div style={{
          background: '#090f1d',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '10px 12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bookmark size={13} color="#06b6d4" /> Real Annotated Feature Tracks ({features.length} features)
            </span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Source: {record?.source} UniProtKB Annotation
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            {features.slice(0, 10).map((feat, idx) => {
              const start = feat.location?.start?.value || 1;
              const end = feat.location?.end?.value || start;
              const isSelected = selectedFeature === idx;
              return (
                <button
                  key={`feat_${idx}`}
                  type="button"
                  onClick={() => {
                    setSelectedFeature(idx);
                    const targetLine = Math.floor((start - 1) / LINE_LENGTH);
                    if (containerRef.current) {
                      containerRef.current.scrollTop = targetLine * ROW_HEIGHT;
                    }
                  }}
                  style={{
                    background: isSelected ? 'rgba(6, 182, 212, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${isSelected ? '#06b6d4' : 'rgba(255, 255, 255, 0.1)'}`,
                    color: isSelected ? '#38bdf8' : '#cbd5e1',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <strong>{feat.type}</strong>: {start}-{end} {feat.description ? `(${feat.description})` : ''}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Minimap Position Bar */}
      <div 
        onClick={handleMinimapClick}
        title="Interactive Sequence Minimap - Click to jump"
        style={{
          height: '14px',
          background: '#090f1d',
          borderRadius: '4px',
          border: '1px solid rgba(56, 189, 248, 0.15)',
          position: 'relative',
          cursor: 'pointer',
          overflow: 'hidden'
        }}
      >
        {/* Scroller Thumb Indicator */}
        <div style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${(scrollTop / (totalLines * ROW_HEIGHT || 1)) * 100}%`,
          width: `${Math.max(4, (visibleCount / totalLines) * 100)}%`,
          background: 'rgba(6, 182, 212, 0.5)',
          borderRadius: '3px'
        }} />
      </div>

      {/* Virtualized Sequence Window */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          height: `${containerHeight}px`,
          overflowY: 'auto',
          background: '#090f1d',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          position: 'relative',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.84rem'
        }}
      >
        {/* Virtual Scroll Spacer */}
        <div style={{ height: `${totalLines * ROW_HEIGHT}px`, position: 'relative' }}>
          {visibleLines.map((line, offset) => {
            const actualIndex = startIndex + offset;
            const topPos = actualIndex * ROW_HEIGHT;

            // Format into blocks of 10 for ease of reading
            const formattedBlocks = line.text.match(/.{1,10}/g)?.join(' ') || line.text;

            return (
              <div
                key={`line_${actualIndex}`}
                style={{
                  position: 'absolute',
                  top: `${topPos}px`,
                  left: 0,
                  right: 0,
                  height: `${ROW_HEIGHT}px`,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  color: '#e2e8f0',
                  lineHeight: `${ROW_HEIGHT}px`
                }}
              >
                {/* 1-based coordinate line number */}
                <span style={{
                  width: '65px',
                  color: '#64748b',
                  fontSize: '0.74rem',
                  userSelect: 'none',
                  textAlign: 'right',
                  paddingRight: '14px',
                  borderRight: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  {line.startCoord}
                </span>

                {/* Sequence Characters */}
                <span style={{
                  paddingLeft: '14px',
                  letterSpacing: '0.5px'
                }}>
                  {formattedBlocks}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* BioNexus Computed Metrics Bar (Clearly Labeled With Method) */}
      {metrics && (
        <div style={{
          background: 'rgba(6, 182, 212, 0.06)',
          border: '1px solid rgba(6, 182, 212, 0.25)',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '0.8rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: 700 }}>
            <Sliders size={14} />
            <span>BioNexus Real Computed Sequence Properties</span>
          </div>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', color: '#cbd5e1' }}>
            <div>
              <span>Length: </span>
              <strong style={{ color: '#f8fafc' }}>{metrics.length} {metrics.unit}</strong>
            </div>

            {metrics.gcPercent !== undefined && (
              <div>
                <span>GC Content: </span>
                <strong style={{ color: '#f8fafc' }}>{metrics.gcPercent}%</strong>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: '6px' }}>
                  {metrics.gcFormula}
                </span>
              </div>
            )}

            <div>
              <span>Estimated Mol Weight: </span>
              <strong style={{ color: '#f8fafc' }}>{metrics.molecularWeightKDa} kDa</strong>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: '6px' }}>
                {metrics.mwFormula}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
