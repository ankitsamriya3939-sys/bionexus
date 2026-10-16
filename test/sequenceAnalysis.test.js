// Automated Scientific Test Suite for BioNexus Studio Sequence Analysis
// Uses Node.js native test runner and assert module

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseFasta,
  validateAccessionFormat,
  validateNucleotideInput,
  validateProteinInput,
  validateDnaSequence
} from '../src/utils/sequenceValidator.js';

import {
  cleanSequence,
  calculateNucleotideStatistics,
  calculateReverseComplement,
  findORFs,
  translateNucleotideSequence,
  calculateProteinMolecularWeight,
  calculateProteinIsoelectricPoint,
  calculateProteinStatistics
} from '../src/utils/sequenceEngine.js';

import { resolveAccessionRecord } from '../src/utils/ncbiService.js';

describe('BioNexus Studio Sequence Analysis Scientific Verification Suite', () => {

  // Case 1: A valid nucleotide accession resolves to the retrieved biological sequence
  test('Case 1: Accession format validator and resolver accurately fetch and parse RefSeq nucleotide records', async () => {
    const acc = 'NC_000913.3';
    const validation = validateAccessionFormat(acc);
    assert.equal(validation.isValid, true);
    assert.equal(validation.accession, 'NC_000913.3');
    assert.equal(validation.candidateDb, 'nucleotide');
    assert.equal(validation.moleculeType, 'DNA');

    const mrnaAcc = 'NM_000546.6';
    const mrnaVal = validateAccessionFormat(mrnaAcc);
    assert.equal(mrnaVal.isValid, true);
    assert.equal(mrnaVal.candidateDb, 'nucleotide');
    assert.equal(mrnaVal.moleculeType, 'RNA');

    // Test live NCBI Entrez resolution for nucleotide mRNA NM_000546.6
    const rec = await resolveAccessionRecord('NM_000546.6');
    assert.ok(rec.accession.includes('NM_000546'));
    assert.equal(rec.database, 'nucleotide');
    assert.ok(rec.length > 2000);
    assert.equal(typeof rec.sequence, 'string');
    assert.ok(rec.sequence.length > 2000);
    assert.equal(rec.sequence.includes('>'), false); // FASTA header excluded
  });

  // Case 2: An accession string is never counted as DNA
  test('Case 2: Accession strings are rejected as raw sequences and never evaluated as nucleotides', () => {
    const accessionStr = 'NC_000913.3';
    
    // When passed to nucleotide validator, it must fail because '_' and '.' and numbers are invalid
    const nucVal = validateNucleotideInput(accessionStr);
    assert.equal(nucVal.isValid, false);
    assert.ok(nucVal.invalidChars.includes('_') || nucVal.invalidChars.includes('.'));
    assert.notEqual(nucVal.length, accessionStr.length);

    // Protein accession string NP_000537.3 must also fail nucleotide validation
    const protAccStr = 'NP_000537.3';
    const protAsDna = validateNucleotideInput(protAccStr);
    assert.equal(protAsDna.isValid, false);

    // Direct cleanSequence must exclude FASTA headers and not treat accession metadata as sequence
    const fastaWithAccession = '>NC_000913.3 Escherichia coli str. K-12\nATGCATGC';
    const cleaned = cleanSequence(fastaWithAccession);
    assert.equal(cleaned, 'ATGCATGC');
    assert.equal(cleaned.length, 8);
    // Header characters 'NC_000913.3' must NOT appear in the biological sequence
    assert.equal(cleaned.includes('NC'), false);
    assert.equal(cleaned.includes('000913'), false);
  });

  // Case 3: A valid protein accession resolves to a protein record and does not enter nucleotide pipeline
  test('Case 3: Protein accession validator classifies NP_000537.3 as protein and retrieves amino acid sequence', async () => {
    const acc = 'NP_000537.3';
    const val = validateAccessionFormat(acc);
    assert.equal(val.isValid, true);
    assert.equal(val.candidateDb, 'protein');
    assert.equal(val.moleculeType, 'protein');

    // UniProt accession P04637
    const uniprotVal = validateAccessionFormat('P04637');
    assert.equal(uniprotVal.isValid, true);
    assert.equal(uniprotVal.candidateDb, 'protein');
    assert.equal(uniprotVal.moleculeType, 'protein');

    // Test live NCBI Entrez resolution for protein NP_000537.3
    const rec = await resolveAccessionRecord('NP_000537.3');
    assert.ok(rec.accession.includes('NP_000537'));
    assert.equal(rec.database, 'protein');
    assert.equal(rec.moleculeType, 'protein');
    assert.equal(rec.length, 393);
    assert.ok(rec.sequence.startsWith('MEEPQ'));
  });

  // Case 4: DNA input produces nucleotide statistics only
  test('Case 4: DNA input produces exact nucleotide metrics without protein MW, pI or AA composition', () => {
    const dnaSeq = 'ATGCGATCGATC'; // 12 bp: A=3, T=3, G=3, C=3
    const stats = calculateNucleotideStatistics(dnaSeq, 'DNA');

    assert.equal(stats.length, 12);
    assert.equal(stats.moleculeType, 'DNA');
    assert.equal(stats.counts.A, 3);
    assert.equal(stats.counts.T, 3);
    assert.equal(stats.counts.G, 3);
    assert.equal(stats.counts.C, 3);
    assert.equal(stats.canonicalCount, 12);
    assert.equal(stats.gcPercent, 50.00);
    assert.equal(stats.atPercent, 50.00);
    assert.equal(stats.totalAmbiguous, 0);

    // Verify protein properties are not on nucleotide stats
    assert.equal(stats.mwDa, undefined);
    assert.equal(stats.pi, undefined);
    assert.equal(stats.composition, undefined);
  });

  // Case 5: RNA input correctly handles U rather than silently assuming T
  test('Case 5: RNA input handles Uracil (U) correctly and distinguishes AU from AT content', () => {
    const rnaSeq = 'AUGCGAUCGAUC'; // 12 nt: A=3, U=3, G=3, C=3
    const stats = calculateNucleotideStatistics(rnaSeq, 'RNA');

    assert.equal(stats.length, 12);
    assert.equal(stats.moleculeType, 'RNA');
    assert.equal(stats.counts.A, 3);
    assert.equal(stats.counts.U, 3);
    assert.equal(stats.counts.T, undefined);
    assert.equal(stats.counts.G, 3);
    assert.equal(stats.counts.C, 3);
    assert.equal(stats.gcPercent, 50.00);
    assert.equal(stats.auPercent, 50.00);
    assert.equal(stats.atPercent, null);

    // Reverse complement of RNA
    const revCompRna = calculateReverseComplement(rnaSeq, 'RNA');
    // Original 5' -> 3': AUGCGAUCGAUC
    // Complement:       UACGCUAGCUAG
    // Reverse:          GAUCGAUCGCAU
    assert.equal(revCompRna, 'GAUCGAUCGCAU');
    assert.equal(revCompRna.includes('T'), false);
    assert.equal(revCompRna.includes('U'), true);
  });

  // Case 6: A FASTA header is excluded from sequence calculations
  test('Case 6: FASTA header is completely stripped and never contaminates sequence counts', () => {
    const fasta = `>gi|123456|ref|NM_000546.6| Homo sapiens TP53 transcript
ATGCATGC`;
    const parsed = parseFasta(fasta);
    assert.equal(parsed.isFasta, true);
    assert.ok(parsed.fastaHeader.includes('NM_000546.6'));

    const val = validateNucleotideInput(fasta);
    assert.equal(val.isValid, true);
    assert.equal(val.length, 8);
    assert.equal(val.cleanSequence, 'ATGCATGC');
    assert.equal(val.canonicalCounts.A, 2);
    assert.equal(val.canonicalCounts.T, 2);
    assert.equal(val.canonicalCounts.G, 2);
    assert.equal(val.canonicalCounts.C, 2);

    const stats = calculateNucleotideStatistics(val.cleanSequence, 'DNA');
    assert.equal(stats.length, 8);
    assert.equal(stats.gcPercent, 50.00);
  });

  // Case 7: Lowercase and multiline FASTA produce expected results
  test('Case 7: Multiline lowercase FASTA is normalized cleanly to uppercase biological sequence', () => {
    const multilineFasta = `>test multiline sequence
atgc
aatt
ggcc`;
    const val = validateNucleotideInput(multilineFasta);
    assert.equal(val.isValid, true);
    assert.equal(val.length, 12);
    assert.equal(val.cleanSequence, 'ATGCAATTGGCC');

    const stats = calculateNucleotideStatistics(val.cleanSequence, 'DNA');
    assert.equal(stats.counts.A, 3);
    assert.equal(stats.counts.T, 3);
    assert.equal(stats.counts.G, 3);
    assert.equal(stats.counts.C, 3);
    assert.equal(stats.gcPercent, 50.00);
  });

  // Case 8: Ambiguous bases follow documented calculation rules
  test('Case 8: Ambiguous IUPAC bases (N, R, Y, S, W, K, M) are tallied and handled according to documented formula', () => {
    // 4 canonical bases (A, T, G, C) + 4 ambiguous bases (N, R, Y, S) = 8 nt
    const ambiguousDna = 'ATGCNYSW';
    const val = validateNucleotideInput(ambiguousDna);
    assert.equal(val.isValid, true);
    assert.equal(val.length, 8);
    assert.equal(val.totalAmbiguous, 4);

    const stats = calculateNucleotideStatistics(val.cleanSequence, 'DNA');
    assert.equal(stats.length, 8);
    assert.equal(stats.canonicalCount, 4); // A=1, T=1, G=1, C=1
    assert.equal(stats.totalAmbiguous, 4);
    assert.equal(stats.ambiguousPercent, 50.00);

    // Canonical GC: (1 + 1) / 4 * 100 = 50.00%
    assert.equal(stats.gcPercent, 50.00);
    // Total sequence basis GC: (1 + 1) / 8 * 100 = 25.00%
    assert.equal(stats.gcTotalBasis, 25.00);

    // Verify IUPAC reverse complement:
    // Original: A T G C N Y S W
    // Comp:     T A C G N R S W
    // RevComp:  W S R N G C A T
    const rev = calculateReverseComplement(val.cleanSequence, 'DNA');
    assert.equal(rev, 'WSRNGCAT');
  });

  // Case 9: Invalid characters generate actionable errors with specific offending characters and positions
  test('Case 9: Invalid characters produce actionable errors with character and 1-based position', () => {
    // Position 1: A, 2: T, 3: 9 (invalid number), 4: G, 5: X (invalid for DNA), 6: C
    const invalidDna = 'AT9GXC';
    const val = validateNucleotideInput(invalidDna);
    assert.equal(val.isValid, false);
    assert.equal(val.invalidChars.length, 2);
    assert.ok(val.invalidChars.includes('9'));
    assert.ok(val.invalidChars.includes('X'));

    const pos9 = val.offendingPositions.find(p => p.char === '9');
    assert.ok(pos9);
    assert.equal(pos9.position, 3);

    const posX = val.offendingPositions.find(p => p.char === 'X');
    assert.ok(posX);
    assert.equal(posX.position, 5);

    assert.ok(val.errorMessage.includes("'9'"));
    assert.ok(val.errorMessage.includes("'X'"));
  });

  // Case 10: Failed or empty NCBI responses never produce fake successful results
  test('Case 10: Empty or invalid accession inputs return explicit validation failures without fallback', async () => {
    const emptyVal = validateAccessionFormat('');
    assert.equal(emptyVal.isValid, false);
    assert.equal(emptyVal.isEmpty, true);

    const malformedVal = validateAccessionFormat('NOT_AN_ACCESSION!@#$');
    assert.equal(malformedVal.isValid, false);
    assert.ok(malformedVal.errorMessage.length > 0);

    // Verify resolveAccessionRecord rejects empty input
    await assert.rejects(
      async () => await resolveAccessionRecord(''),
      /Please enter an accession ID/
    );

    // Verify resolveAccessionRecord rejects invalid characters
    await assert.rejects(
      async () => await resolveAccessionRecord('INVALID@@$$%%'),
      /Invalid accession format/
    );
  });

  // Case 11: Translation is separate from nucleotide composition and uses explicitly selected reading frame and genetic code
  test('Case 11: Translation is performed explicitly with designated reading frame and genetic code', () => {
    // 5'-ATGAAGTAA-3':
    // Frame 1: ATG (M), AAG (K), TAA (*) -> MK*
    // Frame 2: TGA (*), AGT (S) -> *S
    // Frame 3: GAA (E), GT -> E
    const codingDna = 'ATGAAGTAA';

    const frame1 = translateNucleotideSequence(codingDna, { frame: 1, strand: '+', geneticCode: '1' });
    assert.equal(frame1.peptide, 'MK*');
    assert.equal(frame1.length, 3);
    assert.equal(frame1.stopCodonCount, 1);

    const frame2 = translateNucleotideSequence(codingDna, { frame: 2, strand: '+', geneticCode: '1' });
    assert.equal(frame2.peptide, '*S');
    assert.equal(frame2.length, 2);

    const frame3 = translateNucleotideSequence(codingDna, { frame: 3, strand: '+', geneticCode: '1' });
    assert.equal(frame3.peptide, 'EV'); // GAA (E) + GTA (V)

    // Vertebrate mitochondrial code (Table 2):
    // In code 2, TGA is Tryptophan (W) instead of Stop codon (*)
    const mitoFrame2 = translateNucleotideSequence(codingDna, { frame: 2, strand: '+', geneticCode: '2' });
    assert.equal(mitoFrame2.peptide, 'WS'); // TGA -> W, AGT -> S
  });

  // Case 12: Empty input, very short sequences, and large inputs are handled safely
  test('Case 12: Edge cases: empty sequence, short sequences, and protein calculations are safe and accurate', () => {
    // Empty input
    const emptyDna = validateNucleotideInput('');
    assert.equal(emptyDna.isValid, false);
    assert.equal(emptyDna.isEmpty, true);

    const emptyStats = calculateNucleotideStatistics('', 'DNA');
    assert.equal(emptyStats.length, 0);
    assert.equal(emptyStats.gcPercent, 0);

    // Very short sequence (1 bp)
    const singleBp = validateNucleotideInput('A', { minLen: 1 });
    assert.equal(singleBp.isValid, true);
    assert.equal(singleBp.length, 1);
    const singleStats = calculateNucleotideStatistics('A', 'DNA');
    assert.equal(singleStats.length, 1);
    assert.equal(singleStats.gcPercent, 0);
    assert.equal(singleStats.atPercent, 100);

    // Protein statistics calculation with known peptide
    // Polyalanine: AAAAA (5 Alanines)
    // Alanine residue weight = 71.08 Da. 5 * 71.08 = 355.4 Da + 18.015 (terminal H2O) = 373.415 Da (0.373 kDa)
    const polyAla = 'AAAAA';
    const protVal = validateProteinInput(polyAla);
    assert.equal(protVal.isValid, true);
    assert.equal(protVal.length, 5);

    const protStats = calculateProteinStatistics(polyAla);
    assert.equal(protStats.length, 5);
    assert.equal(protStats.mwDa, 373.42);
    assert.equal(protStats.mwKDa, 0.373);
    assert.equal(protStats.composition.find(c => c.aa === 'A').count, 5);
    assert.equal(protStats.composition.find(c => c.aa === 'A').percent, 100);
    // Alanine is neutral hydrophobic, pI is dominated by termini (N-term ~9.69, C-term ~2.34 -> average ~6.0)
    assert.ok(protStats.pi > 5.5 && protStats.pi < 6.5);

    // Make sure Protein statistics contain NO GC content or nucleotide counts
    assert.equal(protStats.gcPercent, undefined);
    assert.equal(protStats.atPercent, undefined);
  });

});
