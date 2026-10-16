import React, { useState } from 'react';
import { 
  X, Database, Dna, Boxes, GitFork, Copy, Check, 
  ExternalLink, Pin, ShieldCheck, FileCode, Network, 
  Layers, Bookmark, Info, Scissors, Zap, GitMerge, FileText 
} from 'lucide-react';
import BioSequenceViewer from './BioSequenceViewer';
import LinkedRecordsMap from './LinkedRecordsMap';
import { calculateContrastRatio } from '../../services/bioDatabaseService';

export default function RecordDetailModal({
  record,
  isOpen,
  onClose,
  onSendToTool,
  isPinned,
  onTogglePin
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedAcc, setCopiedAcc] = useState(false);

  if (!isOpen || !record) return null;

  // Determine available tabs dynamically based on real data presence
  const hasSequence = (record.length && record.length > 0) || record.recordType !== 'gene';
  const hasFeatures = Array.isArray(record.features) && record.features.length > 0;
  const hasLinkedRecords = true; // Can always attempt real cross-reference traversal
  const hasCrossRefs = (record.pdbRefs?.length > 0) || 
    (record.refseqRefs?.length > 0) || 
    (record.geneIdRefs?.length > 0) || 
    (record.raw?.uniProtKBCrossReferences?.length > 0);
  const hasEvidence = Array.isArray(record.evidenceCodes) && record.evidenceCodes.length > 0;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Info },
    ...(hasSequence ? [{ id: 'sequence', label: 'Sequence', icon: Dna }] : []),
    ...(hasFeatures ? [{ id: 'features', label: `Features (${record.features.length})`, icon: Bookmark }] : []),
    ...(hasLinkedRecords ? [{ id: 'linked', label: 'Linked Records', icon: Network }] : []),
    ...(hasCrossRefs ? [{ id: 'xrefs', label: 'Cross-References', icon: Layers }] : []),
    ...(hasEvidence ? [{ id: 'evidence', label: `Evidence (${record.evidenceCodes.length})`, icon: ShieldCheck }] : []),
    { id: 'provenance', label: 'Provenance', icon: ShieldCheck },
    { id: 'raw', label: 'Raw Record', icon: FileCode }
  ];

  const currentTab = tabs.find(t => t.id === activeTab) ? activeTab : 'overview';

  const handleCopyAcc = () => {
    navigator.clipboard.writeText(record.accession);
    setCopiedAcc(true);
    setTimeout(() => setCopiedAcc(false), 2000);
  };

  const isNucleotide = record.recordType === 'nucleotide' || record.moleculeType === 'DNA' || record.moleculeType === 'RNA';
  const hasPdb = record.pdbRefs && record.pdbRefs.length > 0;
  const targetPdbId = hasPdb ? record.pdbRefs[0].pdbId : null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 10, 20, 0.88)',
      backdropFilter: 'blur(8px)',
      zIndex: 1100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#0c1322',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '1240px',
        height: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
        color: '#cbd5e1',
        overflow: 'hidden'
      }}>
        {/* Top Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: '#090f1d',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
              {/* Source Badge */}
              <span style={{
                background: `${record.sourceColor || '#2563eb'}22`,
                border: `1px solid ${record.sourceColor || '#2563eb'}66`,
                color: record.sourceColor || '#38bdf8',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.74rem',
                fontWeight: 700
              }}>
                {record.sourceBadge || record.source}
              </span>

              {/* Record Type Badge */}
              <span style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#f8fafc',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.74rem',
                fontWeight: 600,
                textTransform: 'uppercase'
              }}>
                {record.recordType || 'Record'}
              </span>

              {/* Accession with Copy Button */}
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 800,
                fontSize: '1rem',
                color: '#f8fafc'
              }}>
                {record.accession}
              </span>

              <button
                type="button"
                onClick={handleCopyAcc}
                title="Copy Accession"
                style={{
                  background: copiedAcc ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                  border: `1px solid ${copiedAcc ? '#10b981' : 'rgba(255, 255, 255, 0.12)'}`,
                  color: copiedAcc ? '#10b981' : '#cbd5e1',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  fontSize: '0.74rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                {copiedAcc ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedAcc ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <h2 style={{
              margin: 0,
              fontSize: '1.15rem',
              fontWeight: 800,
              color: '#f8fafc',
              lineHeight: 1.3
            }}>
              {record.title}
            </h2>

            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
              Organism: <strong style={{ color: '#e2e8f0' }}>{record.organism}</strong>
              {record.commonName ? ` (${record.commonName})` : ''}
              {record.taxId ? ` • TaxID: ${record.taxId}` : ''}
              {record.length ? ` • Length: ${record.length.toLocaleString()} ${record.lengthUnit || ''}` : ''}
            </p>
          </div>

          {/* Right Header Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => onTogglePin && onTogglePin(record)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: isPinned ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${isPinned ? '#06b6d4' : 'rgba(255, 255, 255, 0.15)'}`,
                color: isPinned ? '#38bdf8' : '#cbd5e1',
                borderRadius: '8px',
                padding: '7px 14px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Pin size={14} />
              <span>{isPinned ? 'Pinned' : 'Pin Record'}</span>
            </button>

            <a
              href={record.originalUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#cbd5e1',
                borderRadius: '8px',
                padding: '7px 14px',
                fontSize: '0.8rem',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <span>Open in {record.source}</span>
              <ExternalLink size={13} />
            </a>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '6px'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Send To Tools Quick Bar */}
        <div style={{
          background: '#090f1d',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '8px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap',
          fontSize: '0.78rem'
        }}>
          <span style={{ color: '#64748b', fontWeight: 600 }}>Send to BioNexus Tools:</span>

          <button
            type="button"
            onClick={() => onSendToTool && onSendToTool('analysis', record)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              color: '#c084fc',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Dna size={12} />
            <span>Sequence Analysis</span>
          </button>

          <button
            type="button"
            onClick={() => onSendToTool && onSendToTool('blast', record)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#fbbf24',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Zap size={12} />
            <span>BLAST Center</span>
          </button>

          <button
            type="button"
            onClick={() => onSendToTool && onSendToTool('alignment', record)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#34d399',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <GitMerge size={12} />
            <span>Alignment Hub</span>
          </button>

          {/* Primer Designer (Enabled ONLY for Nucleotide) */}
          <button
            type="button"
            disabled={!isNucleotide}
            title={isNucleotide ? 'Open PCR Primer Designer' : 'Primer Designer requires nucleotide sequence (disabled for protein)'}
            onClick={() => isNucleotide && onSendToTool && onSendToTool('primer', record)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: isNucleotide ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${isNucleotide ? 'rgba(6, 182, 212, 0.35)' : 'rgba(255, 255, 255, 0.08)'}`,
              color: isNucleotide ? '#38bdf8' : '#64748b',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: isNucleotide ? 'pointer' : 'not-allowed',
              opacity: isNucleotide ? 1 : 0.6
            }}
          >
            <Scissors size={12} />
            <span>Primer Designer</span>
          </button>

          {/* Protein Space (Enabled ONLY when PDB Structure Cross-Reference Exists) */}
          <button
            type="button"
            disabled={!hasPdb}
            title={hasPdb ? `Inspect 3D structure ${targetPdbId} in Protein Space` : 'Protein Space requires an experimentally resolved PDB cross-reference'}
            onClick={() => hasPdb && onSendToTool && onSendToTool('protein', { pdbId: targetPdbId })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: hasPdb ? 'rgba(236, 72, 153, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${hasPdb ? 'rgba(236, 72, 153, 0.35)' : 'rgba(255, 255, 255, 0.08)'}`,
              color: hasPdb ? '#f472b6' : '#64748b',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: hasPdb ? 'pointer' : 'not-allowed',
              opacity: hasPdb ? 1 : 0.6
            }}
          >
            <Boxes size={12} />
            <span>Protein Space {targetPdbId ? `(${targetPdbId})` : ''}</span>
          </button>
        </div>

        {/* Dynamic Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '4px',
          padding: '8px 24px 0',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: '#090f1d',
          overflowX: 'auto'
        }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: isActive ? '#0c1322' : 'transparent',
                  border: '1px solid',
                  borderColor: isActive ? 'rgba(56, 189, 248, 0.3)' : 'transparent',
                  borderBottom: isActive ? '1px solid #0c1322' : 'transparent',
                  borderRadius: '8px 8px 0 0',
                  color: isActive ? '#38bdf8' : '#94a3b8',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  marginBottom: '-1px',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={14} color={isActive ? '#38bdf8' : '#64748b'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body View */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* 1. OVERVIEW TAB */}
          {currentTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px'
              }}>
                {/* Identification Card */}
                <div style={{
                  background: '#090f1d',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  padding: '16px'
                }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '0.88rem', color: '#f8fafc', fontWeight: 700 }}>
                    Nomenclature & Identification
                  </h4>
                  <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: '8px', fontSize: '0.8rem' }}>
                    <dt style={{ color: '#64748b' }}>Accession:</dt>
                    <dd style={{ margin: 0, fontFamily: "'JetBrains Mono', monospace", color: '#38bdf8', fontWeight: 700 }}>
                      {record.accession}
                    </dd>

                    {record.geneSymbol && (
                      <>
                        <dt style={{ color: '#64748b' }}>Gene Symbol:</dt>
                        <dd style={{ margin: 0, fontWeight: 700, color: '#f8fafc' }}>{record.geneSymbol}</dd>
                      </>
                    )}

                    {record.geneId && (
                      <>
                        <dt style={{ color: '#64748b' }}>NCBI Gene ID:</dt>
                        <dd style={{ margin: 0, fontFamily: "'JetBrains Mono', monospace", color: '#e2e8f0' }}>{record.geneId}</dd>
                      </>
                    )}

                    <dt style={{ color: '#64748b' }}>Database:</dt>
                    <dd style={{ margin: 0, color: '#e2e8f0' }}>{record.database || record.source}</dd>

                    <dt style={{ color: '#64748b' }}>Curation Status:</dt>
                    <dd style={{ margin: 0, color: '#e2e8f0' }}>
                      {record.curationLabel || (record.source === 'NCBI' ? 'NCBI Entrez Validated' : 'ENA Standard')}
                    </dd>
                  </dl>
                </div>

                {/* Biological Parameters Card */}
                <div style={{
                  background: '#090f1d',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  padding: '16px'
                }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '0.88rem', color: '#f8fafc', fontWeight: 700 }}>
                    Biological Classification
                  </h4>
                  <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: '8px', fontSize: '0.8rem' }}>
                    <dt style={{ color: '#64748b' }}>Molecule Type:</dt>
                    <dd style={{ margin: 0, color: '#e2e8f0' }}>{record.moleculeType || 'Unspecified'}</dd>

                    <dt style={{ color: '#64748b' }}>Length:</dt>
                    <dd style={{ margin: 0, color: '#e2e8f0', fontWeight: 700 }}>
                      {record.length ? `${record.length.toLocaleString()} ${record.lengthUnit || ''}` : 'Not specified'}
                    </dd>

                    <dt style={{ color: '#64748b' }}>Organism:</dt>
                    <dd style={{ margin: 0, color: '#38bdf8', fontStyle: 'italic' }}>{record.organism}</dd>

                    {record.chromosome && (
                      <>
                        <dt style={{ color: '#64748b' }}>Chromosome:</dt>
                        <dd style={{ margin: 0, color: '#e2e8f0' }}>{record.chromosome}</dd>
                      </>
                    )}

                    {record.subcellularLocations && record.subcellularLocations.length > 0 && (
                      <>
                        <dt style={{ color: '#64748b' }}>Subcellular:</dt>
                        <dd style={{ margin: 0, color: '#e2e8f0' }}>{record.subcellularLocations.join(', ')}</dd>
                      </>
                    )}
                  </dl>
                </div>
              </div>

              {/* Functional Description Box */}
              <div style={{
                background: '#090f1d',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                padding: '16px'
              }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '0.88rem', color: '#f8fafc', fontWeight: 700 }}>
                  Biological Function / Description
                </h4>
                <p style={{ margin: 0, fontSize: '0.86rem', lineHeight: 1.6, color: '#cbd5e1' }}>
                  {record.description || record.title}
                </p>
              </div>

              {/* Taxonomy Lineage (if available) */}
              {record.lineage && record.lineage.length > 0 && (
                <div style={{
                  background: '#090f1d',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  padding: '16px'
                }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '0.88rem', color: '#f8fafc', fontWeight: 700 }}>
                    Taxonomic Lineage
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                    {record.lineage.map((taxon, idx) => (
                      <React.Fragment key={taxon}>
                        <span style={{
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.74rem',
                          color: '#94a3b8'
                        }}>
                          {taxon}
                        </span>
                        {idx < record.lineage.length - 1 && (
                          <span style={{ color: '#475569', fontSize: '0.7rem' }}>›</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. SEQUENCE TAB */}
          {currentTab === 'sequence' && (
            <BioSequenceViewer record={record} />
          )}

          {/* 3. FEATURES TAB */}
          {currentTab === 'features' && (
            <div style={{
              background: '#090f1d',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#050912', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <th style={{ textAlign: 'left', padding: '10px 14px', color: '#94a3b8' }}>Feature Type</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', color: '#94a3b8' }}>Coordinates</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', color: '#94a3b8' }}>Description</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', color: '#94a3b8' }}>Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {(record.features || []).map((feat, idx) => {
                    const start = feat.location?.start?.value || 1;
                    const end = feat.location?.end?.value || start;
                    const evidenceStr = (feat.evidences || []).map(e => e.evidenceCode).join(', ');

                    return (
                      <tr key={`feat_row_${idx}`} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '8px 14px', fontWeight: 700, color: '#38bdf8' }}>
                          {feat.type}
                        </td>
                        <td style={{ padding: '8px 14px', fontFamily: "'JetBrains Mono', monospace", color: '#e2e8f0' }}>
                          {start}..{end} ({end - start + 1} {record.lengthUnit || 'aa'})
                        </td>
                        <td style={{ padding: '8px 14px', color: '#cbd5e1' }}>
                          {feat.description || 'Annotated Region'}
                        </td>
                        <td style={{ padding: '8px 14px', color: '#94a3b8', fontSize: '0.74rem' }}>
                          {evidenceStr || 'Curated'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 4. LINKED RECORDS MAP */}
          {currentTab === 'linked' && (
            <LinkedRecordsMap record={record} onSendToTool={onSendToTool} />
          )}

          {/* 5. CROSS-REFERENCES TAB */}
          {currentTab === 'xrefs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* PDB Structures Box */}
              {record.pdbRefs && record.pdbRefs.length > 0 && (
                <div style={{
                  background: '#090f1d',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  padding: '16px'
                }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '0.88rem', color: '#f8fafc', fontWeight: 700 }}>
                    RCSB Protein Data Bank (PDB) Structures ({record.pdbRefs.length})
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                    {record.pdbRefs.map(pdb => (
                      <div
                        key={pdb.pdbId}
                        style={{
                          background: '#131e34',
                          border: '1px solid rgba(56, 189, 248, 0.2)',
                          borderRadius: '8px',
                          padding: '10px 12px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#38bdf8' }}>
                            {pdb.pdbId}
                          </span>
                          <a
                            href={`https://www.rcsb.org/structure/${pdb.pdbId}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#94a3b8' }}
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.74rem', color: '#94a3b8' }}>
                          Method: {pdb.method} {pdb.resolution ? `(${pdb.resolution})` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* RefSeq Links */}
              {record.refseqRefs && record.refseqRefs.length > 0 && (
                <div style={{
                  background: '#090f1d',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  padding: '16px'
                }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '0.88rem', color: '#f8fafc', fontWeight: 700 }}>
                    NCBI RefSeq Cross-References ({record.refseqRefs.length})
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {record.refseqRefs.map((r, i) => (
                      <span
                        key={`ref_${i}`}
                        style={{
                          background: '#131e34',
                          border: '1px solid rgba(56, 189, 248, 0.15)',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '0.76rem',
                          color: '#e2e8f0'
                        }}
                      >
                        {r.id} {r.nucleotideAcc ? `[${r.nucleotideAcc}]` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. EVIDENCE TAB */}
          {currentTab === 'evidence' && (
            <div style={{
              background: '#090f1d',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '16px'
            }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '0.88rem', color: '#f8fafc', fontWeight: 700 }}>
                Evidence & Conclusion Ontology (ECO) Codes
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '14px' }}>
                UniProt annotations distinguish manual curation from experimental validation. ECO codes document the exact methodology supporting each assertion.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {(record.evidenceCodes || []).map((code) => (
                  <div
                    key={code}
                    style={{
                      background: '#131e34',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '0.78rem'
                    }}
                  >
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#10b981', fontWeight: 700 }}>
                      {code}
                    </span>
                    <span style={{ color: '#cbd5e1', marginLeft: '6px' }}>
                      {code.includes('0000269') ? 'Experimental evidence used in manual assertion' : 'Curated biological assertion'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. PROVENANCE TAB */}
          {currentTab === 'provenance' && (
            <div style={{
              background: '#090f1d',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              fontSize: '0.84rem'
            }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700 }}>
                  API Provider & Protocol
                </span>
                <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#f8fafc' }}>
                  {record.provenance?.apiProvider || `${record.source} Primary Endpoint`}
                </p>
              </div>

              <div>
                <span style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700 }}>
                  Exact Endpoint
                </span>
                <p style={{ margin: '2px 0 0', fontFamily: "'JetBrains Mono', monospace", color: '#38bdf8' }}>
                  {record.provenance?.endpoint || record.originalUrl}
                </p>
              </div>

              <div>
                <span style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700 }}>
                  Retrieval Timestamp
                </span>
                <p style={{ margin: '2px 0 0', color: '#e2e8f0' }}>
                  {record.provenance?.retrievedAt ? new Date(record.provenance.retrievedAt).toISOString() : 'Live'}
                </p>
              </div>

              <div>
                <span style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700 }}>
                  Parser Version
                </span>
                <p style={{ margin: '2px 0 0', fontFamily: "'JetBrains Mono', monospace", color: '#e2e8f0' }}>
                  {record.provenance?.parserVersion || 'BioNexus-GBS-v3.0.0'}
                </p>
              </div>
            </div>
          )}

          {/* 8. RAW RECORD TAB */}
          {currentTab === 'raw' && (
            <div style={{
              background: '#090f1d',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '14px',
              maxHeight: '440px',
              overflowY: 'auto'
            }}>
              <pre style={{
                margin: 0,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.76rem',
                color: '#38bdf8',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}>
                {JSON.stringify(record.raw || record, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
