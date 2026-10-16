// BioNexus UI Studio — Component Registry & Safe Property Schema
// Defines stable component IDs, parent-child hierarchies, safe visual properties,
// and specialized scientific presentation attributes.

export const COMPONENT_CATEGORIES = {
  GLOBAL: 'Global Navigation & Shell',
  HOME: 'Home Workspace',
  PROTEIN: 'Protein Space (Molecular Canvas)',
  PHYLO: 'Evolution Space (Phylogenetics)',
  GENOME: 'Genome Space & Tools',
  DASHBOARD: 'Dashboard & Reports',
  EVIDENCE: 'Evidence Space'
};

export const COMPONENT_REGISTRY = {
  // -------------------------------------------------------------
  // 1. GLOBAL NAVIGATION & SHELL
  // -------------------------------------------------------------
  'navbar-container': {
    id: 'navbar-container',
    name: 'Top Navigation Bar',
    category: COMPONENT_CATEGORIES.GLOBAL,
    page: 'navbar',
    targetFile: 'src/components/Navbar.jsx',
    selector: '.navbar',
    description: 'Header container containing brand logo, search bar, active sequence bridge, and controls.',
    safeProperties: [
      'height', 'padding', 'backgroundColor', 'backdropBlur', 'borderColor', 
      'boxShadow', 'gap', 'borderRadius'
    ],
    defaultStyles: {
      height: '64px',
      padding: '0 20px',
      backgroundColor: 'rgba(11, 15, 25, 0.85)',
      backdropBlur: '12px',
      borderColor: 'rgba(255, 255, 255, 0.08)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      gap: '12px',
      borderRadius: '0px'
    }
  },

  'navbar-brand': {
    id: 'navbar-brand',
    name: 'Navbar Brand & Logo',
    category: COMPONENT_CATEGORIES.GLOBAL,
    page: 'navbar',
    targetFile: 'src/components/Navbar.jsx',
    selector: '.brand-logo',
    description: 'Brand identity containing the DNA icon badge, title typography, and workspace subtitle.',
    safeProperties: [
      'fontSize', 'fontWeight', 'color', 'gap', 'iconColor', 'badgeRadius'
    ],
    defaultStyles: {
      fontSize: '1.05rem',
      fontWeight: '800',
      color: '#f8fafc',
      gap: '8px',
      iconColor: '#06b6d4',
      badgeRadius: '10px'
    }
  },

  'sidebar-container': {
    id: 'sidebar-container',
    name: 'Left Navigation Sidebar',
    category: COMPONENT_CATEGORIES.GLOBAL,
    page: 'sidebar',
    targetFile: 'src/components/Sidebar.jsx',
    selector: '.sidebar',
    description: 'Main vertical sidebar containing universe workspace tabs and genomic quick tools.',
    safeProperties: [
      'width', 'padding', 'backgroundColor', 'borderColor', 'gap', 'itemSpacing'
    ],
    defaultStyles: {
      width: '240px',
      padding: '16px 12px',
      backgroundColor: 'rgba(17, 24, 39, 0.75)',
      borderColor: 'rgba(255, 255, 255, 0.08)',
      gap: '6px',
      itemSpacing: '4px'
    }
  },

  'breadcrumb-bar': {
    id: 'breadcrumb-bar',
    name: 'Breadcrumb Navigation Pill',
    category: COMPONENT_CATEGORIES.GLOBAL,
    page: 'breadcrumb',
    targetFile: 'src/components/BreadcrumbNav.jsx',
    selector: '.breadcrumb-bar',
    description: 'Compact project and active sequence breadcrumb navigation pill.',
    safeProperties: [
      'padding', 'borderRadius', 'backgroundColor', 'borderColor', 'fontSize'
    ],
    defaultStyles: {
      padding: '6px 14px',
      borderRadius: '8px',
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      borderColor: 'rgba(255, 255, 255, 0.08)',
      fontSize: '0.8rem'
    }
  },

  // -------------------------------------------------------------
  // 2. PROTEIN SPACE (Molecular Canvas)
  // -------------------------------------------------------------
  'protein-header-card': {
    id: 'protein-header-card',
    name: 'Protein Workspace Header',
    category: COMPONENT_CATEGORIES.PROTEIN,
    page: 'protein',
    targetFile: 'src/components/ProteinStructure.jsx',
    selector: '.protein-header',
    description: 'Title banner with space badge and custom PDB/CIF upload button.',
    safeProperties: [
      'padding', 'backgroundColor', 'borderRadius', 'borderColor', 'marginBottom'
    ],
    defaultStyles: {
      padding: '20px 24px',
      backgroundColor: 'rgba(17, 24, 39, 0.75)',
      borderRadius: '12px',
      borderColor: 'rgba(255, 255, 255, 0.08)',
      marginBottom: '16px'
    }
  },

  'protein-controls-bar': {
    id: 'protein-controls-bar',
    name: 'Protein Controls & Search Bar',
    category: COMPONENT_CATEGORIES.PROTEIN,
    page: 'protein',
    targetFile: 'src/components/ProteinStructure.jsx',
    selector: '.protein-controls-bar',
    description: 'PDB input search, quick load buttons (1TUP, 6VXX), style picker, and color scheme selectors.',
    safeProperties: [
      'padding', 'backgroundColor', 'borderRadius', 'borderColor', 'gap', 'toolbarLayout'
    ],
    defaultStyles: {
      padding: '16px',
      backgroundColor: 'rgba(17, 24, 39, 0.75)',
      borderRadius: '12px',
      borderColor: 'rgba(255, 255, 255, 0.08)',
      gap: '12px',
      toolbarLayout: 'row'
    }
  },

  'protein-canvas-container': {
    id: 'protein-canvas-container',
    name: '3D Macromolecular Viewer Canvas',
    category: COMPONENT_CATEGORIES.PROTEIN,
    page: 'protein',
    targetFile: 'src/components/ProteinStructure.jsx',
    selector: '.protein-viewer-canvas',
    description: 'WebGL 3Dmol canvas rendering macromolecular structures with rotation, zoom, and atomic halos.',
    safeProperties: [
      'height', 'minHeight', 'borderRadius', 'borderColor', 'backgroundColor', 
      'boxShadow', 'viewerBackground', 'panelArrangement'
    ],
    scientificProperties: {
      viewerBackground: 'dark', // 'dark' | 'black' | 'slate' | 'transparent'
      defaultStyle: 'cartoon',  // 'cartoon' | 'stick' | 'sphere' | 'surface' | 'trace'
      colorScheme: 'spectrum',  // 'spectrum' | 'ss' | 'chain' | 'element' | 'bfactor'
      autoSpin: false,
      panelArrangement: 'side-by-side' // 'side-by-side' | 'stacked'
    },
    defaultStyles: {
      height: '560px',
      minHeight: '400px',
      borderRadius: '12px',
      borderColor: 'rgba(255, 255, 255, 0.08)',
      backgroundColor: '#070b14',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
      viewerBackground: 'dark',
      panelArrangement: 'side-by-side'
    }
  },

  'protein-residue-track': {
    id: 'protein-residue-track',
    name: 'Sequence-to-Structure Residue Track',
    category: COMPONENT_CATEGORIES.PROTEIN,
    page: 'protein',
    targetFile: 'src/components/ProteinStructure.jsx',
    selector: '.residue-track-container',
    description: 'Interactive sequence ribbon with synchronized 3D atom hover and halo rings.',
    safeProperties: [
      'height', 'padding', 'backgroundColor', 'borderRadius', 'fontSize', 'residueSize'
    ],
    defaultStyles: {
      height: '84px',
      padding: '12px',
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      borderRadius: '8px',
      fontSize: '0.78rem',
      residueSize: '24px'
    }
  },

  // -------------------------------------------------------------
  // 3. EVOLUTION SPACE (Phylogenetics)
  // -------------------------------------------------------------
  'phylo-header-card': {
    id: 'phylo-header-card',
    name: 'Evolution Space Header',
    category: COMPONENT_CATEGORIES.PHYLO,
    page: 'phylo',
    targetFile: 'src/components/Phylogenetics.jsx',
    selector: '.phylo-header',
    description: 'Title card with topology comparison toggle and export actions.',
    safeProperties: [
      'padding', 'backgroundColor', 'borderRadius', 'borderColor'
    ],
    defaultStyles: {
      padding: '20px 24px',
      backgroundColor: 'rgba(17, 24, 39, 0.75)',
      borderRadius: '12px',
      borderColor: 'rgba(255, 255, 255, 0.08)'
    }
  },

  'phylo-canvas-container': {
    id: 'phylo-canvas-container',
    name: 'Phylogenetic Tree SVG Canvas',
    category: COMPONENT_CATEGORIES.PHYLO,
    page: 'phylo',
    targetFile: 'src/components/Phylogenetics.jsx',
    selector: '.phylo-tree-canvas',
    description: 'Vector SVG canvas rendering phylogram/cladogram topologies with pan, zoom, and clade inspection.',
    safeProperties: [
      'height', 'minHeight', 'backgroundColor', 'borderRadius', 'borderColor',
      'labelSize', 'branchThickness', 'treeLayout', 'showBranchLengths'
    ],
    scientificProperties: {
      treeLayout: 'phylogram', // 'phylogram' | 'cladogram'
      labelSize: '13px',
      branchThickness: '2px',
      showBranchLengths: true,
      viewerBackground: 'deep-slate'
    },
    defaultStyles: {
      height: '520px',
      minHeight: '400px',
      backgroundColor: '#0a0f1d',
      borderRadius: '12px',
      borderColor: 'rgba(255, 255, 255, 0.08)',
      labelSize: '13px',
      branchThickness: '2px',
      treeLayout: 'phylogram',
      showBranchLengths: true
    }
  },

  'phylo-params-card': {
    id: 'phylo-params-card',
    name: 'Phylo Input & Models Panel',
    category: COMPONENT_CATEGORIES.PHYLO,
    page: 'phylo',
    targetFile: 'src/components/Phylogenetics.jsx',
    selector: '.phylo-params-card',
    description: 'Substitution model selector (JC69/K80), tree inference engine (ML/ME/NJ), and Multi-FASTA textarea.',
    safeProperties: [
      'padding', 'backgroundColor', 'borderRadius', 'borderColor', 'gap'
    ],
    defaultStyles: {
      padding: '20px',
      backgroundColor: 'rgba(17, 24, 39, 0.75)',
      borderRadius: '12px',
      borderColor: 'rgba(255, 255, 255, 0.08)',
      gap: '16px'
    }
  },

  // -------------------------------------------------------------
  // 4. HOME WORKSPACE
  // -------------------------------------------------------------
  'home-hero-card': {
    id: 'home-hero-card',
    name: 'Home Hero Banner',
    category: COMPONENT_CATEGORIES.HOME,
    page: 'home',
    targetFile: 'src/components/Home.jsx',
    selector: '.home-hero-card',
    description: 'Welcome banner with headline, description paragraph, project pill, and launch CTA.',
    safeProperties: [
      'padding', 'backgroundColor', 'borderColor', 'borderRadius', 'titleSize', 'descSize'
    ],
    defaultStyles: {
      padding: '32px',
      backgroundColor: 'linear-gradient(135deg, rgba(6, 182, 212, 0.14), rgba(139, 92, 246, 0.14))',
      borderColor: 'rgba(6, 182, 212, 0.35)',
      borderRadius: '18px',
      titleSize: '2.4rem',
      descSize: '1rem'
    }
  },

  'home-spaces-grid': {
    id: 'home-spaces-grid',
    name: 'Connected Spaces Grid',
    category: COMPONENT_CATEGORIES.HOME,
    page: 'home',
    targetFile: 'src/components/Home.jsx',
    selector: '.home-spaces-grid',
    description: 'Grid of cards for Genome, Evolution, Protein, and Evidence spaces.',
    safeProperties: [
      'gridColumns', 'gap', 'cardPadding', 'cardRadius', 'cardHoverElevation'
    ],
    defaultStyles: {
      gridColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '20px',
      cardPadding: '24px',
      cardRadius: '14px',
      cardHoverElevation: '8px'
    }
  },

  'home-quick-bridge': {
    id: 'home-quick-bridge',
    name: 'Quick Sequence Bridge Card',
    category: COMPONENT_CATEGORIES.HOME,
    page: 'home',
    targetFile: 'src/components/Home.jsx',
    selector: '.home-quick-bridge',
    description: 'FASTA nucleotide input card with quick action buttons (Analyze, Primer, BLAST, 3D).',
    safeProperties: [
      'padding', 'backgroundColor', 'borderRadius', 'borderColor', 'textareaRows'
    ],
    defaultStyles: {
      padding: '24px',
      backgroundColor: 'rgba(17, 24, 39, 0.75)',
      borderRadius: '12px',
      borderColor: 'rgba(255, 255, 255, 0.08)',
      textareaRows: 4
    }
  },

  // -------------------------------------------------------------
  // 5. DASHBOARD & REPORTS
  // -------------------------------------------------------------
  'dashboard-stats-grid': {
    id: 'dashboard-stats-grid',
    name: 'Dashboard Overview Stat Cards',
    category: COMPONENT_CATEGORIES.DASHBOARD,
    page: 'dashboard',
    targetFile: 'src/components/Dashboard.jsx',
    selector: '.dashboard-stat-pills',
    description: 'Summary counters for Primers, Sequence Analyses, FASTA Uploads, and Reports.',
    safeProperties: [
      'gridColumns', 'gap', 'statPadding', 'statRadius', 'iconSize'
    ],
    defaultStyles: {
      gridColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '16px',
      statPadding: '16px 20px',
      statRadius: '12px',
      iconSize: '20px'
    }
  },

  'dashboard-main-card': {
    id: 'dashboard-main-card',
    name: 'Dashboard Workspace Card',
    category: COMPONENT_CATEGORIES.DASHBOARD,
    page: 'dashboard',
    targetFile: 'src/components/Dashboard.jsx',
    selector: '.dashboard-main-card',
    description: 'Primary records table and management view with PDF export triggers.',
    safeProperties: [
      'padding', 'backgroundColor', 'borderRadius', 'borderColor'
    ],
    defaultStyles: {
      padding: '24px',
      backgroundColor: 'rgba(17, 24, 39, 0.75)',
      borderRadius: '12px',
      borderColor: 'rgba(255, 255, 255, 0.08)'
    }
  },

  // -------------------------------------------------------------
  // 6. GENOME SPACE & TOOLS
  // -------------------------------------------------------------
  'genome-tool-tabs': {
    id: 'genome-tool-tabs',
    name: 'Genome Space Tool Switcher Bar',
    category: COMPONENT_CATEGORIES.GENOME,
    page: 'genome',
    targetFile: 'src/components/GenomeSpace.jsx',
    selector: '.genome-tool-switcher',
    description: 'Horizontal tool tabs switching between Analysis, NCBI, BLAST, Alignment, and Primers.',
    safeProperties: [
      'gap', 'padding', 'buttonRadius', 'activeBorderColor'
    ],
    defaultStyles: {
      gap: '8px',
      padding: '12px 0 0',
      buttonRadius: '8px',
      activeBorderColor: '#06b6d4'
    }
  },

  // -------------------------------------------------------------
  // 7. EVIDENCE SPACE
  // -------------------------------------------------------------
  'evidence-cards-container': {
    id: 'evidence-cards-container',
    name: 'Evidence Records List & Filter Bar',
    category: COMPONENT_CATEGORIES.EVIDENCE,
    page: 'evidence',
    targetFile: 'src/components/EvidenceSpace.jsx',
    selector: '.evidence-records-grid',
    description: 'Confidence-tiered scientific publication cards with PubMed/DOI links and BibTeX citation export.',
    safeProperties: [
      'gap', 'cardPadding', 'cardRadius', 'borderColor', 'badgeSize'
    ],
    defaultStyles: {
      gap: '16px',
      cardPadding: '20px',
      cardRadius: '12px',
      borderColor: 'rgba(255, 255, 255, 0.08)',
      badgeSize: '0.75rem'
    }
  }
};

