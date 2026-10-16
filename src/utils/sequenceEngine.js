// Scientific Sequence Analysis Engine for BioNexus Studio
// Implements rigorous biological computations for DNA, RNA, and Protein sequences

// =========================================================================
// 1. GENETIC CODES & TRANSLATION TABLES
// =========================================================================

// NCBI Translation Table 1: Standard Genetic Code
export const GENETIC_CODE_STANDARD = {
  'ATA':'I', 'ATC':'I', 'ATT':'I', 'ATG':'M',
  'ACA':'T', 'ACC':'T', 'ACG':'T', 'ACT':'T',
  'AAC':'N', 'AAT':'N', 'AAA':'K', 'AAG':'K',
  'AGC':'S', 'AGT':'S', 'AGA':'R', 'AGG':'R',
  'CTA':'L', 'CTC':'L', 'CTG':'L', 'CTT':'L',
  'CCA':'P', 'CCC':'P', 'CCG':'P', 'CCT':'P',
  'CAC':'H', 'CAT':'H', 'CAA':'Q', 'CAG':'Q',
  'CGA':'R', 'CGC':'R', 'CGG':'R', 'CGT':'R',
  'GTA':'V', 'GTC':'V', 'GTG':'V', 'GTT':'V',
  'GCA':'A', 'GCC':'A', 'GCG':'A', 'GCT':'A',
  'GAC':'D', 'GAT':'D', 'GAA':'E', 'GAG':'E',
  'GGA':'G', 'GGC':'G', 'GGG':'G', 'GGT':'G',
  'TCA':'S', 'TCC':'S', 'TCG':'S', 'TCT':'S',
  'TTC':'F', 'TTT':'F', 'TTA':'L', 'TTG':'L',
  'TAC':'Y', 'TAT':'Y', 'TAA':'*', 'TAG':'*',
  'TGC':'C', 'TGT':'C', 'TGA':'*', 'TGG':'W'
};

// NCBI Translation Table 2: Vertebrate Mitochondrial Code
export const GENETIC_CODE_MITO = {
  ...GENETIC_CODE_STANDARD,
  'AGA':'*', 'AGG':'*', // Stop codons in vertebrate mitochondria
  'ATA':'M',             // Methionine instead of Isoleucine
  'TGA':'W'              // Tryptophan instead of Stop
};

// NCBI Translation Table 11: Bacterial, Archaeal, and Plant Plastid Code
export const GENETIC_CODE_BACTERIAL = {
  ...GENETIC_CODE_STANDARD
};

export const GENETIC_CODES = {
  '1': { id: '1', name: 'Standard Genetic Code (NCBI Table 1)', table: GENETIC_CODE_STANDARD },
  '2': { id: '2', name: 'Vertebrate Mitochondrial (NCBI Table 2)', table: GENETIC_CODE_MITO },
  '11': { id: '11', name: 'Bacterial, Archaeal & Plastid (NCBI Table 11)', table: GENETIC_CODE_BACTERIAL }
};

// =========================================================================
// 2. MOLECULAR CONSTANTS & PHYSICAL PROPERTIES
// =========================================================================

// Average amino acid residue molecular weights in daltons (free aa minus H2O)
// Water (18.015 Da) is added once for the terminal H and OH groups of a polypeptide.
export const AA_RESIDUE_WEIGHTS = {
  'A': 71.08,  'R': 156.20, 'N': 114.11, 'D': 115.09, 'C': 103.14,
  'E': 129.12, 'Q': 128.13, 'G': 57.05,  'H': 137.14, 'I': 113.17,
  'L': 113.17, 'K': 128.18, 'M': 131.21, 'F': 147.18, 'P': 97.12,
  'S': 87.08,  'T': 101.11, 'W': 186.21, 'Y': 163.18, 'V': 99.13,
  'U': 150.04, // Selenocysteine
  'O': 237.30  // Pyrrolysine
};

