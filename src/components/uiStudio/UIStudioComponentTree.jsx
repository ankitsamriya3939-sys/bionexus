// BioNexus UI Studio — Component Tree & Drafts Navigator (Left Panel)
// Provides page switching, tree hierarchy navigation, and draft persistence management.

import React, { useState } from 'react';
import { useUIStudio } from '../../context/UIStudioContext';
import { 
  COMPONENT_CATEGORIES, COMPONENT_REGISTRY, getComponentsByPage 
} from '../../services/uiStudioRegistry';
import { 
  FolderTree, Bookmark, Layers, Boxes, Network, LayoutDashboard, 
  Dna, BookOpen, PanelLeft, Plus, Trash2, Download, Upload, Clock 
} from 'lucide-react';

export default function UIStudioComponentTree() {
  const {
    targetPage,
    setTargetPage,
    selectedComponentId,
    setSelectedComponentId,
    hoveredComponentId,
    setHoveredComponentId,
    drafts,
    activeDraftId,
    saveDraft,
    loadDraft,
    deleteDraft
  } = useUIStudio();

  const [activeTab, setActiveTab] = useState('tree'); // 'tree' | 'drafts'
  const [newDraftTitle, setNewDraftTitle] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  const pageNavItems = [
    { id: 'protein', label: 'Protein Space', icon: Boxes, color: 'var(--accent-amber)' },
    { id: 'phylo', label: 'Evolution Space', icon: Network, color: 'var(--accent-emerald)' },
    { id: 'home', label: 'Home Workspace', icon: Dna, color: 'var(--accent-cyan)' },
    { id: 'dashboard', label: 'Dashboard & Reports', icon: LayoutDashboard, color: 'var(--accent-rose)' },
    { id: 'genome', label: 'Genome Suite', icon: Dna, color: 'var(--accent-blue)' },
    { id: 'evidence', label: 'Evidence Space', icon: BookOpen, color: 'var(--accent-violet)' }
  ];

  const currentComponents = getComponentsByPage(targetPage);

  const handleCreateDraft = (e) => {
    e.preventDefault();
    if (!newDraftTitle.trim()) return;
    saveDraft(newDraftTitle.trim());
    setNewDraftTitle('');
    setShowSaveForm(false);
  };

  const handleExportDraft = (draft) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(draft, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `BioNexus_DesignDraft_${draft.title.replace(/\s+/g, '_')}.json`);
    dlAnchor.click();
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-color)',
      overflowY: 'auto'
    }}>
      {/* Top Tabs: Hierarchy vs Drafts */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'rgba(255, 255, 255, 0.02)'
      }}>
        <button
          onClick={() => setActiveTab('tree')}
          style={{
            flex: 1,
            padding: '12px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'tree' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            color: activeTab === 'tree' ? 'var(--accent-cyan)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <FolderTree size={14} /> Components
        </button>
        <button
          onClick={() => setActiveTab('drafts')}
          style={{
            flex: 1,
            padding: '12px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'drafts' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            color: activeTab === 'drafts' ? 'var(--accent-cyan)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Bookmark size={14} /> Saved Drafts ({drafts.length})
        </button>
      </div>

      {activeTab === 'tree' ? (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Target Page Selector */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
              Target Page
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {pageNavItems.map(p => {
                const Icon = p.icon;
                const isActive = targetPage === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setTargetPage(p.id)}
                    className="btn-secondary"
                    style={{
                      padding: '8px 12px',
                      justifyContent: 'flex-start',
                      gap: '8px',
                      fontSize: '0.8rem',
                      borderRadius: '8px',
                      borderColor: isActive ? p.color : 'var(--border-color)',
                      background: isActive ? 'rgba(255, 255, 255, 0.06)' : 'transparent'
                    }}
                  >
                    <Icon size={15} color={p.color} />
                    <span style={{ fontWeight: isActive ? 700 : 500, color: isActive ? '#fff' : 'var(--text-secondary)' }}>
                      {p.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Component Hierarchy for Active Page */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
              Redesignable Containers
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {currentComponents.map(comp => {
                const isSelected = selectedComponentId === comp.id;
                const isHovered = hoveredComponentId === comp.id;
                return (
                  <div
                    key={comp.id}
                    onClick={() => setSelectedComponentId(comp.id)}
                    onMouseEnter={() => setHoveredComponentId(comp.id)}
                    onMouseLeave={() => setHoveredComponentId(null)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: isSelected ? '1px solid var(--accent-cyan)' : isHovered ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid var(--border-color)',
                      background: isSelected ? 'rgba(6, 182, 212, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                        {comp.name}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {comp.safeProperties.length} props
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {comp.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        // DRAFTS MANAGER TAB
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Save Draft Trigger */}
          {showSaveForm ? (
            <form onSubmit={handleCreateDraft} className="glass-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Draft name (e.g. Dark Glass Protein Canvas)..."
                value={newDraftTitle}
                onChange={(e) => setNewDraftTitle(e.target.value)}
                autoFocus
                style={{ fontSize: '0.8rem', padding: '6px 10px' }}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '6px', fontSize: '0.78rem' }}>
                  Save
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowSaveForm(false)} style={{ padding: '6px 10px', fontSize: '0.78rem' }}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              className="btn-primary"
              onClick={() => setShowSaveForm(true)}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Plus size={14} /> Save Current Design Draft
            </button>
          )}

          {/* Drafts List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {drafts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <Bookmark size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                No saved drafts yet. Customize styles and click "Save Current Design Draft" to store your work.
              </div>
            ) : (
              drafts.map(draft => {
                const isActive = activeDraftId === draft.id;
                return (
                  <div
                    key={draft.id}
                    className="glass-card"
                    style={{
                      padding: '12px',
                      borderColor: isActive ? 'var(--accent-cyan)' : 'var(--border-color)',
                      background: isActive ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255, 255, 255, 0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                          {draft.title}
                        </h4>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} /> {new Date(draft.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Page: {draft.page}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="btn-icon"
                          onClick={() => handleExportDraft(draft)}
                          title="Export draft JSON"
                          style={{ padding: '3px', color: 'var(--text-muted)' }}
                        >
                          <Download size={13} />
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => deleteDraft(draft.id)}
                          title="Delete draft"
                          style={{ padding: '3px', color: 'var(--accent-rose)' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: '10px' }}>
                      <button
                        className="btn-secondary"
                        onClick={() => loadDraft(draft.id)}
                        style={{
                          width: '100%',
                          padding: '5px 10px',
                          fontSize: '0.76rem',
                          justifyContent: 'center',
                          borderColor: isActive ? 'var(--accent-cyan)' : 'var(--border-color)',
                          color: isActive ? 'var(--accent-cyan)' : 'inherit'
                        }}
                      >
                        {isActive ? 'Active on Canvas' : 'Load onto Canvas'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
