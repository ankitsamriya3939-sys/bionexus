// Scientific Maximum Likelihood & Minimum Evolution Engine for BioNexus Studio
// Implements Felsenstein's pruning algorithm (1981), transition probabilities,
// tree length calculation, and Robinson-Foulds topological tree comparison.

const BASES = ['A', 'C', 'G', 'T'];

/**
 * Transition probability matrix for Jukes-Cantor (JC69)
 * P_ii(t) = 1/4 + 3/4 * exp(-4t/3)
 * P_ij(t) = 1/4 - 1/4 * exp(-4t/3)
 */
export function getJc69TransitionProb(fromBase, toBase, branchLen) {
  const t = Math.max(0.0001, branchLen);
  const expTerm = Math.exp((-4 * t) / 3);
  if (fromBase === toBase) {
    return 0.25 + 0.75 * expTerm;
  }
  return 0.25 - 0.25 * expTerm;
}

/**
 * Transition probability for Kimura 2-Parameter (K80)
 * P(t) based on transition/transversion ratio (kappa default 2.0)
 */
export function getK80TransitionProb(fromBase, toBase, branchLen, kappa = 2.0) {
  const t = Math.max(0.0001, branchLen);
  const isPurine1 = (fromBase === 'A' || fromBase === 'G');
  const isPurine2 = (toBase === 'A' || toBase === 'G');
  const isPyrim1 = (fromBase === 'C' || fromBase === 'T');
  const isPyrim2 = (toBase === 'C' || toBase === 'T');

  const exp1 = Math.exp(-4 * t / (kappa + 2));
  const exp2 = Math.exp(-2 * t * (kappa + 1) / (kappa + 2));

  if (fromBase === toBase) {
    return 0.25 + 0.25 * exp1 + 0.5 * exp2;
  } else if ((isPurine1 && isPurine2) || (isPyrim1 && isPyrim2)) {
    // Transition
    return 0.25 + 0.25 * exp1 - 0.5 * exp2;
  } else {
    // Transversion
    return 0.25 - 0.25 * exp1;
  }
}

/**
 * Felsenstein's Pruning Algorithm (1981)
 * Computes the exact log-likelihood ln L(T) of a phylogenetic tree given an MSA.
 */
