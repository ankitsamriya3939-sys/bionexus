import React, { useState } from 'react';
import { 
  FileCode, X, Copy, Check, ExternalLink, 
  Clock, ShieldCheck, Database, Terminal 
} from 'lucide-react';

export default function ProvenanceDrawer({ record, isOpen, onClose }) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  if (!isOpen || !record) return null;

  const prov = record.provenance || {};
  const curlCmd = `curl -s "${prov.requestUrl || prov.endpoint || record.originalUrl}"`;

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 10, 20, 0.75)',
      backdropFilter: 'blur(6px)',
      zIndex: 1300,
      display: 'flex',
      justifyContent: 'flex-end'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '560px',
        height: '100%',
        background: '#0c1322',
        borderLeft: '1px solid rgba(56, 189, 248, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-10px 0 35px rgba(0, 0, 0, 0.8)',
        color: '#cbd5e1'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="#06b6d4" /> Record Provenance & Audit Trail
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Full reproducibility metadata for {record.accession}
            </span>
          </div>

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

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Metadata Cards */}
          <div style={{
            background: '#090f1d',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            fontSize: '0.82rem'
          }}>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700 }}>
                API Provider & Institution
              </span>
              <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#f8fafc' }}>
                {prov.apiProvider || `${record.source} Official API`}
              </p>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700 }}>
                Target Database
              </span>
              <p style={{ margin: '2px 0 0', color: '#38bdf8', fontFamily: "'JetBrains Mono', monospace" }}>
                {record.database || record.source}
              </p>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700 }}>
                Retrieval Timestamp
              </span>
              <p style={{ margin: '2px 0 0', color: '#e2e8f0' }}>
                {prov.retrievedAt ? new Date(prov.retrievedAt).toLocaleString() : 'Live Session Measurement'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700 }}>
                  Cache Status
                </span>
                <p style={{ margin: '2px 0 0', fontWeight: 700, color: prov.cacheStatus === 'HIT' ? '#10b981' : '#f59e0b' }}>
                  {prov.cacheStatus || 'LIVE REQUEST'}
                </p>
              </div>

              <div>
                <span style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700 }}>
                  Parser Version
                </span>
                <p style={{ margin: '2px 0 0', fontFamily: "'JetBrains Mono', monospace", color: '#e2e8f0' }}>
                  {prov.parserVersion || 'BioNexus-GBS-v3.0.0'}
                </p>
              </div>
            </div>
          </div>

          {/* Endpoint & Request URL */}
          <div style={{
            background: '#090f1d',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            padding: '14px',
            fontSize: '0.8rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700 }}>
                Original Request URL
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(prov.requestUrl || record.originalUrl, 'url')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: copiedUrl ? '#10b981' : '#38bdf8',
                  fontSize: '0.74rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                {copiedUrl ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>

            <div style={{
              background: '#050912',
              padding: '8px 10px',
              borderRadius: '6px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.74rem',
              color: '#38bdf8',
              wordBreak: 'break-all',
              lineHeight: 1.4
            }}>
              {prov.requestUrl || prov.endpoint || record.originalUrl}
            </div>
          </div>

          {/* cURL Command for Independent Terminal Verification */}
          <div style={{
            background: '#090f1d',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            padding: '14px',
            fontSize: '0.8rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Terminal size={13} color="#f59e0b" /> Independent CLI Reproducibility
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(curlCmd, 'curl')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: copiedCurl ? '#10b981' : '#38bdf8',
                  fontSize: '0.74rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                {copiedCurl ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedCurl ? 'Copied' : 'Copy cURL'}</span>
              </button>
            </div>

            <pre style={{
              margin: 0,
              background: '#050912',
              padding: '8px 10px',
              borderRadius: '6px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.74rem',
              color: '#facc15',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}>
              {curlCmd}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <a
            href={record.originalUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#38bdf8',
              fontSize: '0.8rem',
              textDecoration: 'none',
              fontWeight: 600
            }}
          >
            <span>Open Provider Source Entry</span>
            <ExternalLink size={13} />
          </a>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f8fafc',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