// Design tokens list for 1-click palette application
export const DESIGN_TOKENS = {
  colors: [
    { name: 'Cyan Glow', value: 'var(--accent-cyan)', hex: '#06b6d4' },
    { name: 'Emerald', value: 'var(--accent-emerald)', hex: '#10b981' },
    { name: 'Violet', value: 'var(--accent-violet)', hex: '#8b5cf6' },
    { name: 'Amber', value: 'var(--accent-amber)', hex: '#f59e0b' },
    { name: 'Rose', value: 'var(--accent-rose)', hex: '#f43f5e' },
    { name: 'Blue', value: 'var(--accent-blue)', hex: '#3b82f6' }
  ],
  backgrounds: [
    { name: 'Dark Void', value: '#070b14' },
    { name: 'Deep Slate', value: '#0b0f19' },
    { name: 'Glass Card', value: 'rgba(17, 24, 39, 0.75)' },
    { name: 'Subtle Glass', value: 'rgba(15, 23, 42, 0.65)' },
    { name: 'Hero Cyan Gradient', value: 'linear-gradient(135deg, rgba(6, 182, 212, 0.16), rgba(139, 92, 246, 0.16))' },
    { name: 'Emerald Gradient', value: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.15))' }
  ],
  radii: [
    { name: 'Sharp (4px)', value: '4px' },
    { name: 'Standard (8px)', value: '8px' },
    { name: 'Smooth (12px)', value: '12px' },
    { name: 'Pill (20px)', value: '20px' },
    { name: 'Circular', value: '9999px' }
  ],
  shadows: [
    { name: 'None', value: 'none' },
    { name: 'Subtle', value: '0 4px 12px rgba(0, 0, 0, 0.3)' },
    { name: 'Medium Card', value: '0 10px 30px -10px rgba(0, 0, 0, 0.5)' },
    { name: 'Cyan Glow', value: '0 0 24px rgba(6, 182, 212, 0.25)' },
    { name: 'Deep Elevation', value: '0 20px 40px rgba(0, 0, 0, 0.7)' }
  ]
};