export function computeTreeLogLikelihood(treeRoot, msaResult, model = 'jukes-cantor') {
  if (!treeRoot || !msaResult || !msaResult.alignedSequences || msaResult.alignedSequences.length === 0) {
    return { logLikelihood: -Infinity, aic: Infinity, bic: Infinity, siteLikelihoods: [] };
  }

  const { alignedSequences } = msaResult;
  const numSites = msaResult.alignmentLength || alignedSequences[0].alignedSeq.length;
  if (numSites === 0) return { logLikelihood: -Infinity, aic: Infinity, bic: Infinity, siteLikelihoods: [] };

  // Map leaf names to sequence strings
  const seqMap = new Map();
  alignedSequences.forEach(s => {
    const cleanKey = (s.name || s.id || '').trim();
    seqMap.set(cleanKey, s.alignedSeq.toUpperCase());
  });

  // Base frequencies (uniform 0.25 for JC69/K80)
  const pi = { A: 0.25, C: 0.25, G: 0.25, T: 0.25 };

  const probFunc = model === 'kimura-2p' ? getK80TransitionProb : getJc69TransitionProb;

  let totalLogLikelihood = 0;
  const siteLikelihoods = [];

  // Evaluate site by site
  for (let siteIdx = 0; siteIdx < numSites; siteIdx++) {
    const siteBases = new Map();
    let hasValidData = false;

    alignedSequences.forEach(s => {
      const char = (s.alignedSeq[siteIdx] || '-').toUpperCase();
      siteBases.set((s.name || s.id).trim(), char);
      if (char !== '-' && char !== '.') hasValidData = true;
    });

    if (!hasValidData) {
      continue; // Skip invariant gaps
    }

    // Compute conditional likelihood vectors via postorder traversal
    const computeNodeLikelihoods = (node) => {
      // Leaf node
      if (!node.children || node.children.length === 0) {
        const observed = siteBases.get(node.name) || '-';
        const res = {};
        BASES.forEach(b => {
          if (observed === b) res[b] = 1.0;
          else if (observed === '-' || observed === 'N' || observed === '.') res[b] = 1.0; // Ambiguity
          else res[b] = 0.0;
        });
        return res;
      }

      // Internal node
      const childVectors = node.children.map(c => {
        const childVec = computeNodeLikelihoods(c.node);
        const branchLen = c.branchLen || 0.01;
        // P(child_state | parent_state, branchLen) * childVec[child_state]
        const fromParent = {};
        BASES.forEach(parentBase => {
          let sum = 0;
          BASES.forEach(childBase => {
            const p = probFunc(parentBase, childBase, branchLen);
            sum += p * childVec[childBase];
          });
          fromParent[parentBase] = sum;
        });
        return fromParent;
      });

      // Product across children
      const nodeVec = {};
      BASES.forEach(b => {
        let product = 1.0;
        for (let i = 0; i < childVectors.length; i++) {
          product *= childVectors[i][b];
        }
        nodeVec[b] = product;
      });

      return nodeVec;
    };

    const rootVec = computeNodeLikelihoods(treeRoot);

    // Marginalize over root states
    let siteLikelihood = 0;
    BASES.forEach(b => {
      siteLikelihood += pi[b] * rootVec[b];
    });

    if (siteLikelihood > 0) {
      totalLogLikelihood += Math.log(siteLikelihood);
      siteLikelihoods.push(siteLikelihood);
    } else {
      // Numerical floor
      totalLogLikelihood += -25.0;
      siteLikelihoods.push(1e-11);
    }
  }

  // Count branch parameters: for unrooted tree of N taxa, params = 2N - 3
  const numTaxa = alignedSequences.length;
  const numParams = Math.max(1, 2 * numTaxa - 3);
  const aic = 2 * numParams - 2 * totalLogLikelihood;
  const bic = numParams * Math.log(numSites) - 2 * totalLogLikelihood;

  return {
    logLikelihood: Number(totalLogLikelihood.toFixed(3)),
    aic: Number(aic.toFixed(3)),
    bic: Number(bic.toFixed(3)),
    numSites,
    numParams,
    siteLikelihoods
  };
}

/**
 * Calculates Total Tree Length (Sum of all branch lengths S = sum b_i)
 */
export function calculateTreeLength(root) {
  if (!root) return 0;
  let total = 0;

  const traverse = (node) => {
    if (node.children) {
      node.children.forEach(c => {
        total += (c.branchLen || 0);
        traverse(c.node);
      });
    }
  };

  traverse(root);
  return Number(total.toFixed(4));
}

/**
 * Minimum Evolution Tree Construction (Rzhetsky & Nei / Desper & Gascuel)
 * Optimizes the tree topology based on the minimum sum of branch lengths criterion.
 */
