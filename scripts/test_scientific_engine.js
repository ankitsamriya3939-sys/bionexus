// Scientific Engine & Object Model Verification Test Suite
// BioNexus Genome Universe — Automated Quality Assurance

import assert from 'assert';
import { 
  createSequenceObject, 
  createProteinObject, 
  createStructureObject, 
  createTaxonObject, 
  createTreeObject, 
  createEvidenceRecord, 
  linkScientificObjects,
  calculateGc,
  calculateProteinMwKDa,
  calculateProteinPi,
  ObjectTypes,
  EvidenceLevels
} from '../src/models/scientificModel.js';

import {
  getJc69TransitionProb,
  getK80TransitionProb,
  computeTreeLogLikelihood,
  calculateTreeLength,
  buildMinimumEvolutionTree,
  buildMaximumLikelihoodTree,
  calculateRobinsonFouldsDistance,
  exportNexusFormat
} from '../src/utils/likelihoodEngine.js';

import {
  calculateDistanceMatrix,
  buildNeighborJoiningTree,
  buildUpgmaTree,
  exportNewick
} from '../src/utils/phyloEngine.js';

import { runMSA } from '../src/utils/alignmentEngine.js';

console.log('====================================================');
console.log('🧪 BioNexus Genome Universe — Scientific Test Suite');
console.log('====================================================\n');

let testsPassed = 0;
let testsTotal = 0;

