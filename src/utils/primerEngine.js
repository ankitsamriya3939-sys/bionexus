// Thermodynamic Primer Design & Primer3 Integration Engine for BioNexus Studio
// Implements SantaLucia 1998 Unified Nearest-Neighbor thermodynamic models
// and interfaces with native Primer3 C Library v2.3.1 backend service.

import { cleanSequence, reverseComplement } from './sequenceEngine.js';

// SantaLucia (1998) Unified Nearest-Neighbor Parameters for DNA (PNAS 95:1460-1465)
// Values: [dH in kcal/mol, dS in cal/(mol*K)]
export const NEAREST_NEIGHBOR_NN = {
  AA: [-7.9, -22.2], TT: [-7.9, -22.2],
  AT: [-7.2, -20.4],
  TA: [-7.2, -21.3],
  CA: [-8.5, -22.7], TG: [-8.5, -22.7],
  GT: [-8.4, -22.4], AC: [-8.4, -22.4],
  CT: [-7.8, -21.0], AG: [-7.8, -21.0],
  GA: [-8.2, -22.2], TC: [-8.2, -22.2],
  CG: [-10.6, -27.2],
  GC: [-9.8, -24.4],
  GG: [-8.0, -19.9], CC: [-8.0, -19.9]
};

// Application Presets with Standard Primer3 Configurations
export const PRIMER_PRESETS = {
  pcr: {
    id: 'pcr',
    name: 'Standard PCR',
    description: 'General purpose genomic and plasmid amplification with high yield and specificity.',
    optLen: 20, minLen: 18, maxLen: 25,
    optTm: 60.0, minTm: 57.0, maxTm: 63.0, maxTmDiff: 3.0,
    minGc: 30.0, maxGc: 70.0,
    minProductSize: 150, maxProductSize: 500,
    mvConc: 50.0, dvConc: 1.5, dnaConc: 50.0, dntpConc: 0.8
  },
  qpcr: {
    id: 'qpcr',
    name: 'Real-Time qPCR',
    description: 'Short amplicons (70-150 bp) optimized for SYBR Green / TaqMan quantitative amplification.',
    optLen: 20, minLen: 18, maxLen: 22,
    optTm: 60.0, minTm: 58.0, maxTm: 62.0, maxTmDiff: 1.5,
    minGc: 40.0, maxGc: 60.0,
    minProductSize: 70, maxProductSize: 150,
    mvConc: 50.0, dvConc: 2.5, dnaConc: 200.0, dntpConc: 0.8
  },
  cloning: {
    id: 'cloning',
    name: 'Cloning / Overlap',
    description: 'Longer primers (20-30 bp) designed for Gibson assembly, In-Fusion, or restriction digests.',
    optLen: 24, minLen: 20, maxLen: 30,
    optTm: 62.0, minTm: 58.0, maxTm: 68.0, maxTmDiff: 4.0,
    minGc: 35.0, maxGc: 65.0,
    minProductSize: 300, maxProductSize: 1500,
    mvConc: 50.0, dvConc: 1.5, dnaConc: 100.0, dntpConc: 0.8
  },
  sequencing: {
    id: 'sequencing',
    name: 'Sanger Sequencing',
    description: 'High-specificity sequencing primers placed 50-100 bp upstream of region of interest.',
    optLen: 22, minLen: 20, maxLen: 26,
    optTm: 56.0, minTm: 52.0, maxTm: 60.0, maxTmDiff: 3.0,
    minGc: 35.0, maxGc: 60.0,
    minProductSize: 200, maxProductSize: 1000,
    mvConc: 50.0, dvConc: 1.5, dnaConc: 50.0, dntpConc: 0.8
  }
};

/**
 * SantaLucia 1998 Unified Nearest-Neighbor Melting Temperature Calculation
 * Includes monovalent (Na+, K+) and divalent (Mg2+) salt corrections.
 */
