// Multiple Sequence Alignment (MSA) Engine for BioNexus Studio
import { cleanSequence } from './sequenceEngine.js';

// Clustal Color Mapping
export const NUC_COLORS = {
  'A': '#ef4444', // Red
  'T': '#3b82f6', // Blue
  'U': '#3b82f6',
  'G': '#10b981', // Green
  'C': '#f59e0b', // Yellow
  '-': '#64748b'  // Slate
};

export const AA_COLORS = {
  // Small hydrophobic (Red/Orange)
  'A': '#f97316', 'V': '#f97316', 'L': '#f97316', 'I': '#f97316', 'M': '#f97316', 'F': '#f97316', 'W': '#f97316', 'P': '#f97316',
  // Acidic (Red)
  'D': '#ef4444', 'E': '#ef4444',
  // Basic (Blue)
  'K': '#3b82f6', 'R': '#3b82f6', 'H': '#3b82f6',
  // Polar (Green)
  'S': '#10b981', 'T': '#10b981', 'N': '#10b981', 'Q': '#10b981',
  // Aromatic/Cys (Cyan/Pink)
  'Y': '#06b6d4', 'C': '#ec4899', 'G': '#8b5cf6',
  '-': '#64748b'
};

export function alignPairNeedlemanWunsch(seq1, seq2, isProtein = false) {
  const s1 = cleanSequence(seq1);
  const s2 = cleanSequence(seq2);
  const m = s1.length;
  const n = s2.length;

  const match = isProtein ? 4 : 2;
  const mismatch = isProtein ? -2 : -3;
  const gap = isProtein ? -3 : -4;

  const score = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) score[i][0] = i * gap;
  for (let j = 0; j <= n; j++) score[0][j] = j * gap;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const sMatch = s1[i - 1] === s2[j - 1] ? match : mismatch;
      score[i][j] = Math.max(
        score[i - 1][j - 1] + sMatch,
        score[i - 1][j] + gap,
        score[i][j - 1] + gap
      );
    }
  }

  let a1 = '';
  let a2 = '';
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && score[i][j] === score[i - 1][j - 1] + (s1[i - 1] === s2[j - 1] ? match : mismatch)) {
      a1 = s1[i - 1] + a1;
      a2 = s2[j - 1] + a2;
      i--;
      j--;
    } else if (i > 0 && score[i][j] === score[i - 1][j] + gap) {
      a1 = s1[i - 1] + a1;
      a2 = '-' + a2;
      i--;
    } else {
      a1 = '-' + a1;
      a2 = s2[j - 1] + a2;
      j--;
    }
  }

  return { aligned1: a1, aligned2: a2 };
}

export function runMSA(sequences = []) {
  if (!sequences || !sequences.length) {
    return { alignedSequences: [], consensus: '', conservation: [] };
  }

  const validSeqs = sequences.map((item, idx) => ({
    id: item.id || `Seq_${idx + 1}`,
    name: item.name || `Sequence ${idx + 1}`,
    seq: cleanSequence(item.seq || item.sequence || '')
  })).filter(s => s.seq.length > 0);

  if (validSeqs.length === 0) return { alignedSequences: [], consensus: '', conservation: [] };
  if (validSeqs.length === 1) {
    const s = validSeqs[0].seq;
    return {
      alignedSequences: [{ ...validSeqs[0], alignedSeq: s }],
      consensus: s,
      conservation: Array(s.length).fill(100)
    };
  }

  // Progressive Alignment Strategy using guide sequence
  const isProtein = /[EFILPQZ]/i.test(validSeqs[0].seq);
  let reference = validSeqs[0].seq;
  let alignedList = [{ ...validSeqs[0], alignedSeq: reference }];

  for (let k = 1; k < validSeqs.length; k++) {
    const current = validSeqs[k].seq;
    const { aligned1, aligned2 } = alignPairNeedlemanWunsch(alignedList[0].alignedSeq, current, isProtein);
    
    // Update previous aligned sequences if gaps were introduced in reference
    alignedList = alignedList.map((item, itemIdx) => {
      if (itemIdx === 0) return { ...item, alignedSeq: aligned1 };
      let newSeq = '';
      let refIdx = 0;
      for (let p = 0; p < aligned1.length; p++) {
        if (aligned1[p] === '-') {
          newSeq += '-';
        } else {
          newSeq += (refIdx < item.alignedSeq.length ? item.alignedSeq[refIdx] : '-');
          refIdx++;
        }
      }
      return { ...item, alignedSeq: newSeq };
    });

    alignedList.push({
      ...validSeqs[k],
      alignedSeq: aligned2
    });
  }

  // Calculate position-wise conservation and consensus
  const alignLen = alignedList[0].alignedSeq.length;
  let consensus = '';
  const conservation = [];

  for (let col = 0; col < alignLen; col++) {
    const counts = {};
    let nonGaps = 0;

    for (let item of alignedList) {
      const char = item.alignedSeq[col] || '-';
      if (char !== '-') {
        counts[char] = (counts[char] || 0) + 1;
        nonGaps++;
      }
    }

    let maxChar = '-';
    let maxCount = 0;
    Object.keys(counts).forEach(c => {
      if (counts[c] > maxCount) {
        maxCount = counts[c];
        maxChar = c;
      }
    });

    consensus += maxChar;
    const score = parseFloat(((maxCount / (alignedList.length || 1)) * 100).toFixed(1));
    conservation.push(score);
  }

  return {
    alignedSequences: alignedList,
    consensus,
    conservation,
    alignmentLength: alignLen,
    isProtein
  };
}
