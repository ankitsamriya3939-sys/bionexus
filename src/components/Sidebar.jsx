import React from 'react';
import { 
  Dna, Network, Boxes, BookOpen, 
  LayoutDashboard, Calculator, FolderGit2, 
  Bookmark, Binary, Database, Zap, GitMerge, Scissors, Sparkles 
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, onOpenProjects, onOpenLibrary, onOpenUpdates }) {
  const primarySpaces = [
    { id: 'genome', label: 'Genome Space', icon: Dna, path: '/genome', color: 'var(--accent-cyan)' },
    { id: 'phylo', label: 'Evolution Space', icon: Network, path: '/phylogenetics', color: 'var(--accent-emerald)' },
    { id: 'protein', label: 'Protein Space', icon: Boxes, path: '/protein-structure', color: 'var(--accent-amber)' },
    { id: 'evidence', label: 'Evidence Space', icon: BookOpen, path: '/evidence', color: 'var(--accent-blue)' },
  ];

  const quickTools = [
    { id: 'analysis', label: 'Sequence Analysis', icon: Binary, path: '/sequence-analysis' },
    { id: 'ncbi', label: 'NCBI Explorer', icon: Database, path: '/ncbi' },
    { id: 'blast', label: 'BLAST Center', icon: Zap, path: '/blast' },
    { id: 'alignment', label: 'Alignment (MSA)', icon: GitMerge, path: '/alignment' },
    { id: 'primer', label: 'Primer Designer', icon: Scissors, path: '/primer-design', newTab: true },
    { id: 'utilities', label: 'Lab Utilities', icon: Calculator, path: '/lab-utilities' },
  ];

  return (
    <aside className="sidebar">
      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', padding: '6px 12px 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Research Workspaces
      </div>

      {primarySpaces.map(item => {
        const Icon = item.icon;
        const isActive = activeTab === item.id || 
          (item.id === 'genome' && ['analysis', 'ncbi', 'blast', 'alignment', 'primer'].includes(activeTab));

        return (
          <a
            key={item.id}
            href={item.path}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              setActiveTab(item.id);
            }}
            style={{ textDecoration: 'none' }}
          >
            <Icon size={18} color={isActive ? item.color : 'currentColor'} />
            <span style={{ fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
          </a>
        );
      })}

      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', padding: '14px 12px 4px', textTransform: 'uppercase', letterSpacing: '1px', borderTop: '1px solid var(--border-color)', marginTop: '8px' }}>
        Genomic Tools
      </div>

      {quickTools.map(item => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <a
            key={item.id}
            href={item.path}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={(e) => {
              if (item.newTab || item.id === 'primer') {
                e.preventDefault();
                window.open('/primer-design', '_blank');
              } else {
                e.preventDefault();
                setActiveTab(item.id);
              }
            }}
            style={{ textDecoration: 'none', paddingLeft: '18px', fontSize: '0.84rem' }}
          >
            <Icon size={16} />
            <span>{item.label}</span>
          </a>
        );
      })}

      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', padding: '14px 12px 4px', textTransform: 'uppercase', letterSpacing: '1px', borderTop: '1px solid var(--border-color)', marginTop: '8px' }}>
        Workspace Hub
      </div>

      <a
        href="/dashboard"
        className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
        onClick={(e) => {
          e.preventDefault();
          setActiveTab('dashboard');
        }}
        style={{ textDecoration: 'none' }}
      >
        <LayoutDashboard size={17} />
        <span>Dashboard & Reports</span>
      </a>

      <div className="nav-item" onClick={onOpenProjects} style={{ cursor: 'pointer' }}>
        <FolderGit2 size={17} color="var(--accent-cyan)" />
        <span>Project Workspaces</span>
      </div>

      <div className="nav-item" onClick={onOpenLibrary} style={{ cursor: 'pointer' }}>
        <Bookmark size={17} color="var(--accent-emerald)" />
        <span>Sequence Library</span>
      </div>

      {onOpenUpdates && (
        <div 
          className="nav-item" 
          onClick={onOpenUpdates} 
          style={{ 
            cursor: 'pointer',
            marginTop: '6px',
            color: '#c084fc',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(192, 132, 252, 0.05))',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            borderRadius: '8px'
          }}
          title="What's New in BioNexus Studio v2.1"
        >
          <Sparkles size={17} color="#c084fc" />
          <span>What's New</span>
          <span style={{
            marginLeft: 'auto',
            background: 'linear-gradient(135deg, #a855f7, #ec4899)',
            color: '#ffffff',
            fontSize: '0.62rem',
            fontWeight: 800,
            padding: '1px 5px',
            borderRadius: '10px',
            lineHeight: 1.1
          }}>v2.1</span>
        </div>
      )}
    </aside>
  );
}
