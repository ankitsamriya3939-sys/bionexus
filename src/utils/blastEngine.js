// BLAST Alignment Engine for BioNexus Studio
import { cleanSequence, translateDNA } from './sequenceEngine.js';

// Local Smith-Waterman Alignment for Fast Interactive BLAST
export function alignSmithWaterman(querySeq, subjectSeq, program = 'blastn') {
  const q = cleanSequence(querySeq);
  const s = cleanSequence(subjectSeq);

  if (!q.length || !s.length) return null;

  const matchScore = program === 'blastp' ? 4 : 2;
  const mismatchScore = program === 'blastp' ? -2 : -3;
  const gapPenalty = program === 'blastp' ? -3 : -5;

  const m = q.length;
  const n = s.length;

  const matrix = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  let maxScore = 0;
  let maxI = 0;
  let maxJ = 0;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const match = q[i - 1] === s[j - 1] ? matchScore : mismatchScore;
      const diag = matrix[i - 1][j - 1] + match;
      const up = matrix[i - 1][j] + gapPenalty;
      const left = matrix[i][j - 1] + gapPenalty;

      const score = Math.max(0, diag, up, left);
      matrix[i][j] = score;

      if (score > maxScore) {
        maxScore = score;
        maxI = i;
        maxJ = j;
      }
    }
  }

  // Traceback
  let alignQ = '';
  let alignSym = '';
  let alignS = '';
  let currI = maxI;
  let currJ = maxJ;
  let matches = 0;
  let gaps = 0;

  while (currI > 0 && currJ > 0 && matrix[currI][currJ] > 0) {
    const current = matrix[currI][currJ];
    const isMatch = q[currI - 1] === s[currJ - 1];
    const diagScore = matrix[currI - 1][currJ - 1] + (isMatch ? matchScore : mismatchScore);
    const upScore = matrix[currI - 1][currJ] + gapPenalty;

    if (current === diagScore) {
      alignQ = q[currI - 1] + alignQ;
      alignS = s[currJ - 1] + alignS;
      if (isMatch) {
        alignSym = '|' + alignSym;
        matches++;
      } else {
        alignSym = '.' + alignSym;
      }
      currI--;
      currJ--;
    } else if (current === upScore) {
      alignQ = q[currI - 1] + alignQ;
      alignS = '-' + alignS;
      alignSym = ' ' + alignSym;
      gaps++;
      currI--;
    } else {
      alignQ = '-' + alignQ;
      alignS = s[currJ - 1] + alignS;
      alignSym = ' ' + alignSym;
      gaps++;
      currJ--;
    }
  }

  const queryStart = currI + 1;
  const queryEnd = maxI;
  const subjectStart = currJ + 1;
  const subjectEnd = maxJ;
  const alignmentLength = alignQ.length;
  const identityPercent = parseFloat(((matches / (alignmentLength || 1)) * 100).toFixed(1));
  const queryCoverage = parseFloat((((queryEnd - queryStart + 1) / q.length) * 100).toFixed(1));
  
  // Statistical Bit Score & E-Value calculation
  const lambda = 0.267;
  const K = 0.041;
  const rawScore = maxScore;
  const bitScore = parseFloat(((lambda * rawScore - Math.log(K)) / Math.LN2).toFixed(1));
  const searchSpace = q.length * s.length;
  const evalueRaw = K * searchSpace * Math.exp(-lambda * rawScore);
  const evalue = evalueRaw < 1e-180 ? '0.0' : evalueRaw.toExponential(2);

  return {
    program,
    maxScore: rawScore,
    bitScore,
    evalue,
    identityPercent,
    queryCoverage,
    alignmentLength,
    matches,
    gaps,
    queryStart,
    queryEnd,
    subjectStart,
    subjectEnd,
    alignQ,
    alignSym,
    alignS
  };
}

