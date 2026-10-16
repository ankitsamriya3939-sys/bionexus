import React from 'react';
import {
  Moon, Sun, Search, FolderGit2, Bookmark, UserCheck,
  User, Pin, Boxes, Sparkles
} from 'lucide-react';
import ActiveSequenceBar from './ActiveSequenceBar';
import { useWorkspace } from '../context/WorkspaceContext';

export default function Navbar({
  currentTheme,
  toggleTheme,
  activeTab: _activeTab,
  setActiveTab,
  globalSearch,
  setGlobalSearch,
  onOpenProjects,
  onOpenLibrary,
  onOpenUpdates,
  user,
  onOpenAuthModal
}) {
  const {
    activeProject,
    selectedScientificObject,
    inspectObjectInSpace
  } = useWorkspace();

  return (
    <nav className="navbar" style={{ gap: '14px', background: 'rgba(8, 12, 30, 0.88)', borderBottom: '1px solid rgba(99, 128, 220, 0.18)' }}>
      {/* Brand Logo - Schrödinger / PyMOL 3 Style */}
      <a
        href="/"
        className="brand-logo"
        onClick={(e) => {
          e.preventDefault();
          setActiveTab('home');
        }}
        style={{ cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}
      >
        <div style={{
          background: 'linear-gradient(135deg, var(--schrodinger-blue), var(--pymol-cyan))',
          padding: '7px',
          borderRadius: '10px',
          display: 'flex',
          boxShadow: '0 0 18px rgba(0, 132, 214, 0.45)'
        }}>
          <Boxes size={20} color="#070a1a" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.3px', lineHeight: 1.1, color: '#ffffff' }}>
              BioNexus
            </span>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              background: 'rgba(0, 132, 214, 0.25)',
              color: 'var(--pymol-cyan)',
              border: '1px solid rgba(0, 132, 214, 0.4)',
              padding: '1px 6px',
              borderRadius: '12px'
            }}>
              PyMOL 3
            </span>
          </div>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            Schrödinger Platform
          </span>
        </div>
      </a>

      {/* Global Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, maxWidth: '340px', margin: '0 8px' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="input-field"
            style={{ paddingLeft: '34px', height: '34px', fontSize: '0.82rem' }}
            placeholder="Search NCBI, UniProt, or gene (e.g. TP53, 1TUP)..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setActiveTab('ncbi');
              }
            }}
          />
        </div>
      </div>

      {/* Selected Scientific Object Quick-Bridge */}
      {selectedScientificObject && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(6, 182, 212, 0.1)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '0.78rem'
        }}>
          <Pin size={12} color="var(--accent-cyan)" />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>
            {selectedScientificObject.type}:
          </span>
          <strong style={{ color: 'var(--text-primary)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedScientificObject.name || selectedScientificObject.symbol || selectedScientificObject.pdbId}
          </strong>

          {/* Quick jump to Protein Space if structure or PDB is available */}
          {(selectedScientificObject.pdbId || selectedScientificObject.associatedPdbIds?.length > 0) && (
            <button
              onClick={() => {
                inspectObjectInSpace(selectedScientificObject, 'protein');
                setActiveTab('protein');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-cyan)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0 4px'
              }}
              title="Open 3D structure in Protein Space"
            >
              <Boxes size={12} /> 3D
            </button>
          )}
        </div>
      )}

      {/* Legacy Active Sequence Bar Bridge */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <ActiveSequenceBar setActiveTab={setActiveTab} />
      </div>

      {/* Workspace Controls */}
      <div className="nav-controls" style={{ gap: '8px' }}>

        <button
          className="btn-secondary"
          style={{ padding: '5px 10px', fontSize: '0.8rem' }}
          onClick={onOpenProjects}
          title="Manage Project Workspaces"
        >
          <FolderGit2 size={15} color="var(--accent-cyan)" />
          <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeProject ? activeProject.name : 'Projects'}
          </span>
        </button>

        <button
          className="btn-secondary"
          style={{ padding: '5px 10px', fontSize: '0.8rem' }}
          onClick={onOpenLibrary}
          title="Open Sequence Library"
        >
          <Bookmark size={15} color="var(--accent-emerald)" />
          Library
        </button>

        <button
          className="btn-secondary"
          style={{
            padding: '5px 11px',
            fontSize: '0.8rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.18), rgba(192, 132, 252, 0.08))',
            borderColor: 'rgba(168, 85, 247, 0.45)',
            boxShadow: '0 0 14px rgba(168, 85, 247, 0.2)'
          }}
          onClick={onOpenUpdates}
          title="What's New in BioNexus Studio v2.1"
        >
          <Sparkles size={14} color="#c084fc" />
          <span>Updates</span>
          <span style={{
            background: 'linear-gradient(135deg, #a855f7, #ec4899)',
            color: '#ffffff',
            fontSize: '0.62rem',
            fontWeight: 800,
            padding: '1px 5px',
            borderRadius: '10px',
            lineHeight: 1.1
          }}>v2.1</span>
        </button>

        <button className="btn-icon" title="Toggle Dark/Light Mode" onClick={toggleTheme}>
          {currentTheme === 'dark' ? <Sun size={17} color="#f59e0b" /> : <Moon size={17} color="#8b5cf6" />}
        </button>

        {/* Account Controls - Schrödinger Pill Buttons */}
        <button
          onClick={onOpenAuthModal}
          style={{
            background: 'rgba(18, 24, 53, 0.7)',
            border: '1px solid rgba(99, 128, 220, 0.4)',
            color: '#ffffff',
            padding: '6px 16px',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
          title={user ? `Signed in as ${user.name || user.email}` : 'Sign into BioNexus Studio'}
        >
          {user ? <UserCheck size={14} color="var(--accent-emerald)" /> : <User size={14} color="var(--text-secondary)" />}
          <span>{user ? (user.name || user.email.split('@')[0]) : 'LOGIN'}</span>
        </button>

        <button
          className="btn-schrodinger"
          style={{ padding: '6px 16px', fontSize: '0.8rem', letterSpacing: '0.3px' }}
          onClick={() => setActiveTab('protein')}
        >
          <span>LAUNCH STUDIO</span>
        </button>
      </div>
    </nav>
  );
}
