// Scientific Sequence Parsing and Validation Engine for BioNexus Studio
// Supports NCBI Accessions, DNA, RNA, and Protein sequences with IUPAC ambiguity handling

export const CANONICAL_DNA_BASES = new Set(['A', 'T', 'G', 'C']);
export const CANONICAL_RNA_BASES = new Set(['A', 'U', 'G', 'C']);
export const CANONICAL_BASES = new Set(['A', 'T', 'G', 'C', 'U']);
export const IUPAC_AMBIGUITY_CODES = new Set(['R', 'Y', 'S', 'W', 'K', 'M', 'B', 'D', 'H', 'V', 'N']);
export const VALID_NUCLEOTIDES = new Set([...CANONICAL_BASES, ...IUPAC_AMBIGUITY_CODES]);

export const STANDARD_AMINO_ACIDS = new Set([
  'A', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L',
  'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'W', 'Y'
]);
export const EXTENDED_AMINO_ACIDS = new Set(['B', 'Z', 'J', 'X', 'U', 'O', '*']);
export const VALID_AMINO_ACIDS = new Set([...STANDARD_AMINO_ACIDS, ...EXTENDED_AMINO_ACIDS]);
export const PROTEIN_ONLY_AMINO_ACIDS = new Set(['E', 'Q', 'L', 'I', 'F', 'P', 'Z']);

/**
 * Safely parse raw input into FASTA header(s) and sequence body lines
 */
export function parseFasta(rawInput = '') {
  if (!rawInput || typeof rawInput !== 'string') {
    return { isFasta: false, fastaHeader: '', seqBody: '', headers: [], rawInput: '' };
  }

  const lines = rawInput.split(/\r?\n/);
  let isFasta = false;
  const headers = [];
  const seqLines = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('>')) {
      isFasta = true;
      headers.push(trimmed.substring(1).trim());
    } else if (trimmed.length > 0) {
      seqLines.push(trimmed);
    }
  }

  return {
    isFasta,
    fastaHeader: headers[0] || '',
    headers,
    seqBody: seqLines.join(''),
    rawInput
  };
}

/**
 * Validate NCBI accession format syntax
 * Does NOT fetch from network; validates format and predicts target database.
 */
export function validateAccessionFormat(accessionStr = '') {
  const trimmed = (accessionStr || '').trim().toUpperCase();
  if (!trimmed) {
    return {
      isValid: false,
      isEmpty: true,
      accession: '',
      candidateDb: null,
      moleculeType: null,
      errorMessage: 'Accession ID is empty. Please enter an NCBI accession (e.g. NC_000913.3, NM_000546.6, NP_000537.3).'
    };
  }

  // General format pattern for NCBI RefSeq, GenBank, EMBL, DDBJ, UniProt
  const refSeqNucPattern = /^(NC_|NM_|NR_|NZ_|NG_|NT_|NW_|XM_|XR_)\d+(\.\d+)?$/;
  const refSeqProtPattern = /^(NP_|AP_|XP_|YP_|ZP_|WP_)\d+(\.\d+)?$/;
  const genBankNucPattern = /^[A-Z]{1,2}\d{5,6}(\.\d+)?$|^[A-Z]{4,6}\d{8,10}(\.\d+)?$/;
  const genBankProtPattern = /^[A-Z]{3}\d{5}(\.\d+)?$/;
  const uniProtPattern = /^([OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9][A-Z][A-Z0-9]{2}[0-9])(\.\d+)?$/;

  let candidateDb = 'nucleotide';
  let moleculeType = 'DNA';

  if (refSeqProtPattern.test(trimmed) || genBankProtPattern.test(trimmed) || uniProtPattern.test(trimmed)) {
    candidateDb = 'protein';
    moleculeType = 'protein';
  } else if (refSeqNucPattern.test(trimmed)) {
    candidateDb = 'nucleotide';
    moleculeType = /^(NM_|NR_|XM_|XR_)/.test(trimmed) ? 'RNA' : 'DNA';
  } else if (genBankNucPattern.test(trimmed)) {
    candidateDb = 'nucleotide';
    moleculeType = 'DNA';
  } else if (/^[A-Z0-9_.-]{3,35}$/.test(trimmed)) {
    // General NCBI / EMBL identifier with unknown prefix
    candidateDb = 'unknown';
    moleculeType = 'unknown';
  } else {
    return {
      isValid: false,
      isEmpty: false,
      accession: trimmed,
      candidateDb: null,
      moleculeType: null,
      errorMessage: `Invalid accession ID format: '${accessionStr.trim()}'. Valid examples include RefSeq (NC_000913.3, NM_000546.6, NP_000537.3), GenBank (U00096.3), or UniProt (P04637).`
    };
  }

  return {
    isValid: true,
    isEmpty: false,
    accession: trimmed,
    candidateDb,
    moleculeType,
    errorMessage: ''
  };
}

