// BioNexus UI Studio — AI-Powered Visual Website Designer
// Main workspace integrating live canvas, component tree, property inspector,
// natural language AI design assistant, and safe codebase patch execution.

import React, { useState, useEffect } from 'react';
import { UIStudioProvider, useUIStudio } from '../../context/UIStudioContext';
import UIStudioCanvas from './UIStudioCanvas';
import UIStudioInspector from './UIStudioInspector';
import UIStudioAiAssistant from './UIStudioAiAssistant';
import UIStudioComponentTree from './UIStudioComponentTree';
import UIStudioDiffModal from './UIStudioDiffModal';

import { 
  Palette, Monitor, Tablet, Smartphone, SplitSquareVertical, 
  Undo2, Redo2, RotateCcw, Save, FileCode, Sparkles, Sliders, 
  HelpCircle, Eye, ArrowLeft, Check 
} from 'lucide-react';

function UIStudioWorkspaceInner({ onExitStudio = () => {} }) {
  const {
    targetPage,
    setTargetPage,
    viewportMode,
    setViewportMode,
    splitCompare,
    setSplitCompare,
    undo,
    redo,
    canUndo,
    canRedo,
    resetAllStyles,
    saveDraft,
    setDiffModalOpen,
    pendingProposal
  } = useUIStudio();

  // Right Panel Tabs: Inspector vs AI Assistant
  const [rightPanelTab, setRightPanelTab] = useState('inspector'); // 'inspector' | 'ai'
  const [saveDraftModalOpen, setSaveDraftModalOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Keyboard shortcuts for Undo (Ctrl+Z) and Redo (Ctrl+Y / Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        if (canRedo) redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  const handleSaveDraft = (e) => {
    e.preventDefault();
    if (!draftName.trim()) return;
    saveDraft(draftName.trim());
    setDraftName('');
    setSaveDraftModalOpen(false);
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 2500);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 64px)',
      backgroundColor: 'var(--bg-primary)',
      overflow: 'hidden'
    }}>
      {/* ========================================================= */}
      {/* 1. TOP STUDIO TOOLBAR                                     */}
      {/* ========================================================= */}
      <header style={{
        height: '52px',
        padding: '0 16px',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'rgba(11, 15, 25, 0.95)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        zIndex: 100
      }}>
        {/* Brand & Page Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex'
            }}>
              <Palette size={16} color="#070b14" />
            </div>
            <div>
              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.2px' }}>
                BioNexus <span style={{ color: 'var(--accent-cyan)' }}>UI Studio</span>
              </span>
            </div>
          </div>

          <div style={{ width: '1px', height: '22px', backgroundColor: 'var(--border-color)' }} />

          <select
            className="input-field font-sans"
            value={targetPage}
            onChange={(e) => setTargetPage(e.target.value)}
            style={{
              padding: '4px 8px',
              fontSize: '0.8rem',
              height: '32px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="protein">Page: Protein Space (3D Canvas)</option>
            <option value="phylo">Page: Evolution Space (Phylogenetics)</option>
            <option value="home">Page: Home Workspace</option>
            <option value="dashboard">Page: Dashboard & Reports</option>
            <option value="genome">Page: Genome Space</option>
            <option value="evidence">Page: Evidence Space</option>
          </select>
        </div>

        {/* Viewport Switcher & Comparison Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Desktop, Tablet, Mobile */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '2px'
          }}>
            <button
              onClick={() => setViewportMode('desktop')}
              className="btn-icon"
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                background: viewportMode === 'desktop' ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                color: viewportMode === 'desktop' ? 'var(--accent-cyan)' : 'var(--text-muted)'
              }}
              title="Desktop Viewport (100%)"
            >
              <Monitor size={15} />
            </button>
            <button
              onClick={() => setViewportMode('tablet')}
              className="btn-icon"
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                background: viewportMode === 'tablet' ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                color: viewportMode === 'tablet' ? 'var(--accent-cyan)' : 'var(--text-muted)'
              }}
              title="Tablet Viewport (768px)"
            >
              <Tablet size={15} />
            </button>
            <button
              onClick={() => setViewportMode('mobile')}
              className="btn-icon"
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                background: viewportMode === 'mobile' ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                color: viewportMode === 'mobile' ? 'var(--accent-cyan)' : 'var(--text-muted)'
              }}
              title="Mobile Viewport (375px)"
            >
              <Smartphone size={15} />
            </button>
          </div>

          {/* Before & After Comparison Toggle */}
          <button
            onClick={() => setSplitCompare(!splitCompare)}
            className="btn-secondary"
            style={{
              padding: '5px 10px',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderColor: splitCompare ? 'var(--accent-cyan)' : 'var(--border-color)',
              color: splitCompare ? 'var(--accent-cyan)' : 'var(--text-secondary)'
            }}
            title="Toggle Before & After Side-by-Side Comparison"
          >
            <SplitSquareVertical size={14} />
            <span>Before / After</span>
          </button>

          <div style={{ width: '1px', height: '22px', backgroundColor: 'var(--border-color)' }} />

          {/* Undo / Redo */}
          <button
            onClick={undo}
            disabled={!canUndo}
            className="btn-icon"
            title="Undo (Ctrl+Z)"
            style={{ opacity: canUndo ? 1 : 0.4 }}
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="btn-icon"
            title="Redo (Ctrl+Y)"
            style={{ opacity: canRedo ? 1 : 0.4 }}
          >
            <Redo2 size={16} />
          </button>

          <button
            onClick={resetAllStyles}
            className="btn-icon"
            title="Reset All Overrides"
            style={{ color: 'var(--text-muted)' }}
          >
            <RotateCcw size={15} />
          </button>
        </div>

        {/* Action Buttons: Save Draft & Review Code */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn-secondary"
            onClick={() => setSaveDraftModalOpen(true)}
            style={{ padding: '5px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Save size={14} />
            <span>{saveSuccessMsg ? 'Draft Saved!' : 'Save Draft'}</span>
          </button>

          <button
            className="btn-primary"
            onClick={() => setDiffModalOpen(true)}
            style={{
              padding: '6px 14px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: pendingProposal ? 'linear-gradient(135deg, #06b6d4, #10b981)' : undefined
            }}
          >
            <FileCode size={15} />
            <span>Review & Apply Diff</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. THREE-COLUMN STUDIO WORKSPACE                          */}
      {/* ========================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '270px 1fr 340px',
        flex: 1,
        overflow: 'hidden'
      }}>
        {/* Left Column: Component Hierarchy Tree & Drafts */}
        <UIStudioComponentTree />

        {/* Center Column: Live Interactive Preview Canvas */}
        <UIStudioCanvas />

        {/* Right Column: Tabbed Inspector & AI Assistant */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-color)',
          overflow: 'hidden'
        }}>
          {/* Right Panel Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)'
          }}>
            <button
              onClick={() => setRightPanelTab('inspector')}
              style={{
                flex: 1,
                padding: '12px',
                background: 'none',
                border: 'none',
                borderBottom: rightPanelTab === 'inspector' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                color: rightPanelTab === 'inspector' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Sliders size={14} /> Visual Inspector
            </button>
            <button
              onClick={() => setRightPanelTab('ai')}
              style={{
                flex: 1,
                padding: '12px',
                background: 'none',
                border: 'none',
                borderBottom: rightPanelTab === 'ai' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                color: rightPanelTab === 'ai' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Sparkles size={14} color="#ec4899" /> AI Assistant
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {rightPanelTab === 'inspector' ? (
              <UIStudioInspector />
            ) : (
              <UIStudioAiAssistant />
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. MODALS (Diff Modal & Save Draft Modal)                  */}
      {/* ========================================================= */}
      <UIStudioDiffModal />

      {saveDraftModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2100,
          padding: '20px'
        }}>
          <form onSubmit={handleSaveDraft} className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Save Design Draft
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Give your design configuration a memorable name to recall or export later.
            </p>

            <input
              type="text"
              className="input-field"
              placeholder="e.g. Cybernetic Protein 3D Redesign..."
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              autoFocus
              style={{ marginBottom: '16px' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn-secondary" onClick={() => setSaveDraftModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={!draftName.trim()}>
                Save Draft
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function UIStudio({ onExitStudio }) {
  return (
    <UIStudioProvider>
      <UIStudioWorkspaceInner onExitStudio={onExitStudio} />
    </UIStudioProvider>
  );
}