export const AA_NAMES = {
  'A': 'Alanine', 'R': 'Arginine', 'N': 'Asparagine', 'D': 'Aspartate',
  'C': 'Cysteine', 'E': 'Glutamate', 'Q': 'Glutamine', 'G': 'Glycine',
  'H': 'Histidine', 'I': 'Isoleucine', 'L': 'Leucine', 'K': 'Lysine',
  'M': 'Methionine', 'F': 'Phenylalanine', 'P': 'Proline', 'S': 'Serine',
  'T': 'Threonine', 'W': 'Tryptophan', 'Y': 'Tyrosine', 'V': 'Valine',
  'B': 'Asx (Asn/Asp)', 'Z': 'Glx (Gln/Glu)', 'J': 'Xle (Leu/Ile)',
  'X': 'Unknown (Xaa)', 'U': 'Selenocysteine', 'O': 'Pyrrolysine', '*': 'Stop Codon'
};

// Kyte-Doolittle hydropathy scale (J. Mol. Biol. 1982, 157:105-132)
export const HYDROPHOBICITY_KD = {
  'A': 1.8, 'R': -4.5, 'N': -3.5, 'D': -3.5, 'C': 2.5,
  'Q': -3.5, 'E': -3.5, 'G': -0.4, 'H': -3.2, 'I': 4.5,
  'L': 3.8, 'K': -3.9, 'M': 1.9,  'F': 2.8,  'P': -1.6,
  'S': -0.8, 'T': -0.7, 'W': -0.9, 'Y': -1.3, 'V': 4.2
};

// Bjellqvist / EMBOSS pKa values for isoelectric point estimation
export const PKA_BJELLQVIST = {
  N_TERM: 9.69,
  C_TERM: 2.34,
  D: 3.86, // Aspartate side-chain
  E: 4.25, // Glutamate side-chain
  C: 8.33, // Cysteine side-chain
  Y: 10.07, // Tyrosine side-chain
  H: 6.00, // Histidine side-chain
  K: 10.53, // Lysine side-chain
  R: 12.48  // Arginine side-chain
};

// =========================================================================
// 3. SEQUENCE NORMALIZATION
// =========================================================================

/**
 * Remove FASTA header(s) and non-alphabetical characters
 * Guaranteed to exclude FASTA header lines from sequence calculations.
 */
export function cleanSequence(seq) {
  if (!seq || typeof seq !== 'string') return '';
  // 1. Remove FASTA headers (lines starting with '>')
  const withoutFasta = seq.replace(/^>.*(\r?\n|$)/gm, '');
  // 2. Remove all non-letter characters and uppercase
  return withoutFasta.replace(/[^a-zA-Z]/g, '').toUpperCase();
}

/**
 * Robust heuristic to test if an arbitrary string looks like a protein sequence
 */
export function isProteinSequence(seq) {
  const cleaned = cleanSequence(seq);
  if (!cleaned || cleaned.length < 5) return false;
  const nonDnaAaCount = (cleaned.match(/[EQKVPILFWYHDZ]/g) || []).length;
  return (nonDnaAaCount / cleaned.length) > 0.08;
}

// =========================================================================
// 4. NUCLEOTIDE (DNA / RNA) ANALYSIS
// =========================================================================

/**
 * Calculate rigorous nucleotide statistics for DNA or RNA
 * Strictly documents calculation basis for GC content and ambiguous bases.
 */
