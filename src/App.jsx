import React, { useState, useEffect } from 'react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import BreadcrumbNav from './components/BreadcrumbNav';

import Home from './components/Home';
import Dashboard from './components/Dashboard';
import GenomeSpace from './components/GenomeSpace';
import Phylogenetics from './components/Phylogenetics';
import ProteinStructure from './components/ProteinStructure';
import EvidenceSpace from './components/EvidenceSpace';
import LabUtilities from './components/LabUtilities';

import ProjectManager from './components/ProjectManager';
import SequenceLibraryModal from './components/SequenceLibraryModal';
import AuthModal from './components/AuthModal';
import UpdatesModal from './components/UpdatesModal';
import ErrorBoundary from './components/ErrorBoundary';
import PrimerDesignWorkspace from './components/primerDesign/PrimerDesignWorkspace';

import { getCurrentUser, signOut } from './services/authService';
import { updateRouteSeo } from './utils/seo';
import { initAnalytics, trackPageView } from './utils/analytics';

import { getTabFromPath, getPathFromTab } from './utils/router';
export { getTabFromPath, getPathFromTab };

function MainAppShell() {
  const [theme, setTheme] = useState('dark');
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      return getTabFromPath(window.location.pathname);
    }
    return 'home';
  });
  const [globalSearch, setGlobalSearch] = useState('');
  
  // Shared state between tools
  const [sharedAlignmentData, setSharedAlignmentData] = useState(null);

  // User Auth State
  const [user, setUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authRedirectTab, setAuthRedirectTab] = useState(null);

  // Workspace Modals
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);
  const [updatesModalOpen, setUpdatesModalOpen] = useState(false);

  // Saved Workspace Records
  const [savedPrimers, setSavedPrimers] = useState(() => {
    try {
      const stored = localStorage.getItem('bionexus_primers');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const [savedAnalyses, setSavedAnalyses] = useState(() => {
    try {
      const stored = localStorage.getItem('bionexus_analyses');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  // Init analytics on mount
  useEffect(() => {
    initAnalytics();
  }, []);

  // Sync window location popstate with activeTab
  useEffect(() => {
    const handlePopState = () => {
      const targetTab = getTabFromPath(window.location.pathname);
      setActiveTab(targetTab);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update dynamic SEO & Analytics whenever activeTab changes
  useEffect(() => {
    updateRouteSeo(activeTab);
    trackPageView(getPathFromTab(activeTab));
  }, [activeTab]);

  // Check initial user on mount
  useEffect(() => {
    getCurrentUser().then(u => {
      if (u) setUser(u);
    });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('bionexus_primers', JSON.stringify(savedPrimers));
  }, [savedPrimers]);

  useEffect(() => {
    localStorage.setItem('bionexus_analyses', JSON.stringify(savedAnalyses));
  }, [savedAnalyses]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Tab Navigation with history synchronization
  const handleTabChange = (targetTab, updateHistory = true) => {
    setActiveTab(targetTab);
    if (updateHistory && typeof window !== 'undefined') {
      const targetPath = getPathFromTab(targetTab);
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ tab: targetTab }, '', targetPath);
      }
    }
  };

  const handleAuthSuccess = (authUser, redirectTab) => {
    setUser(authUser);
    setAuthModalOpen(false);
    if (redirectTab) {
      handleTabChange(redirectTab);
      setAuthRedirectTab(null);
    }
  };

  const handleSignOutUser = async () => {
    await signOut();
    setUser(null);
    handleTabChange('home');
  };

  const handleSavePrimerSet = (primerPair) => {
    setSavedPrimers(prev => [primerPair, ...prev]);
  };

  const handleDeletePrimer = (idx) => {
    setSavedPrimers(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveAnalysis = (analysis) => {
    setSavedAnalyses(prev => [analysis, ...prev]);
  };

  const handleDeleteAnalysis = (idx) => {
    setSavedAnalyses(prev => prev.filter((_, i) => i !== idx));
  };

  const exportWorkspaceJson = () => {
    const data = { savedPrimers, savedAnalyses, exportedAt: new Date() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BioNexus_Universe_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const importWorkspaceJson = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (data.savedPrimers) setSavedPrimers(data.savedPrimers);
        if (data.savedAnalyses) setSavedAnalyses(data.savedAnalyses);
        alert('Workspace backup successfully imported!');
      } catch {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // Determine if active tab belongs to Genome Space
  // Full-page Benchling-style Primer Design Workspace route (/primer-design)
  if (activeTab === 'primer-design') {
    return (
      <ErrorBoundary>
        <PrimerDesignWorkspace />
      </ErrorBoundary>
    );
  }

  // Determine if active tab belongs to Genome Space
  const isGenomeSpace = activeTab === 'genome' || ['analysis', 'ncbi', 'blast', 'alignment'].includes(activeTab);

  return (
    <div className="app-container">
      <Navbar
        currentTheme={theme}
        toggleTheme={toggleTheme}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        globalSearch={globalSearch}
        setGlobalSearch={setGlobalSearch}
        onOpenProjects={() => setProjectModalOpen(true)}
        onOpenLibrary={() => setLibraryModalOpen(true)}
        onOpenUpdates={() => setUpdatesModalOpen(true)}
        user={user}
        onOpenAuthModal={() => {
          if (user) {
            if (window.confirm(`Signed in as ${user.name || user.email}. Would you like to sign out?`)) {
              handleSignOutUser();
            }
          } else {
            setAuthModalOpen(true);
          }
        }}
      />

      <div className="main-body" style={{ position: 'relative' }}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          onOpenProjects={() => setProjectModalOpen(true)}
          onOpenLibrary={() => setLibraryModalOpen(true)}
          onOpenUpdates={() => setUpdatesModalOpen(true)}
        />

        <main className="content-area">
          <ErrorBoundary>
            <BreadcrumbNav activeTab={activeTab} onOpenProjects={() => setProjectModalOpen(true)} />

            {activeTab === 'home' && (
              <Home
                setActiveTab={handleTabChange}
                onOpenProjects={() => setProjectModalOpen(true)}
                onOpenLibrary={() => setLibraryModalOpen(true)}
                onOpenUpdates={() => setUpdatesModalOpen(true)}
              />
            )}

            {isGenomeSpace && (
              <GenomeSpace
                initialTool={activeTab === 'genome' ? 'analysis' : activeTab}
                setActiveTab={handleTabChange}
                globalSearch={globalSearch}
                saveAnalysis={handleSaveAnalysis}
                savePrimerSet={handleSavePrimerSet}
                sharedAlignmentData={sharedAlignmentData}
                setSharedAlignmentData={setSharedAlignmentData}
              />
            )}

            {activeTab === 'phylo' && (
              <Phylogenetics
                setActiveTab={handleTabChange}
                sharedAlignmentData={sharedAlignmentData}
              />
            )}

            {activeTab === 'protein' && (
              <ProteinStructure />
            )}

            {activeTab === 'evidence' && (
              <EvidenceSpace />
            )}

            {activeTab === 'dashboard' && (
              <Dashboard
                savedPrimers={savedPrimers}
                savedAnalyses={savedAnalyses}
                savedFastas={[]}
                deletePrimer={handleDeletePrimer}
                deleteAnalysis={handleDeleteAnalysis}
                exportWorkspaceJson={exportWorkspaceJson}
                importWorkspaceJson={importWorkspaceJson}
              />
            )}

            {activeTab === 'utilities' && (
              <LabUtilities />
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* Global Modals */}
      <ProjectManager
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        setActiveTab={handleTabChange}
        savedPrimers={savedPrimers}
        savedAnalyses={savedAnalyses}
      />

      <SequenceLibraryModal
        isOpen={libraryModalOpen}
        onClose={() => setLibraryModalOpen(false)}
        setActiveTab={handleTabChange}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          setAuthRedirectTab(null);
        }}
        onAuthSuccess={handleAuthSuccess}
        requestedTab={authRedirectTab}
      />

      <UpdatesModal
        isOpen={updatesModalOpen}
        onClose={() => setUpdatesModalOpen(false)}
        setActiveTab={handleTabChange}
      />
    </div>
  );
}

export default function App() {
  return (
    <WorkspaceProvider>
      <MainAppShell />
    </WorkspaceProvider>
  );
}