function runTest(name, fn) {
  testsTotal++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}\n`);
    throw err;
  }
}

// -----------------------------------------------------------------
// Test Suite 1: Scientific Object Model & Provenance
// -----------------------------------------------------------------
console.log('1. Testing Shared Scientific Object Model...');

runTest('Sequence model calculates exact GC percentage and types DNA/Protein', () => {
  const dnaSeq = createSequenceObject({
    name: 'Test DNA',
    sequence: 'GCGCATAT'
  });
  assert.strictEqual(dnaSeq.moleculeType, 'DNA');
  assert.strictEqual(dnaSeq.length, 8);
  assert.strictEqual(dnaSeq.gcPercent, 50.0);

  const protSeq = createSequenceObject({
    name: 'Test Protein',
    sequence: 'MEEPQSDPSV'
  });
  assert.strictEqual(protSeq.moleculeType, 'protein');
  assert.strictEqual(protSeq.gcPercent, null);
});

runTest('Protein model computes molecular weight (kDa) and isoelectric point (pI)', () => {
  const prot = createProteinObject({
    name: 'TP53 Fragment',
    sequence: 'MEEPQSDPSVEPPLSQETFS'
  });
  assert.strictEqual(prot.length, 20);
  assert(prot.molecularWeightKDa > 1.5 && prot.molecularWeightKDa < 3.0, `MW was ${prot.molecularWeightKDa}`);
  assert(prot.isoelectricPoint >= 3.0 && prot.isoelectricPoint <= 10.0, `pI was ${prot.isoelectricPoint}`);
});

runTest('Explicit bidirectional linking preserves provenance and prevents hallucination', () => {
  const seq = createSequenceObject({ id: 'seq_1', name: 'BRCA1 CDS' });
  const prot = createProteinObject({ id: 'prot_1', name: 'BRCA1 Protein' });

  const { source, target } = linkScientificObjects(seq, prot, 'encodes', {
    confidence: 1.0,
    evidenceLevel: EvidenceLevels.DATABASE_ANNOTATION
  });

  assert.strictEqual(source.relationships.length, 1);
  assert.strictEqual(source.relationships[0].targetId, 'prot_1');
  assert.strictEqual(source.relationships[0].predicate, 'encodes');

  assert.strictEqual(target.relationships.length, 1);
  assert.strictEqual(target.relationships[0].targetId, 'seq_1');
  assert.strictEqual(target.relationships[0].predicate, 'translated_from');
});

// -----------------------------------------------------------------
// Test Suite 2: Evolutionary Substitution Probability Properties
// -----------------------------------------------------------------
console.log('\n2. Testing Evolutionary Substitution Matrix Calculations...');

runTest('Jukes-Cantor JC69 transition probabilities satisfy stochastic properties', () => {
  // At t -> 0, P_ii -> 1, P_ij -> 0
  const pSameSmall = getJc69TransitionProb('A', 'A', 0.0001);
  const pDiffSmall = getJc69TransitionProb('A', 'C', 0.0001);
  assert(pSameSmall > 0.999, `pSame was ${pSameSmall}`);
  assert(pDiffSmall < 0.001, `pDiff was ${pDiffSmall}`);

  // Row sum must equal 1.0 (1 same + 3 different)
  const branchLen = 0.25;
  const pSame = getJc69TransitionProb('A', 'A', branchLen);
  const pDiff = getJc69TransitionProb('A', 'G', branchLen);
  const rowSum = pSame + 3 * pDiff;
  assert(Math.abs(rowSum - 1.0) < 1e-6, `Row sum ${rowSum} was not 1.0`);

  // At large t, all states converge to equilibrium 0.25
  const pEquilSame = getJc69TransitionProb('A', 'A', 10.0);
  const pEquilDiff = getJc69TransitionProb('A', 'T', 10.0);
  assert(Math.abs(pEquilSame - 0.25) < 0.01, `Equilibrium same was ${pEquilSame}`);
  assert(Math.abs(pEquilDiff - 0.25) < 0.01, `Equilibrium diff was ${pEquilDiff}`);
});

runTest('Kimura 2-Parameter K80 differentiates transitions from transversions', () => {
  const t = 0.2;
  const pTrans = getK80TransitionProb('A', 'G', t, 2.0); // Purine-Purine transition
  const pTransv = getK80TransitionProb('A', 'C', t, 2.0); // Purine-Pyrimidine transversion
  assert(pTrans > pTransv, `Transition prob ${pTrans} should be greater than transversion prob ${pTransv}`);
});

// -----------------------------------------------------------------
// Test Suite 3: Tree Reconstruction & Maximum Likelihood
// -----------------------------------------------------------------
console.log('\n3. Testing Maximum Likelihood & Minimum Evolution Inference...');

const testTaxa = [
  { id: 'Human', name: 'Human', seq: 'ATGGATTTACTGCTCTTCGCGTTGAAGAAGTACAAAATGTCATTAATGCTATGCAGAAA' },
  { id: 'Chimp', name: 'Chimp', seq: 'ATGGATTTATCTGCTCTTCGCGTTGAAGAAGTACAAAATGTCATTAATGCTATGCAGAAA' },
  { id: 'Mouse', name: 'Mouse', seq: 'ATGGATTTATCTGCTCTTCGCGTCGAGGAAGTACAGAATGTCATCAACGCTATGCAGAAA' },
  { id: 'Rat',   name: 'Rat',   seq: 'ATGGATTTATCTGCTCTTCGCGTCGAGGAAGTACAGAATGTCATCAACGCTATGCAAAGA' }
];

const msa = runMSA(testTaxa);
const dist = calculateDistanceMatrix(msa, 'jukes-cantor');

runTest('Calculates pairwise distance matrix with positive diagonal zero symmetry', () => {
  assert.strictEqual(dist.labels.length, 4);
  for (let i = 0; i < 4; i++) {
    assert.strictEqual(dist.matrix[i][i], 0);
    for (let j = 0; j < 4; j++) {
      assert.strictEqual(dist.matrix[i][j], dist.matrix[j][i]);
      assert(dist.matrix[i][j] >= 0);
    }
  }
});

runTest('Builds valid Neighbor-Joining (NJ) and UPGMA trees with valid Newick strings', () => {
  const njTree = buildNeighborJoiningTree(dist);
  assert(njTree !== null);
  const njNewick = exportNewick(njTree);
  assert(njNewick.includes('Human') && njNewick.includes('Chimp') && njNewick.includes('Mouse') && njNewick.includes('Rat'));

  const upgmaTree = buildUpgmaTree(dist);
  assert(upgmaTree !== null);
  const upgmaNewick = exportNewick(upgmaTree);
  assert(upgmaNewick.includes('Human'));
});

runTest('Builds Minimum Evolution (ME) tree and evaluates non-negative tree length', () => {
  const meTree = buildMinimumEvolutionTree(dist);
  assert(meTree !== null);
  const treeLen = calculateTreeLength(meTree);
  assert(treeLen > 0, `Tree length was ${treeLen}`);
});

runTest('Computes Felsenstein pruning Maximum Likelihood ln L on tree topology', () => {
  const njTree = buildNeighborJoiningTree(dist);
  const mlEval = computeTreeLogLikelihood(njTree, msa, 'jukes-cantor');
  assert(Number.isFinite(mlEval.logLikelihood), `Log likelihood was ${mlEval.logLikelihood}`);
  assert(mlEval.logLikelihood < 0, `Log likelihood should be negative, got ${mlEval.logLikelihood}`);
  assert(Number.isFinite(mlEval.aic), `AIC was ${mlEval.aic}`);
});

runTest('Builds Maximum Likelihood optimized tree', () => {
  const mlResult = buildMaximumLikelihoodTree(dist, msa, 'jukes-cantor');
  assert(mlResult.rootNode !== null);
  assert(Number.isFinite(mlResult.logLikelihood));
  assert(mlResult.treeLength > 0);
});

runTest('Calculates Robinson-Foulds distance (0 between identical topologies)', () => {
  const tree1 = buildNeighborJoiningTree(dist);
  const tree2 = buildNeighborJoiningTree(dist);
  const rfSelf = calculateRobinsonFouldsDistance(tree1, tree2);
  assert.strictEqual(rfSelf.rfDistance, 0);
  assert.strictEqual(rfSelf.normalizedDistance, 0);
});

runTest('Generates standard compliant NEXUS format output (.nex)', () => {
  const njTree = buildNeighborJoiningTree(dist);
  const nexus = exportNexusFormat(njTree, msa);
  assert(nexus.startsWith('#NEXUS'));
  assert(nexus.includes('BEGIN TAXA;'));
  assert(nexus.includes('BEGIN CHARACTERS;'));
  assert(nexus.includes('BEGIN TREES;'));
});

console.log('\n====================================================');
console.log(`🎉 ALL ${testsPassed}/${testsTotal} SCIENTIFIC TESTS PASSED SUCCESSFULLY!`);
console.log('====================================================\n');