export function calculateNucleotideStatistics(cleanSeq = '', moleculeType = 'DNA') {
  const seq = (cleanSeq || '').toUpperCase();
  const totalLength = seq.length;

  if (totalLength === 0) {
    return {
      length: 0,
      moleculeType,
      counts: moleculeType === 'RNA' ? { A: 0, C: 0, G: 0, U: 0 } : { A: 0, C: 0, G: 0, T: 0 },
      canonicalCount: 0,
      ambiguousCounts: {},
      totalAmbiguous: 0,
      ambiguousPercent: 0,
      gcPercent: 0,
      gcTotalBasis: 0,
      atPercent: 0,
      auPercent: 0,
      gcSkew: 0,
      atSkew: 0,
      formulaBasis: 'Canonical base denominator (A + C + G + T/U)',
      warnings: ['Sequence is empty.']
    };
  }

  const isRna = moleculeType === 'RNA' || (seq.includes('U') && !seq.includes('T'));
  const mol = isRna ? 'RNA' : 'DNA';

  let a = 0, c = 0, g = 0, t = 0, u = 0;
  const ambiguousCounts = {
    R: 0, Y: 0, S: 0, W: 0, K: 0, M: 0, B: 0, D: 0, H: 0, V: 0, N: 0
  };

  for (let i = 0; i < totalLength; i++) {
    const ch = seq[i];
    if (ch === 'A') a++;
    else if (ch === 'C') c++;
    else if (ch === 'G') g++;
    else if (ch === 'T') t++;
    else if (ch === 'U') u++;
    else if (ambiguousCounts[ch] !== undefined) {
      ambiguousCounts[ch]++;
    }
  }

  const primaryT = isRna ? u : t;
  const canonicalCount = a + c + g + primaryT;
  let totalAmbiguous = 0;
  for (const count of Object.values(ambiguousCounts)) {
    totalAmbiguous += count;
  }
  const ambiguousPercent = totalLength > 0 ? parseFloat(((totalAmbiguous / totalLength) * 100).toFixed(2)) : 0;

  // Documented GC calculation:
  // 1. Canonical Basis: (G + C) / (A + C + G + T_or_U) * 100
  // 2. Total Basis: (G + C) / totalLength * 100
  const gcCanonical = canonicalCount > 0 ? parseFloat((((g + c) / canonicalCount) * 100).toFixed(2)) : 0;
  const gcTotal = totalLength > 0 ? parseFloat((((g + c) / totalLength) * 100).toFixed(2)) : 0;

  const atCanonical = canonicalCount > 0 ? parseFloat((((a + primaryT) / canonicalCount) * 100).toFixed(2)) : 0;

  // Skew calculation: (G - C) / (G + C)
  const gcSkew = (g + c) > 0 ? parseFloat(((g - c) / (g + c)).toFixed(3)) : 0;
  const atSkew = (a + primaryT) > 0 ? parseFloat(((a - primaryT) / (a + primaryT)).toFixed(3)) : 0;

  const warnings = [];
  if (totalAmbiguous > 0) {
    warnings.push(`Sequence contains ${totalAmbiguous} ambiguous IUPAC base(s) (${ambiguousPercent}%). GC content is reported on canonical bases (${canonicalCount} nt).`);
  }
  if (isRna && t > 0) {
    warnings.push(`RNA sequence contains ${t} Thymine (T) residue(s).`);
  }
  if (!isRna && u > 0) {
    warnings.push(`DNA sequence contains ${u} Uracil (U) residue(s).`);
  }

  return {
    length: totalLength,
    moleculeType: mol,
    counts: isRna ? { A: a, C: c, G: g, U: u } : { A: a, C: c, G: g, T: t },
    canonicalCount,
    ambiguousCounts,
    totalAmbiguous,
    ambiguousPercent,
    gcPercent: gcCanonical,
    gcTotalBasis: gcTotal,
    atPercent: !isRna ? atCanonical : null,
    auPercent: isRna ? atCanonical : null,
    gcSkew,
    atSkew,
    formulaBasis: 'Canonical bases only (A + C + G + T/U); ambiguous bases excluded from denominator.',
    warnings
  };
}

/**
 * Reverse complement supporting full IUPAC ambiguity codes for DNA or RNA
 */