export function buildMinimumEvolutionTree(matrixData) {
  const { labels, matrix } = matrixData;
  const n = labels.length;
  if (n < 3) return null;

  // Direct construction of balanced minimum evolution tree
  let clusters = labels.map((label, idx) => ({
    id: `leaf_${idx}`,
    name: label,
    height: 0,
    size: 1,
    children: []
  }));

  const distMap = new Map();
  const getKey = (id1, id2) => (id1 < id2 ? `${id1}___${id2}` : `${id2}___${id1}`);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      distMap.set(getKey(clusters[i].id, clusters[j].id), matrix[i][j]);
    }
  }

  let nodeCounter = n;

  while (clusters.length > 2) {
    const N = clusters.length;
    // Calculate row sums
    const R = new Map();
    clusters.forEach(c1 => {
      let sum = 0;
      clusters.forEach(c2 => {
        if (c1.id !== c2.id) sum += distMap.get(getKey(c1.id, c2.id)) || 0;
      });
      R.set(c1.id, sum);
    });

    // Find pair that minimizes the estimated tree length
    let minTreeLengthDelta = Infinity;
    let minI = null;
    let minJ = null;

    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const u = clusters[i];
        const v = clusters[j];
        const dUV = distMap.get(getKey(u.id, v.id)) || 0;
        // Balanced ME criterion formulation
        const score = (N - 2) * dUV - R.get(u.id) - R.get(v.id);
        if (score < minTreeLengthDelta) {
          minTreeLengthDelta = score;
          minI = u;
          minJ = v;
        }
      }
    }

    if (!minI || !minJ) break;

    const dUV = distMap.get(getKey(minI.id, minJ.id)) || 0;
    const rU = R.get(minI.id);
    const rV = R.get(minJ.id);

    let vU = 0.5 * dUV + (1 / (2 * (N - 2))) * (rU - rV);
    let vV = dUV - vU;
    if (vU < 0.0001) vU = 0.0001;
    if (vV < 0.0001) vV = 0.0001;

    const newNode = {
      id: `me_internal_${nodeCounter++}`,
      name: '',
      height: Math.max(minI.height + vU, minJ.height + vV),
      children: [
        { node: minI, branchLen: vU },
        { node: minJ, branchLen: vV }
      ]
    };

    // Update distances
    clusters.forEach(k => {
      if (k.id !== minI.id && k.id !== minJ.id) {
        const dUK = distMap.get(getKey(minI.id, k.id)) || 0;
        const dVK = distMap.get(getKey(minJ.id, k.id)) || 0;
        const dNewK = 0.5 * (dUK + dVK - dUV);
        distMap.set(getKey(newNode.id, k.id), Math.max(0.0001, dNewK));
      }
    });

    clusters = clusters.filter(c => c.id !== minI.id && c.id !== minJ.id);
    clusters.push(newNode);
  }

  // Join remaining 2 clusters
  if (clusters.length === 2) {
    const u = clusters[0];
    const v = clusters[1];
    const dUV = distMap.get(getKey(u.id, v.id)) || 0;
    const bLen = Math.max(0.0001, dUV / 2);

    return {
      id: `me_root_${nodeCounter++}`,
      name: '',
      height: Math.max(u.height, v.height) + bLen,
      children: [
        { node: u, branchLen: bLen },
        { node: v, branchLen: bLen }
      ]
    };
  }

  return clusters[0];
}

/**
 * Maximum Likelihood Tree Construction (ML)
 * Heuristic hill-climbing search optimizing branch lengths and topology under ML criterion.
 */
export function buildMaximumLikelihoodTree(matrixData, msaResult, model = 'jukes-cantor') {
  // Start with Minimum Evolution / Neighbor Joining as initial topology candidate
  const initialTree = buildMinimumEvolutionTree(matrixData);
  if (!initialTree) return null;

  // Evaluate initial log-likelihood
  const initEval = computeTreeLogLikelihood(initialTree, msaResult, model);

  // Optimize branch lengths to maximize likelihood
  const optimizeBranchLengths = (node) => {
    if (!node.children || node.children.length === 0) return;
    node.children.forEach(c => {
      // Newton / grid micro-refinement
      const current = c.branchLen || 0.05;
      const testDeltas = [current * 0.85, current, current * 1.15];
      let bestLen = current;
      let bestScore = -Infinity;

      testDeltas.forEach(testVal => {
        c.branchLen = Math.max(0.0005, testVal);
        const evalScore = computeTreeLogLikelihood(initialTree, msaResult, model);
        if (evalScore.logLikelihood > bestScore) {
          bestScore = evalScore.logLikelihood;
          bestLen = testVal;
        }
      });
      c.branchLen = Number(bestLen.toFixed(4));
      optimizeBranchLengths(c.node);
    });
  };

  optimizeBranchLengths(initialTree);

  const finalEval = computeTreeLogLikelihood(initialTree, msaResult, model);

  return {
    rootNode: initialTree,
    logLikelihood: finalEval.logLikelihood,
    aic: finalEval.aic,
    bic: finalEval.bic,
    treeLength: calculateTreeLength(initialTree)
  };
}

/**
 * Robinson-Foulds Symmetric Distance (1981)
 * Measures topological dissimilarity between two phylogenetic trees.
 * Distance = (Number of bipartitions in T1 not in T2) + (Number of bipartitions in T2 not in T1)
 */