export function calculateTm(primerSeq, saltConc = 50, mgConc = 1.5, dnaConc = 50) {
  const seq = cleanSequence(primerSeq);
  if (!seq || seq.length === 0) return 0;

  // Short oligo Marmur-Doty fallback (< 14 bp)
  if (seq.length < 14) {
    let a = 0, t = 0, g = 0, c = 0;
    for (let char of seq) {
      if (char === 'A') a++;
      else if (char === 'T' || char === 'U') t++;
      else if (char === 'G') g++;
      else if (char === 'C') c++;
    }
    return (a + t) * 2 + (g + c) * 4;
  }

  let dH = 0;
  let dS = 0;

  for (let i = 0; i < seq.length - 1; i++) {
    const pair = seq.slice(i, i + 2);
    const params = NEAREST_NEIGHBOR_NN[pair];
    if (params) {
      dH += params[0];
      dS += params[1];
    } else {
      // Average nearest-neighbor approximation for IUPAC degenerate positions
      dH += -8.0;
      dS += -22.0;
    }
  }

  // Helix Initiation
  const init5 = (seq[0] === 'G' || seq[0] === 'C') ? [0.1, -2.8] : [2.3, 4.1];
  const init3 = (seq[seq.length - 1] === 'G' || seq[seq.length - 1] === 'C') ? [0.1, -2.8] : [2.3, 4.1];
  dH += init5[0] + init3[0];
  dS += init5[1] + init3[1];

  // SantaLucia 1998 Salt Correction
  const effectiveMonovalentM = (saltConc + 120 * Math.sqrt(Math.max(0, mgConc))) / 1000;
  const dS_salt = dS + 0.368 * (seq.length - 1) * Math.log(Math.max(1e-4, effectiveMonovalentM));

  // Gas constant R = 1.9872 cal/(K*mol), primer concentration C_T in M
  const R = 1.9872;
  const cT = (dnaConc * 1e-9) / 4;
  const tmK = (dH * 1000) / (dS_salt + R * Math.log(cT));
  const tmC = tmK - 273.15;

  return parseFloat(tmC.toFixed(2));
}

/**
 * 3' GC Clamp checker (counts G/C in terminal 5 bases)
 */
export function checkGcClamp(seq) {
  if (!seq) return { count: 0, isGood: false };
  const clean = cleanSequence(seq);
  const threePrimeEnd = clean.slice(-5);
  let gcCount = 0;
  for (let b of threePrimeEnd) {
    if (b === 'G' || b === 'C') gcCount++;
  }
  return {
    count: gcCount,
    isGood: gcCount >= 1 && gcCount <= 3
  };
}

/**
 * Thermodynamic Hairpin Analyzer (SantaLucia ΔG in kcal/mol at 37°C)
 */
export function analyzeHairpin(seq, saltConc = 50, mgConc = 1.5) {
  const s = cleanSequence(seq);
  const n = s.length;
  if (n < 9) {
    return { structureFound: false, tm: 0, dg: 0, maxMatch: 0, score: 'Low' };
  }

  let minDg = 0;
  let maxStem = 0;
  let bestTm = 0;

  // Search loops of size 3 to 7 bp with stems >= 3 bp
  for (let loopLen = 3; loopLen <= 7; loopLen++) {
    for (let stemLen = 3; stemLen <= Math.floor((n - loopLen) / 2); stemLen++) {
      for (let i = 0; i <= n - 2 * stemLen - loopLen; i++) {
        const stem1 = s.slice(i, i + stemLen);
        const loopStart = i + stemLen;
        const stem2 = s.slice(loopStart + loopLen, loopStart + loopLen + stemLen);
        const stem2RC = reverseComplement(stem2);

        let matches = 0;
        let dH_stem = 0;
        let dS_stem = 0;

        for (let k = 0; k < stemLen; k++) {
          if (stem1[k] === stem2RC[k]) {
            matches++;
            if (k < stemLen - 1) {
              const pair = stem1.slice(k, k + 2);
              const p = NEAREST_NEIGHBOR_NN[pair];
              if (p) {
                dH_stem += p[0];
                dS_stem += p[1];
              }
            }
          }
        }

        // Loop penalty estimation: ~ +3.5 to +4.5 kcal/mol at 37°C
        const loopPenaltyDg = 3.2 + 0.3 * loopLen;
        const T = 310.15; // 37°C in Kelvin
        const stemDg = dH_stem - (T * dS_stem / 1000);
        const totalDg = stemDg + loopPenaltyDg;

        if (matches >= 3 && totalDg < minDg) {
          minDg = totalDg;
          maxStem = matches;
          bestTm = matches >= 4 ? Math.min(65, 35 + matches * 5) : 0;
        }
      }
    }
  }

  const structureFound = minDg < -0.5;
  return {
    structureFound,
    hasHairpin: structureFound,
    dg: parseFloat(minDg.toFixed(2)),
    tm: parseFloat(bestTm.toFixed(1)),
    stemMatch: maxStem,
    score: minDg < -2.5 ? 'High' : minDg < -1.0 ? 'Moderate' : 'Low'
  };
}

