import React, { useState, useRef } from 'react';
import { 
  ZoomIn, ZoomOut, Maximize2, MoveRight, MoveLeft, 
  MapPin, Eye, Dna, Info, Target, AlertCircle
} from 'lucide-react';
import { complement } from '../../utils/sequenceEngine';

export default function SequenceMapPane({
  sequence,
  sequenceName,
  targetRegion,
  excludedRegion,
  selectedPair,
  allPairs,
  onSelectPair
}) {
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = fit/compact, 2 = standard, 4 = detailed base-by-base
  const [showAntisense, setShowAntisense] = useState(true);
  const scrollContainerRef = useRef(null);

  const seqLength = sequence ? sequence.length : 0;
  const fwd = selectedPair?.forward;
  const rev = selectedPair?.reverse;
  const amplicon = selectedPair?.amplicon;

  const handleMinimapClick = (e) => {
    if (!seqLength || !scrollContainerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = clickX / rect.width;
    const targetScroll = fraction * scrollContainerRef.current.scrollWidth;
    scrollContainerRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
  };

  const jumpToRegion = (startBp) => {
    if (!seqLength || !scrollContainerRef.current) return;
    const fraction = Math.max(0, startBp - 1) / seqLength;
    const targetScroll = fraction * scrollContainerRef.current.scrollWidth;
    scrollContainerRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
  };

  return (
    <main className="pd-pane-center">
      {/* Viewer Header / Toolbar */}
      <div className="pd-seq-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 700, color: 'var(--pd-text)', fontSize: '0.82rem' }}>
            Sequence Map
          </span>
          {seqLength > 0 && (
            <span style={{ fontSize: '0.74rem', color: 'var(--pd-text-muted)' }}>
              {sequenceName || 'Template'} ({seqLength} bp)
            </span>
          )}
          {amplicon && (
            <span className="pd-chip pd-chip-cyan" style={{ fontSize: '0.7rem' }}>
              Selected Amplicon: {amplicon.size} bp (bp {amplicon.start}–{amplicon.end})
            </span>
          )}
        </div>

        {/* View Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            className={`pd-btn pd-btn-sm ${showAntisense ? 'pd-btn-primary' : 'pd-btn-ghost'}`}
            style={{ fontSize: '0.7rem', padding: '2px 6px' }}
            onClick={() => setShowAntisense(!showAntisense)}
            title="Toggle complementary strand"
          >
            3' Complement
          </button>

          <button
            type="button"
            className="pd-btn pd-btn-ghost pd-btn-sm"
            style={{ padding: '4px' }}
            onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.3))}
            disabled={zoomLevel <= 0.6}
            title="Zoom Out"
          >
            <ZoomOut size={13} />
          </button>
          <span style={{ fontSize: '0.7rem', color: 'var(--pd-text-muted)', minWidth: '32px', textAlign: 'center' }}>
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            className="pd-btn pd-btn-ghost pd-btn-sm"
            style={{ padding: '4px' }}
            onClick={() => setZoomLevel(prev => Math.min(3.5, prev + 0.3))}
            disabled={zoomLevel >= 3.5}
            title="Zoom In"
          >
            <ZoomIn size={13} />
          </button>
          <button
            type="button"
            className="pd-btn pd-btn-ghost pd-btn-sm"
            style={{ padding: '4px' }}
            onClick={() => setZoomLevel(1)}
            title="Reset Zoom"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* Overview Mini-Map Bar */}
      {seqLength > 0 && (
        <div className="pd-minimap-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--pd-text-subtle)' }}>
            <span>1 bp</span>
            <div style={{ display: 'flex', gap: '14px' }}>
              {targetRegion && (
                <span style={{ color: '#eab308', cursor: 'pointer' }} onClick={() => jumpToRegion(targetRegion.start)}>
                  Target: {targetRegion.start}–{targetRegion.start + targetRegion.len - 1} bp
                </span>
              )}
              {excludedRegion && (
                <span style={{ color: '#ef4444', cursor: 'pointer' }} onClick={() => jumpToRegion(excludedRegion.start)}>
                  Excluded: {excludedRegion.start}–{excludedRegion.start + excludedRegion.len - 1} bp
                </span>
              )}
              {amplicon && (
                <span style={{ color: 'var(--pd-accent)', cursor: 'pointer' }} onClick={() => jumpToRegion(amplicon.start)}>
                  Amplicon: {amplicon.start}–{amplicon.end} bp
                </span>
              )}
            </div>
            <span>{seqLength} bp</span>
          </div>

          <div className="pd-minimap-track" onClick={handleMinimapClick} title="Click to navigate along sequence">
            {/* Target Region Span on Minimap */}
            {targetRegion && (
              <div
                className="pd-minimap-target"
                style={{
                  left: `${(targetRegion.start / seqLength) * 100}%`,
                  width: `${(targetRegion.len / seqLength) * 100}%`
                }}
                title={`Target Region (${targetRegion.start} - ${targetRegion.start + targetRegion.len - 1} bp)`}
              />
            )}

            {/* Excluded Region Span on Minimap */}
            {excludedRegion && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  background: 'var(--pd-excluded-bg)',
                  borderLeft: '1px solid var(--pd-excluded-border)',
                  borderRight: '1px solid var(--pd-excluded-border)',
                  left: `${(excludedRegion.start / seqLength) * 100}%`,
                  width: `${(excludedRegion.len / seqLength) * 100}%`
                }}
                title={`Excluded Region (${excludedRegion.start} - ${excludedRegion.start + excludedRegion.len - 1} bp)`}
              />
            )}

            {/* Selected Amplicon Span on Minimap */}
            {amplicon && (
              <div
                className="pd-minimap-amplicon"
                style={{
                  left: `${((amplicon.start - 1) / seqLength) * 100}%`,
                  width: `${(amplicon.size / seqLength) * 100}%`
                }}
                title={`Amplicon (${amplicon.start} - ${amplicon.end} bp)`}
              />
            )}

            {/* Forward Primer Arrow on Minimap */}
            {fwd && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${((fwd.start - 1) / seqLength) * 100}%`,
                  width: `${(fwd.length / seqLength) * 100}%`,
                  background: 'var(--pd-accent)',
                  opacity: 0.9
                }}
                title={`Fwd Primer (${fwd.start}-${fwd.end} bp)`}
              />
            )}

            {/* Reverse Primer Arrow on Minimap */}
            {rev && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${((rev.start - 1) / seqLength) * 100}%`,
                  width: `${(rev.length / seqLength) * 100}%`,
                  background: 'var(--pd-rev-primer)',
                  opacity: 0.9
                }}
                title={`Rev Primer (${rev.start}-${rev.end} bp)`}
              />
            )}
          </div>
        </div>
      )}

      {/* Main Interactive Sequence Workspace Track */}
      <div className="pd-seq-track" ref={scrollContainerRef}>
        {seqLength === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '40px', color: 'var(--pd-text-muted)' }}>
            <Dna size={40} color="var(--pd-border)" />
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--pd-text)' }}>
              No Sequence Loaded
            </span>
            <p style={{ fontSize: '0.8rem', maxWidth: '380px', textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
              Paste a DNA template, upload a FASTA file, or enter an NCBI Accession in the left panel to begin primer design.
            </p>
          </div>
        ) : (
          <div style={{ padding: '24px', minWidth: 'max-content' }}>
            {/* Visual Primer Legend */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', fontSize: '0.74rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'var(--pd-accent)' }} />
                <span>Forward Primer (5' → 3')</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'var(--pd-rev-primer)' }} />
                <span>Reverse Primer (3' ← 5')</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'var(--pd-amplicon-bg)', border: '1px solid var(--pd-amplicon-border)' }} />
                <span>Amplicon Span</span>
              </div>
              {targetRegion && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'var(--pd-target-bg)', border: '1px solid var(--pd-target-border)' }} />
                  <span>Target Region</span>
                </div>
              )}
            </div>

            {/* Sequence Blocks Rendered in Manageable Segments */}
            <SequenceBlocksRenderer
              sequence={sequence}
              showAntisense={showAntisense}
              zoomLevel={zoomLevel}
              selectedPair={selectedPair}
              targetRegion={targetRegion}
              excludedRegion={excludedRegion}
            />
          </div>
        )}
      </div>
    </main>
  );
}

