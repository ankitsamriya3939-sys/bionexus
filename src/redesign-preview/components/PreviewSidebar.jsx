import React, { useState } from 'react';
import { 
  Dna, Network, Boxes, BookOpen, Share2, 
  Binary, Database, Zap, GitMerge, Scissors, Calculator, 
  LayoutDashboard, FolderGit2, Bookmark, ChevronLeft, ChevronRight,
  Flame, HelpCircle, Activity 
} from 'lucide-react';

export default function PreviewSidebar({ 
  activeWorkspace, 
  setActiveWorkspace, 
  onOpenProjects, 
  onOpenLibrary 
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const primarySpaces = [
    { id: 'genome', label: 'Genome Space', icon: Dna, color: 'var(--bn-cyan)', count: '5 Tools' },
    { id: 'phylo', label: 'Evolution Space', icon: Network, color: 'var(--bn-emerald)', count: 'Trees' },
    { id: 'protein', label: 'Protein Space', icon: Boxes, color: 'var(--bn-amber)', count: '3D WebGL' },
    { id: 'evidence', label: 'Evidence Space', icon: BookOpen, color: 'var(--bn-blue)', count: '18 Refs' },
    { id: 'graph', label: 'Research Graph', icon: Share2, color: 'var(--bn-violet)', count: 'Network' }
  ];

  const genomicTools = [
    { id: 'analysis', label: 'Sequence Analysis', icon: Binary, count: '6-Frame' },
    { id: 'ncbi', label: 'NCBI Explorer', icon: Database, count: 'Entrez' },
    { id: 'blast', label: 'BLAST Center', icon: Zap, count: 'Local' },
    { id: 'alignment', label: 'Alignment (MSA)', icon: GitMerge, count: 'NW' },
    { id: 'primer', label: 'Primer Designer', icon: Scissors, count: 'Tm Clamps' },
    { id: 'utilities', label: 'Lab Utilities', icon: Calculator, count: 'Formulas' }
  ];

  const workspaceHub = [
    { id: 'dashboard', label: 'Dashboard & Reports', icon: LayoutDashboard, count: 'PDFs' }
  ];

  return (
    <aside className={`bn-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Header with Collapse Toggle */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid var(--bn-border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between'
      }}>
        {!isCollapsed && (
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--bn-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Workstation Nav
          </span>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="bn-btn bn-btn-ghost bn-btn-icon" 
          style={{ width: '24px', height: '24px' }}
          title={isCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* Primary Research Workspaces */}
      <div style={{ padding: '4px 0' }}>
        {!isCollapsed && <div className="bn-sidebar-section-title">Research Workspaces</div>}
        {primarySpaces.map(item => {
          const Icon = item.icon;
          const isActive = activeWorkspace === item.id;
          return (
            <div
              key={item.id}
              className={`bn-nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setActiveWorkspace(item.id)}
              title={item.label}
              style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}
            >
              <Icon size={15} color={isActive ? item.color : 'currentColor'} />
              {!isCollapsed && (
                <>
                  <span>{item.label}</span>
                  <span className="bn-nav-badge">{item.count}</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Genomic Suite Tools */}
      <div style={{ padding: '6px 0', borderTop: '1px solid var(--bn-border-subtle)' }}>
        {!isCollapsed && <div className="bn-sidebar-section-title">Genomic Tools</div>}
        {genomicTools.map(item => {
          const Icon = item.icon;
          const isActive = activeWorkspace === item.id;
          return (
            <div
              key={item.id}
              className={`bn-nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setActiveWorkspace(item.id)}
              title={item.label}
              style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}
            >
              <Icon size={14} color={isActive ? 'var(--bn-cyan)' : 'currentColor'} />
              {!isCollapsed && (
                <>
                  <span>{item.label}</span>
                  <span className="bn-nav-badge">{item.count}</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Workspace Hub */}
      <div style={{ padding: '6px 0', borderTop: '1px solid var(--bn-border-subtle)', marginTop: 'auto' }}>
        {!isCollapsed && <div className="bn-sidebar-section-title">Workspace Hub</div>}
        {workspaceHub.map(item => {
          const Icon = item.icon;
          const isActive = activeWorkspace === item.id;
          return (
            <div
              key={item.id}
              className={`bn-nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setActiveWorkspace(item.id)}
              title={item.label}
              style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}
            >
              <Icon size={14} />
              {!isCollapsed && (
                <>
                  <span>{item.label}</span>
                  <span className="bn-nav-badge">{item.count}</span>
                </>
              )}
            </div>
          );
        })}

        <div
          className="bn-nav-link"
          onClick={onOpenProjects}
          title="Project Workspaces"
          style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}
        >
          <FolderGit2 size={14} color="var(--bn-cyan)" />
          {!isCollapsed && <span>Project Manager</span>}
        </div>

        <div
          className="bn-nav-link"
          onClick={onOpenLibrary}
          title="Sequence Library"
          style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}
        >
          <Bookmark size={14} color="var(--bn-emerald)" />
          {!isCollapsed && <span>Sequence Library</span>}
        </div>
      </div>
    </aside>
  );
}