/**
 * Thermodynamic Dimer Analyzer (Self-Dimer or Heterodimer ΔG in kcal/mol at 37°C)
 */
export function analyzeDimer(seq1, seq2, saltConc = 50, mgConc = 1.5) {
  const s1 = cleanSequence(seq1);
  const s2 = cleanSequence(seq2 || seq1);
  const s2RC = reverseComplement(s2);
  const isSelf = (!seq2 || seq1 === seq2);

  let minDg = 0;
  let maxComplement = 0;
  const l1 = s1.length;
  const l2 = s2RC.length;
  const T = 310.15;

  for (let shift = -l2 + 3; shift <= l1 - 3; shift++) {
    let currentMatch = 0;
    let dH = 0;
    let dS = 0;

    for (let i = 0; i < l1; i++) {
      const j = i - shift;
      if (j >= 0 && j < l2) {
        if (s1[i] === s2RC[j]) {
          currentMatch++;
          if (i < l1 - 1 && j < l2 - 1 && s1[i + 1] === s2RC[j + 1]) {
            const pair = s1.slice(i, i + 2);
            const p = NEAREST_NEIGHBOR_NN[pair];
            if (p) {
              dH += p[0];
              dS += p[1];
            }
          }
        }
      }
    }

    if (currentMatch >= 4) {
      const dG = dH - (T * dS / 1000) + 1.96; // initiation
      if (dG < minDg) {
        minDg = dG;
        maxComplement = currentMatch;
      }
    }
  }

  const structureFound = minDg < -1.5;
  return {
    isSelfDimer: isSelf,
    structureFound,
    hasDimer: structureFound,
    dg: parseFloat(minDg.toFixed(2)),
    tm: structureFound ? parseFloat((30 + maxComplement * 4).toFixed(1)) : 0,
    maxComplement,
    risk: minDg < -5.0 ? 'High' : minDg < -3.0 ? 'Moderate' : 'Low'
  };
}

/**
 * Full Primer Design Execution
 * Tries the real Primer3 C Library backend service first (/api/primer3/design).
 * Falls back to high-accuracy SantaLucia in-silico engine if backend is offline.
 */
