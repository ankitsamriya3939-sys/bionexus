// Dynamic SEO & Metadata Manager for BioNexus Studio

const ROUTE_SEO_CONFIG = {
  home: {
    title: 'BioNexus Studio | Computational Bioinformatics Platform',
    description: 'BioNexus Studio is a computational bioinformatics workspace for sequence analysis, phylogenetics, 3D macromolecular visualization, literature evidence, and lab utilities.',
    path: '/',
  },
  genome: {
    title: 'Genome Space — BioNexus Studio',
    description: 'Comprehensive genomic suite for sequence analysis, NCBI Entrez multi-database streaming, local BLAST alignment, MSA, and PCR primer design.',
    path: '/genome',
  },
  phylo: {
    title: 'Evolution Space — BioNexus Studio',
    description: 'Interactive phylogenetic tree reconstruction with Maximum Likelihood (Felsenstein pruning), Minimum Evolution, Neighbor-Joining, and topological comparison.',
    path: '/phylogenetics',
  },
  phylogenetics: {
    title: 'Evolution Space — BioNexus Studio',
    description: 'Interactive phylogenetic tree reconstruction with Maximum Likelihood, Minimum Evolution, and Newick/Nexus exports.',
    path: '/phylogenetics',
  },
  protein: {
    title: 'Protein Space — BioNexus Studio',
    description: 'Interactive WebGL 3D molecular visualization with sequence-to-structure residue track, RCSB PDB metadata, and AlphaFold model exploration.',
    path: '/protein-structure',
  },
  evidence: {
    title: 'Evidence Space — BioNexus Studio',
    description: 'Evidence-backed bioinformatics workbench linking experimental crystallography, Swiss-Prot curated records, in-silico predictions, and BibTeX citations.',
    path: '/evidence',
  },
  'primer-design': {
    title: 'Primer Design Workspace — BioNexus Studio',
    description: 'Benchling-style primer design workspace with real Primer3 thermodynamic calculations, interactive sequence map, hairpin ΔG analysis, and specificity checks.',
    path: '/primer-design',
  },
  primer: {
    title: 'PCR Primer Designer — BioNexus Studio',
    description: 'Design forward and reverse PCR primers with thermodynamic Tm calculation, hairpin detection, GC content optimization, and automated NCBI target sequence fetching.',
    path: '/primer-design',
  },
  ncbi: {
    title: 'NCBI Explorer & Entrez Search — BioNexus Studio',
    description: 'Direct Entrez API access to search NCBI Nucleotide, Protein, Gene, and PubMed literature databases. Extract FASTA sequences and accession records instantly.',
    path: '/ncbi',
  },
  blast: {
    title: 'BLAST Alignment Center (BLASTN, BLASTP, BLASTX) — BioNexus Studio',
    description: 'Execute local sequence alignment against local and NCBI databases using BLASTN, BLASTP, and BLASTX algorithms with e-value scoring and bit-score visualization.',
    path: '/blast',
  },
  analysis: {
    title: 'DNA & Protein Sequence Analysis — BioNexus Studio',
    description: '6-frame Open Reading Frame (ORF) finder, DNA/RNA translation, molecular weight, isoelectric point (pI), hydrophobic profiling, and GC content analysis.',
    path: '/sequence-analysis',
  },
  alignment: {
    title: 'Multiple Sequence Alignment (MSA) Hub — BioNexus Studio',
    description: 'Perform progressive multiple sequence alignment with interactive Clustal color scheme, consensus scoring, percentage identity matrices, and alignment export.',
    path: '/alignment',
  },
  utilities: {
    title: 'Biochemistry & Molecular Biology Lab Calculators — BioNexus Studio',
    description: 'Essential lab utilities including PCR Master Mix calculation, C1V1=C2V2 dilution formulas, molarity calculations, and cell culture media prep tools.',
    path: '/lab-utilities',
  },
  dashboard: {
    title: 'User Workspace & Saved Projects — BioNexus Studio',
    description: 'Access saved workspace sessions, stored primer sets, custom analysis reports, and project history.',
    path: '/dashboard',
    noindex: true,
  }
};

export function getAppBaseUrl() {
  const envUrl = import.meta.env.VITE_PUBLIC_APP_URL;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return 'https://bionexusstudio.ai';
}

export function updateRouteSeo(tabId) {
  if (typeof document === 'undefined') return;

  const config = ROUTE_SEO_CONFIG[tabId] || ROUTE_SEO_CONFIG.home;
  const baseUrl = getAppBaseUrl();
  const canonicalUrl = `${baseUrl}${config.path}`;

  // Update Title
  document.title = config.title;

  // Update Description
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.name = 'description';
    document.head.appendChild(metaDesc);
  }
  metaDesc.content = config.description;

  // Update Canonical
  let canonicalLink = document.querySelector('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.rel = 'canonical';
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.href = canonicalUrl;

  // Update Robots (noindex for private dashboard)
  let metaRobots = document.querySelector('meta[name="robots"]');
  if (!metaRobots) {
    metaRobots = document.createElement('meta');
    metaRobots.name = 'robots';
    document.head.appendChild(metaRobots);
  }
  metaRobots.content = config.noindex ? 'noindex, nofollow' : 'index, follow';

  // Update Open Graph Tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.content = config.title;

  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.content = config.description;

  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.content = canonicalUrl;

  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage) ogImage.content = `${baseUrl}/og-image.png`;

  // Update Twitter Card Tags
  const twTitle = document.querySelector('meta[name="twitter:title"]');
  if (twTitle) twTitle.content = config.title;

  const twDesc = document.querySelector('meta[name="twitter:description"]');
  if (twDesc) twDesc.content = config.description;

  const twImage = document.querySelector('meta[name="twitter:image"]');
  if (twImage) twImage.content = `${baseUrl}/og-image.png`;
}
