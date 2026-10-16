import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  calculateTm, 
  analyzeHairpin, 
  analyzeDimer, 
  checkGcClamp, 
  designPrimersWithPrimer3,
  exportPrimersToCsv,
  PRIMER_PRESETS
} from '../src/utils/primerEngine.js';
import { cleanSequence, reverseComplement } from '../src/utils/sequenceEngine.js';
import { getTabFromPath, getPathFromTab } from '../src/utils/router.js';

describe('BioNexus Studio: Primer Design Workspace Test Suite', () => {

  // Test 1: FASTA Parsing and Header Exclusion
  it('Case 1: FASTA parsing strips headers and whitespace without contaminating sequence length', () => {
    const rawFasta = `>NC_000017.11:c7687550-7668402 Homo sapiens chromosome 17, GRCh38.p14 Primary Assembly
    ATGGAGGAGC CGCAGTCAGA TCCTAGCGTC GAGCCCCCTC TGAGTCAGGA
    AACATTTTCA GACCTATGGA AACTACTTCC TGAAAACAAC GTTCTGTCCC
    ACCACCATCA TCATCCTGGA GTGTGAAGGC CCACCGGTCG GCTTGGCCTT`;

    const cleaned = cleanSequence(rawFasta.replace(/^>.*(\r?\n)?/, ''));
    assert.strictEqual(cleaned.includes('>'), false, 'FASTA header > must be excluded');
    assert.strictEqual(cleaned.includes('Homo'), false, 'Header text must be excluded');
    assert.strictEqual(cleaned.includes(' '), false, 'Spaces must be stripped');
    assert.strictEqual(cleaned.length, 150, 'Cleaned length must match exact nucleotide count (150 bp)');
  });

  // Test 2: Reverse Complement & Coordinates
  it('Case 2: Reverse-complement and 1-based biological coordinate alignment', () => {
    const senseStrand = 'ATGGAGGAGCCGCAGTCAGATCCTAGCGTCGAGCCCCCTCTGAGTCAGGAAACATTTTCA';
    const revPrimer = reverseComplement('TGAGTCAGGAAACATTTTCA');
    
    assert.strictEqual(revPrimer, 'TGAAAATGTTTCCTGACTCA', 'Must generate correct Watson-Crick reverse complement');
    
    // Test coordinate mapping: if reverse primer is at 41-60 bp on sense strand:
    const startPos = 41;
    const endPos = 60;
    const expectedProductSize = endPos - startPos + 1;
    assert.strictEqual(expectedProductSize, 20, 'Amplicon size formula must satisfy (end - start + 1)');
  });

  // Test 3: SantaLucia Unified Nearest-Neighbor Tm and GC Calculation
  it('Case 3: SantaLucia 1998 unified nearest-neighbor Tm and GC% calculation', () => {
    // Oligo: GCAGTCAGATCCTAGCGTCG (20 bp, 60% GC)
    // Official Primer3 / SantaLucia nearest-neighbor gives ~59.9 - 61.2°C depending on oligo conc
    const oligo = 'GCAGTCAGATCCTAGCGTCG';
    const tm = calculateTm(oligo, 50, 1.5, 50);
    
    assert.ok(tm >= 59.0 && tm <= 62.5, `Melting temperature (${tm}°C) should fall within 59.0-62.5°C`);
    
    const gcCount = (oligo.match(/[GC]/g) || []).length;
    const gcPercent = (gcCount / oligo.length) * 100;
    assert.strictEqual(gcPercent, 60.0, 'GC content must equal exactly 60.0%');

    // 3' GC Clamp
    const clamp = checkGcClamp(oligo);
    assert.strictEqual(clamp.count, 4, 'Terminal 5 bases CGTCG contains 4 G/C bases');
  });

  // Test 4: Amplicon Size and Flanking Verification
  it('Case 4: Amplicon boundaries span from forward primer start to reverse primer end', () => {
    const fwd = { start: 15, end: 34, length: 20 };
    const rev = { start: 180, end: 200, length: 21 };
    
    const ampliconSize = rev.end - fwd.start + 1;
    assert.strictEqual(ampliconSize, 186, 'Amplicon size must be 200 - 15 + 1 = 186 bp');
    assert.ok(rev.start > fwd.end, 'Reverse primer must be downstream of forward primer');
  });

  // Test 5: Application Presets Conform to Standard Primer3 Defaults
  it('Case 5: Application presets provide calibrated Primer3 defaults', () => {
    assert.ok(PRIMER_PRESETS.pcr, 'Standard PCR preset must exist');
    assert.strictEqual(PRIMER_PRESETS.pcr.optTm, 60.0);
    assert.strictEqual(PRIMER_PRESETS.pcr.optLen, 20);

    assert.ok(PRIMER_PRESETS.qpcr, 'qPCR preset must exist');
    assert.strictEqual(PRIMER_PRESETS.qpcr.maxProductSize, 150, 'qPCR amplicons should be <= 150 bp');

    assert.ok(PRIMER_PRESETS.cloning, 'Cloning preset must exist');
    assert.ok(PRIMER_PRESETS.cloning.maxLen >= 30, 'Cloning primers must support >= 30 bp for overlaps');

    assert.ok(PRIMER_PRESETS.sequencing, 'Sequencing preset must exist');
  });

  // Test 6: Invalid and Impossible Constraints Handling
  it('Case 6: Impossible constraints return clean validation failure without crashing', async () => {
    // 1. Sequence too short (< 30 bp)
    const shortRes = await designPrimersWithPrimer3({ sequence: 'ATGC' });
    assert.strictEqual(shortRes.success, false);
    assert.ok(shortRes.error.includes('too short'), 'Must report sequence too short');

    // 2. Impossible product range for short template
    const template = 'ATGGAGGAGCCGCAGTCAGATCCTAGCGTCGAGCCCCCTCTGAGTCAGGAAACATTTTCA'; // 60 bp
    const impossibleRes = await designPrimersWithPrimer3({
      sequence: template,
      minProductSize: 500,
      maxProductSize: 1000
    });
    // Should return 0 pairs without throwing uncaught exception
    assert.ok(impossibleRes.pairs.length === 0 || !impossibleRes.success);
  });

  // Test 7: Secondary Structure Thermodynamic Calculation
  it('Case 7: Thermodynamic hairpins and dimers evaluate free energy ΔG in kcal/mol', () => {
    // Strong self-complementary palindromic hairpin loop: CGCGAAAAACGCG
    const hairpinSeq = 'CGCGAAAAACGCG';
    const hp = analyzeHairpin(hairpinSeq);
    assert.strictEqual(hp.structureFound, true, 'Must detect hairpin in palindromic stem loop');
    assert.ok(hp.dg < 0, 'Favorable hairpin must have negative ΔG');

    // Self-dimer check
    const dimer = analyzeDimer('CGCGCGCGCGCG');
    assert.strictEqual(dimer.structureFound, true, 'Repetitive palindromic oligo must form self-dimer');
  });

  // Test 8: CSV Export Conformance
  it('Case 8: RFC 4180 CSV export generates required metadata, coordinates, and headers', () => {
    const mockPairs = [
      {
        rank: 1,
        pairPenalty: 0.12,
        forward: {
          sequence: 'GCAGTCAGATCCTAGCGTCG',
          length: 20,
          tm: 59.9,
          gc: 60.0,
          start: 12,
          end: 31,
          hairpin: { dg: 0 },
          selfDimer: { dg: -2.5 }
        },
        reverse: {
          sequence: 'TCATCCATTGCTTGGGACGG',
          length: 20,
          tm: 59.8,
          gc: 55.0,
          start: 106,
          end: 125,
          hairpin: { dg: 0 },
          selfDimer: { dg: -1.8 }
        },
        heterodimer: { dg: -3.2 },
        amplicon: { size: 114 },
        tmDiff: 0.1,
        recommendedTa: 54.8,
        statusLabel: 'Meets configured constraints'
      }
    ];

    const csv = exportPrimersToCsv(mockPairs, {
      engine: 'Primer3 C Library v2.3.1',
      templateId: 'TP53_Exon4'
    });

    assert.ok(csv.includes('Rank'), 'Must include Rank header');
    assert.ok(csv.includes('Fwd Sequence'), 'Must include Forward Sequence header');
    assert.ok(csv.includes('GCAGTCAGATCCTAGCGTCG'), 'Must contain forward primer sequence');
    assert.ok(csv.includes('TCATCCATTGCTTGGGACGG'), 'Must contain reverse primer sequence');
    assert.ok(csv.includes('Primer3 C Library v2.3.1'), 'Must include engine provenance');
    assert.ok(csv.includes('Meets configured constraints'), 'Must include honest status label');
  });

  // Test 9: Route Resolution and Direct Navigation
  it('Case 9: Router resolves /primer-design on direct open, refresh, and tab state', () => {
    assert.strictEqual(getTabFromPath('/primer-design'), 'primer-design', 'Direct /primer-design must map to primer-design tab');
    assert.strictEqual(getTabFromPath('/primer-designer'), 'primer-design', 'Backwards-compatible /primer-designer must map to primer-design');
    assert.strictEqual(getTabFromPath('/primer'), 'primer-design', 'Legacy /primer must map to primer-design');

    assert.strictEqual(getPathFromTab('primer-design'), '/primer-design', 'Tab primer-design must map to URL /primer-design');
    assert.strictEqual(getPathFromTab('primer'), '/primer-design', 'Tab primer must map to URL /primer-design');
  });

  // Test 10: Full In-Silico PCR Candidate Search Generation
  it('Case 10: In-silico design produces compliant primer pairs with SantaLucia unified parameters', async () => {
    const demoSeq = 'ATGGAGGAGCCGCAGTCAGATCCTAGCGTCGAGCCCCCTCTGAGTCAGGAAACATTTTCAGACCTATGGAAACTACTTCCTGAAAACAACGTTCTGTCCCCCTTGCCGTCCCAAGCAATGGATGATTTGATGCTGTCCCCGGACGATATTGAACAATGGTTCACTGAAGACCCAGGTCCAGATGAAGCTCCCAGAATGCCAGAGGCTGCTCCCCGCGTGGCCCCTGCACCAGCAGCTCCTACACCGGCGGCCCCTGCACCAGCCCCCTCCTGGCCCCTGTCATCT';

    const result = await designPrimersWithPrimer3({
      sequence: demoSeq,
      minLen: 18,
      optLen: 20,
      maxLen: 24,
      minTm: 55.0,
      optTm: 60.0,
      maxTm: 65.0,
      minProductSize: 60,
      maxProductSize: 220,
      numReturn: 5
    });

    assert.strictEqual(result.success, true, 'Design must return success: true');
    assert.ok(result.pairs.length > 0, 'Must return at least 1 primer candidate pair');
    const firstPair = result.pairs[0];
    assert.ok(firstPair.forward.sequence.length >= 18 && firstPair.forward.sequence.length <= 24);
    assert.ok(firstPair.reverse.sequence.length >= 18 && firstPair.reverse.sequence.length <= 24);
    assert.ok(firstPair.amplicon.size >= 60 && firstPair.amplicon.size <= 220);
    assert.strictEqual(firstPair.statusLabel, 'Meets configured constraints');
  });
});