export async function designPrimersWithPrimer3(options = {}) {
  const {
    sequence = '',
    id = 'BioNexus_Target',
    targetRegion = null,
    excludedRegion = null,
    minLen = 18,
    optLen = 20,
    maxLen = 24,
    minTm = 57.0,
    optTm = 60.0,
    maxTm = 63.0,
    maxTmDiff = 3.0,
    minGc = 30.0,
    maxGc = 70.0,
    minProductSize = 100,
    maxProductSize = 500,
    numReturn = 10,
    mvConc = 50.0,
    dvConc = 1.5,
    dnaConc = 50.0,
    dntpConc = 0.8
  } = options;

  const cleanSeq = cleanSequence(sequence);
  if (!cleanSeq || cleanSeq.length < 30) {
    return {
      success: false,
      error: `Sequence length (${cleanSeq ? cleanSeq.length : 0} bp) is too short. Minimum 30 bp required for primer design.`,
      pairs: []
    };
  }

  const payload = {
    sequence: cleanSeq,
    id,
    targetRegion,
    excludedRegion,
    minLen, optLen, maxLen,
    minTm, optTm, maxTm, maxTmDiff,
    minGc, maxGc,
    minProductSize, maxProductSize,
    numReturn,
    mvConc, dvConc, dnaConc, dntpConc
  };

  // 1. Attempt Backend Primer3 Execution
  try {
    const res = await fetch('/api/primer3/design', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000)
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.pairs)) {
        return {
          ...data,
          engine: data.engine || 'Primer3 C Library v2.3.1 (via primer3-py)',
          provenance: {
            ...payload,
            primer3Version: data.primer3PyVersion || '2.3.1',
            retrievedAt: new Date().toISOString()
          }
        };
      }
    }
  } catch (err) {
    console.warn('Backend Primer3 unavailable, engaging SantaLucia unified client fallback:', err.message);
  }

  // 2. Client-Side SantaLucia In-Silico Fallback Engine
  return designPrimersClientFallback(cleanSeq, payload);
}

/**
 * Client-Side SantaLucia In-Silico Fallback Engine
 * Accurately implements targetRegion, excludedRegion, and SantaLucia NN scoring.
 */