/**
 * Validate Nucleotide (DNA/RNA) sequence input
 * Accepts raw sequence or FASTA. Correctly handles multiline, IUPAC, and mixed cases.
 * Reports exact 1-based character positions of invalid symbols.
 */
export function validateNucleotideInput(rawInput, options = {}) {
  const { moleculePreference = 'auto', minLen = 1 } = options;

  if (!rawInput || !rawInput.trim()) {
    return {
      isValid: false,
      isEmpty: true,
      isFasta: false,
      fastaHeader: '',
      cleanSequence: '',
      rawSequence: '',
      moleculeType: 'DNA',
      length: 0,
      canonicalCounts: { A: 0, C: 0, G: 0, T: 0, U: 0 },
      ambiguityCounts: {},
      totalAmbiguous: 0,
      invalidChars: [],
      offendingPositions: [],
      errorMessage: 'Sequence is empty. Please enter a DNA or RNA sequence (raw or FASTA format).',
      warningMessage: ''
    };
  }

  const { isFasta, fastaHeader } = parseFasta(rawInput);
  const lines = rawInput.split(/\r?\n/);

  // Track positions in the non-header sequence
  const offendingPositions = [];
  const invalidCharSet = new Set();
  const canonicalCounts = { A: 0, C: 0, G: 0, T: 0, U: 0 };
  const ambiguityCounts = {};
  for (const code of IUPAC_AMBIGUITY_CODES) {
    ambiguityCounts[code] = 0;
  }

  let cleanChars = [];
  let seqPos = 0; // 1-based position in clean biological sequence

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    if (line.trim().startsWith('>')) {
      continue; // Skip FASTA header
    }

    for (let colIdx = 0; colIdx < line.length; colIdx++) {
      const char = line[colIdx];
      // Skip whitespace and line breaks
      if (/\s/.test(char)) {
        continue;
      }

      seqPos++;
      const upper = char.toUpperCase();

      if (CANONICAL_BASES.has(upper)) {
        canonicalCounts[upper] = (canonicalCounts[upper] || 0) + 1;
        cleanChars.push(upper);
      } else if (IUPAC_AMBIGUITY_CODES.has(upper)) {
        ambiguityCounts[upper] = (ambiguityCounts[upper] || 0) + 1;
        cleanChars.push(upper);
      } else {
        invalidCharSet.add(char);
        offendingPositions.push({
          char,
          position: seqPos,
          line: lineIdx + 1,
          column: colIdx + 1
        });
      }
    }
  }

  const cleanSequence = cleanChars.join('');
  const totalLength = cleanSequence.length;
  const invalidChars = Array.from(invalidCharSet);
  let totalAmbiguous = 0;
  for (const count of Object.values(ambiguityCounts)) {
    totalAmbiguous += count;
  }

  // Detect molecule type (DNA vs RNA vs Ambiguous vs Mixed)
  const hasT = canonicalCounts.T > 0;
  const hasU = canonicalCounts.U > 0;
  let moleculeType = 'DNA';
  let hybridError = false;

  if (hasT && hasU) {
    hybridError = true;
    moleculeType = 'hybrid';
  } else if (hasU && !hasT) {
    moleculeType = 'RNA';
  } else if (hasT && !hasU) {
    moleculeType = 'DNA';
  } else {
    // Neither T nor U present (e.g. A, C, G and IUPAC codes)
    moleculeType = moleculePreference === 'RNA' ? 'RNA' : 'DNA';
  }

  // Check invalid characters
  if (invalidChars.length > 0) {
    const isLikelyProtein = invalidChars.some(c => PROTEIN_ONLY_AMINO_ACIDS.has(c.toUpperCase()));
    let errMsg = `Invalid nucleotide sequence. Found non-nucleotide character(s): ${invalidChars.map(c => `'${c}'`).join(', ')} at position(s) ${offendingPositions.slice(0, 5).map(p => `${p.position} ('${p.char}')`).join(', ')}${offendingPositions.length > 5 ? '...' : ''}.`;
    if (isLikelyProtein) {
      errMsg += ' Amino acid characters detected. If this is a protein sequence, switch to "Protein Sequence" mode.';
    }

    return {
      isValid: false,
      isEmpty: false,
      isFasta,
      fastaHeader,
      cleanSequence,
      rawSequence: rawInput,
      moleculeType,
      length: totalLength,
      canonicalCounts,
      ambiguityCounts,
      totalAmbiguous,
      invalidChars,
      offendingPositions,
      errorMessage: errMsg,
      warningMessage: ''
    };
  }

  // Check mixed DNA/RNA error
  if (hybridError) {
    return {
      isValid: false,
      isEmpty: false,
      isFasta,
      fastaHeader,
      cleanSequence,
      rawSequence: rawInput,
      moleculeType: 'hybrid',
      length: totalLength,
      canonicalCounts,
      ambiguityCounts,
      totalAmbiguous,
      invalidChars: ['T', 'U'],
      offendingPositions: [],
      errorMessage: `Mixed DNA/RNA sequence detected: Contains both Thymine (T: ${canonicalCounts.T}) and Uracil (U: ${canonicalCounts.U}). Biological sequences cannot mix DNA and RNA bases simultaneously without clarification.`,
      warningMessage: ''
    };
  }

  // Check minimum length
  if (totalLength < minLen) {
    return {
      isValid: false,
      isEmpty: false,
      isFasta,
      fastaHeader,
      cleanSequence,
      rawSequence: rawInput,
      moleculeType,
      length: totalLength,
      canonicalCounts,
      ambiguityCounts,
      totalAmbiguous,
      invalidChars: [],
      offendingPositions: [],
      errorMessage: `Sequence length (${totalLength} nt) is shorter than minimum required length (${minLen} nt).`,
      warningMessage: ''
    };
  }

  // Build warnings
  const warnings = [];
  if (totalAmbiguous > 0) {
    const ambigPercent = ((totalAmbiguous / totalLength) * 100).toFixed(1);
    warnings.push(`Contains ${totalAmbiguous} IUPAC ambiguity code(s) (${ambigPercent}% of sequence).`);
  }
  if (!hasT && !hasU && totalLength > 0) {
    warnings.push(`Sequence contains neither T nor U. Evaluated as ${moleculeType} by default.`);
  }

  return {
    isValid: true,
    isEmpty: false,
    isFasta,
    fastaHeader,
    cleanSequence,
    rawSequence: rawInput,
    moleculeType,
    length: totalLength,
    canonicalCounts,
    ambiguityCounts,
    totalAmbiguous,
    invalidChars: [],
    offendingPositions: [],
    errorMessage: '',
    warningMessage: warnings.join(' ')
  };
}