// Sample blast database target entries for interactive queries
export const BLAST_LOCAL_DATABASE = [
  {
    accession: 'NM_007294.4',
    title: 'Homo sapiens BRCA1 DNA repair associated mRNA',
    organism: 'Homo sapiens',
    sequence: 'ATGGATTTATCTGCTCTTCGCGTTGAAGAAGTACAAAATGTCATTAATGCTATGCAGAAAATCTTAGAGTGTCCCATCTGTCTGGAGTTGATCAAGGAACCTGTCTCCACAAAGTGTGACCACATATTTTGCAAATTTTGCATGCTGAAACTTCTCAACCAGAAGAAAGGGCCTTCACAGTGTCCTTTATGTAAGAATGATATAACCAAAAGGAGCC'
  },
  {
    accession: 'NM_000546.6',
    title: 'Homo sapiens tumor protein p53 (TP53) mRNA',
    organism: 'Homo sapiens',
    sequence: 'ATGGAGGAGCCGCAGTCAGATCCTAGCGTCGAGCCCCCTCTGAGTCAGGAAACATTTTCAGACCTATGGAAACTACTTCCTGAAAACAACGTTCTGTCCCCCTTGCCGTCCCAAGCAATGGATGATTTGATGCTGTCCCCGGACGATATTGAACAATGGTTCACTGAAGACCCAGGTCCAGATGAAGCTCCCAGAATGCCAGAGGCTGCT'
  },
  {
    accession: 'NC_045512.2',
    title: 'Severe acute respiratory syndrome coronavirus 2 isolate Wuhan-Hu-1 (SARS-CoV-2)',
    organism: 'SARS-CoV-2',
    sequence: 'ATGTCTGATAATGGACCCCAAAATCAGCGAAATGCACCCCGCATTACGTTTGGTGGACCCTCAGATTCAACTGGCAGTAACCAGAATGGAGAACGCAGTGGGGCGCGATCAAAACAACGTCGGCCCCAAGGTTTACCCAATAATACTGCGTCTTGGTTCACCGCTCTCACTCAACATGGCAAGGAAGACCTTAAATTCCCTCGAGGACAAGGCGTT'
  },
  {
    accession: 'NM_001101.5',
    title: 'Homo sapiens actin beta (ACTB) mRNA',
    organism: 'Homo sapiens',
    sequence: 'ATGGATGATGATATCGCCGCGCTCGTCGTCGACAACGGCTCCGGCATGTGCAAGGCCGGCTTCGCGGGCGACGATGCCCCCCGGGCCGTCTTCCCCTCCATCGTGGGCCGCCCCAGGCACCAGGGCGTGATGGTGGGCATGGGCCAGAAGGACTCCTACGTGGGCGACGAGGCCCAGAGCAAGAGAGGCATCCTCACCCTGAAGTACCCCATCGAGC'
  }
];

export function runBlast(querySeq, program = 'blastn', dbList = BLAST_LOCAL_DATABASE) {
  const query = cleanSequence(querySeq);
  if (!query) return { hits: [], queryLength: 0 };

  const hits = dbList.map(dbEntry => {
    let subjectSeq = dbEntry.sequence;
    let procQuery = query;

    if (program === 'blastx') {
      procQuery = translateDNA(query, 0);
    } else if (program === 'tblastn') {
      subjectSeq = translateDNA(dbEntry.sequence, 0);
    } else if (program === 'tblastx') {
      procQuery = translateDNA(query, 0);
      subjectSeq = translateDNA(dbEntry.sequence, 0);
    }

    const alignment = alignSmithWaterman(procQuery, subjectSeq, program);
    if (!alignment || alignment.identityPercent < 15) return null;

    return {
      accession: dbEntry.accession,
      title: dbEntry.title,
      organism: dbEntry.organism,
      sequence: dbEntry.sequence,
      alignment
    };
  }).filter(Boolean);

  hits.sort((a, b) => b.alignment.bitScore - a.alignment.bitScore);

  return {
    queryLength: query.length,
    program,
    hits
  };
}