export function calculateReverseComplement(cleanSeq = '', moleculeType = 'DNA') {
  const seq = (cleanSeq || '').toUpperCase();
  const isRna = moleculeType === 'RNA' || (seq.includes('U') && !seq.includes('T'));

  const compDna = {
    'A': 'T', 'T': 'A', 'U': 'A', 'G': 'C', 'C': 'G',
    'R': 'Y', 'Y': 'R', 'S': 'S', 'W': 'W', 'K': 'M',
    'M': 'K', 'B': 'V', 'D': 'H', 'H': 'D', 'V': 'B', 'N': 'N'
  };

  const compRna = {
    'A': 'U', 'U': 'A', 'T': 'A', 'G': 'C', 'C': 'G',
    'R': 'Y', 'Y': 'R', 'S': 'S', 'W': 'W', 'K': 'M',
    'M': 'K', 'B': 'V', 'D': 'H', 'H': 'D', 'V': 'B', 'N': 'N'
  };

  const compMap = isRna ? compRna : compDna;
  let revComp = '';
  for (let i = seq.length - 1; i >= 0; i--) {
    const base = seq[i];
    revComp += compMap[base] || base;
  }
  return revComp;
}

/**
 * 6-Frame Open Reading Frame (ORF) finder
 * Finds ORFs in frames +1, +2, +3 and -1, -2, -3 starting with ATG/AUG and terminating at Stop codons.
 */
export function findORFs(cleanSeq = '', minCodons = 30, geneticCodeId = '1') {
  const seq = (cleanSeq || '').toUpperCase();
  if (seq.length < 9) return [];

  const isRna = seq.includes('U') && !seq.includes('T');
  // Normalize RNA to DNA codons for standard table lookup
  const dnaSeq = isRna ? seq.replace(/U/g, 'T') : seq;
  const revCompSeq = calculateReverseComplement(dnaSeq, 'DNA');
  const codeTable = (GENETIC_CODES[geneticCodeId] || GENETIC_CODES['1']).table;

  const orfs = [];
  const seqLen = dnaSeq.length;

  const scanStrand = (strandSeq, isRev) => {
    for (let frame = 0; frame < 3; frame++) {
      const frameNum = frame + 1;
      const frameLabel = isRev ? `-${frameNum}` : `+${frameNum}`;
      let inOrf = false;
      let startIdx = 0;
      let currentCodons = [];

      for (let i = frame; i <= strandSeq.length - 3; i += 3) {
        const codon = strandSeq.slice(i, i + 3);
        const aa = codeTable[codon] || 'X';

        if (codon === 'ATG' && !inOrf) {
          inOrf = true;
          startIdx = i;
          currentCodons = [codon];
        } else if (inOrf) {
          currentCodons.push(codon);
          if (aa === '*') {
            const dnaLength = currentCodons.length * 3;
            const aaCount = currentCodons.length - 1; // Exclude terminal stop codon from peptide length
            if (aaCount >= minCodons) {
              const peptide = currentCodons.slice(0, -1).map(c => codeTable[c] || 'X').join('');

              // 1-based coordinates relative to original 5' -> 3' sequence
              let origStart, origEnd;
              if (!isRev) {
                origStart = startIdx + 1;
                origEnd = startIdx + dnaLength;
              } else {
                // On reverse complement: index 0 is position seqLen in original
                origStart = seqLen - (startIdx + dnaLength) + 1;
                origEnd = seqLen - startIdx;
              }

              orfs.push({
                frame: frameLabel,
                start: origStart,
                end: origEnd,
                lengthDna: dnaLength,
                lengthAa: aaCount,
                dnaSeq: currentCodons.join(''),
                aaSeq: peptide,
                isReverse: isRev
              });
            }
            inOrf = false;
            currentCodons = [];
          }
        }
      }
    }
  };

  scanStrand(dnaSeq, false);
  scanStrand(revCompSeq, true);

  return orfs.sort((a, b) => b.lengthAa - a.lengthAa);
}

/**
 * Translate nucleotide sequence into amino acid peptide
 * Allows explicit reading frame (1, 2, 3), strand (+ or -), and genetic code.
 */