// Subcomponent: Renders sequence in standard biological rows (e.g. 60 or 100 bp per row)
function SequenceBlocksRenderer({
  sequence,
  showAntisense,
  zoomLevel,
  selectedPair,
  targetRegion,
  excludedRegion
}) {
  const blockSize = zoomLevel < 1 ? 100 : zoomLevel > 2 ? 50 : 80;
  const numBlocks = Math.ceil(sequence.length / blockSize);
  const blocks = [];

  const fwd = selectedPair?.forward;
  const rev = selectedPair?.reverse;

  for (let b = 0; b < numBlocks; b++) {
    const startBp = b * blockSize + 1;
    const endBp = Math.min((b + 1) * blockSize, sequence.length);
    const chunk = sequence.slice(startBp - 1, endBp);
    const chunkComplement = chunk.split('').map(complement).join('');

    // Check if primers overlap this chunk
    const fwdOverlap = fwd && !(fwd.end < startBp || fwd.start > endBp);
    const revOverlap = rev && !(rev.end < startBp || rev.start > endBp);
    const ampliconOverlap = selectedPair?.amplicon && !(selectedPair.amplicon.end < startBp || selectedPair.amplicon.start > endBp);

    blocks.push(
      <div
        key={startBp}
        style={{
          marginBottom: '20px',
          background: 'var(--pd-surface)',
          border: '1px solid var(--pd-border)',
          borderRadius: '8px',
          padding: '12px 16px',
          position: 'relative'
        }}
      >
        {/* Block Header with Position Range */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--pd-text-subtle)', marginBottom: '8px', borderBottom: '1px solid var(--pd-border-subtle)', paddingBottom: '4px' }}>
          <span>bp {startBp}</span>
          <span style={{ fontFamily: 'var(--pd-font-mono)' }}>{startBp} – {endBp}</span>
        </div>

        {/* Forward Primer Annotation Track (if present in this chunk) */}
        {fwdOverlap && (
          <div style={{ marginBottom: '4px', height: '18px', position: 'relative', display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                background: 'var(--pd-accent)',
                color: '#04131f',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 8px rgba(6, 182, 212, 0.3)'
              }}
            >
              <span>FWD PRIMER ({fwd.length} bp)</span>
              <MoveRight size={12} />
              <span style={{ fontSize: '0.65rem', opacity: 0.85 }}>Tm {fwd.tm}°C</span>
            </div>
          </div>
        )}

        {/* Nucleotide Sequence Row (Sense strand) */}
        <div style={{ fontFamily: 'var(--pd-font-mono)', fontSize: '0.85rem', letterSpacing: '0.12em', whiteSpace: 'pre', overflowX: 'auto', padding: '2px 0' }}>
          <span style={{ color: 'var(--pd-text-subtle)', marginRight: '8px', fontSize: '0.72rem', userSelect: 'none' }}>5'</span>
          {chunk.split('').map((char, idx) => {
            const currentPos = startBp + idx;
            const isFwd = fwd && currentPos >= fwd.start && currentPos <= fwd.end;
            const isRev = rev && currentPos >= rev.start && currentPos <= rev.end;
            const isTarget = targetRegion && currentPos >= targetRegion.start && currentPos < targetRegion.start + targetRegion.len;
            const isExcluded = excludedRegion && currentPos >= excludedRegion.start && currentPos < excludedRegion.start + excludedRegion.len;
            const isAmp = selectedPair?.amplicon && currentPos >= selectedPair.amplicon.start && currentPos <= selectedPair.amplicon.end;

            let bg = 'transparent';
            let color = char === 'A' ? 'var(--pd-base-a, #10b981)' :
                        char === 'T' ? 'var(--pd-base-t, #ef4444)' :
                        char === 'C' ? 'var(--pd-base-c, #3b82f6)' :
                        char === 'G' ? 'var(--pd-base-g, #f59e0b)' : 'inherit';

            if (isFwd) {
              bg = 'rgba(6, 182, 212, 0.35)';
              color = '#22d3ee';
            } else if (isRev) {
              bg = 'rgba(244, 63, 94, 0.35)';
              color = '#fb7185';
            } else if (isTarget) {
              bg = 'var(--pd-target-bg)';
            } else if (isExcluded) {
              bg = 'var(--pd-excluded-bg)';
            } else if (isAmp) {
              bg = 'var(--pd-amplicon-bg)';
            }

            return (
              <span
                key={currentPos}
                style={{
                  backgroundColor: bg,
                  color,
                  fontWeight: (isFwd || isRev) ? 700 : 500,
                  borderRadius: '2px',
                  padding: '1px 0'
                }}
                title={`Position: ${currentPos} bp (${char})`}
              >
                {char}
              </span>
            );
          })}
          <span style={{ color: 'var(--pd-text-subtle)', marginLeft: '8px', fontSize: '0.72rem', userSelect: 'none' }}>3'</span>
        </div>

        {/* Complementary Strand Row (Antisense strand) */}
        {showAntisense && (
          <div style={{ fontFamily: 'var(--pd-font-mono)', fontSize: '0.85rem', letterSpacing: '0.12em', whiteSpace: 'pre', overflowX: 'auto', padding: '2px 0', opacity: 0.75 }}>
            <span style={{ color: 'var(--pd-text-subtle)', marginRight: '8px', fontSize: '0.72rem', userSelect: 'none' }}>3'</span>
            {chunkComplement.split('').map((char, idx) => {
              const currentPos = startBp + idx;
              const isRev = rev && currentPos >= rev.start && currentPos <= rev.end;
              return (
                <span
                  key={currentPos}
                  style={{
                    color: isRev ? '#fb7185' : 'var(--pd-text-muted)',
                    backgroundColor: isRev ? 'rgba(244, 63, 94, 0.25)' : 'transparent',
                    fontWeight: isRev ? 700 : 400
                  }}
                >
                  {char}
                </span>
              );
            })}
            <span style={{ color: 'var(--pd-text-subtle)', marginLeft: '8px', fontSize: '0.72rem', userSelect: 'none' }}>5'</span>
          </div>
        )}

        {/* Reverse Primer Annotation Track (if present in this chunk) */}
        {revOverlap && (
          <div style={{ marginTop: '4px', height: '18px', position: 'relative', display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                background: 'var(--pd-rev-primer)',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 8px rgba(244, 63, 94, 0.3)'
              }}
            >
              <MoveLeft size={12} />
              <span>REV PRIMER ({rev.length} bp)</span>
              <span style={{ fontSize: '0.65rem', opacity: 0.85 }}>Tm {rev.tm}°C</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return <div>{blocks}</div>;
}