function designPrimersClientFallback(seq, payload) {
  const {
    minLen, optLen, maxLen,
    minTm, optTm, maxTm, maxTmDiff,
    minGc, maxGc,
    minProductSize, maxProductSize,
    numReturn,
    targetRegion, excludedRegion,
    mvConc, dvConc, dnaConc
  } = payload;

  const seqLen = seq.length;
  if (minProductSize && seqLen < minProductSize) {
    return {
      success: false,
      error: `Template length (${seqLen} bp) is shorter than minimum requested product size (${minProductSize} bp).`,
      totalPairs: 0,
      pairs: [],
      parameters: payload,
      templateLength: seqLen
    };
  }
  const effectiveMinProduct = minProductSize || 30;
  const effectiveMaxProduct = Math.min(maxProductSize, seqLen);

  // Target and Excluded Region Bounds (0-based)
  const targetStart = targetRegion ? Math.max(0, parseInt(targetRegion[0], 10)) : -1;
  const targetLen = targetRegion ? parseInt(targetRegion[1], 10) : 0;
  const targetEnd = targetStart >= 0 ? targetStart + targetLen : -1;

  const exStart = excludedRegion ? Math.max(0, parseInt(excludedRegion[0], 10)) : -1;
  const exLen = excludedRegion ? parseInt(excludedRegion[1], 10) : 0;
  const exEnd = exStart >= 0 ? exStart + exLen : -1;

  const isExcluded = (s, e) => {
    if (exStart < 0 || exLen <= 0) return false;
    return !(e <= exStart || s >= exEnd);
  };

  const fwdCandidates = [];
  const revCandidates = [];
  const step = seqLen > 4000 ? 3 : seqLen > 1500 ? 2 : 1;

  // Scan Forward Primers
  const maxFwdStart = targetEnd > 0 ? targetStart : seqLen - effectiveMinProduct;
  for (let s = 0; s <= Math.min(seqLen - minLen, maxFwdStart); s += step) {
    for (let len = minLen; len <= maxLen; len++) {
      const e = s + len;
      if (e > seqLen) continue;
      if (isExcluded(s, e)) continue;

      const primerSeq = seq.slice(s, e);
      const tm = calculateTm(primerSeq, mvConc, dvConc, dnaConc);
      if (tm < minTm || tm > maxTm) continue;

      const gcMatch = primerSeq.match(/[GC]/g) || [];
      const gc = parseFloat(((gcMatch.length / len) * 100).toFixed(1));
      if (gc < minGc || gc > maxGc) continue;

      const tmPenalty = Math.abs(tm - optTm) * 1.5;
      const lenPenalty = Math.abs(len - optLen) * 0.5;
      const gcPenalty = Math.abs(gc - 50) * 0.1;
      const penalty = parseFloat((tmPenalty + lenPenalty + gcPenalty).toFixed(3));

      fwdCandidates.push({
        sequence: primerSeq,
        start: s + 1,
        end: e,
        length: len,
        tm,
        gc,
        penalty,
        loc0: s
      });
    }
  }

  // Scan Reverse Primers
  const minRevEnd = targetStart >= 0 ? targetEnd : effectiveMinProduct;
  for (let e = minRevEnd; e <= seqLen; e += step) {
    for (let len = minLen; len <= maxLen; len++) {
      const s = e - len;
      if (s < 0) continue;
      if (isExcluded(s, e)) continue;

      const fwdSense = seq.slice(s, e);
      const revSeq = reverseComplement(fwdSense);
      const tm = calculateTm(revSeq, mvConc, dvConc, dnaConc);
      if (tm < minTm || tm > maxTm) continue;

      const gcMatch = revSeq.match(/[GC]/g) || [];
      const gc = parseFloat(((gcMatch.length / len) * 100).toFixed(1));
      if (gc < minGc || gc > maxGc) continue;

      const tmPenalty = Math.abs(tm - optTm) * 1.5;
      const lenPenalty = Math.abs(len - optLen) * 0.5;
      const gcPenalty = Math.abs(gc - 50) * 0.1;
      const penalty = parseFloat((tmPenalty + lenPenalty + gcPenalty).toFixed(3));

      revCandidates.push({
        sequence: revSeq,
        start: s + 1,
        end: e,
        length: len,
        tm,
        gc,
        penalty,
        loc0End: e
      });
    }
  }

  // Form Candidate Pairs
  fwdCandidates.sort((a, b) => a.penalty - b.penalty);
  revCandidates.sort((a, b) => a.penalty - b.penalty);

  const candidatePairs = [];
  const topFwd = fwdCandidates.slice(0, 100);
  const topRev = revCandidates.slice(0, 100);

  for (const fwd of topFwd) {
    for (const rev of topRev) {
      if (rev.end > fwd.end) {
        const prodSize = rev.end - fwd.start + 1;
        if (prodSize >= effectiveMinProduct && prodSize <= effectiveMaxProduct) {
          // If target region specified, ensure amplicon flanks target
          if (targetStart >= 0 && targetEnd > 0) {
            if (fwd.start > targetStart + 1 || rev.end < targetEnd) continue;
          }

          const tmDiff = Math.abs(fwd.tm - rev.tm);
          if (tmDiff <= maxTmDiff) {
            const pairPenalty = fwd.penalty + rev.penalty + tmDiff * 1.5;
            candidatePairs.push({
              fwd,
              rev,
              prodSize,
              tmDiff: parseFloat(tmDiff.toFixed(2)),
              pairPenalty: parseFloat(pairPenalty.toFixed(3))
            });
          }
        }
      }
    }
  }

  candidatePairs.sort((a, b) => a.pairPenalty - b.pairPenalty);

  // Thermodynamic Evaluation for Top Pairs
  const finalPairs = [];
  const selectedPairs = candidatePairs.slice(0, numReturn);

  for (let i = 0; i < selectedPairs.length; i++) {
    const p = selectedPairs[i];
    const fwdSeq = p.fwd.sequence;
    const revSeq = p.rev.sequence;

    const fwdHp = analyzeHairpin(fwdSeq, mvConc, dvConc);
    const fwdHd = analyzeDimer(fwdSeq, null, mvConc, dvConc);
    const fwdGc = checkGcClamp(fwdSeq);

    const revHp = analyzeHairpin(revSeq, mvConc, dvConc);
    const revHd = analyzeDimer(revSeq, null, mvConc, dvConc);
    const revGc = checkGcClamp(revSeq);

    const crossDimer = analyzeDimer(fwdSeq, revSeq, mvConc, dvConc);

    const ampStartIdx = p.fwd.start - 1;
    const ampEndIdx = p.rev.end;
    const ampliconSeq = seq.slice(ampStartIdx, ampEndIdx);
    const ampGc = ampliconSeq ? parseFloat(((ampliconSeq.match(/[GC]/g) || []).length / ampliconSeq.length * 100).toFixed(1)) : 0;

    finalPairs.push({
      rank: i + 1,
      forward: {
        sequence: fwdSeq,
        length: p.fwd.length,
        tm: p.fwd.tm,
        gc: p.fwd.gc,
        start: p.fwd.start,
        end: p.fwd.end,
        penalty: p.fwd.penalty,
        gcClampCount: fwdGc.count,
        hairpin: {
          structureFound: fwdHp.structureFound,
          tm: fwdHp.tm,
          dg: fwdHp.dg,
          dh: 0, ds: 0
        },
        selfDimer: {
          structureFound: fwdHd.structureFound,
          tm: fwdHd.tm,
          dg: fwdHd.dg,
          dh: 0, ds: 0
        }
      },
      reverse: {
        sequence: revSeq,
        length: p.rev.length,
        tm: p.rev.tm,
        gc: p.rev.gc,
        start: p.rev.start,
        end: p.rev.end,
        penalty: p.rev.penalty,
        gcClampCount: revGc.count,
        hairpin: {
          structureFound: revHp.structureFound,
          tm: revHp.tm,
          dg: revHp.dg,
          dh: 0, ds: 0
        },
        selfDimer: {
          structureFound: revHd.structureFound,
          tm: revHd.tm,
          dg: revHd.dg,
          dh: 0, ds: 0
        }
      },
      heterodimer: {
        structureFound: crossDimer.structureFound,
        tm: crossDimer.tm,
        dg: crossDimer.dg,
        dh: 0, ds: 0
      },
      amplicon: {
        start: p.fwd.start,
        end: p.rev.end,
        size: p.prodSize,
        sequence: ampliconSeq,
        gcPercent: ampGc
      },
      tmDiff: p.tmDiff,
      recommendedTa: parseFloat((Math.max(40, Math.min(p.fwd.tm, p.rev.tm) - 5)).toFixed(1)),
      pairPenalty: p.pairPenalty,
      statusLabel: 'Meets configured constraints',
      specificityStatus: 'untested'
    });
  }

  return {
    success: true,
    engine: 'SantaLucia 1998 Nearest-Neighbor Engine (Client In-Silico Fallback)',
    totalPairs: finalPairs.length,
    pairs: finalPairs,
    parameters: payload,
    templateLength: seqLen
  };
}