export function translateNucleotideSequence(cleanSeq = '', options = {}) {
  const {
    frame = 1,
    strand = '+',
    geneticCode = '1',
    stopSymbol = '*'
  } = options;

  let seq = (cleanSeq || '').toUpperCase();
  if (!seq) {
    return { peptide: '', length: 0, stopCodonCount: 0, frame, strand, geneticCode, codons: [] };
  }

  // Handle strand
  if (strand === '-') {
    seq = calculateReverseComplement(seq, seq.includes('U') ? 'RNA' : 'DNA');
  }

  // Normalize U to T for codon lookup
  const dnaSeq = seq.replace(/U/g, 'T');
  const codeTable = (GENETIC_CODES[geneticCode] || GENETIC_CODES['1']).table;
  const frameOffset = Math.max(0, Math.min(2, parseInt(frame, 10) - 1));

  let peptide = '';
  let stopCount = 0;
  const codons = [];

  for (let i = frameOffset; i <= dnaSeq.length - 3; i += 3) {
    const codon = dnaSeq.slice(i, i + 3);
    const aa = codeTable[codon] || 'X';
    if (aa === '*') {
      stopCount++;
      peptide += stopSymbol;
    } else {
      peptide += aa;
    }
    codons.push({ codon, aa, pos: i + 1 });
  }

  return {
    peptide,
    length: peptide.length,
    stopCodonCount: stopCount,
    frame,
    strand,
    geneticCode: (GENETIC_CODES[geneticCode] || GENETIC_CODES['1']).name,
    codons
  };
}

// =========================================================================
// 5. PROTEIN (AMINO ACID) ANALYSIS
// =========================================================================

/**
 * Calculate molecular weight of a protein in Daltons
 * Stated assumption: Average residue mass in peptide chain + 18.015 Da (terminal H and OH).
 */
export function calculateProteinMolecularWeight(cleanAaSeq = '') {
  const seq = (cleanAaSeq || '').toUpperCase();
  if (!seq.length) return { mwDa: 0, mwKDa: 0, statedAssumptions: 'Empty sequence' };

  let sum = 18.015; // Terminal water addition (H- at N-terminus, -OH at C-terminus)
  let unknownCount = 0;

  for (let i = 0; i < seq.length; i++) {
    const aa = seq[i];
    if (AA_RESIDUE_WEIGHTS[aa] !== undefined) {
      sum += AA_RESIDUE_WEIGHTS[aa];
    } else if (aa === '*') {
      // Stop codon does not add weight
    } else {
      // Fallback weight for ambiguous residues (B, Z, J, X) = 110.0 Da
      sum += 110.0;
      unknownCount++;
    }
  }

  const roundedSum = Math.round((sum + 1e-9) * 100) / 100;
  const mwDa = parseFloat(roundedSum.toFixed(2));
  const mwKDa = parseFloat(((sum + 1e-9) / 1000).toFixed(3));

  return {
    mwDa,
    mwKDa,
    statedAssumptions: `Average isotopic residue weights with free N-terminal H and C-terminal OH (+18.015 Da).${unknownCount > 0 ? ` ${unknownCount} non-standard residue(s) estimated at 110.0 Da.` : ''}`
  };
}

/**
 * Calculate theoretical isoelectric point (pI) using exact bisection charge balance
 * Uses Bjellqvist / EMBOSS standard pKa values for ionizable groups.
 */
