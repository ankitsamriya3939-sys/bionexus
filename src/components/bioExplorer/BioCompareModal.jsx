import React from 'react';
import { 
  GitCompare, X, AlertTriangle, CheckCircle2, 
  ExternalLink, Info, Database, Dna 
} from 'lucide-react';

export default function BioCompareModal({ records = [], onClose, onUnpin }) {
  if (!records || records.length < 2) return null;

  // Comparison fields definitions
  const fields = [
    {
      key: 'source',
      label: 'Database Source',
      getValue: (r) => r.sourceBadge || r.source,
      hasDisagreement: () => false
    },
    {
      key: 'accession',
      label: 'Accession & ID',
      getValue: (r) => r.accession || r.id,
      isMono: true,
      hasDisagreement: () => false
    },
    {
      key: 'recordType',
      label: 'Record Category',
      getValue: (r) => (r.recordType || 'record').toUpperCase(),
      hasDisagreement: (recs) => {
        const types = new Set(recs.map(r => r.recordType));
        return types.size > 1;
      }
    },
    {
      key: 'organism',
      label: 'Organism',
      getValue: (r) => r.organism || 'Unknown',
      hasDisagreement: (recs) => {
        const orgs = new Set(recs.map(r => (r.organism || '').toLowerCase()));
        return orgs.size > 1;
      }
    },
    {
      key: 'moleculeType',
      label: 'Molecule Type',
      getValue: (r) => r.moleculeType || 'Unspecified',
      hasDisagreement: (recs) => {
        const molTypes = new Set(recs.map(r => (r.moleculeType || '').toLowerCase()));
        return molTypes.size > 1;
      }
    },
    {
      key: 'length',
      label: 'Sequence Length',
      getValue: (r) => r.length ? `${r.length.toLocaleString()} ${r.lengthUnit || ''}` : 'Not provided',
      hasDisagreement: (recs) => {
        const validLengths = recs.map(r => r.length).filter(Boolean);
        return new Set(validLengths).size > 1;
      }
    },
    {
      key: 'curation',
      label: 'Curation / Review Status',
      getValue: (r) => r.curationLabel || (r.source === 'NCBI' ? 'NCBI Entrez Validated' : 'ENA Standard'),
      hasDisagreement: (recs) => {
        const statuses = new Set(recs.map(r => r.curationStatus || ''));
        return statuses.size > 1;
      }
    },
    {
      key: 'structures',
      label: 'Cross-Referenced 3D Structures',
      getValue: (r) => {
        if (r.pdbRefs && r.pdbRefs.length > 0) {
          return `${r.pdbRefs.length} PDB entries (${r.pdbRefs.map(p => p.pdbId).slice(0, 3).join(', ')})`;
        }
        return '0 PDB cross-references';
      },
      hasDisagreement: (recs) => {
        const counts = recs.map(r => (r.pdbRefs?.length || 0) > 0);
        return new Set(counts).size > 1;
      }
    },
    {
      key: 'description',
      label: 'Biological Summary / Function',
      getValue: (r) => r.description || r.title || 'No description available',
      hasDisagreement: () => false
    },
    {
      key: 'provenance',
      label: 'API Provenance Endpoint',
      getValue: (r) => r.provenance?.endpoint || 'Live Provider Endpoint',
      isMono: true,
      hasDisagreement: () => false
    }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 10, 20, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 1200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        background: '#0c1322',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '1100px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GitCompare size={18} color="#06b6d4" /> Side-by-Side Record Comparison Matrix
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
              Comparing {records.length} records. Provenance is preserved and disagreements between repositories are highlighted.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Comparison Matrix Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.82rem',
            color: '#cbd5e1'
          }}>
            <thead>
              <tr>
                <th style={{
                  textAlign: 'left',
                  padding: '10px 14px',
                  background: '#090f1d',
                  borderBottom: '2px solid rgba(56, 189, 248, 0.2)',
                  color: '#94a3b8',
                  width: '22%',
                  fontWeight: 700
                }}>
                  Comparison Dimension
                </th>
                {records.map((rec) => (
                  <th
                    key={rec.id}
                    style={{
                      textAlign: 'left',
                      padding: '10px 14px',
                      background: '#090f1d',
                      borderBottom: '2px solid rgba(56, 189, 248, 0.2)',
                      color: '#f8fafc',
                      fontWeight: 700
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#38bdf8' }}>
                        {rec.accession}
                      </span>
                      {onUnpin && (
                        <button
                          type="button"
                          onClick={() => onUnpin(rec.id)}
                          title="Remove from comparison"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#64748b',
                            cursor: 'pointer',
                            fontSize: '0.74rem'
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.map((f, idx) => {
                const isDisagreement = f.hasDisagreement(records);

                return (
                  <tr
                    key={f.key}
                    style={{
                      background: isDisagreement ? 'rgba(245, 158, 11, 0.06)' : idx % 2 === 0 ? 'rgba(255, 255, 255, 0.015)' : 'transparent',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    <td style={{
                      padding: '10px 14px',
                      fontWeight: 600,
                      color: isDisagreement ? '#fbbf24' : '#94a3b8',
                      verticalAlign: 'top',
                      borderRight: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isDisagreement && <AlertTriangle size={13} color="#f59e0b" />}
                        <span>{f.label}</span>
                      </div>
                      {isDisagreement && (
                        <span style={{ fontSize: '0.7rem', color: '#f59e0b', display: 'block', marginTop: '2px', fontWeight: 500 }}>
                          Cross-source discrepancy
                        </span>
                      )}
                    </td>

                    {records.map((rec) => {
                      const val = f.getValue(rec);
                      return (
                        <td
                          key={`${rec.id}_${f.key}`}
                          style={{
                            padding: '10px 14px',
                            verticalAlign: 'top',
                            fontFamily: f.isMono ? "'JetBrains Mono', monospace" : 'inherit',
                            fontSize: f.isMono ? '0.76rem' : '0.82rem',
                            color: '#e2e8f0',
                            lineHeight: 1.5
                          }}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.78rem',
          color: '#94a3b8'
        }}>
          <span>Values reflect raw database entries without artificial harmonization.</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f8fafc',
              borderRadius: '6px',
              padding: '6px 16px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
}