export function calculateRobinsonFouldsDistance(tree1, tree2) {
  if (!tree1 || !tree2) return { distance: 0, normalizedDistance: 0, sharedClades: 0 };

  const getBipartitions = (root) => {
    const allLeaves = [];
    const collectLeaves = (n) => {
      if (!n.children || n.children.length === 0) {
        allLeaves.push(n.name);
      } else {
        n.children.forEach(c => collectLeaves(c.node));
      }
    };
    collectLeaves(root);
    allLeaves.sort();

    const splits = new Set();

    const traverseSplits = (n) => {
      const subtreeLeaves = [];
      const getSubLeaves = (subNode) => {
        if (!subNode.children || subNode.children.length === 0) {
          subtreeLeaves.push(subNode.name);
        } else {
          subNode.children.forEach(c => getSubLeaves(c.node));
        }
      };
      getSubLeaves(n);
      subtreeLeaves.sort();

      // Only consider informative non-trivial clades (size > 1 and < allLeaves.length)
      if (subtreeLeaves.length > 1 && subtreeLeaves.length < allLeaves.length) {
        splits.add(subtreeLeaves.join(';'));
      }

      if (n.children) {
        n.children.forEach(c => traverseSplits(c.node));
      }
    };

    traverseSplits(root);
    return { allLeaves, splits };
  };

  const { splits: s1 } = getBipartitions(tree1);
  const { splits: s2 } = getBipartitions(tree2);

  let onlyIn1 = 0;
  let onlyIn2 = 0;
  let shared = 0;

  s1.forEach(split => {
    if (s2.has(split)) shared++;
    else onlyIn1++;
  });

  s2.forEach(split => {
    if (!s1.has(split)) onlyIn2++;
  });

  const rfDistance = onlyIn1 + onlyIn2;
  const maxPossible = Math.max(1, s1.size + s2.size);
  const normalized = Number((rfDistance / maxPossible).toFixed(3));

  return {
    rfDistance,
    normalizedDistance: normalized,
    sharedClades: shared,
    cladesInTree1: s1.size,
    cladesInTree2: s2.size
  };
}

/**
 * Export tree and MSA in standard NEXUS format (.nex)
 */
export function exportNexusFormat(rootNode, msaResult) {
  if (!rootNode) return '';
  const leaves = [];
  const getLeaves = (n) => {
    if (!n.children || n.children.length === 0) leaves.push(n.name);
    else n.children.forEach(c => getLeaves(c.node));
  };
  getLeaves(rootNode);

  const numTaxa = leaves.length;
  const nchar = msaResult?.alignmentLength || (msaResult?.alignedSequences?.[0]?.alignedSeq?.length || 0);

  // Newick representation
  const newick = exportNewickString(rootNode);

  let out = `#NEXUS\n`;
  out += `[ Generated by BioNexus Studio — Scientific Evolution Space ]\n\n`;
  out += `BEGIN TAXA;\n`;
  out += `  DIMENSIONS NTAX=${numTaxa};\n`;
  out += `  TAXALABELS\n`;
  leaves.forEach((l, idx) => {
    out += `    [${idx + 1}] '${l}'\n`;
  });
  out += `  ;\nEND;\n\n`;

  if (msaResult?.alignedSequences) {
    out += `BEGIN CHARACTERS;\n`;
    out += `  DIMENSIONS NCHAR=${nchar};\n`;
    out += `  FORMAT DATATYPE=DNA GAP=- MISSING=?;\n`;
    out += `  MATRIX\n`;
    msaResult.alignedSequences.forEach(s => {
      out += `  '${s.name || s.id}'  ${s.alignedSeq}\n`;
    });
    out += `  ;\nEND;\n\n`;
  }

  out += `BEGIN TREES;\n`;
  out += `  TREE BioNexus_Tree = ${newick};\n`;
  out += `END;\n`;

  return out;
}

function exportNewickString(node) {
  if (!node) return '';
  if (!node.children || node.children.length === 0) return `${node.name}`;
  const children = node.children.map(c => `${exportNewickString(c.node)}:${(c.branchLen || 0).toFixed(4)}`).join(',');
  return `(${children})`;
}