export function calculateProteinIsoelectricPoint(cleanAaSeq = '') {
  const seq = (cleanAaSeq || '').toUpperCase();
  if (!seq.length) return 7.0;

  // Count ionizable groups
  let nD = 0, nE = 0, nC = 0, nY = 0, nH = 0, nK = 0, nR = 0;

  for (let i = 0; i < seq.length; i++) {
    const ch = seq[i];
    if (ch === 'D') nD++;
    else if (ch === 'E') nE++;
    else if (ch === 'C') nC++;
    else if (ch === 'Y') nY++;
    else if (ch === 'H') nH++;
    else if (ch === 'K') nK++;
    else if (ch === 'R') nR++;
  }

  // Net charge function at given pH using Henderson-Hasselbalch equation
  const getNetCharge = (pH) => {
    // Positively charged groups (base protonation: charge = +1 / (1 + 10^(pH - pKa)))
    const qNTerm = 1 / (1 + Math.pow(10, pH - PKA_BJELLQVIST.N_TERM));
    const qK = nK / (1 + Math.pow(10, pH - PKA_BJELLQVIST.K));
    const qR = nR / (1 + Math.pow(10, pH - PKA_BJELLQVIST.R));
    const qH = nH / (1 + Math.pow(10, pH - PKA_BJELLQVIST.H));

    // Negatively charged groups (acid deprotonation: charge = -1 / (1 + 10^(pKa - pH)))
    const qCTerm = -1 / (1 + Math.pow(10, PKA_BJELLQVIST.C_TERM - pH));
    const qD = -nD / (1 + Math.pow(10, PKA_BJELLQVIST.D - pH));
    const qE = -nE / (1 + Math.pow(10, PKA_BJELLQVIST.E - pH));
    const qC = -nC / (1 + Math.pow(10, PKA_BJELLQVIST.C - pH));
    const qY = -nY / (1 + Math.pow(10, PKA_BJELLQVIST.Y - pH));

    return qNTerm + qK + qR + qH + qCTerm + qD + qE + qC + qY;
  };

  // Binary search (bisection) between pH 0.00 and 14.00
  let low = 0.0;
  let high = 14.0;
  for (let iter = 0; iter < 40; iter++) {
    const mid = (low + high) / 2;
    const charge = getNetCharge(mid);
    if (charge > 0) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return parseFloat(((low + high) / 2).toFixed(2));
}

/**
 * Calculate complete amino acid composition, grouping, and hydropathy
 */
export function calculateProteinStatistics(cleanAaSeq = '') {
  const seq = (cleanAaSeq || '').toUpperCase();
  const totalResidues = seq.length;

  if (totalResidues === 0) {
    return {
      length: 0,
      composition: [],
      groups: { acidic: 0, basic: 0, neutralPolar: 0, hydrophobic: 0, special: 0 },
      mwDa: 0,
      mwKDa: 0,
      pi: 7.0,
      gravy: 0,
      statedAssumptions: 'Empty sequence',
      warnings: ['Sequence is empty.']
    };
  }

  const counts = {};
  const standardAAs = ['A','R','N','D','C','E','Q','G','H','I','L','K','M','F','P','S','T','W','Y','V'];
  standardAAs.forEach(aa => counts[aa] = 0);

  let gravySum = 0;
  let validGravyCount = 0;
  let unknownCount = 0;

  for (let i = 0; i < totalResidues; i++) {
    const aa = seq[i];
    if (counts[aa] !== undefined) {
      counts[aa]++;
    } else {
      counts[aa] = (counts[aa] || 0) + 1;
      unknownCount++;
    }

    if (HYDROPHOBICITY_KD[aa] !== undefined) {
      gravySum += HYDROPHOBICITY_KD[aa];
      validGravyCount++;
    }
  }

  // Groups
  const acidic = (counts['D'] || 0) + (counts['E'] || 0);
  const basic = (counts['K'] || 0) + (counts['R'] || 0) + (counts['H'] || 0);
  const neutralPolar = (counts['S'] || 0) + (counts['T'] || 0) + (counts['N'] || 0) + (counts['Q'] || 0) + (counts['C'] || 0) + (counts['Y'] || 0);
  const hydrophobic = (counts['A'] || 0) + (counts['V'] || 0) + (counts['I'] || 0) + (counts['L'] || 0) + (counts['M'] || 0) + (counts['F'] || 0) + (counts['W'] || 0) + (counts['P'] || 0) + (counts['G'] || 0);

  const composition = Object.keys(counts).map(aa => ({
    aa,
    name: AA_NAMES[aa] || `Residue ${aa}`,
    count: counts[aa],
    percent: parseFloat(((counts[aa] / totalResidues) * 100).toFixed(2))
  })).sort((a, b) => b.count - a.count);

  const { mwDa, mwKDa, statedAssumptions } = calculateProteinMolecularWeight(seq);
  const pi = calculateProteinIsoelectricPoint(seq);
  const gravy = validGravyCount > 0 ? parseFloat((gravySum / validGravyCount).toFixed(3)) : 0;

  const warnings = [];
  if (unknownCount > 0) {
    warnings.push(`Contains ${unknownCount} non-standard/ambiguous residue(s) (e.g. X, B, Z, J, U, O).`);
  }

  return {
    length: totalResidues,
    composition,
    groups: {
      acidic: { count: acidic, percent: parseFloat(((acidic / totalResidues) * 100).toFixed(1)) },
      basic: { count: basic, percent: parseFloat(((basic / totalResidues) * 100).toFixed(1)) },
      neutralPolar: { count: neutralPolar, percent: parseFloat(((neutralPolar / totalResidues) * 100).toFixed(1)) },
      hydrophobic: { count: hydrophobic, percent: parseFloat(((hydrophobic / totalResidues) * 100).toFixed(1)) },
      unknown: { count: unknownCount, percent: parseFloat(((unknownCount / totalResidues) * 100).toFixed(1)) }
    },
    mwDa,
    mwKDa,
    pi,
    gravy,
    statedAssumptions,
    warnings
  };
}

/**
 * Kyte-Doolittle Hydropathy Profile for sliding window visualization
 */
export function calculateKyteDoolittleProfile(cleanAaSeq = '', windowSize = 7) {
  const seq = (cleanAaSeq || '').toUpperCase();
  const values = [];
  if (seq.length < windowSize) return values;

  const halfWin = Math.floor(windowSize / 2);
  for (let i = halfWin; i < seq.length - halfWin; i++) {
    let sum = 0;
    for (let j = -halfWin; j <= halfWin; j++) {
      const aa = seq[i + j];
      sum += HYDROPHOBICITY_KD[aa] || 0;
    }
    values.push({
      position: i + 1,
      residue: seq[i],
      score: parseFloat((sum / windowSize).toFixed(2))
    });
  }
  return values;
}

// =========================================================================
// 6. BACKWARD-COMPATIBLE FUNCTION EXPORTS
// (Ensures PrimerDesigner, BlastCenter, AlignmentHub, etc. continue working)
// =========================================================================

export function calculateGC(seq) {
  const cleaned = cleanSequence(seq);
  const stats = calculateNucleotideStatistics(cleaned, 'DNA');
  return {
    gcPercent: stats.gcPercent,
    gCount: stats.counts.G,
    cCount: stats.counts.C,
    aCount: stats.counts.A,
    tCount: stats.counts.T,
    length: stats.length
  };
}

export function complement(base) {
  if (!base || typeof base !== 'string') return '';
  const map = {
    'A': 'T', 'T': 'A', 'U': 'A', 'G': 'C', 'C': 'G',
    'R': 'Y', 'Y': 'R', 'S': 'S', 'W': 'W', 'K': 'M',
    'M': 'K', 'B': 'V', 'D': 'H', 'H': 'D', 'V': 'B', 'N': 'N',
    'a': 't', 't': 'a', 'u': 'a', 'g': 'c', 'c': 'g'
  };
  return map[base] || base;
}

export function reverseComplement(seq) {
  const cleaned = cleanSequence(seq);
  return calculateReverseComplement(cleaned, 'DNA');
}

export function translateDNA(seq, frame = 0) {
  const cleaned = cleanSequence(seq);
  const res = translateNucleotideSequence(cleaned, { frame: frame + 1, strand: '+', geneticCode: '1' });
  return res.peptide;
}

export function calculateProteinMW(aaSeq) {
  const cleaned = cleanSequence(aaSeq);
  const { mwKDa } = calculateProteinMolecularWeight(cleaned);
  return mwKDa;
}

export function calculateAminoAcidComp(aaSeq) {
  const cleaned = cleanSequence(aaSeq);
  const stats = calculateProteinStatistics(cleaned);
  return {
    totalResidues: stats.length,
    composition: stats.composition
  };
}

export function calculateIsoelectricPoint(aaSeq) {
  const cleaned = cleanSequence(aaSeq);
  return calculateProteinIsoelectricPoint(cleaned);
}

export function calculateKyteDoolittle(aaSeq, windowSize = 7) {
  const cleaned = cleanSequence(aaSeq);
  return calculateKyteDoolittleProfile(cleaned, windowSize);
}
