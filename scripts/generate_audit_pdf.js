import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

const doc = new jsPDF({
  orientation: 'p',
  unit: 'mm',
  format: 'a4'
});

const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
let y = 15;

function addHeader(title) {
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(6, 182, 212); // cyan-500
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('BIONEXUS STUDIO AI', 14, 12);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(title, 14, 20);

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.text(`Comprehensive Codebase Audit Report`, 125, 20);

  y = 35;
}

function checkPageBreak(neededHeight = 15) {
  if (y + neededHeight > pageHeight - 15) {
    doc.addPage();
    addHeader('BioNexus Studio AI — Complete Codebase Audit (Cont.)');
  }
}

function addSectionTitle(title) {
  checkPageBreak(16);
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(14, y, pageWidth - 28, 8, 'F');

  doc.setTextColor(6, 182, 212); // cyan-400
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(title, 18, y + 5.5);
  y += 12;
}

function addSubSectionTitle(title) {
  checkPageBreak(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(title, 16, y);
  y += 5;
}

function addBullet(label, text, indent = 16) {
  checkPageBreak(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(2, 132, 199); // sky-600
  doc.setFontSize(9);
  doc.text(`• ${label}:`, indent, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85); // slate-700

  const labelWidth = doc.getTextWidth(`• ${label}: `);
  const maxWidth = pageWidth - indent - 14 - labelWidth;
  const lines = doc.splitTextToSize(text, maxWidth);

  doc.text(lines[0], indent + labelWidth, y);
  y += 5;

  for (let i = 1; i < lines.length; i++) {
    checkPageBreak(6);
    doc.text(lines[i], indent + labelWidth, y);
    y += 5;
  }
}

function addParagraph(text, indent = 16) {
  checkPageBreak(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  const maxWidth = pageWidth - indent - 14;
  const lines = doc.splitTextToSize(text, maxWidth);

  for (let i = 0; i < lines.length; i++) {
    checkPageBreak(5);
    doc.text(lines[i], indent, y);
    y += 4.8;
  }
}

function addCallout(title, text, type = 'info') {
  checkPageBreak(22);
  const maxWidth = pageWidth - 32;
  const lines = doc.splitTextToSize(text, maxWidth - 16);
  const boxHeight = 10 + lines.length * 4.8;

  if (type === 'danger') {
    doc.setFillColor(254, 242, 242); // red-50
    doc.setDrawColor(239, 68, 68); // red-500
  } else if (type === 'warning') {
    doc.setFillColor(255, 251, 235); // amber-50
    doc.setDrawColor(245, 158, 11); // amber-500
  } else {
    doc.setFillColor(240, 253, 250); // teal-50
    doc.setDrawColor(20, 184, 166); // teal-500
  }

  doc.roundedRect(14, y, maxWidth, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  if (type === 'danger') doc.setTextColor(185, 28, 28);
  else if (type === 'warning') doc.setTextColor(180, 83, 9);
  else doc.setTextColor(15, 118, 110);

  doc.text(title, 18, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  let textY = y + 11;
  for (let i = 0; i < lines.length; i++) {
    doc.text(lines[i], 18, textY);
    textY += 4.5;
  }

  y += boxHeight + 4;
}

// ----------------------------------------------------------------------
// BUILD PDF CONTENT
// ----------------------------------------------------------------------

// PAGE 1: TITLE & EXECUTIVE SUMMARY
addHeader('BioNexus Studio AI — Complete Codebase Audit');

addCallout('AUDIT EXECUTIVE SUMMARY', 'This audit inspects the full BioNexus Studio AI codebase (React 19 + Vite 8). Key finding: The application is 100% client-side (no backend server). Scientific modules (MSA, Phylogenetics, Sequence Analysis, NCBI Explorer, 3D Protein Viewer) possess genuine client-side algorithms, but BLAST is mocked locally against 4 genes, user auth is simulated in localStorage with Base64 passwords, the AI Assistant is unmounted/orphaned, and LabUtilities has runtime crashing bugs.', 'warning');

addSectionTitle('1. PROJECT DIRECTORY STRUCTURE');
addBullet('Root Level', 'Configured with Vite 8 (vite.config.js), React 19 (package.json), Firebase hosting rules (firebase.json), and Oxlint (.oxlintrc.json).');
addBullet('public/', 'Static assets (robots.txt, sitemap.xml, _redirects for SPA routing, favicon.svg, and og-image.png).');
addBullet('src/context/', 'WorkspaceContext.jsx - Provides centralized active sequence memory and project isolation across all components.');
addBullet('src/services/', 'authService.js (localStorage user accounts) and dataService.js (storage partitioning).');
addBullet('src/utils/', '12 core utility engines: sequenceEngine, primerEngine, blastEngine, alignmentEngine, phyloEngine, ncbiService, labCalculators, sequenceValidator, pdfGenerator, analytics, seo, aiAssistantEngine.');
addBullet('src/components/', '20 React UI components covering 10 scientific tabs and modal management dialogs.');

addSectionTitle('2. FRONTEND FRAMEWORK & PROGRAMMING LANGUAGES');
addBullet('Framework', 'React 19 (v19.2.8) and React-DOM (v19.2.8) in package.json.');
addBullet('Build Tooling', 'Vite (v8.3.0) with @vitejs/plugin-react (v6.1.1). Fast HMR dev server and optimized rollup bundle.');
addBullet('Languages', 'JavaScript (ES Modules + JSX) and Vanilla CSS. No TypeScript (files are .js/.jsx) and no TailwindCSS.');
addBullet('Libraries', 'Lucide React (v1.47.0) for icons; 3Dmol.js (v2.5.5) for WebGL PDB protein models; jsPDF (v4.2.1) & html2canvas (v1.4.1) for PDF reporting.');

addSectionTitle('3. BACKEND INFRASTRUCTURE ASSESSMENT');
addCallout('NO BACKEND SERVER EXISTS', 'There is no Node.js/Express, Python/FastAPI, Go, or serverless functions folder in this repository. The entire platform runs 100% inside the user browser. While .env.example references VITE_API_BASE_URL=https://api.bionexusstudio.ai, this variable is never imported or used in the source code.', 'info');

addSectionTitle('4. HOSTING & DEPLOYMENT CONFIGURATION');
addBullet('Firebase Hosting', 'firebase.json specifies "public": "dist" with a SPA rewrite "**" -> "/index.html". .firebaserc binds to project "bionexux-bbc9b".');
addBullet('Live Domains', 'Default domain https://bionexux-bbc9b.web.app configured in .env and .env.production. Custom domain https://bionexusstudio.ai set as canonical URL.');
addBullet('Netlify / Cloudflare', 'public/_redirects contains "/* /index.html 200" for seamless SPA client-side routing on edge static platforms.');

addSectionTitle('5. EXTERNAL APIS & AI SERVICES USAGE');
addBullet('NCBI E-Utilities', 'Calls eutils.ncbi.nlm.nih.gov/entrez/eutils (esearch, esummary, efetch) via ncbiService.js. Direct browser fetch without API key.');
addBullet('RCSB PDB', 'Downloads 3D coordinate files (.pdb) from files.rcsb.org and renders them via 3Dmol.js in ProteinStructure.jsx.');
addBullet('Google Analytics 4', 'analytics.js injects gtag.js in production (Measurement ID: G-81PM8QDEPV).');
addBullet('AI Services Reality', 'NO remote LLM API is used (no OpenAI, no Gemini, no Anthropic). The AI assistant uses offline regex keyword pattern matching with static biological templates.');

addSectionTitle('6. DATABASE, AUTHENTICATION & STORAGE AUDIT');
addBullet('Database Status', 'NO database (no SQL, MongoDB, Firestore, or Supabase). All data is saved in browser localStorage (bionexus_active_sequence, bionexus_primers, etc.).');
addBullet('Authentication Status', 'SIMULATED in localStorage. authService.js encodes passwords with btoa() (Base64). Passwords are not encrypted or hashed. Reset password does not send emails.');
addBullet('Cloud Storage Status', 'NO cloud storage. Workspace backup/restore is handled via client-side JSON files; PDF reports are rendered locally using jsPDF.');

addSectionTitle('7. MAJOR MODULES & FILE RESPONSIBILITY MATRIX');
addBullet('Primer Designer', 'src/components/PrimerDesigner.jsx & src/utils/primerEngine.js. Forward/Reverse primer generation, Tm, hairpins, dimers.');
addBullet('NCBI Explorer', 'src/components/NcbiExplorer.jsx & src/utils/ncbiService.js. Entrez database search & FASTA sequence import.');
addBullet('BLAST Center', 'src/components/BlastCenter.jsx & src/utils/blastEngine.js. Local Smith-Waterman alignment against 4 reference genes.');
addBullet('Sequence Analysis', 'src/components/SequenceAnalysis.jsx & src/utils/sequenceEngine.js. 6-frame ORF finder, translation, MW, and isoelectric point titration.');
addBullet('Alignment Hub', 'src/components/AlignmentHub.jsx & src/utils/alignmentEngine.js. Progressive Needleman-Wunsch Multiple Sequence Alignment (MSA).');
addBullet('Phylogenetics', 'src/components/Phylogenetics.jsx & src/utils/phyloEngine.js. Distance models (JC69/K80/p-dist), NJ & UPGMA tree generation, SVG render, Newick export.');
addBullet('Protein Structure', 'src/components/ProteinStructure.jsx. 3D WebGL rendering of PDB structures via 3Dmol.js.');
addBullet('Lab Utilities', 'src/components/LabUtilities.jsx & src/utils/labCalculators.js. Master Mix, Dilutions, Molarity, Media recipes.');
addBullet('Global Workspace', 'src/context/WorkspaceContext.jsx & src/components/ActiveSequenceBar.jsx. Synchronizes active sequence across all tools.');
addBullet('AI Assistant', 'src/components/AiAssistant.jsx & src/utils/aiAssistantEngine.js. Currently unmounted / orphaned.');

addSectionTitle('8. SCIENTIFIC ALGORITHMS IMPLEMENTED');
addBullet('Smith-Waterman', 'Dynamic programming for local pairwise alignment. Computes Karlin-Altschul parameters for Bit Score and E-values (blastEngine.js).');
addBullet('Needleman-Wunsch', 'Dynamic programming for end-to-end global alignment with match/mismatch scores and gap penalties (alignmentEngine.js).');
addBullet('Progressive MSA', 'Sequential star alignment using the first sequence as guide, followed by consensus and conservation scoring (alignmentEngine.js).');
addBullet('Distance Models', 'p-Distance (Hamming), Jukes-Cantor 1969 (JC69 logarithmic saturation correction), Kimura 2-Parameter (K80 transition/transversion ratio) (phyloEngine.js).');
addBullet('Phylogenetic Trees', 'Neighbor-Joining (Saitou & Nei 1987) with Q-matrix and branch lengths; UPGMA agglomerative clustering; Newick export (phyloEngine.js).');
addBullet('Primer Thermodynamics', 'Wallace rule (<14 bp), salt-adjusted empirical Tm, hairpin stem-loop search, dimer complementarity scan (primerEngine.js).');
addBullet('Protein Chemistry', 'Isoelectric point (pI) solved via Henderson-Hasselbalch charge balance from pH 0 to 14; Kyte-Doolittle hydropathy profile (sequenceEngine.js).');

addSectionTitle('9. FEATURE IMPLEMENTATION STATUS');
addBullet('Fully Implemented', 'Sequence Analysis Suite, Phylogenetics Suite, Multiple Sequence Alignment, NCBI Explorer, 3D Protein Structure Viewer, DNA/FASTA Validator, Theme Switching.');
addBullet('Partially Implemented', 'Primer Designer (empirical Tm vs SantaLucia nearest-neighbor); Project Manager & Sequence Library (local only, no cloud sync); Single Page App Routing (history pushState).');
addBullet('Mocked / Simulated', 'BLAST Center (matches 4 genes in memory instead of NCBI GenBank); Authentication (localStorage Base64 accounts, no server check).');
addBullet('Orphaned / Broken', 'AiAssistant.jsx (not rendered in UI); LabUtilities.jsx (crashing bugs in PCR and Molarity tabs); SequenceConflictModal.jsx (never imported).');

addSectionTitle('10. SECURITY, ACCURACY & RELIABILITY DEFECTS');
addCallout('CRITICAL BUG 1: LabUtilities PCR Tab Crash', 'LabUtilities.jsx line 98 calls pcrResult.components.map(), but labCalculators.js returns { recipe: [...] }. Because .components is undefined, the PCR tab throws an immediate uncaught TypeError on mount.', 'danger');
addCallout('CRITICAL BUG 2: LabUtilities Molarity Tab Crash', 'LabUtilities.jsx lines 148-156 bind to molarity, volMl, and mw. None of these variables exist in useState (which declared molMass, desiredConc, desiredVol), causing an immediate ReferenceError.', 'danger');
addCallout('SECURITY WARNING: Insecure Password Storage', 'authService.js stores passwords as passwordHash: btoa(password). Base64 encoding is not encryption or hashing; it is completely reversible in 1 second using atob().', 'warning');
addCallout('SCIENTIFIC ACCURACY: 4-Gene BLAST Limit', 'BLAST Center searches only 4 hardcoded genes (BRCA1, TP53, SARS-CoV-2, ACTB). Querying other genes produces 0 hits, which can mislead users into believing their sequence does not exist in nature.', 'warning');

addSectionTitle('11. LEARNING PLAN & RECOMMENDED ROADMAP');
addBullet('Phase 1 (Bug Fixes)', 'Fix LabUtilities.jsx property mappings and state variables; mount or cleanly remove AiAssistant.jsx; clean up orphaned components.');
addBullet('Phase 2 (Bioinformatics)', 'Study dynamic programming in alignmentEngine.js (Needleman-Wunsch); study distance matrix Q-calculation in phyloEngine.js (Neighbor-Joining).');
addBullet('Phase 3 (Production Cloud)', 'Replace localStorage auth with Firebase Authentication or Supabase; replace local BLAST with NCBI QBLAST API; connect AiAssistant to an authentic generative AI API.');

// ----------------------------------------------------------------------
// WRITE OUTPUT
// ----------------------------------------------------------------------
const outputDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const reportPath = path.join(outputDir, 'BioNexus_Studio_AI_Codebase_Audit_Report.pdf');
const brainPath = 'C:/Users/hp/.gemini/antigravity-ide/brain/3eb8e4fa-1c29-43ec-9daa-1bf15f5538f1/BioNexus_Studio_AI_Codebase_Audit_Report.pdf';

const pdfBytes = doc.output('arraybuffer');
fs.writeFileSync(reportPath, Buffer.from(pdfBytes));

const brainDir = path.dirname(brainPath);
if (!fs.existsSync(brainDir)) {
  fs.mkdirSync(brainDir, { recursive: true });
}
fs.writeFileSync(brainPath, Buffer.from(pdfBytes));

console.log('SUCCESS: Audit PDF successfully generated at:');
console.log('1.', reportPath);
console.log('2.', brainPath);
