// BioNexus UI Studio — AI Design Assistant Panel
// Converts natural language design prompts into structured proposals,
// previews them in the live canvas, and provides 1-click diff review before applying.

import React, { useState } from 'react';
import { useUIStudio } from '../../context/UIStudioContext';
import { 
  Sparkles, Send, RefreshCw, CheckCircle2, AlertTriangle, 
  FileCode, ShieldCheck, ArrowRight, X, Play, Sliders 
} from 'lucide-react';

const SUGGESTED_DESIGN_PROMPTS = [
  {
    label: 'Immersive Protein Canvas',
    prompt: 'Redesign the protein workspace with a larger central 3D viewer (620px), compact dark glassmorphism toolbar, and side-by-side layout.'
  },
  {
    label: 'High-Contrast Evolution Tree',
    prompt: 'Transform the phylogenetic tree viewer with larger taxon typography (15px), emerald border accents, and a deep contrast canvas.'
  },
  {
    label: 'Modern Dashboard Stats',
    prompt: 'Reorganize dashboard stats into a modern glass card layout with neon cyan borders, rounded corners (16px), and subtle glow.'
  },
  {
    label: 'Compact Research Toolbar',
    prompt: 'Make the toolbars compact and minimal with 8px padding and high-density spacing for rapid scientific analysis.'
  }
];

export default function UIStudioAiAssistant() {
  const {
    targetPage,
    selectedComponentId,
    requestAiRedesign,
    isAiThinking,
    aiError,
    pendingProposal,
    setPendingProposal,
    setDiffModalOpen
  } = useUIStudio();

  const [promptInput, setPromptInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!promptInput.trim() || isAiThinking) return;
    requestAiRedesign(promptInput.trim());
  };

  const handleUseSuggested = (suggestedText) => {
    setPromptInput(suggestedText);
    requestAiRedesign(suggestedText);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border-color)',
      overflowY: 'auto',
      padding: '16px'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
            padding: '6px',
            borderRadius: '8px',
            display: 'flex'
          }}>
            <Sparkles size={16} color="#070b14" />
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            AI Design Assistant
          </h3>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          Describe redesigns in plain English. The AI generates a structured proposal with safety checks, live preview, and reviewable code diffs.
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '18px' }}>
        <div style={{ position: 'relative' }}>
          <textarea
            className="textarea-field font-sans"
            rows={4}
            placeholder="e.g. Redesign protein workspace with larger 3D viewer, compact toolbars, and neon cyan accents..."
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            disabled={isAiThinking}
            style={{ fontSize: '0.84rem', resize: 'vertical', marginBottom: '8px' }}
          />

          <button
            type="submit"
            className="btn-primary"
            disabled={!promptInput.trim() || isAiThinking}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '0.84rem'
            }}
          >
            {isAiThinking ? (
              <>
                <RefreshCw size={14} className="spin-animation" />
                <span>Synthesizing Design Proposal...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Generate Design Proposal</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Suggested Inspiration Prompts */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
          Suggested Design Prompts
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {SUGGESTED_DESIGN_PROMPTS.map((item, idx) => (
            <button
              key={idx}
              className="btn-secondary"
              onClick={() => handleUseSuggested(item.prompt)}
              disabled={isAiThinking}
              style={{
                padding: '8px 10px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                borderRadius: '8px',
                fontSize: '0.75rem'
              }}
            >
              <strong style={{ color: 'var(--accent-cyan)' }}>{item.label}</strong>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{item.prompt}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Error Notice */}
      {aiError && (
        <div className="glass-card" style={{ padding: '12px', borderColor: 'var(--accent-rose)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-rose)', fontSize: '0.82rem', fontWeight: 700 }}>
            <AlertTriangle size={15} /> Generation Error
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            {aiError}
          </p>
        </div>
      )}

      {/* Structured Proposal Card */}
      {pendingProposal && (
        <div className="glass-card" style={{
          padding: '16px',
          borderColor: 'var(--accent-cyan)',
          backgroundColor: 'rgba(6, 182, 212, 0.05)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                Structured Proposal
              </span>
              <h4 style={{ fontSize: '0.96rem', fontWeight: 700, margin: '2px 0 0', color: 'var(--text-primary)' }}>
                {pendingProposal.title}
              </h4>
            </div>
            <button
              className="btn-icon"
              onClick={() => setPendingProposal(null)}
              title="Dismiss proposal"
              style={{ padding: '2px' }}
            >
              <X size={14} />
            </button>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            {pendingProposal.rationale}
          </p>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.72rem',
            color: 'var(--accent-emerald)',
            background: 'rgba(16, 185, 129, 0.1)',
            padding: '4px 8px',
            borderRadius: '6px'
          }}>
            <ShieldCheck size={14} />
            <span>{pendingProposal.risks}</span>
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Target File: <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{pendingProposal.targetFile}</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              className="btn-primary"
              onClick={() => setDiffModalOpen(true)}
              style={{
                flex: 1,
                padding: '8px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <FileCode size={14} /> Review Code Diff
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