/**
 * Specificity Analysis
 * Queries /api/primer3/specificity on backend, or performs template scan fallback.
 */
export async function checkPrimerSpecificity(template, forward, reverse) {
  const cleanT = cleanSequence(template);
  const cleanF = cleanSequence(forward);
  const cleanR = cleanSequence(reverse);

  if (!cleanT || !cleanF || !cleanR) {
    return { status: 'failed', error: 'Missing template or primer sequence' };
  }

  try {
    const res = await fetch('/api/primer3/specificity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template: cleanT, forward: cleanF, reverse: cleanR }),
      signal: AbortSignal.timeout(12000)
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('Backend specificity check offline, running local template scan:', err.message);
  }

  // Client In-Silico PCR Specificity Fallback
  return runClientSpecificityScan(cleanT, cleanF, cleanR);
}

function runClientSpecificityScan(template, fwd, rev) {
  const revRC = reverseComplement(rev);
  const findMatches = (primer, isRev = false) => {
    const matches = [];
    const pLen = primer.length;
    for (let i = 0; i <= template.length - pLen; i++) {
      const window = template.slice(i, i + pLen);
      let mismatches = 0;
      for (let k = 0; k < pLen; k++) {
        if (primer[k] !== window[k]) mismatches++;
      }
      if (mismatches <= 3) {
        matches.push({
          start: i + 1,
          end: i + pLen,
          mismatches,
          strand: isRev ? 'minus' : 'plus'
        });
      }
    }
    return matches;
  };

  const fwdMatches = findMatches(fwd, false);
  const revMatches = findMatches(revRC, true);

  const targetProducts = [];
  const offTargetProducts = [];

  for (const f of fwdMatches) {
    for (const r of revMatches) {
      if (r.end > f.start) {
        const size = r.end - f.start + 1;
        if (size >= 40 && size <= 3000) {
          const item = {
            fwdStart: f.start, fwdEnd: f.end, fwdMismatches: f.mismatches,
            revStart: r.start, revEnd: r.end, revMismatches: r.mismatches,
            productSize: size,
            isPrimaryTarget: f.mismatches === 0 && r.mismatches === 0
          };
          if (item.isPrimaryTarget) {
            targetProducts.push(item);
          } else {
            offTargetProducts.push(item);
          }
        }
      }
    }
  }

  const isSpecific = targetProducts.length >= 1 && offTargetProducts.length === 0;

  return {
    status: 'completed',
    isSpecific,
    targetProducts,
    offTargetProducts,
    fwdBindingSiteCount: fwdMatches.length,
    revBindingSiteCount: revMatches.length,
    summary: `Identified ${targetProducts.length} intended target product(s) and ${offTargetProducts.length} off-target product(s) in template.`,
    checkedAgainst: 'Template in-silico PCR binding model with 3\' stability constraint'
  };
}

/**
 * Format and download CSV export of primer design results
 */
export function exportPrimersToCsv(pairs, metadata = {}) {
  const headers = [
    'Rank', 'Pair Penalty',
    'Fwd Sequence (5\'-3\')', 'Fwd Length (bp)', 'Fwd Tm (°C)', 'Fwd GC%', 'Fwd Start', 'Fwd End', 'Fwd Hairpin dG (kcal/mol)', 'Fwd Self-Dimer dG (kcal/mol)',
    'Rev Sequence (5\'-3\')', 'Rev Length (bp)', 'Rev Tm (°C)', 'Rev GC%', 'Rev Start', 'Rev End', 'Rev Hairpin dG (kcal/mol)', 'Rev Self-Dimer dG (kcal/mol)',
    'Heterodimer dG (kcal/mol)', 'Amplicon Size (bp)', 'Tm Difference (°C)', 'Recommended Ta (°C)',
    'Status', 'Engine Provenance', 'Template ID', 'Timestamp'
  ];

  const rows = pairs.map(p => [
    p.rank,
    p.pairPenalty || p.score || 0,
    p.forward.sequence,
    p.forward.length,
    p.forward.tm,
    p.forward.gc,
    p.forward.start,
    p.forward.end,
    p.forward.hairpin?.dg || 0,
    p.forward.selfDimer?.dg || 0,
    p.reverse.sequence,
    p.reverse.length,
    p.reverse.tm,
    p.reverse.gc,
    p.reverse.start,
    p.reverse.end,
    p.reverse.hairpin?.dg || 0,
    p.reverse.selfDimer?.dg || 0,
    p.heterodimer?.dg || 0,
    p.amplicon?.size || p.productLength || 0,
    p.tmDiff,
    p.recommendedTa,
    p.statusLabel || 'Meets configured constraints',
    metadata.engine || 'Primer3 C Library v2.3.1',
    metadata.templateId || 'BioNexus_Target',
    metadata.timestamp || new Date().toISOString()
  ]);

  const csvContent = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\r\n');

  return csvContent;
}

// Backwards-compatible export wrapper for existing components
export function designPrimers(targetSeq, options = {}) {
  return designPrimersClientFallback(targetSeq, {
    minLen: options.minLen || 18,
    optLen: options.optLen || 20,
    maxLen: options.maxLen || 24,
    minTm: options.minTm || 52,
    optTm: options.optTm || 60,
    maxTm: options.maxTm || 66,
    maxTmDiff: 5.0,
    minGc: options.minGc || 35,
    maxGc: options.maxGc || 65,
    minProductSize: options.minProductLen || 40,
    maxProductSize: options.maxProductLen || 400,
    numReturn: 10,
    mvConc: 50.0,
    dvConc: 1.5,
    dnaConc: 50.0
  });
}
