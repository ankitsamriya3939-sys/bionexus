// BioNexus UI Studio — Central Context & State Management
// Manages selected components, visual property overrides, undo/redo history,
// viewport modes, drafts persistence, and code patch approvals.

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { DESIGN_PRESETS, getComponentsByPage } from '../services/uiStudioRegistry';
import { validatePropertyChange } from '../utils/uiStudioPatcher';
import { generateAiDesignProposal } from '../utils/uiStudioAiEngine';

const UIStudioContext = createContext(null);

const STORAGE_DRAFTS_KEY = 'bionexus_ui_studio_drafts';

export function UIStudioProvider({ children }) {
  // Navigation & Page target
  const [targetPage, setTargetPage] = useState('protein'); // 'protein' | 'phylo' | 'home' | 'dashboard' | 'genome' | 'evidence' | 'graph' | 'navbar'
  const [selectedComponentId, setSelectedComponentId] = useState('protein-canvas-container');
  const [hoveredComponentId, setHoveredComponentId] = useState(null);

  // Viewport & Comparison
  const [viewportMode, setViewportMode] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'
  const [splitCompare, setSplitCompare] = useState(false);

  // Active Style Overrides: { [componentId]: { prop: val } }
  const [activeStyles, setActiveStyles] = useState({});

  // History stack for Undo / Redo
  const [historyStack, setHistoryStack] = useState([{}]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Saved Drafts
  const [drafts, setDrafts] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_DRAFTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [activeDraftId, setActiveDraftId] = useState(null);

  // AI Design Assistant State
  const [pendingProposal, setPendingProposal] = useState(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Diff & Patch Application Modal
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [isPatching, setIsPatching] = useState(false);
  const [patchFeedback, setPatchFeedback] = useState(null);
  const [lastBackupFile, setLastBackupFile] = useState(null);

  // Sync drafts to localStorage and attempt backend sync
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_DRAFTS_KEY, JSON.stringify(drafts));
    } catch {
      // Storage full or private mode
    }
  }, [drafts]);

  // When targetPage changes, select the first component on that page
  useEffect(() => {
    const pageComps = getComponentsByPage(targetPage);
    if (pageComps.length > 0) {
      setSelectedComponentId(pageComps[0].id);
    }
  }, [targetPage]);

  // Push new state to history stack
  const pushHistory = useCallback((newStyles) => {
    setHistoryStack(prev => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      return [...upToCurrent, JSON.parse(JSON.stringify(newStyles))];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  // Update a single style property on a component
  const updateComponentStyle = useCallback((componentId, property, value) => {
    const valResult = validatePropertyChange(componentId, property, value);
    if (!valResult.valid) {
      alert(`Invalid visual property: ${valResult.error}`);
      return;
    }

    setActiveStyles(prev => {
      const compStyles = prev[componentId] || {};
      const updated = {
        ...prev,
        [componentId]: {
          ...compStyles,
          [property]: valResult.value
        }
      };
      pushHistory(updated);
      return updated;
    });
  }, [pushHistory]);

  // Apply a full preset
  const applyPreset = useCallback((presetId) => {
    const preset = DESIGN_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    setActiveStyles(prev => {
      const updated = { ...prev };
      for (const [cId, sObj] of Object.entries(preset.styles)) {
        updated[cId] = { ...(updated[cId] || {}), ...sObj };
      }
      pushHistory(updated);
      return updated;
    });
  }, [pushHistory]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setActiveStyles(JSON.parse(JSON.stringify(historyStack[prevIndex])));
    }
  }, [historyIndex, historyStack]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < historyStack.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setActiveStyles(JSON.parse(JSON.stringify(historyStack[nextIndex])));
    }
  }, [historyIndex, historyStack]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyStack.length - 1;

  // Reset single component styles to default
  const resetComponentStyles = useCallback((componentId) => {
    setActiveStyles(prev => {
      const copy = { ...prev };
      delete copy[componentId];
      pushHistory(copy);
      return copy;
    });
  }, [pushHistory]);

  // Reset all styles
  const resetAllStyles = useCallback(() => {
    setActiveStyles({});
    pushHistory({});
  }, [pushHistory]);

  // AI Redesign Request
  const requestAiRedesign = useCallback(async (promptText) => {
    setIsAiThinking(true);
    setAiError(null);
    try {
      const proposal = await generateAiDesignProposal({
        prompt: promptText,
        activePage,
        selectedComponentId,
        currentStyles: activeStyles
      });
      setPendingProposal(proposal);
      // Automatically preview the proposal's styles on the canvas
      if (proposal.changes) {
        setActiveStyles(prev => {
          const updated = { ...prev };
          for (const [cId, sObj] of Object.entries(proposal.changes)) {
            updated[cId] = { ...(updated[cId] || {}), ...sObj };
          }
          pushHistory(updated);
          return updated;
        });
      }
    } catch (err) {
      setAiError(err.message || 'Error generating AI design proposal.');
    } finally {
      setIsAiThinking(false);
    }
  }, [targetPage, selectedComponentId, activeStyles, pushHistory]);

  // Drafts management
  const saveDraft = useCallback((title) => {
    const draftName = title || `Design Draft (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    const newDraft = {
      id: `draft_${Date.now()}`,
      title: draftName,
      page: targetPage,
      styles: JSON.parse(JSON.stringify(activeStyles)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setDrafts(prev => [newDraft, ...prev.filter(d => d.id !== newDraft.id)]);
    setActiveDraftId(newDraft.id);

    // Async sync to backend
    fetch('/api/ui-studio/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDraft)
    }).catch(() => {});

    return newDraft;
  }, [targetPage, activeStyles]);

  const loadDraft = useCallback((draftId) => {
    const draft = drafts.find(d => d.id === draftId);
    if (!draft) return;
    setTargetPage(draft.page);
    setActiveStyles(JSON.parse(JSON.stringify(draft.styles || {})));
    setActiveDraftId(draft.id);
    pushHistory(draft.styles || {});
  }, [drafts, pushHistory]);

  const deleteDraft = useCallback((draftId) => {
    setDrafts(prev => prev.filter(d => d.id !== draftId));
    if (activeDraftId === draftId) {
      setActiveDraftId(null);
    }
    fetch(`/api/ui-studio/drafts/${draftId}`, { method: 'DELETE' }).catch(() => {});
  }, [activeDraftId]);

  // Apply Approved Patch to Codebase (Controlled backend update)
  const applyApprovedPatch = useCallback(async (proposal) => {
    setIsPatching(true);
    setPatchFeedback(null);
    try {
      const res = await fetch('/api/ui-studio/apply-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal: proposal || pendingProposal,
          activeStyles
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to apply patch to codebase.');
      }

      setPatchFeedback({
        success: true,
        message: data.message || 'Changes successfully applied to codebase.',
        backupFile: data.backupFile || null,
        affectedFiles: data.affectedFiles || []
      });
      if (data.backupFile) {
        setLastBackupFile(data.backupFile);
      }
      setPendingProposal(null);
    } catch (err) {
      setPatchFeedback({
        success: false,
        message: err.message || 'An error occurred while modifying the codebase.'
      });
    } finally {
      setIsPatching(false);
    }
  }, [pendingProposal, activeStyles]);

  // Revert last applied patch
  const revertLastPatch = useCallback(async () => {
    setIsPatching(true);
    try {
      const res = await fetch('/api/ui-studio/revert-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupFile: lastBackupFile })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revert patch.');

      setPatchFeedback({
        success: true,
        message: 'Successfully rolled back to previous codebase state.'
      });
      setLastBackupFile(null);
    } catch (err) {
      setPatchFeedback({
        success: false,
        message: err.message || 'Revert failed.'
      });
    } finally {
      setIsPatching(false);
    }
  }, [lastBackupFile]);

  const value = useMemo(() => ({
    targetPage,
    setTargetPage,
    selectedComponentId,
    setSelectedComponentId,
    hoveredComponentId,
    setHoveredComponentId,
    viewportMode,
    setViewportMode,
    splitCompare,
    setSplitCompare,
    activeStyles,
    updateComponentStyle,
    applyPreset,
    undo,
    redo,
    canUndo,
    canRedo,
    resetComponentStyles,
    resetAllStyles,
    drafts,
    activeDraftId,
    saveDraft,
    loadDraft,
    deleteDraft,
    pendingProposal,
    setPendingProposal,
    isAiThinking,
    aiError,
    requestAiRedesign,
    diffModalOpen,
    setDiffModalOpen,
    isPatching,
    patchFeedback,
    lastBackupFile,
    applyApprovedPatch,
    revertLastPatch
  }), [
    targetPage,
    selectedComponentId,
    hoveredComponentId,
    viewportMode,
    splitCompare,
    activeStyles,
    updateComponentStyle,
    applyPreset,
    undo,
    redo,
    canUndo,
    canRedo,
    resetComponentStyles,
    resetAllStyles,
    drafts,
    activeDraftId,
    saveDraft,
    loadDraft,
    deleteDraft,
    pendingProposal,
    isAiThinking,
    aiError,
    requestAiRedesign,
    diffModalOpen,
    isPatching,
    patchFeedback,
    lastBackupFile,
    applyApprovedPatch,
    revertLastPatch
  ]);

  return (
    <UIStudioContext.Provider value={value}>
      {children}
    </UIStudioContext.Provider>
  );
}

export function useUIStudio() {
  const context = useContext(UIStudioContext);
  if (!context) {
    throw new Error('useUIStudio must be used within a UIStudioProvider');
  }
  return context;
}
