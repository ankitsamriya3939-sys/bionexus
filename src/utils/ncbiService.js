import { NCBI_API_KEY, clientNcbiQueue, formatNcbiDirectUrl } from '../services/bioDatabaseService.js';

const DIRECT_NCBI_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const TOOL_PARAM = 'tool=BioNexusStudio&email=support@bionexusstudio.ai';

const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const isBackendHost = typeof window !== 'undefined' && (window.location.port === '5000' || window.location.port === '8000' || window.location.port === '');
const API_BASE = (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_BASE_URL) || (isBackendHost ? '' : isLocalhost ? 'http://localhost:5000' : '');

export async function searchNcbi(db = 'nucleotide', term, retmax = 15) {
  if (!term || !term.trim()) return { ids: [], total: 0 };

  // 1. Try Backend Proxy First
  try {
    const proxyUrl = `${API_BASE}/api/ncbi/search?db=${encodeURIComponent(db)}&term=${encodeURIComponent(term)}&retmax=${retmax}`;
    const response = await fetch(proxyUrl, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (response.ok) {
      const data = await response.json();
      if (data && data.ids) return data;
    }
  } catch {
    // Backend offline or unreachable — fallback to direct NCBI
  }

  // 2. Fallback to Direct NCBI E-utilities
  try {
    const url = formatNcbiDirectUrl(`${DIRECT_NCBI_BASE}/esearch.fcgi?db=${db}&term=${encodeURIComponent(term)}&retmode=json&retmax=${retmax}&${TOOL_PARAM}`);
    const response = await clientNcbiQueue.fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`NCBI Search HTTP error ${response.status}`);
    const data = await response.json();

    const idList = data.esearchresult?.idlist || [];
    const count = parseInt(data.esearchresult?.count || 0, 10);

    return {
      ids: idList,
      total: count
    };
  } catch (err) {
    console.error('NCBI Search Error:', err);
    throw err;
  }
}

export async function fetchNcbiSummaries(db = 'nucleotide', ids = []) {
  if (!ids.length) return [];

  const idParam = ids.join(',');

  // 1. Try Backend Proxy First
  try {
    const proxyUrl = `${API_BASE}/api/ncbi/summary?db=${encodeURIComponent(db)}&id=${encodeURIComponent(idParam)}`;
    const response = await fetch(proxyUrl, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch {
    // Backend offline — fallback
  }

  // 2. Fallback to Direct NCBI E-utilities
  try {
    const url = formatNcbiDirectUrl(`${DIRECT_NCBI_BASE}/esummary.fcgi?db=${db}&id=${idParam}&retmode=json&${TOOL_PARAM}`);
    const response = await clientNcbiQueue.fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`NCBI Summary HTTP error ${response.status}`);
    const data = await response.json();

    const resultObj = data.result || {};
    const summaries = ids.map(id => {
      const item = resultObj[id];
      if (!item) return null;
      return {
        id,
        title: item.title || item.caption || item.source || 'No Title Available',
        organism: item.organism || item.source || 'Unknown Organism',
        length: item.slen || item.length || null,
        acc: item.caption || id,
        updateDate: item.updatedate || item.pubdate || '',
        extra: item
      };
    }).filter(Boolean);

    return summaries;
  } catch (err) {
    console.error('NCBI Summary Fetch Error:', err);
    throw err;
  }
}

export async function fetchFasta(db = 'nucleotide', id) {
  if (!id) return '';

  // 1. Try Backend Proxy First
  try {
    const proxyUrl = `${API_BASE}/api/ncbi/fasta?db=${encodeURIComponent(db)}&id=${encodeURIComponent(id)}`;
    const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
    if (response.ok) {
      const text = await response.text();
      if (text && text.includes('>')) return text;
    }
  } catch {
    // Backend offline or timeout — fallback to direct NCBI
  }

  // 2. Fallback to Direct NCBI E-utilities
  try {
    const url = formatNcbiDirectUrl(`${DIRECT_NCBI_BASE}/efetch.fcgi?db=${db}&id=${id}&rettype=fasta&retmode=text&${TOOL_PARAM}`);
    const response = await clientNcbiQueue.fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`NCBI Fetch HTTP error ${response.status}`);
    const text = await response.text();
    return text;
  } catch (err) {
    console.error('NCBI FASTA Fetch Error:', err);
    throw err;
  }
}

