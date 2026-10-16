// Phylogenetics Engine (Neighbor Joining & UPGMA & Substitution Models) for BioNexus Studio

/**
 * Calculates pairwise distance matrix based on chosen substitution model
 * Models supported:
 * 1. Jukes-Cantor (JC69)
 * 2. Kimura 2-Parameter (K80)
 * 3. p-Distance (Uncorrected Hamming)
 */
export function calculateDistanceMatrix(msaResult, model = 'jukes-cantor') {
  const { alignedSequences } = msaResult;
  const n = alignedSequences.length;
  const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
  const formattedMatrix = Array(n).fill(null).map(() => Array(n).fill('0.0000'));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const s1 = alignedSequences[i].alignedSeq;
      const s2 = alignedSequences[j].alignedSeq;
      
      let diff = 0;
      let validPositions = 0;
      let transitions = 0;
      let transversions = 0;

      const len = Math.min(s1.length, s2.length);
      for (let k = 0; k < len; k++) {
        const c1 = s1[k].toUpperCase();
        const c2 = s2[k].toUpperCase();

        if (c1 !== '-' && c2 !== '-' && c1 !== '.' && c2 !== '.') {
          validPositions++;
          if (c1 !== c2) {
            diff++;
            // Check transition vs transversion
            const isPurine1 = (c1 === 'A' || c1 === 'G');
            const isPurine2 = (c2 === 'A' || c2 === 'G');
            const isPyrimidine1 = (c1 === 'C' || c1 === 'T' || c1 === 'U');
            const isPyrimidine2 = (c2 === 'C' || c2 === 'T' || c2 === 'U');

            if ((isPurine1 && isPurine2) || (isPyrimidine1 && isPyrimidine2)) {
              transitions++;
            } else {
              transversions++;
            }
          }
        }
      }

      const p = validPositions > 0 ? diff / validPositions : 0;
      let dist = p;

      if (model === 'jukes-cantor') {
        if (p >= 0.75) {
          dist = 2.5; // Capped maximum saturated distance
        } else {
          dist = -0.75 * Math.log(1 - (4 / 3) * p);
        }
      } else if (model === 'kimura-2p') {
        const P = validPositions > 0 ? transitions / validPositions : 0;
        const Q = validPositions > 0 ? transversions / validPositions : 0;
        const term1 = 1 - 2 * P - Q;
        const term2 = 1 - 2 * Q;

        if (term1 <= 0 || term2 <= 0) {
          dist = 2.5;
        } else {
          dist = -0.5 * Math.log(term1) - 0.25 * Math.log(term2);
        }
      } else if (model === 'p-distance') {
        dist = p;
      }

      // Store raw float in matrix for calculation, formatted string for UI
      matrix[i][j] = dist;
      matrix[j][i] = dist;
      formattedMatrix[i][j] = dist.toFixed(4);
      formattedMatrix[j][i] = dist.toFixed(4);
    }
  }

  return {
    labels: alignedSequences.map(s => s.name || s.id),
    matrix,
    formattedMatrix,
    alignmentLength: msaResult.alignmentLength || (alignedSequences[0] ? alignedSequences[0].alignedSeq.length : 0)
  };
}

/**
 * Neighbor-Joining Algorithm (Saitou & Nei 1987)
 */
