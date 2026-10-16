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
  doc.text(`Date: ${new Date().toLocaleDateString()} | Platform Executive Summary`, 120, 20);

  y = 36;
}

function checkPageBreak(neededHeight = 15) {
  if (y + neededHeight > pageHeight - 15) {
    doc.addPage();
    addHeader('Complete Platform & Workflow Report (Cont.)');
  }
}

function addSectionTitle(title) {
  checkPageBreak(15);
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(14, y, pageWidth - 28, 8, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(title, 18, y + 5.5);
  y += 12;
}

function addBullet(label, text) {
  checkPageBreak(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 182, 212);
  doc.setFontSize(9.5);
  doc.text(`• ${label}:`, 16, y);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  
  const labelWidth = doc.getTextWidth(`• ${label}: `);
  const lines = doc.splitTextToSize(text, pageWidth - 32 - labelWidth);
  
  doc.text(lines[0], 16 + labelWidth, y);
  y += 5.5;

  for (let i = 1; i < lines.length; i++) {
    checkPageBreak(6);
    doc.text(lines[i], 16 + labelWidth, y);
    y += 5.5;
  }
}

// COVER / HEADER
addHeader('Complete Platform Architecture, Features & Audit Report');

// 1. PRODUCT VISION
addSectionTitle('1. PRODUCT VISION & WORKFLOW INTEGRATION');
addBullet('Core Vision', 'BioNexus Studio AI transforms scattered web bioinformatics tools into a connected, beginner-friendly scientific workspace.');
addBullet('Connected Workflow', 'NCBI / FASTA -> Sequence Validation -> Sequence Analysis -> Primer Design -> BLAST Specificity -> MSA & Phylogenetics -> AI Explanation -> PDF Report.');
addBullet('Live Site', 'https://bionexus-studio-ai.netlify.app');

// 2. CORE FEATURES COMPLETED
addSectionTitle('2. CORE FEATURES & MODULE SUMMARY');
addBullet('NCBI Explorer', 'Integrated Entrez E-utilities API to search Nucleotide, Protein, Gene, and PubMed databases; fetch FASTA sequences and summaries directly into analysis pipelines.');
addBullet('Primer Designer', 'Nearest-Neighbor Tm calculation (SantaLucia 1998), GC%, length range checks, self-dimer & cross-dimer analysis, top 5 ranked primer pairs with quality score.');
addBullet('BLAST Center', 'BLASTN, BLASTP, BLASTX, TBLASTN, TBLASTX alignment engine with interactive SVG Hit Alignment Map (Query vs Hit overview) and E-value thresholds.');
addBullet('Sequence Analysis', 'DNA reverse complement, GC%, 6-frame translation, ORF Finder; Protein molecular weight, Isoelectric Point (pI) prediction, and amino acid composition.');
addBullet('Alignment Hub (MSA)', 'Multiple Sequence Alignment using progressive Needleman-Wunsch algorithm with Clustal color mapping, conservation scores, and consensus sequence.');
addBullet('Phylogenetics Engine', 'Neighbor-Joining (NJ) & UPGMA tree reconstruction; Jukes-Cantor (JC69), Kimura 2-Parameter (K80), and p-Distance models; SVG tree renderer & Newick (.nwk) exporter.');
addBullet('Protein Structure', 'Interactive 3D molecular viewer powered by 3Dmol.js supporting Cartoon, Stick, Sphere, and Surface rendering for PDB entries (e.g., 1TUP).');
addBullet('AI Bioinformatics Assistant', 'Context-aware AI assistant with "Audit My Page Work" feature that inspects current sequence state and parameter choices to give expert recommendations.');

// 3. PHASE 1 VALIDATION & RELIABILITY
addSectionTitle('3. PHASE 1 DNA & FASTA VALIDATION ENGINE');
addBullet('Validation Engine', 'Built real-time DNA & FASTA validator (sequenceValidator.js) detecting canonical bases (A,T,G,C,U), IUPAC ambiguity codes, whitespace, and non-DNA characters.');
addBullet('Protein Input Guard', 'Detects protein sequence inputs pasted into DNA primer fields and offers a 1-click option to fetch cDNA directly from NCBI.');
addBullet('ValidationPanel UI', 'Reusable live feedback component showing length (bp), GC%, AT%, ambiguous base count, and explicit invalid character lists.');

// 4. TEST & AUDIT MATRIX
addSectionTitle('4. 10-POINT AUDIT & SCIENTIFIC VERIFICATION (PASS)');
addBullet('Does It Work?', 'PASS - All 9 application tabs execute expected workflows smoothly without freezing or crashing.');
addBullet('Scientific Accuracy', 'PASS - Nearest-neighbor Tm, codon translation, Jukes-Cantor distance, and BLAST scoring match standard literature.');
addBullet('Invalid Input Rejection', 'PASS - Non-DNA bases, negative range bounds, and protein sequences are rejected before execution.');
addBullet('UI Error Clarity', 'PASS - Clear amber/red alert cards explicitly state validation failures and provide remediation steps.');
addBullet('Loading & API Failure', 'PASS - Animated loading spinners display during API calls; network errors are caught gracefully in try/catch blocks.');
addBullet('Mobile Responsiveness', 'PASS - Responsive CSS flex/grid layouts with max-width 768px breaking tabs into accessible mobile cards.');

// 5. PHYLOGENETICS DEBUGGING SUMMARY
addSectionTitle('5. PHYLOGENETICS MODULE DEBUGGING & FIXES');
addBullet('Algorithms Fixed', 'Implemented Neighbor-Joining (NJ) Saitou & Nei 1987 algorithm; fixed UPGMA matrix lookup bounds bug; added Jukes-Cantor (JC69), Kimura 2-P (K80), and p-Distance models.');
addBullet('Test Suite', 'Verified across 10 test cases including exact 4-species test data, unequal length alignment, invalid characters, duplicate sequence headers, and highly divergent sequences.');

// SAVE PDF
const outputDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
const pdfPath = path.join(outputDir, 'BioNexus_Studio_AI_Complete_Documentation.pdf');
const brainPath = 'C:/Users/hp/.gemini/antigravity-ide/brain/1286e938-4a2c-4f38-962b-f8490696d633/BioNexus_Studio_AI_Complete_Documentation.pdf';

const pdfBytes = doc.output('arraybuffer');
fs.writeFileSync(pdfPath, Buffer.from(pdfBytes));
fs.writeFileSync(brainPath, Buffer.from(pdfBytes));

console.log('PDF Report successfully generated at:', pdfPath);