// Curated Design Presets
export const DESIGN_PRESETS = [
  {
    id: 'cyber-bio-dark',
    name: 'Cybernetic Bio-Dark',
    description: 'Immersive dark workspace with neon cyan accents, deep glassmorphism cards, and high contrast.',
    page: 'all',
    styles: {
      'protein-canvas-container': {
        height: '620px',
        backgroundColor: '#05070d',
        borderRadius: '16px',
        boxShadow: '0 0 30px rgba(6, 182, 212, 0.2)'
      },
      'protein-controls-bar': {
        backgroundColor: 'rgba(11, 15, 25, 0.85)',
        borderRadius: '14px',
        padding: '18px'
      },
      'phylo-canvas-container': {
        height: '580px',
        backgroundColor: '#05070d',
        borderRadius: '16px',
        labelSize: '14px'
      },
      'home-hero-card': {
        borderRadius: '20px',
        backgroundColor: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(139, 92, 246, 0.2))'
      }
    }
  },
  {
    id: 'compact-researcher',
    name: 'Compact High-Density',
    description: 'Maximum screen space efficiency with slim toolbars, condensed padding, and rapid data scanning.',
    page: 'all',
    styles: {
      'navbar-container': {
        height: '54px',
        padding: '0 16px'
      },
      'protein-canvas-container': {
        height: '480px',
        padding: '0px'
      },
      'protein-controls-bar': {
        padding: '10px 14px',
        gap: '8px'
      },
      'home-hero-card': {
        padding: '20px'
      },
      'dashboard-stats-grid': {
        gap: '10px',
        statPadding: '10px 14px'
      }
    }
  },
  {
    id: 'emerald-eco-genomics',
    name: 'Emerald Genomic Clean',
    description: 'Calm emerald & teal theme with soft borders, rounded pills, and comfortable reading margins.',
    page: 'all',
    styles: {
      'protein-canvas-container': {
        borderColor: 'rgba(16, 185, 129, 0.3)',
        borderRadius: '16px'
      },
      'phylo-canvas-container': {
        backgroundColor: '#061014',
        borderRadius: '16px',
        borderColor: 'rgba(16, 185, 129, 0.3)'
      },
      'home-hero-card': {
        backgroundColor: 'linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(6, 182, 212, 0.16))',
        borderColor: 'rgba(16, 185, 129, 0.4)'
      }
    }
  }
];

export function getComponentById(id) {
  return COMPONENT_REGISTRY[id] || null;
}

export function getComponentsByPage(page) {
  return Object.values(COMPONENT_REGISTRY).filter(c => c.page === page);
}