export function buildNeighborJoiningTree(matrixData) {
  const { labels, matrix } = matrixData;
  const n = labels.length;

  if (n === 0) return null;
  if (n === 1) return { id: 'node_0', name: labels[0], height: 0, children: [] };

  // Track active nodes and full pairwise distance lookup
  let activeNodes = labels.map((label, idx) => ({
    id: `leaf_${idx}`,
    name: label,
    height: 0,
    children: []
  }));

  // Create full key-based distance map
  const distMap = new Map();
  const getKey = (id1, id2) => (id1 < id2 ? `${id1}___${id2}` : `${id2}___${id1}`);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      distMap.set(getKey(activeNodes[i].id, activeNodes[j].id), matrix[i][j]);
    }
  }

  let nodeCounter = n;

  while (activeNodes.length > 2) {
    const N = activeNodes.length;

    // Calculate sum of distances R_i for each active node
    const R = new Map();
    activeNodes.forEach(nodeI => {
      let sum = 0;
      activeNodes.forEach(nodeJ => {
        if (nodeI.id !== nodeJ.id) {
          sum += distMap.get(getKey(nodeI.id, nodeJ.id)) || 0;
        }
      });
      R.set(nodeI.id, sum);
    });

    // Compute Q-matrix to find pair (u, v) with min Q
    let minQ = Infinity;
    let minU = null;
    let minV = null;

    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const u = activeNodes[i];
        const v = activeNodes[j];
        const dUV = distMap.get(getKey(u.id, v.id)) || 0;
        const qVal = (N - 2) * dUV - R.get(u.id) - R.get(v.id);

        if (qVal < minQ) {
          minQ = qVal;
          minU = u;
          minV = v;
        }
      }
    }

    if (!minU || !minV) break;

    const dUV = distMap.get(getKey(minU.id, minV.id)) || 0;
    const rU = R.get(minU.id);
    const rV = R.get(minV.id);

    // Compute branch lengths from new node to minU and minV
    let vU = 0.5 * dUV + (1 / (2 * (N - 2))) * (rU - rV);
    let vV = dUV - vU;

    // Clean small numeric rounding errors
    if (vU < 0) vU = 0;
    if (vV < 0) vV = 0;

    // Create new parent node
    const newNode = {
      id: `internal_${nodeCounter++}`,
      name: '',
      height: Math.max(minU.height + vU, minV.height + vV),
      children: [
        { node: minU, branchLen: vU },
        { node: minV, branchLen: vV }
      ]
    };

    // Calculate distances from newNode to remaining active nodes
    activeNodes.forEach(k => {
      if (k.id !== minU.id && k.id !== minV.id) {
        const dUK = distMap.get(getKey(minU.id, k.id)) || 0;
        const dVK = distMap.get(getKey(minV.id, k.id)) || 0;
        const dNewK = 0.5 * (dUK + dVK - dUV);
        distMap.set(getKey(newNode.id, k.id), Math.max(0, dNewK));
      }
    });

    // Update active nodes
    activeNodes = activeNodes.filter(n => n.id !== minU.id && n.id !== minV.id);
    activeNodes.push(newNode);
  }

  // Final join when 2 active nodes remain
  if (activeNodes.length === 2) {
    const u = activeNodes[0];
    const v = activeNodes[1];
    const dUV = distMap.get(getKey(u.id, v.id)) || 0;
    const bLen = Math.max(0, dUV / 2);

    return {
      id: `root_${nodeCounter++}`,
      name: '',
      height: Math.max(u.height, v.height) + bLen,
      children: [
        { node: u, branchLen: bLen },
        { node: v, branchLen: bLen }
      ]
    };
  }

  return activeNodes[0];
}

/**
 * UPGMA Algorithm (Unweighted Pair Group Method with Arithmetic Mean)
 */
export function buildUpgmaTree(matrixData) {
  const { labels, matrix } = matrixData;
  const n = labels.length;

  if (n === 0) return null;
  if (n === 1) return { id: 'node_0', name: labels[0], height: 0, size: 1, children: [] };

  let activeClusters = labels.map((label, idx) => ({
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
      distMap.set(getKey(activeClusters[i].id, activeClusters[j].id), matrix[i][j]);
    }
  }

  let nodeCounter = n;

  while (activeClusters.length > 1) {
    let minD = Infinity;
    let minU = null;
    let minV = null;

    for (let i = 0; i < activeClusters.length; i++) {
      for (let j = i + 1; j < activeClusters.length; j++) {
        const u = activeClusters[i];
        const v = activeClusters[j];
        const d = distMap.get(getKey(u.id, v.id)) || 0;

        if (d < minD) {
          minD = d;
          minU = u;
          minV = v;
        }
      }
    }

    if (!minU || !minV) break;

    const newHeight = minD / 2;
    const bLenU = Math.max(0, newHeight - minU.height);
    const bLenV = Math.max(0, newHeight - minV.height);

    const newCluster = {
      id: `cluster_${nodeCounter++}`,
      name: '',
      height: newHeight,
      size: minU.size + minV.size,
      children: [
        { node: minU, branchLen: bLenU },
        { node: minV, branchLen: bLenV }
      ]
    };

    // Calculate cluster distances
    activeClusters.forEach(k => {
      if (k.id !== minU.id && k.id !== minV.id) {
        const dUK = distMap.get(getKey(minU.id, k.id)) || 0;
        const dVK = distMap.get(getKey(minV.id, k.id)) || 0;
        const newDist = (minU.size * dUK + minV.size * dVK) / (minU.size + minV.size);
        distMap.set(getKey(newCluster.id, k.id), newDist);
      }
    });

    activeClusters = activeClusters.filter(c => c.id !== minU.id && c.id !== minV.id);
    activeClusters.push(newCluster);
  }

  return activeClusters[0];
}

/**
 * Generates Newick Format String from tree node
 */
export function exportNewick(node) {
  if (!node) return '';
  if (!node.children || node.children.length === 0) {
    return `${node.name}`;
  }
  const childStr = node.children
    .map(c => `${exportNewick(c.node)}:${c.branchLen.toFixed(4)}`)
    .join(',');
  return `(${childStr})`;
}

// Export advanced scientific evolution methods
export {
  computeTreeLogLikelihood,
  calculateTreeLength,
  buildMinimumEvolutionTree,
  buildMaximumLikelihoodTree,
  calculateRobinsonFouldsDistance,
  exportNexusFormat
} from './likelihoodEngine.js';