/**
 * Validate Protein (Amino Acid) sequence input
 * Accepts raw sequence or FASTA.
 * Validates against standard 20 amino acids + IUPAC extensions (B, Z, J, X, U, O, *).
 */
export function validateProteinInput(rawInput, options = {}) {
  const { minLen = 1 } = options;

  if (!rawInput || !rawInput.trim()) {
    return {
      isValid: false,
      isEmpty: true,
      isFasta: false,
      fastaHeader: '',
      cleanSequence: '',
      rawSequence: '',
      length: 0,
      aminoAcidCounts: {},
      extendedCounts: {},
      invalidChars: [],
      offendingPositions: [],
      errorMessage: 'Protein sequence is empty. Please enter an amino acid sequence (raw or FASTA format).',
      warningMessage: ''
    };
  }

  const { isFasta, fastaHeader } = parseFasta(rawInput);
  const lines = rawInput.split(/\r?\n/);

  const offendingPositions = [];
  const invalidCharSet = new Set();
  const aminoAcidCounts = {};
  for (const aa of STANDARD_AMINO_ACIDS) {
    aminoAcidCounts[aa] = 0;
  }
  const extendedCounts = {};
  for (const aa of EXTENDED_AMINO_ACIDS) {
    extendedCounts[aa] = 0;
  }

  let cleanChars = [];
  let seqPos = 0;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    if (line.trim().startsWith('>')) {
      continue; // Skip FASTA header
    }

    for (let colIdx = 0; colIdx < line.length; colIdx++) {
      const char = line[colIdx];
      if (/\s/.test(char)) {
        continue;
      }

      seqPos++;
      const upper = char.toUpperCase();

      if (STANDARD_AMINO_ACIDS.has(upper)) {
        aminoAcidCounts[upper] = (aminoAcidCounts[upper] || 0) + 1;
        cleanChars.push(upper);
      } else if (EXTENDED_AMINO_ACIDS.has(upper)) {
        extendedCounts[upper] = (extendedCounts[upper] || 0) + 1;
        cleanChars.push(upper);
      } else {
        invalidCharSet.add(char);
        offendingPositions.push({
          char,
          position: seqPos,
          line: lineIdx + 1,
          column: colIdx + 1
        });
      }
    }
  }

  const cleanSequence = cleanChars.join('');
  const totalLength = cleanSequence.length;
  const invalidChars = Array.from(invalidCharSet);

  if (invalidChars.length > 0) {
    return {
      isValid: false,
      isEmpty: false,
      isFasta,
      fastaHeader,
      cleanSequence,
      rawSequence: rawInput,
      length: totalLength,
      aminoAcidCounts,
      extendedCounts,
      invalidChars,
      offendingPositions,
      errorMessage: `Invalid protein sequence. Detected non-amino-acid character(s): ${invalidChars.map(c => `'${c}'`).join(', ')} at position(s) ${offendingPositions.slice(0, 5).map(p => `${p.position} ('${p.char}')`).join(', ')}${offendingPositions.length > 5 ? '...' : ''}.`,
      warningMessage: ''
    };
  }

  if (totalLength < minLen) {
    return {
      isValid: false,
      isEmpty: false,
      isFasta,
      fastaHeader,
      cleanSequence,
      rawSequence: rawInput,
      length: totalLength,
      aminoAcidCounts,
      extendedCounts,
      invalidChars: [],
      offendingPositions: [],
      errorMessage: `Protein length (${totalLength} aa) is shorter than minimum required length (${minLen} aa).`,
      warningMessage: ''
    };
  }

  const warnings = [];
  const extendedTotal = Object.values(extendedCounts).reduce((a, b) => a + b, 0);
  if (extendedTotal > 0) {
    warnings.push(`Contains ${extendedTotal} non-standard/ambiguous residue(s) (e.g. X, B, Z, J, U, O, *).`);
  }

  return {
    isValid: true,
    isEmpty: false,
    isFasta,
    fastaHeader,
    cleanSequence,
    rawSequence: rawInput,
    length: totalLength,
    aminoAcidCounts,
    extendedCounts,
    invalidChars: [],
    offendingPositions: [],
    errorMessage: '',
    warningMessage: warnings.join(' ')
  };
}

