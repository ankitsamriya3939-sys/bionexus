# BioNexus Studio — Complete Architecture & Bioinformatic Learner's Guide

> **Project Name:** BioNexus Studio  
> **Repository:** `grown item`  
> **Tech Stack:** React 19, Vite 8, Express 5, Node.js, 3Dmol.js, Vanilla Modern CSS  
> **Target Audience:** Bioinformatics Software Engineers, Computational Biologists, & Full-Stack Developers  

---

## Table of Contents
1. [Executive Summary & High-Level Architecture](#1-executive-summary--high-level-architecture)
2. [Full Tech Stack & Directory Structure](#2-full-tech-stack--directory-structure)
3. [The Bioinformatic Algorithms: Under the Hood](#3-the-bioinformatic-algorithms-under-the-hood)
   - [A. NCBI Entrez E-Utilities Engine](#a-ncbi-entrez-e-utilities-engine)
   - [B. Local BLAST Alignment Engine](#b-local-blast-alignment-engine)
   - [C. Multiple Sequence Alignment (MSA) Engine](#c-multiple-sequence-alignment-msa-engine)
   - [D. Phylogenetic Tree Construction Engine](#d-phylogenetic-tree-construction-engine)
   - [E. PCR Primer Design Engine](#e-pcr-primer-design-engine)
   - [F. 3D Protein Structure Viewer](#f-3d-protein-structure-viewer)
   - [G. Laboratory Calculators](#g-laboratory-calculators)
4. [The Backend Infrastructure (Express 5 Server)](#4-the-backend-infrastructure-express-5-server)
   - [A. Proxy Architecture & CORS Resolution](#a-proxy-architecture--cors-resolution)
   - [B. Zero-Database JSON Persistence](#b-zero-database-json-persistence)
   - [C. Server Crash Guards & Uptime Guarantee](#c-server-crash-guards--uptime-guarantee)
5. [The Frontend Architecture & Central Data Pipeline](#5-the-frontend-architecture--central-data-pipeline)
   - [A. WorkspaceContext — The Central Nervous System](#a-workspacecontext--the-central-nervous-system)
   - [B. Active Sequence Bar Cross-Tool Sync](#b-active-sequence-bar-cross-tool-sync)
   - [C. Tab-Based Routing & Breadcrumb Navigation](#c-tab-based-routing--breadcrumb-navigation)
6. [Minor & Polish Details That Make the App Production-Ready](#6-minor--polish-details-that-make-the-app-production-ready)
   - [A. Dynamic SEO & Meta Tags](#a-dynamic-seo--meta-tags)
   - [B. Error Boundaries](#b-error-boundaries)
   - [C. Automated Windows Launchers](#c-automated-windows-launchers)
7. [Step-by-Step Tutorial: How to Add a New Bio Tool Yourself](#7-step-by-step-tutorial-how-to-add-a-new-bio-tool-yourself)

---

## 1. Executive Summary & High-Level Architecture

BioNexus Studio is a dual-tier web application designed to bring desktop-grade bioinformatics tools directly into the browser. Traditional bioinformatics software often requires complex command-line setup (Python, Biopython, BLAST+ binaries, Perl scripts). BioNexus Studio executes key sequence algorithms directly in the user's browser using JavaScript, while offloading remote biological database queries and persistent file storage to a lightweight Node.js/Express service.

```
+---------------------------------------------------------------------------------------+
|                                    BROWSER CLIENT                                     |
|  +---------------------------------------------------------------------------------+  |
|  |                             React 19 View Components                            |  |
|  |  (Global Bio-Explorer, BlastCenter, AlignmentHub, Phylogenetics, etc.)             |  |
|  +---------------------------------------------------------------------------------+  |
|                                           |                                           |
|                                           v                                           |
|  +---------------------------------------------------------------------------------+  |
|  |             Multi-Device Security & WorkspaceContext Pipeline                   |  |
|  |          - New Device Verification    - Multi-API Concurrent Racing             |  |
|  |          - Hardware Fingerprinting    - Auto-Save & Project Sync                |  |
|  +---------------------------------------------------------------------------------+  |
|        |                               |                               |              |
|        v                               v                               v              |
|  +---------------+             +---------------+             +---------------+        |
|  | Local BLAST   |             | MSA Engine    |             | Phylo Engine  |        |
|  | Engine        |             | (Progressive  |             | (UPGMA & NJ   |        |
|  | (Smith-       |             |  Needleman-   |             |  Distance     |        |
|  |  Waterman)    |             |  Wunsch)      |             |  Matrices)    |        |
|  +---------------+             +---------------+             +---------------+        |
+---------------------------------------------------------------------------------------+
        |                                                                |
        |  REST API Calls                                                | Direct Fallback
        v                                                                v
+----------------------------------------+              +-------------------------------+
|      EXPRESS BACKEND (Port 5000)       |              |       EXTERNAL BIO APIS       |
|  - NCBI Proxy (/api/ncbi/*)            |------------->|  - NCBI Entrez E-Utilities    |
|  - JSON Data Store (/api/workspace/*)  |              |    (esearch, esummary, efetch)|
|  - Health Monitor & Static File Server |              |  - RCSB Protein Data Bank     |
+----------------------------------------+              +-------------------------------+
```

---

## 2. Full Tech Stack & Directory Structure

### Dependencies (`package.json`)
* **React 19 (`react`, `react-dom`)**: Cutting-edge rendering engine with streamlined hooks and high-performance state batching.
* **Vite 8 (`vite`, `@vitejs/plugin-react`)**: Ultra-fast module bundler with instant Hot Module Replacement (HMR).
* **Express 5 (`express`)**: Modern Node.js web server handling native asynchronous errors and REST routing.
* **3Dmol.js (`3dmol`)**: WebGL hardware-accelerated macromolecular structure renderer.
* **Lucide Icons (`lucide-react`)**: Over 40 consistent, clean SVG icons used throughout the studio.
* **PDF Export (`jspdf`, `html2canvas`)**: Client-side lab report rendering and PDF generation.
* **Cross-Origin Resource Sharing (`cors`)**: Express middleware enabling safe cross-port communication between port 5173 (Vite) and port 5000 (Express).

### File Tree
```
grown item/
|-- server/
|   |-- data/                     # Local JSON database storage
|   |   |-- projects.json         # User research workspaces
|   |   |-- sequences.json        # Saved FASTA records
|   |   |-- primers.json          # Designed oligonucleotide pairs
|   |   `-- analyses.json         # Computational runs and outputs
|   `-- server.js                 # Express 5 gateway, proxy, and crash protection
|-- src/
|   |-- components/               # View screens and modular UI panels
|   |   |-- ActiveSequenceBar.jsx # Cross-tool sequence bridge
|   |   |-- AlignmentHub.jsx      # Multiple sequence alignment workspace
|   |   |-- AuthModal.jsx         # User identity and profile modal
|   |   |-- BlastCenter.jsx       # Interactive BLAST analysis studio
|   |   |-- BreadcrumbNav.jsx     # Route location hierarchy
|   |   |-- Dashboard.jsx         # Workspace overview & statistics
|   |   |-- ErrorBoundary.jsx     # React crash protection boundary
|   |   |-- Home.jsx              # Landing portal and feature launchpad
|   |   |-- LabUtilities.jsx      # Molarity, dilutions, and Master Mix math
|   |   |-- Navbar.jsx            # Top navigation and workspace controls
|   |   |-- NcbiExplorer.jsx      # Direct gene/nucleotide database search
|   |   |-- Phylogenetics.jsx     # Cladogram generation and tree viewer
|   |   |-- PrimerDesigner.jsx    # Thermodynamic PCR primer modeler
|   |   |-- ProjectManager.jsx    # Multi-project organization hub
|   |   |-- ProteinStructure.jsx  # 3D interactive PDB structural viewer
|   |   |-- SequenceAnalysis.jsx  # GC, ORF, molecular weight, translation
|   |   |-- SequenceLibraryModal.jsx # Sequence inventory management
|   |   `-- Sidebar.jsx           # Left drawer tool launcher
|   |-- context/
|   |   `-- WorkspaceContext.jsx  # Reactive state store & sequence dispatcher
|   |-- services/
|   |   |-- authService.js        # LocalStorage session manager
|   |   `-- dataService.js        # Dual-sync backend & client storage adapter
|   |-- utils/
|   |   |-- alignmentEngine.js    # Needleman-Wunsch & Progressive MSA
|   |   |-- blastEngine.js        # Smith-Waterman & Karlin-Altschul statistics
|   |   |-- labCalculators.js     # Wet-lab calculation utilities
|   |   |-- ncbiService.js        # E-Utilities client with auto-failover
|   |   |-- pdfGenerator.js       # Client-side printable PDF renderer
|   |   |-- phyloEngine.js        # Distance matrices, UPGMA, NJ, Newick
|   |   |-- primerEngine.js       # Nearest-neighbor Tm and primer dimerization
|   |   |-- sequenceEngine.js     # Transcription, translation, ORF mapping
|   |   |-- sequenceValidator.js  # FASTA validation & molecule detection
|   |   |-- seo.js                # Dynamic HTML head and OpenGraph updating
|   |   `-- analytics.js          # Tool engagement and navigation tracker
|   |-- App.jsx                   # Application root, routing, modal orchestration
|   |-- index.css                 # Modern CSS design system & variables
|   `-- main.jsx                  # React DOM initialization
|-- start.bat                     # Windows cmd double-click runner
`-- package.json                  # Project manifest
```

---

## 3. The Bioinformatic Algorithms: Under the Hood

### A. NCBI Entrez E-Utilities Engine (`src/utils/ncbiService.js`)

The National Center for Biotechnology Information (NCBI) exposes biological data through Entrez E-Utilities. BioNexus uses a 3-step sequence retrieval workflow:

1. **`esearch` (Identification):**
   * **Endpoint:** `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi`
   * **Role:** Accepts free-text keywords (e.g., `TP53 human`) and returns matching Unique Identifiers (`idlist`, e.g., `["187830", "12053"]`).
2. **`esummary` (Metadata Extraction):**
   * **Endpoint:** `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi`
   * **Role:** Accepts a comma-separated list of IDs and returns JSON metadata including organism, gene description, total base pairs, and accession numbers.
3. **`efetch` (Raw Sequence Retrieval):**
   * **Endpoint:** `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?rettype=fasta&retmode=text`
   * **Role:** Streams the raw standard FASTA text format containing headers and nucleotide/amino acid sequences.

#### Dual-Path Fault Tolerance
```javascript
// Step 1: Try Express Backend Proxy
try {
  const proxyUrl = `${API_BASE}/api/ncbi/search?...`;
  const res = await fetch(proxyUrl);
  if (res.ok) return await res.json();
} catch (e) {
  // Step 2: Fallback to Direct NCBI API if server is offline
  const directUrl = `${DIRECT_NCBI_BASE}/esearch.fcgi?...`;
  const res = await fetch(directUrl);
  return await res.json();
}
```

---

### B. Local BLAST Alignment Engine (`src/utils/blastEngine.js`)

Rather than forcing users to queue on remote NCBI servers, BioNexus Studio implements an interactive local alignment algorithm in JavaScript.

#### 1. Smith-Waterman Local Dynamic Programming Matrix
The alignment score matrix $H(i, j)$ is computed using:
$$H(i, j) = \max \begin{cases} 0 \\ H(i-1, j-1) + \text{score}(q_i, s_j) & \text{(Diagonal: match/mismatch)} \\ H(i-1, j) - W & \text{(Up: deletion/gap)} \\ H(i, j-1) - W & \text{(Left: insertion/gap)} \end{cases}$$

* **Match Score:** $+2$ for nucleotides, $+4$ for proteins.
* **Mismatch Penalty:** $-3$ for nucleotides, $-2$ for proteins.
* **Gap Penalty:** $-5$ for nucleotides, $-3$ for proteins.
* By enforcing $\max(0, \dots)$, negative scores are zeroed out, isolating locally conserved sequence segments.

#### 2. Traceback Routine
Once the highest score in the matrix $(i_{\max}, j_{\max})$ is found, the algorithm traces backwards until it reaches a cell with value $0$. During this path:
* Diagonal move $\rightarrow$ characters from both sequences are aligned (match `|` or mismatch `.`).
* Upward move $\rightarrow$ a gap (`-`) is introduced into the query.
* Leftward move $\rightarrow$ a gap (`-`) is introduced into the subject.

#### 3. Karlin-Altschul Statistical Scores
Raw scores ($S$) vary by matrix parameters. The engine computes normalized metrics:
* **Bit Score ($S'$):**
  $$S' = \frac{\lambda S - \ln(K)}{\ln(2)}$$
  *(Independent of the scoring matrix, allowing comparisons across different algorithms).*
* **Expect Value ($E$-value):**
  $$E = K \cdot m \cdot n \cdot e^{-\lambda S}$$
  *(Represents the number of distinct alignments with score $\ge S$ expected to occur by chance alone in a search space of size $m \times n$).*

#### 4. The 5 BLAST Program Modes
* **`blastn`:** Nucleotide Query vs. Nucleotide Database.
* **`blastp`:** Protein Query vs. Protein Database.
* **`blastx`:** 6-frame translated Nucleotide Query vs. Protein Database.
* **`tblastn`:** Protein Query vs. 6-frame translated Nucleotide Database.
* **`tblastx`:** 6-frame translated Nucleotide Query vs. 6-frame translated Nucleotide Database.

---

### C. Multiple Sequence Alignment (MSA) Engine (`src/utils/alignmentEngine.js`)

Multiple Sequence Alignment arranges $N \ge 3$ biological sequences to highlight evolutionary conservation and mutations.

#### 1. Needleman-Wunsch Global Pairwise Alignment
Unlike local alignment, global alignment penalizes sequence ends:
* Initialization: $H(i, 0) = i \times \text{gapPenalty}$, $H(0, j) = j \times \text{gapPenalty}$.
* Forces complete end-to-end alignment of two sequences.

#### 2. Progressive Alignment Strategy
BioNexus uses a progressive alignment approach (similar to ClustalW):
1. The first sequence acts as a reference seed.
2. Each subsequent sequence is pairwise-aligned to the reference profile.
3. If new gap characters (`-`) are inserted into the reference sequence, all previously aligned sequences are padded at the exact same column index, preserving global alignment integrity.

#### 3. Consensus & Conservation Calculation
For each column position $c$ in the final alignment:
$$\text{Conservation \%}(c) = \left( \frac{\text{Count of Majority Residue}}{\text{Total Non-Gap Sequences}} \right) \times 100$$
The residue with the highest frequency becomes the **Consensus Character**.

#### 4. Standard Clustal Color Schemes
* **DNA/RNA:** Adenine (`#ef4444` Red), Thymine/Uracil (`#3b82f6` Blue), Guanine (`#10b981` Green), Cytosine (`#f59e0b` Yellow).
* **Amino Acids:** Grouped by biophysical properties: Hydrophobic (Orange), Acidic (Red), Basic (Blue), Polar Uncharged (Green), Aromatic/Cysteine (Cyan/Pink).

---

### D. Phylogenetic Tree Construction Engine (`src/utils/phyloEngine.js`)

To reconstruct evolutionary divergence:

#### 1. Jukes-Cantor Genetic Distance
Computes pairwise sequence divergence $p$ (proportion of differing sites) and applies the Jukes-Cantor correction for multiple substitutions at the same site:
$$d = -\frac{3}{4} \ln\left(1 - \frac{4}{3} p\right)$$

#### 2. Clustering Algorithms
* **UPGMA (Unweighted Pair Group Method with Arithmetic Mean):**
  * Assumes a constant molecular clock.
  * Iteratively merges the closest pair of taxa $(i, j)$ into a composite node and updates distances to any remaining taxon $k$ via:
    $$d_{(ij), k} = \frac{|i| \cdot d_{ik} + |j| \cdot d_{jk}}{|i| + |j|}$$
* **Neighbor-Joining (NJ):**
  * Does not assume a constant molecular clock; models variable mutation rates.
  * Calculates rate-adjusted net divergence $R_i = \sum d_{ik}$ and minimizes the $Q$-matrix:
    $$Q_{ij} = (n - 2) d_{ij} - R_i - R_j$$

#### 3. Newick Formatting & Dynamic SVG Rendering
The hierarchical node cluster is exported to standard Newick parenthetical notation:
```text
((Homo_sapiens:0.024,Pan_troglodytes:0.021):0.052,Mus_musculus:0.142);
```
The browser then maps Newick branch lengths into coordinate pairs $(x, y)$ to draw scalable vector graphics (SVG) with zoom, pan, and branch length labels.

---

### E. PCR Primer Design Engine (`src/utils/primerEngine.js`)

#### 1. Nearest-Neighbor Thermodynamic Melting Temperature ($T_m$)
For short primers ($\le 13$ bp), the basic Wallace formula is applied:
$$T_m = 2(A + T) + 4(G + C)$$
For primers $> 13$ bp, nearest-neighbor thermodynamic parameters (SantaLucia 1998) are used:
$$T_m = \frac{\Delta H^\circ}{\Delta S^\circ + R \ln(C_T / 4)} - 273.15 + 16.6 \log_{10}[K^+]$$
*(Where $\Delta H^\circ$ is enthalpy, $\Delta S^\circ$ is entropy, $R = 1.987 \text{ cal/mol}\cdot\text{K}$, $C_T$ is primer concentration, and $[K^+]$ is monovalent salt concentration).*

#### 2. Quality Checks
* **GC Content:** Flags sequences outside the optimal $40\% - 60\%$ range.
* **GC Clamp:** Checks if the $3'$ end terminates with 1 or 2 G/C bases to ensure strong DNA polymerase initiation.
* **Self-Dimer & Hairpin Screening:** Analyzes the primer sequence against itself and its reverse complement to prevent secondary stem-loop structures.

---

### F. 3D Protein Structure Viewer (`src/components/ProteinStructure.jsx`)

* Integrates **3Dmol.js** directly into a React canvas container.
* Fetches atomic coordinates directly from RCSB PDB (`https://files.rcsb.org/download/{PDB_ID}.pdb`).
* Supports real-time rendering styles:
  * **Cartoon:** Polypeptide secondary structure ribbons (alpha helices & beta sheets).
  * **Sticks & Spheres:** Full atomistic ball-and-stick configurations.
  * **Solvent-Accessible Surface:** Hydrophobicity and electrostatic potential envelopes.

---

### G. Laboratory Calculators (`src/utils/labCalculators.js`)

* **Molarity Formula:** $\text{Mass (g)} = \text{Molarity (mol/L)} \times \text{Volume (L)} \times \text{Molecular Weight (g/mol)}$.
* **Stock Dilution:** $C_1 V_1 = C_2 V_2$.
* **PCR Master Mix Formulation:** Automatically factors in user-defined excess overage (e.g., $10\%$) across arbitrary reaction counts.
* **Copy Number Calculation:** Computes molecules per nanogram of DNA based on template length and average base pair weight ($660 \text{ g/mol}$).

---

## 4. The Backend Infrastructure (Express 5 Server)

The Node.js backend lives in `server/server.js`.

### A. Proxy Architecture & CORS Resolution
Browsers restrict direct client requests to third-party scientific servers that lack `Access-Control-Allow-Origin: *` headers. The Express backend acts as an intermediary:
```
Client (port 5173) ---> Express Proxy (port 5000) ---> NCBI Entrez (HTTPS)
```
The server attaches a compliant user agent header (`BioNexusStudio/2.1`), preventing IP-level rate limit bans.

### B. Zero-Database JSON Persistence
To avoid heavy external database setup (PostgreSQL, MongoDB), the backend maintains records inside `server/data/`:
* `projects.json`
* `sequences.json`
* `primers.json`
* `analyses.json`

Helper functions `readDataFile()` and `writeDataFile()` safely deserialize and serialize JSON to disk.

### C. Server Crash Guards & Uptime Guarantee
```javascript
process.on('uncaughtException', (err) => {
  console.error('[CRASH GUARD - UNCAUGHT EXCEPTION]:', err.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[CRASH GUARD - UNHANDLED REJECTION]:', reason);
});
```
These guards intercept unhandled asynchronous errors (such as network drops while querying NCBI), keeping the Express service online without dropping existing connections.

---

## 5. The Frontend Architecture & Central Data Pipeline

### A. `WorkspaceContext.jsx` — The Central Nervous System
The `WorkspaceProvider` wraps the entire application:
* `activeSequenceObj`: Current working sequence loaded into memory.
* `activeProject`: The selected project folder.
* `sequenceLibrary`: The user's saved FASTA entries.
* `autoSaveStatus`: Indicator displaying `saving` $\rightarrow$ `saved` across changes.

### B. `ActiveSequenceBar.jsx` Cross-Tool Sync
When a sequence is selected anywhere in the app, the `ActiveSequenceBar` mounts at the top of the interface:
* Displays sequence name, accession number, molecule type, and length.
* Includes direct routing triggers:
  * **"Analyze"** $\rightarrow$ Routes to Sequence Analysis.
  * **"Run BLAST"** $\rightarrow$ Routes to BLAST Center with query auto-loaded.
  * **"Design Primers"** $\rightarrow$ Routes to Primer Designer with template pre-filled.
  * **"Add to MSA"** $\rightarrow$ Appends the sequence to the Alignment Hub.

### C. Tab-Based Routing & Breadcrumb Navigation
`App.jsx` handles state-based routing via `getTabFromPath()` and `getPathFromTab()`, syncing the browser's URL with the active view without requiring a heavy external router dependency. `BreadcrumbNav.jsx` tracks current depth in the workspace hierarchy.

---

## 6. Minor & Polish Details That Make the App Production-Ready

1. **Dynamic SEO Engine (`src/utils/seo.js`):** Updates `document.title`, description tags, canonical links, and social metadata dynamically on every tab change.
2. **Crash-Resistant React Error Boundary (`src/components/ErrorBoundary.jsx`):** Wraps all sub-views. If an unexpected runtime error occurs, it displays a friendly error recovery panel rather than crashing to a blank white screen.
3. **Session Analytics (`src/utils/analytics.js`):** Lightweight, zero-dependency analytics tracking session duration, tool usage, and sequence operations locally.
4. **Desktop Launcher (`start.bat` / `start.ps1`):** A single script boots the Express backend in the background, starts Vite, and launches the browser automatically.

---

## 7. Step-by-Step Tutorial: How to Add a New Bio Tool Yourself

Want to add a new tool (for example, a **Restriction Enzyme Cleavage Site Mapper**)? Here is the step-by-step workflow:

### Step 1: Write the Core Algorithm
Create `src/utils/restrictionEngine.js`:
```javascript
export const ENZYMES = {
  EcoRI: { site: 'GAATTC', cutOffset: 1 },
  BamHI: { site: 'GGATCC', cutOffset: 1 },
  HindIII: { site: 'AAGCTT', cutOffset: 1 }
};

export function findCutSites(sequence) {
  const cleanSeq = sequence.toUpperCase().replace(/[^ATGC]/g, '');
  const results = [];

  Object.entries(ENZYMES).forEach(([name, data]) => {
    let pos = cleanSeq.indexOf(data.site);
    while (pos !== -1) {
      results.push({
        enzyme: name,
        position: pos + 1,
        cutPosition: pos + data.cutOffset
      });
      pos = cleanSeq.indexOf(data.site, pos + 1);
    }
  });

  return results;
}
```

### Step 2: Build the UI Component
Create `src/components/RestrictionMapper.jsx`:
```jsx
import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { findCutSites } from '../utils/restrictionEngine';
import { Scissors } from 'lucide-react';

export default function RestrictionMapper() {
  const { activeSequenceObj } = useWorkspace();
  const [seq, setSeq] = useState(activeSequenceObj?.sequence || '');

  const cuts = findCutSites(seq);

  return (
    <div className="tool-container">
      <h2><Scissors /> Restriction Enzyme Mapper</h2>
      <textarea value={seq} onChange={e => setSeq(e.target.value)} />
      <div className="results-grid">
        {cuts.map((c, i) => (
          <div key={i} className="card">
            <strong>{c.enzyme}</strong> cuts at position {c.cutPosition}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Step 3: Register the Route
In `src/App.jsx`:
1. Import `RestrictionMapper`.
2. Add `'restriction'` to `getTabFromPath` and `getPathFromTab`.
3. Add the conditional render in the main view:
   ```jsx
   {activeTab === 'restriction' && <RestrictionMapper />}
   ```

### Step 4: Add Navigation Entry
In `src/components/Sidebar.jsx`, add a navigation entry:
```jsx
{ id: 'restriction', label: 'Restriction Mapper', icon: Scissors }
```

Your new bioinformatic tool is now fully integrated into BioNexus Studio, connected to the active sequence bar, and ready to use!