export function parseFastaHeader(fastaText) {
  if (!fastaText) return { header: '', sequence: '' };
  const lines = fastaText.trim().split('\n');
  let header = '';
  let seqLines = [];

  for (let line of lines) {
    if (line.startsWith('>')) {
      header = line.substring(1).trim();
    } else {
      seqLines.push(line.trim());
    }
  }

  return {
    header,
    sequence: seqLines.join('').toUpperCase()
  };
}

/**
 * Resolve an accession string, determine database, and retrieve verified record and sequence
 * Never calculates biological statistics from the accession string.
 */
export async function resolveAccessionRecord(rawAccession) {
  if (!rawAccession || !rawAccession.trim()) {
    throw new Error('Please enter an accession ID.');
  }

  const cleanedAcc = rawAccession.trim().toUpperCase();
  if (!/^[A-Z0-9_.-]{3,35}$/.test(cleanedAcc)) {
    throw new Error(`Invalid accession format: '${rawAccession}'. NCBI accessions consist of uppercase letters, digits, and optional underscores or versions (e.g. NC_000913.3, NM_000546.6, NP_000537.3).`);
  }

  // 1. Try Backend Proxy First
  try {
    const proxyUrl = `${API_BASE}/api/ncbi/resolve-accession?accession=${encodeURIComponent(cleanedAcc)}`;
    const response = await fetch(proxyUrl, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(12000) });
    if (response.ok) {
      const data = await response.json();
      if (data && data.sequence) {
        return data;
      }
    } else if (response.status === 404) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `Record for accession '${cleanedAcc}' not found in NCBI.`);
    }
  } catch (err) {
    // If it's a 404 from backend, rethrow
    if (err.message && err.message.includes('not found in NCBI')) {
      throw err;
    }
    // Otherwise fallback to direct NCBI
  }

  // 2. Direct NCBI Entrez Fallback
  // Determine candidate database
  let targetDb = null;
  if (/^(NC_|NM_|NR_|NZ_|NG_|NT_|NW_|XM_|XR_)/.test(cleanedAcc)) {
    targetDb = 'nucleotide';
  } else if (/^(NP_|AP_|XP_|YP_|ZP_|WP_)/.test(cleanedAcc)) {
    targetDb = 'protein';
  }

  if (!targetDb) {
    try {
      const searchNucUrl = formatNcbiDirectUrl(`${DIRECT_NCBI_BASE}/esearch.fcgi?db=nucleotide&term=${encodeURIComponent(cleanedAcc)}[Accession]&retmode=json&retmax=1&${TOOL_PARAM}`);
      const nucRes = await clientNcbiQueue.fetch(searchNucUrl, { signal: AbortSignal.timeout(7000) });
      if (nucRes.ok) {
        const nucData = await nucRes.json();
        if (nucData.esearchresult?.idlist?.length > 0) {
          targetDb = 'nucleotide';
        }
      }
    } catch {
      // Continue to check protein
    }

    if (!targetDb) {
      try {
        const searchProtUrl = formatNcbiDirectUrl(`${DIRECT_NCBI_BASE}/esearch.fcgi?db=protein&term=${encodeURIComponent(cleanedAcc)}[Accession]&retmode=json&retmax=1&${TOOL_PARAM}`);
        const protRes = await clientNcbiQueue.fetch(searchProtUrl, { signal: AbortSignal.timeout(7000) });
        if (protRes.ok) {
          const protData = await protRes.json();
          if (protData.esearchresult?.idlist?.length > 0) {
            targetDb = 'protein';
          }
        }
      } catch {
        // Continue
      }
    }
  }

  if (!targetDb) {
    targetDb = 'nucleotide';
  }

  // Step A: ESummary for metadata
  let summaryItem = null;
  let uid = null;
  try {
    const sumUrl = formatNcbiDirectUrl(`${DIRECT_NCBI_BASE}/esummary.fcgi?db=${targetDb}&id=${encodeURIComponent(cleanedAcc)}&retmode=json&${TOOL_PARAM}`);
    const sumRes = await clientNcbiQueue.fetch(sumUrl, { signal: AbortSignal.timeout(8000) });
    if (sumRes.ok) {
      const sumJson = await sumRes.json();
      const uids = sumJson.result?.uids || [];
      if (uids.length > 0) {
        uid = uids[0];
        summaryItem = sumJson.result[uid];
      }
    }
  } catch {
    // Continue
  }

  // If summary failed on nucleotide and target was not definite, try protein
  if (!summaryItem && targetDb === 'nucleotide' && !/^(NC_|NM_|NR_)/.test(cleanedAcc)) {
    try {
      const altSumUrl = formatNcbiDirectUrl(`${DIRECT_NCBI_BASE}/esummary.fcgi?db=protein&id=${encodeURIComponent(cleanedAcc)}&retmode=json&${TOOL_PARAM}`);
      const altRes = await clientNcbiQueue.fetch(altSumUrl, { signal: AbortSignal.timeout(8000) });
      if (altRes.ok) {
        const altJson = await altRes.json();
        const altUids = altJson.result?.uids || [];
        if (altUids.length > 0) {
          targetDb = 'protein';
          uid = altUids[0];
          summaryItem = altJson.result[uid];
        }
      }
    } catch {
      // Continue
    }
  }

  // Step B: EFetch for real FASTA
  const fastaUrl = formatNcbiDirectUrl(`${DIRECT_NCBI_BASE}/efetch.fcgi?db=${targetDb}&id=${encodeURIComponent(uid || cleanedAcc)}&rettype=fasta&retmode=text&${TOOL_PARAM}`);
  const fastaRes = await clientNcbiQueue.fetch(fastaUrl, { signal: AbortSignal.timeout(10000) });
  if (!fastaRes.ok) {
    throw new Error(`NCBI EFetch request failed (HTTP ${fastaRes.status}). Could not retrieve record for '${cleanedAcc}'.`);
  }
  const fastaText = await fastaRes.text();
  if (!fastaText || !fastaText.includes('>')) {
    throw new Error(`No sequence record found for accession '${cleanedAcc}' in NCBI ${targetDb} database. Please verify the accession format and version.`);
  }

  const { header: fastaHeader, sequence: biologicalSequence } = parseFastaHeader(fastaText);

  let moleculeType = targetDb === 'protein' ? 'protein' : 'DNA';
  if (targetDb === 'nucleotide') {
    moleculeType = biologicalSequence.includes('U') && !biologicalSequence.includes('T') ? 'RNA' : 'DNA';
  }

  return {
    accession: summaryItem?.caption || cleanedAcc,
    uid: uid || cleanedAcc,
    database: targetDb,
    moleculeType,
    title: summaryItem?.title || fastaHeader || `NCBI Record ${cleanedAcc}`,
    organism: summaryItem?.organism || summaryItem?.source || 'Unknown organism',
    length: summaryItem?.slen ? parseInt(summaryItem.slen, 10) : biologicalSequence.length,
    updateDate: summaryItem?.updatedate || summaryItem?.pubdate || '',
    topology: summaryItem?.topology || null,
    strand: summaryItem?.strand || null,
    fastaHeader,
    sequence: biologicalSequence,
    rawFasta: fastaText,
    provenance: {
      sourceDatabase: targetDb === 'protein' ? 'NCBI Protein' : 'NCBI Nucleotide',
      externalId: cleanedAcc,
      retrievedAt: new Date().toISOString()
    }
  };
}