/**
 * Backward-compatible validateDnaSequence wrapper for existing modules
 * (BlastCenter, PrimerDesigner, Phylogenetics)
 */
export function validateDnaSequence(rawInput, options = {}) {
  const result = validateNucleotideInput(rawInput, { ...options, moleculePreference: 'DNA' });
  const g = result.canonicalCounts?.G || 0;
  const c = result.canonicalCounts?.C || 0;
  const a = result.canonicalCounts?.A || 0;
  const t = (result.canonicalCounts?.T || 0) + (result.canonicalCounts?.U || 0);
  const denom = (g + c + a + t) || 1;

  const gcPercent = parseFloat((((g + c) / denom) * 100).toFixed(1));
  const atPercent = parseFloat((((a + t) / denom) * 100).toFixed(1));

  return {
    isValid: result.isValid,
    isEmpty: result.isEmpty,
    isFasta: result.isFasta,
    fastaHeader: result.fastaHeader,
    cleanDna: result.cleanSequence,
    length: result.length,
    gcPercent: isNaN(gcPercent) ? 0 : gcPercent,
    atPercent: isNaN(atPercent) ? 0 : atPercent,
    ambigCount: result.totalAmbiguous || 0,
    invalidChars: result.invalidChars,
    isProtein: result.invalidChars && result.invalidChars.some(ch => PROTEIN_ONLY_AMINO_ACIDS.has(ch.toUpperCase())),
    errorMessage: result.errorMessage,
    warningMessage: result.warningMessage
  };
}
