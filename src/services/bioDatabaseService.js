/**
 * BioNexus Studio: Global Bio-Database Service
 * Research-Grade multi-database retrieval, parsing, cross-reference mapping, and sequence provenance.
 *
 * Core Principle: Every value on screen is either:
 * (a) returned by a real API, with its source shown, or
 * (b) computed by BioNexus, with its method shown.
 * Never fabricate accessions, annotations, counts, latency, or "live" indicators.
 */

const DIRECT_NCBI_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const DIRECT_UNIPROT_BASE = 'https://rest.uniprot.org/uniprotkb';
const DIRECT_EBI_BASE = 'https://www.ebi.ac.uk/ebisearch/ws/rest';
const DIRECT_ENA_BROWSER = 'https://www.ebi.ac.uk/ena/browser/api';
const NCBI_TOOL_PARAM = 'tool=BioNexusStudio&email=support@bionexusstudio.ai';

// NCBI API Key and Rate Limits (3 req/s without key, 10 req/s with key)
export const NCBI_API_KEY = (typeof import.meta !== 'undefined' && (import.meta?.env?.VITE_NCBI_API_KEY || import.meta?.env?.NCBI_API_KEY)) || 
  (typeof process !== 'undefined' && (process.env?.NCBI_API_KEY || process.env?.VITE_NCBI_API_KEY)) || 
  (typeof window !== 'undefined' && (window.__NCBI_API_KEY__ || window.NCBI_API_KEY)) || 
  '';

export const NCBI_RATE_LIMIT = NCBI_API_KEY ? 10 : 3;

export function formatNcbiDirectUrl(rawUrl) {
  if (!NCBI_API_KEY) return rawUrl;
  if (rawUrl.includes('api_key=')) return rawUrl;
  const sep = rawUrl.includes('?') ? '&' : '?';
  return `${rawUrl}${sep}api_key=${encodeURIComponent(NCBI_API_KEY)}`;
}

export class ClientNcbiQueue {
  constructor(apiKey = NCBI_API_KEY) {
    this.apiKey = (apiKey || '').trim();
    this.rateLimit = this.apiKey ? 10 : 3;
    this.minInterval = Math.ceil(1000 / this.rateLimit);
    this.lastRequestTime = 0;
    this.queue = [];
    this.processing = false;
  }

  fetch(url, options = {}, retries = 0) {
    const formatted = formatNcbiDirectUrl(url);
    const headers = {
      ...(options.headers || {})
    };
    if (this.apiKey) {
      headers['NCBI-API-Key'] = this.apiKey;
    }
    return new Promise((resolve, reject) => {
      this.queue.push({ url: formatted, options: { ...options, headers }, resolve, reject, retries });
      this.process();
    });
  }

  async process() {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const now = Date.now();
        const elapsed = now - this.lastRequestTime;
        if (elapsed < this.minInterval) {
          await new Promise(r => setTimeout(r, this.minInterval - elapsed));
        }

        const task = this.queue.shift();
        this.lastRequestTime = Date.now();

        try {
          const res = await fetch(task.url, task.options);
          if ((res.status === 429 || res.status === 503) && task.retries < 3) {
            const backoff = (task.retries + 1) * 800;
            await new Promise(r => setTimeout(r, backoff));
            this.fetch(task.url, task.options, task.retries + 1)
              .then(task.resolve)
              .catch(task.reject);
            continue;
          }
          task.resolve(res);
        } catch (err) {
          task.reject(err);
        }
      }
    } finally {
      this.processing = false;
    }
  }
}

export const clientNcbiQueue = new ClientNcbiQueue();

const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const isBackendHost = typeof window !== 'undefined' && 
  (window.location.port === '5000' || window.location.port === '8000' || window.location.port === '');
export const API_BASE = (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_BASE_URL) || 
  (isBackendHost ? '' : isLocalhost ? 'http://localhost:5000' : '');

export const PARSER_VERSION = 'BioNexus-GBS-v3.0.0';

// In-memory LRU query cache to prevent duplicate calls
const queryCache = new Map();
const MAX_CACHE_SIZE = 100;

function getCache(key) {
  if (queryCache.has(key)) {
    const val = queryCache.get(key);
    // Refresh position
    queryCache.delete(key);
    queryCache.set(key, val);
    return val;
  }
  return null;
}

function setCache(key, val) {
  if (queryCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = queryCache.keys().next().value;
    queryCache.delete(oldestKey);
  }
  queryCache.set(key, val);
}

// -------------------------------------------------------------
// 1. QUERY UNDERSTANDING & HEURISTIC CLASSIFIER
// -------------------------------------------------------------
export function classifyQuery(input) {
  if (!input || typeof input !== 'string') {
    return {
      type: 'empty',
      label: 'Empty Query',
      suggestion: 'Enter gene symbol, accession, or organism...',
      targetDatabases: ['ncbi', 'uniprot', 'ena'],
      confidence: 0
    };
  }

  const query = input.trim();
  const upper = query.toUpperCase();

  // 1. NCBI RefSeq Nucleotide Accession
  if (/^(NC_|NM_|NR_|NZ_|NG_|NT_|NW_|XM_|XR_)\d+(\.\d+)?$/i.test(upper)) {
    return {
      type: 'refseq_nucleotide',
      label: 'RefSeq Nucleotide Accession',
      suggestion: `Detected RefSeq nucleotide transcript/genomic accession '${upper}'`,
      detectedAccession: upper,
      targetDatabases: ['ncbi', 'ena'],
      recommendedType: 'nucleotide',
      confidence: 0.98
    };
  }

  // 2. NCBI RefSeq Protein Accession
  if (/^(NP_|AP_|XP_|YP_|ZP_|WP_)\d+(\.\d+)?$/i.test(upper)) {
    return {
      type: 'refseq_protein',
      label: 'RefSeq Protein Accession',
      suggestion: `Detected RefSeq curated protein accession '${upper}'`,
      detectedAccession: upper,
      targetDatabases: ['ncbi', 'uniprot'],
      recommendedType: 'protein',
      confidence: 0.98
    };
  }

  // 3. UniProtKB Accession (e.g., P04637, P38398, Q9Y6K1, A0A024RBG1)
  if (/^([OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2})$/i.test(upper)) {
    return {
      type: 'uniprot_accession',
      label: 'UniProtKB Accession',
      suggestion: `Detected UniProt knowledgebase accession '${upper}'`,
      detectedAccession: upper,
      targetDatabases: ['uniprot'],
      recommendedType: 'protein',
      confidence: 0.95
    };
  }

  // 4. ENA / GenBank Nucleotide Accession (e.g. U14680, PX673138, AF000001, AY123456)
  if (/^([A-Z]{1,2}\d{5,6}|[A-Z]{4}\d{8,10})(\.\d+)?$/i.test(upper)) {
    return {
      type: 'genbank_ena_accession',
      label: 'ENA / GenBank Accession',
      suggestion: `Detected standard nucleotide accession '${upper}'`,
      detectedAccession: upper,
      targetDatabases: ['ena', 'ncbi'],
      recommendedType: 'nucleotide',
      confidence: 0.92
    };
  }

  // 5. Organism Scientific Name (e.g., Homo sapiens, Mus musculus, Drosophila melanogaster)
  if (/^[A-Z][a-z]+\s+[a-z]+(\s+[a-z]+)?$/.test(query)) {
    return {
      type: 'organism',
      label: 'Organism Name',
      suggestion: `Looks like taxonomic species name '${query}'`,
      targetDatabases: ['ncbi', 'uniprot', 'ena'],
      recommendedType: 'organism',
      confidence: 0.90
    };
  }

  // 6. Gene Symbol (e.g., BRCA1, TP53, EGFR, INS, ACTB)
  if (/^[A-Z0-9]{2,10}(-[A-Z0-9]{1,5})?$/i.test(upper) && !/^\d+$/.test(upper)) {
    return {
      type: 'gene_symbol',
      label: 'Gene Symbol',
      suggestion: `Looks like standard gene symbol '${upper}'`,
      targetDatabases: ['ncbi', 'uniprot', 'ena'],
      recommendedType: 'gene',
      confidence: 0.88
    };
  }

  // 7. NCBI Gene ID or PubMed ID (numeric)
  if (/^\d{3,9}$/.test(query)) {
    return {
      type: 'numeric_id',
      label: 'Numeric Database Identifier',
      suggestion: `Detected integer ID '${query}' (NCBI Gene ID, TaxID, or PMID)`,
      targetDatabases: ['ncbi'],
      recommendedType: 'gene',
      confidence: 0.85
    };
  }

  // 8. Raw Biological Sequence check
  const cleanSeq = query.replace(/[\s\r\n\d]/g, '').toUpperCase();
  if (cleanSeq.length >= 15 && /^[ACGTU]+$/.test(cleanSeq)) {
    return {
      type: 'sequence_nucleotide',
      label: 'Nucleotide Sequence',
      suggestion: `Detected raw DNA/RNA sequence (${cleanSeq.length} bp)`,
      targetDatabases: ['blast'],
      recommendedType: 'nucleotide',
      confidence: 0.96
    };
  }

  // Default General Text Search
  return {
    type: 'keyword',
    label: 'Biological Keyword',
    suggestion: `Keyword search for '${query}'`,
    targetDatabases: ['ncbi', 'uniprot', 'ena'],
    recommendedType: 'all',
    confidence: 0.60
  };
}

// -------------------------------------------------------------
// 2. NCBI ENTREZ RETRIEVER & PARSER
// -------------------------------------------------------------
export async function searchNcbiDatabase(term, options = {}) {
  const { limit = 15, recordType = 'all', organism = '' } = options;
  const start = performance.now();
  const cacheKey = `ncbi_${term}_${recordType}_${organism}_${limit}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return { ...cached, latencyMs: Math.round(performance.now() - start), cacheStatus: 'HIT' };
  }

  // Choose appropriate Entrez database based on recordType or query
  let entrezDb = 'nucleotide';
  if (recordType === 'protein') {
    entrezDb = 'protein';
  } else if (recordType === 'gene') {
    entrezDb = 'gene';
  } else if (recordType === 'nucleotide') {
    entrezDb = 'nucleotide';
  } else {
    const classification = classifyQuery(term);
    if (classification.recommendedType === 'protein') entrezDb = 'protein';
    else if (classification.recommendedType === 'gene') entrezDb = 'gene';
  }

  let finalTerm = term.trim();
  if (organism && organism.trim()) {
    finalTerm = `${finalTerm} AND ${organism.trim()}[Organism]`;
  }

  const requestUrl = `${API_BASE}/api/ncbi/search?db=${encodeURIComponent(entrezDb)}&term=${encodeURIComponent(finalTerm)}&retmax=${limit}`;
  let ids = [];
  let totalReported = 0;
  let usedProxy = false;

  try {
    const proxyRes = await fetch(requestUrl, { signal: AbortSignal.timeout(8000) });
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      ids = data.ids || [];
      totalReported = data.total || 0;
      usedProxy = true;
    }
  } catch {
    // Backend unavailable, fallback to direct NCBI
  }

  if (!usedProxy) {
    const directUrl = formatNcbiDirectUrl(`${DIRECT_NCBI_BASE}/esearch.fcgi?db=${encodeURIComponent(entrezDb)}&term=${encodeURIComponent(finalTerm)}&retmode=json&retmax=${limit}&${NCBI_TOOL_PARAM}`);
    const directRes = await clientNcbiQueue.fetch(directUrl, { signal: AbortSignal.timeout(10000) });
    if (!directRes.ok) throw new Error(`NCBI ESearch HTTP Error ${directRes.status}`);
    const data = await directRes.json();
    ids = data.esearchresult?.idlist || [];
    totalReported = parseInt(data.esearchresult?.count || '0', 10);
  }

  if (!ids.length) {
    const result = {
      source: 'NCBI',
      sourceBadge: 'NCBI Entrez',
      sourceColor: '#2563eb',
      providerId: 'ncbi',
      records: [],
      total: totalReported,
      latencyMs: Math.round(performance.now() - start),
      endpoint: usedProxy ? requestUrl : `${DIRECT_NCBI_BASE}/esearch.fcgi?db=${entrezDb}`,
      cacheStatus: 'MISS'
    };
    setCache(cacheKey, result);
    return result;
  }

  // Fetch document summaries for IDs
  let rawSummaries = [];
  const sumProxyUrl = `${API_BASE}/api/ncbi/summary?db=${encodeURIComponent(entrezDb)}&id=${encodeURIComponent(ids.join(','))}`;
  try {
    const sumRes = await fetch(sumProxyUrl, { signal: AbortSignal.timeout(8000) });
    if (sumRes.ok) {
      const data = await sumRes.json();
      if (Array.isArray(data)) rawSummaries = data;
    }
  } catch {}

  if (!rawSummaries.length) {
    const sumDirectUrl = formatNcbiDirectUrl(`${DIRECT_NCBI_BASE}/esummary.fcgi?db=${encodeURIComponent(entrezDb)}&id=${encodeURIComponent(ids.join(','))}&retmode=json&${NCBI_TOOL_PARAM}`);
    const sumRes = await clientNcbiQueue.fetch(sumDirectUrl, { signal: AbortSignal.timeout(10000) });
    if (sumRes.ok) {
      const data = await sumRes.json();
      const resObj = data.result || {};
      rawSummaries = ids.map(id => {
        const item = resObj[id];
        if (!item) return null;
        return {
          id,
          title: item.title || item.description || item.caption || `NCBI ${entrezDb} ${id}`,
          organism: item.organism || item.source || item.scientificname || 'Unknown organism',
          length: item.slen || item.length || null,
          acc: item.caption || item.accessionversion || item.name || id,
          updateDate: item.updatedate || item.pubdate || '',
          extra: item
        };
      }).filter(Boolean);
    }
  }

  const duration = Math.round(performance.now() - start);

  // Normalize NCBI records with source-specific fields
  const records = rawSummaries.map(s => {
    const extra = s.extra || {};
    let moleculeType = 'DNA';
    let recordTypeStandard = 'nucleotide';

    if (entrezDb === 'protein') {
      moleculeType = 'protein';
      recordTypeStandard = 'protein';
    } else if (entrezDb === 'gene') {
      moleculeType = 'genomic';
      recordTypeStandard = 'gene';
    } else if (s.title && s.title.toLowerCase().includes('mrna')) {
      moleculeType = 'RNA';
    }

    const accession = s.acc || s.id;
    const title = s.title || (extra.description ? `${extra.name || ''}: ${extra.description}` : `NCBI ${entrezDb} record`);
    const organismName = s.organism || extra.organism?.scientificname || extra.scientificname || 'Unknown organism';
    const geneId = entrezDb === 'gene' ? s.id : (extra.geneid || null);
    const geneSymbol = extra.name || extra.genename || null;
    const chromosome = extra.chromosome || extra.maplocation || null;

    return {
      id: `ncbi_${entrezDb}_${s.id}`,
      originalId: s.id,
      accession,
      version: accession.includes('.') ? accession.split('.')[1] : null,
      title,
      organism: organismName,
      source: 'NCBI',
      sourceBadge: 'NCBI Entrez',
      sourceColor: '#2563eb',
      database: entrezDb,
      recordType: recordTypeStandard,
      moleculeType,
      length: s.length ? parseInt(s.length, 10) : null,
      lengthUnit: entrezDb === 'protein' ? 'aa' : entrezDb === 'nucleotide' ? 'bp' : null,
      updateDate: s.updateDate || '',
      description: extra.summary || extra.description || title,
      geneId,
      geneSymbol,
      chromosome,
      mapLocation: extra.maplocation || null,
      originalUrl: entrezDb === 'gene'
        ? `https://www.ncbi.nlm.nih.gov/gene/${s.id}`
        : entrezDb === 'protein'
        ? `https://www.ncbi.nlm.nih.gov/protein/${accession}`
        : `https://www.ncbi.nlm.nih.gov/nuccore/${accession}`,
      provenance: {
        apiProvider: 'National Center for Biotechnology Information (NCBI Entrez)',
        endpoint: `${DIRECT_NCBI_BASE}/esummary.fcgi?db=${entrezDb}`,
        requestUrl: usedProxy ? sumProxyUrl : `${DIRECT_NCBI_BASE}/esummary.fcgi`,
        parserVersion: PARSER_VERSION,
        retrievedAt: new Date().toISOString(),
        cacheStatus: 'MISS',
        uid: s.id
      },
      raw: s
    };
  });

  const result = {
    source: 'NCBI',
    sourceBadge: 'NCBI Entrez',
    sourceColor: '#2563eb',
    providerId: 'ncbi',
    records,
    total: totalReported,
    latencyMs: duration,
    endpoint: usedProxy ? requestUrl : `${DIRECT_NCBI_BASE}/esearch.fcgi?db=${entrezDb}`,
    cacheStatus: 'MISS'
  };

  setCache(cacheKey, result);
  return result;
}

// -------------------------------------------------------------
// 3. UNIPROT KNOWLEDGEBASE RETRIEVER & PARSER
// -------------------------------------------------------------
export async function searchUniProtDatabase(term, options = {}) {
  const { limit = 15, reviewedOnly = false, organism = '' } = options;
  const start = performance.now();
  const cacheKey = `uniprot_${term}_${reviewedOnly}_${organism}_${limit}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return { ...cached, latencyMs: Math.round(performance.now() - start), cacheStatus: 'HIT' };
  }

  let queryBuilder = term.trim();
  if (reviewedOnly) {
    queryBuilder += ' AND reviewed:true';
  }
  if (organism && organism.trim()) {
    queryBuilder += ` AND organism_name:"${organism.trim()}"`;
  }

  const proxyUrl = `${API_BASE}/api/uniprot/search?query=${encodeURIComponent(queryBuilder)}&size=${limit}`;
  const directUrl = `${DIRECT_UNIPROT_BASE}/search?query=${encodeURIComponent(queryBuilder)}&format=json&size=${limit}`;

  let data = null;
  let usedProxy = false;
  let totalReported = 0;

  try {
    const proxyRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
    if (proxyRes.ok) {
      data = await proxyRes.json();
      usedProxy = true;
    }
  } catch {}

  if (!data) {
    const directRes = await fetch(directUrl, { signal: AbortSignal.timeout(10000) });
    if (!directRes.ok) throw new Error(`UniProt HTTP Error ${directRes.status}`);
    data = await directRes.json();
  }

  const rawEntries = data.results || [];
  totalReported = rawEntries.length;
  const duration = Math.round(performance.now() - start);

  const records = rawEntries.map(entry => {
    const acc = entry.primaryAccession || entry.uniProtkbId;
    const isReviewed = entry.entryType === 'UniProtKB reviewed (Swiss-Prot)';
    const proteinName = entry.proteinDescription?.recommendedName?.fullName?.value ||
      entry.proteinDescription?.submissionNames?.[0]?.fullName?.value ||
      'Protein Entry';

    const geneNames = (entry.genes || []).map(g => g.geneName?.value).filter(Boolean);
    const geneSymbol = geneNames[0] || null;
    const organismObj = entry.organism || {};
    const organismName = organismObj.scientificName || 'Unknown organism';
    const commonName = organismObj.commonName || null;
    const taxId = organismObj.taxonId || null;
    const lineage = organismObj.lineage || [];

    const seqObj = entry.sequence || {};
    const length = seqObj.length || null;

    // Function annotation
    const funcComment = (entry.comments || []).find(c => c.commentType === 'FUNCTION');
    const functionDesc = funcComment?.texts?.[0]?.value || null;

    // Subcellular locations
    const subcellComment = (entry.comments || []).find(c => c.commentType === 'SUBCELLULAR LOCATION');
    const subcellularLocations = (subcellComment?.subcellularLocations || []).map(sl => sl.location?.value).filter(Boolean);

    // Domains
    const domainComments = (entry.comments || []).filter(c => c.commentType === 'DOMAIN');
    const domainNames = domainComments.map(d => d.texts?.[0]?.value).filter(Boolean);

    // Extract Cross-References (PDB, RefSeq, Ensembl, GeneID, EMBL, AlphaFoldDB)
    const crossRefs = entry.uniProtKBCrossReferences || [];
    const pdbRefs = crossRefs.filter(x => x.database === 'PDB').map(p => {
      const methodProp = p.properties?.find(prop => prop.key === 'Method')?.value || 'Experimental';
      const resProp = p.properties?.find(prop => prop.key === 'Resolution')?.value || null;
      const chainsProp = p.properties?.find(prop => prop.key === 'Chains')?.value || null;
      return {
        pdbId: p.id,
        method: methodProp,
        resolution: resProp,
        chains: chainsProp
      };
    });

    const refseqRefs = crossRefs.filter(x => x.database === 'RefSeq').map(r => ({
      id: r.id,
      nucleotideAcc: r.properties?.find(p => p.key === 'NucleotideSequenceId')?.value || null
    }));

    const geneIdRefs = crossRefs.filter(x => x.database === 'GeneID').map(g => g.id);
    const ensemblRefs = crossRefs.filter(x => x.database === 'Ensembl').map(e => e.id);
    const emblRefs = crossRefs.filter(x => x.database === 'EMBL').map(e => e.id);

    // Evidence codes (ECO codes)
    const evidenceCodes = new Set();
    (entry.features || []).forEach(f => {
      (f.evidences || []).forEach(e => {
        if (e.evidenceCode) evidenceCodes.add(e.evidenceCode);
      });
    });

    return {
      id: `uniprot_${acc}`,
      originalId: acc,
      accession: acc,
      version: null,
      title: geneSymbol ? `[${geneSymbol}] ${proteinName}` : proteinName,
      proteinName,
      geneSymbol,
      geneNames,
      organism: organismName,
      commonName,
      taxId,
      lineage,
      source: 'UniProt',
      sourceBadge: 'UniProt KB',
      sourceColor: '#0d9488',
      database: 'uniprotkb',
      recordType: 'protein',
      moleculeType: 'protein',
      length,
      lengthUnit: 'aa',
      curationStatus: isReviewed ? 'reviewed' : 'unreviewed',
      curationLabel: isReviewed ? 'Swiss-Prot Reviewed' : 'TrEMBL Unreviewed',
      hasExperimentalValidation: pdbRefs.length > 0 || Array.from(evidenceCodes).some(c => c.includes('0000269')),
      description: functionDesc || (geneSymbol ? `${proteinName} encoded by ${geneSymbol}` : proteinName),
      functionDesc,
      subcellularLocations,
      domains: domainNames,
      pdbRefs,
      refseqRefs,
      geneIdRefs,
      ensemblRefs,
      emblRefs,
      evidenceCodes: Array.from(evidenceCodes),
      features: entry.features || [],
      originalUrl: `https://www.uniprot.org/uniprotkb/${acc}/entry`,
      provenance: {
        apiProvider: 'UniProt Knowledgebase (Swiss-Prot / TrEMBL)',
        endpoint: `${DIRECT_UNIPROT_BASE}/${acc}.json`,
        requestUrl: usedProxy ? proxyUrl : directUrl,
        parserVersion: PARSER_VERSION,
        retrievedAt: new Date().toISOString(),
        cacheStatus: 'MISS',
        uid: acc
      },
      raw: entry
    };
  });

  const result = {
    source: 'UniProt',
    sourceBadge: 'UniProt KB',
    sourceColor: '#0d9488',
    providerId: 'uniprot',
    records,
    total: totalReported,
    latencyMs: duration,
    endpoint: usedProxy ? proxyUrl : directUrl,
    cacheStatus: 'MISS'
  };

  setCache(cacheKey, result);
  return result;
}

// -------------------------------------------------------------
// 4. ENA (EUROPEAN NUCLEOTIDE ARCHIVE / EMBL-EBI) RETRIEVER & PARSER
// -------------------------------------------------------------
export async function searchEnaDatabase(term, options = {}) {
  const { limit = 15, organism = '' } = options;
  const start = performance.now();
  const cacheKey = `ena_${term}_${organism}_${limit}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return { ...cached, latencyMs: Math.round(performance.now() - start), cacheStatus: 'HIT' };
  }

  let finalQuery = term.trim();
  if (organism && organism.trim()) {
    finalQuery = `${finalQuery} AND scientific_name:"${organism.trim()}"`;
  }

  const proxyUrl = `${API_BASE}/api/ena/search?query=${encodeURIComponent(finalQuery)}&size=${limit}&domain=embl`;
  const directUrl = `${DIRECT_EBI_BASE}/embl?query=${encodeURIComponent(finalQuery)}&format=json&size=${limit}&fields=name,description,scientific_name,length`;

  let data = null;
  let usedProxy = false;
  let totalReported = 0;

  try {
    const proxyRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
    if (proxyRes.ok) {
      data = await proxyRes.json();
      usedProxy = true;
    }
  } catch {}

  if (!data) {
    const directRes = await fetch(directUrl, { signal: AbortSignal.timeout(10000) });
    if (!directRes.ok) throw new Error(`ENA / EBI Search HTTP Error ${directRes.status}`);
    data = await directRes.json();
  }

  const entries = data.entries || [];
  totalReported = parseInt(data.hitCount || `${entries.length}`, 10);
  const duration = Math.round(performance.now() - start);

  const records = entries.map(entry => {
    const accession = entry.id;
    const fields = entry.fields || {};
    const description = fields.description?.[0] || fields.name?.[0] || `ENA Sequence ${accession}`;
    const scientificName = fields.scientific_name?.[0] || 'Unspecified Organism';
    const lengthStr = fields.length?.[0] || null;
    const length = lengthStr ? parseInt(lengthStr, 10) : null;
    const resourceIdentified = entry.source || 'ENA / EMBL-Bank';

    return {
      id: `ena_${accession}`,
      originalId: accession,
      accession,
      version: null,
      title: description,
      organism: scientificName,
      source: 'ENA',
      sourceBadge: 'ENA / EMBL-EBI',
      sourceColor: '#d97706',
      database: 'ena_embl_bank',
      resourceDetails: `European Nucleotide Archive (${resourceIdentified})`,
      recordType: 'nucleotide',
      moleculeType: 'DNA',
      length,
      lengthUnit: 'bp',
      description,
      originalUrl: `https://www.ebi.ac.uk/ena/browser/view/${accession}`,
      provenance: {
        apiProvider: 'European Bioinformatics Institute (EMBL-EBI / ENA)',
        endpoint: `${DIRECT_EBI_BASE}/embl`,
        requestUrl: usedProxy ? proxyUrl : directUrl,
        parserVersion: PARSER_VERSION,
        retrievedAt: new Date().toISOString(),
        cacheStatus: 'MISS',
        uid: accession
      },
      raw: entry
    };
  });

  const result = {
    source: 'ENA',
    sourceBadge: 'ENA / EMBL-EBI',
    sourceColor: '#d97706',
    providerId: 'ena',
    records,
    total: totalReported,
    latencyMs: duration,
    endpoint: usedProxy ? proxyUrl : directUrl,
    cacheStatus: 'MISS'
  };

  setCache(cacheKey, result);
  return result;
}

// -------------------------------------------------------------
// 5. INDEPENDENT PARALLEL MULTI-DATABASE RETRIEVER
// -------------------------------------------------------------
export async function searchAllDatabases(term, options = {}) {
  const {
    activeSource = 'all', // 'all' | 'ncbi' | 'uniprot' | 'ena'
    recordType = 'all',   // 'all' | 'gene' | 'nucleotide' | 'protein'
    organism = '',
    limit = 15
  } = options;

  if (!term || !term.trim()) {
    return {
      query: '',
      sources: {
        ncbi: { status: 'idle', records: [], total: 0, latencyMs: null, error: null },
        uniprot: { status: 'idle', records: [], total: 0, latencyMs: null, error: null },
        ena: { status: 'idle', records: [], total: 0, latencyMs: null, error: null }
      },
      allRecords: [],
      counts: { total: 0, ncbi: 0, uniprot: 0, ena: 0 },
      isPartial: false,
      failedSources: []
    };
  }

  const queries = [];
  const providersToQuery = [];

  if (activeSource === 'all' || activeSource === 'ncbi') {
    providersToQuery.push('ncbi');
    queries.push(
      searchNcbiDatabase(term, { limit, recordType, organism })
        .then(res => ({ providerId: 'ncbi', success: true, res }))
        .catch(err => ({ providerId: 'ncbi', success: false, error: err.message || 'NCBI request failed' }))
    );
  }

  if (activeSource === 'all' || activeSource === 'uniprot') {
    providersToQuery.push('uniprot');
    queries.push(
      searchUniProtDatabase(term, { limit, reviewedOnly: false, organism })
        .then(res => ({ providerId: 'uniprot', success: true, res }))
        .catch(err => ({ providerId: 'uniprot', success: false, error: err.message || 'UniProt request failed' }))
    );
  }

  if (activeSource === 'all' || activeSource === 'ena') {
    providersToQuery.push('ena');
    queries.push(
      searchEnaDatabase(term, { limit, organism })
        .then(res => ({ providerId: 'ena', success: true, res }))
        .catch(err => ({ providerId: 'ena', success: false, error: err.message || 'ENA request failed' }))
    );
  }

  const outcomes = await Promise.allSettled(queries);

  const sourcesState = {
    ncbi: { status: 'idle', records: [], total: 0, latencyMs: null, error: null },
    uniprot: { status: 'idle', records: [], total: 0, latencyMs: null, error: null },
    ena: { status: 'idle', records: [], total: 0, latencyMs: null, error: null }
  };

  const failedSources = [];
  const allRecords = [];

  outcomes.forEach(outcome => {
    if (outcome.status === 'fulfilled') {
      const item = outcome.value;
      const pid = item.providerId;
      if (item.success && item.res) {
        const r = item.res;
        sourcesState[pid] = {
          status: r.records.length > 0 ? 'results' : 'no_results',
          records: r.records,
          total: r.total,
          latencyMs: r.latencyMs,
          error: null,
          endpoint: r.endpoint
        };
        allRecords.push(...r.records);
      } else {
        sourcesState[pid] = {
          status: 'error',
          records: [],
          total: 0,
          latencyMs: null,
          error: item.error
        };
        failedSources.push(pid);
      }
    }
  });

  const successfulCount = providersToQuery.length - failedSources.length;
  const isPartial = failedSources.length > 0 && successfulCount > 0;

  return {
    query: term,
    sources: sourcesState,
    allRecords,
    counts: {
      total: allRecords.length,
      ncbi: sourcesState.ncbi.records.length,
      uniprot: sourcesState.uniprot.records.length,
      ena: sourcesState.ena.records.length,
      reportedTotals: {
        ncbi: sourcesState.ncbi.total,
        uniprot: sourcesState.uniprot.total,
        ena: sourcesState.ena.total
      }
    },
    isPartial,
    failedSources
  };
}

// -------------------------------------------------------------
// 6. LINKED RECORDS MAP ENGINE (NCBI ELink & UniProt X-Refs)
// -------------------------------------------------------------
export async function fetchLinkedRecordsMap(record) {
  if (!record) return { nodes: [], edges: [], metadata: {} };

  const nodes = [];
  const edges = [];
  const seenNodeIds = new Set();

  function addNode(node) {
    if (!seenNodeIds.has(node.id)) {
      seenNodeIds.add(node.id);
      nodes.push(node);
    }
  }

  function addEdge(edge) {
    edges.push(edge);
  }

  // Root node from current record
  const rootNodeId = record.id;
  addNode({
    id: rootNodeId,
    label: record.accession || record.geneSymbol || record.title,
    sublabel: record.recordType ? record.recordType.toUpperCase() : 'ENTRY',
    source: record.source,
    sourceColor: record.sourceColor,
    type: record.recordType || 'record',
    status: 'present',
    isRoot: true,
    data: record
  });

  // Scenario A: Record is or contains an NCBI Gene ID
  if (record.geneId || record.database === 'gene') {
    const geneId = record.geneId || record.originalId;
    try {
      const elinkProxy = `${API_BASE}/api/ncbi/elink?dbfrom=gene&id=${geneId}&db=nuccore,protein`;
      let linkData = null;

      try {
        const elinkRes = await fetch(elinkProxy, { signal: AbortSignal.timeout(6000) });
        if (elinkRes.ok) linkData = await elinkRes.json();
      } catch {}

      if (!linkData) {
        const directElink = formatNcbiDirectUrl(`${DIRECT_NCBI_BASE}/elink.fcgi?dbfrom=gene&id=${geneId}&db=nuccore,protein&retmode=json&${NCBI_TOOL_PARAM}`);
        const directRes = await clientNcbiQueue.fetch(directElink, { signal: AbortSignal.timeout(8000) });
        if (directRes.ok) linkData = await directRes.json();
      }

      const linksetdbs = linkData?.linksets?.[0]?.linksetdbs || [];
      const rnaLinks = linksetdbs.find(x => x.linkname === 'gene_nuccore_refseqrna')?.links || [];
      const protLinks = linksetdbs.find(x => x.linkname === 'gene_protein_refseq')?.links || [];

      if (rnaLinks.length > 0) {
        const transcriptId = `ncbi_nuccore_${rnaLinks[0]}`;
        addNode({
          id: transcriptId,
          label: `RefSeq mRNA (${rnaLinks[0]})`,
          sublabel: 'TRANSCRIPT',
          source: 'NCBI',
          sourceColor: '#2563eb',
          type: 'transcript',
          status: 'present',
          externalId: rnaLinks[0],
          url: `https://www.ncbi.nlm.nih.gov/nuccore/${rnaLinks[0]}`
        });
        addEdge({
          source: rootNodeId,
          target: transcriptId,
          relationship: 'transcribed_to',
          label: 'Transcribed To',
          provenance: 'NCBI ELink (gene_nuccore_refseqrna)'
        });

        if (protLinks.length > 0) {
          const proteinNodeId = `ncbi_protein_${protLinks[0]}`;
          addNode({
            id: proteinNodeId,
            label: `RefSeq Protein (${protLinks[0]})`,
            sublabel: 'PROTEIN',
            source: 'NCBI',
            sourceColor: '#2563eb',
            type: 'protein',
            status: 'present',
            externalId: protLinks[0],
            url: `https://www.ncbi.nlm.nih.gov/protein/${protLinks[0]}`
          });
          addEdge({
            source: transcriptId,
            target: proteinNodeId,
            relationship: 'translates_to',
            label: 'Translates To',
            provenance: 'NCBI ELink (gene_protein_refseq)'
          });
        }
      }
    } catch {
      // ELink failed
    }
  }

  // Scenario B: Record is UniProt entry
  if (record.source === 'UniProt' || record.raw?.uniProtKBCrossReferences) {
    const raw = record.raw || {};
    const xRefs = raw.uniProtKBCrossReferences || [];

    // RefSeq links
    const refseq = xRefs.filter(x => x.database === 'RefSeq');
    if (refseq.length > 0) {
      const topRefseq = refseq[0];
      const rnaAcc = topRefseq.properties?.find(p => p.key === 'NucleotideSequenceId')?.value || topRefseq.id;
      const rnaNodeId = `refseq_rna_${topRefseq.id}`;
      addNode({
        id: rnaNodeId,
        label: rnaAcc,
        sublabel: 'REFSEQ TRANSCRIPT',
        source: 'NCBI RefSeq',
        sourceColor: '#2563eb',
        type: 'transcript',
        status: 'present',
        url: `https://www.ncbi.nlm.nih.gov/nuccore/${rnaAcc}`
      });
      addEdge({
        source: rnaNodeId,
        target: rootNodeId,
        relationship: 'encodes_protein',
        label: 'Encodes Protein',
        provenance: 'UniProt Cross-Reference (RefSeq)'
      });
    }

    // PDB 3D Structure links
    const pdbs = xRefs.filter(x => x.database === 'PDB');
    if (pdbs.length > 0) {
      pdbs.slice(0, 3).forEach(pdb => {
        const method = pdb.properties?.find(p => p.key === 'Method')?.value || 'Experimental';
        const resolution = pdb.properties?.find(p => p.key === 'Resolution')?.value || '';
        const pdbNodeId = `pdb_${pdb.id}`;
        addNode({
          id: pdbNodeId,
          label: `PDB: ${pdb.id}`,
          sublabel: `STRUCTURE (${method}${resolution ? ` ${resolution}` : ''})`,
          source: 'RCSB PDB',
          sourceColor: '#06b6d4',
          type: 'structure',
          status: 'present',
          pdbId: pdb.id,
          url: `https://www.rcsb.org/structure/${pdb.id}`
        });
        addEdge({
          source: rootNodeId,
          target: pdbNodeId,
          relationship: 'has_3d_structure',
          label: '3D Structure',
          provenance: `UniProt Cross-Reference PDB (${pdb.id}, ${method})`
        });
      });
    } else {
      // Explicitly show missing 3D structure node instead of guessing
      const missingPdbId = `pdb_missing_${record.id}`;
      addNode({
        id: missingPdbId,
        label: 'No 3D Structure Resolved',
        sublabel: 'PDB: 0 Cross-References',
        source: 'PDB',
        sourceColor: '#64748b',
        type: 'structure',
        status: 'missing',
        reason: 'No experimentally solved structures cross-referenced in UniProt'
      });
      addEdge({
        source: rootNodeId,
        target: missingPdbId,
        relationship: 'missing_structure',
        label: 'No Structure',
        provenance: 'UniProt cross-references checked: 0 PDB entries'
      });
    }

    // Ensembl cross-reference
    const ensembl = xRefs.find(x => x.database === 'Ensembl');
    if (ensembl) {
      const ensNodeId = `ensembl_${ensembl.id}`;
      addNode({
        id: ensNodeId,
        label: ensembl.id,
        sublabel: 'ENSEMBL TRANSCRIPT',
        source: 'Ensembl',
        sourceColor: '#8b5cf6',
        type: 'transcript',
        status: 'present',
        url: `https://www.ensembl.org/id/${ensembl.id}`
      });
      addEdge({
        source: ensNodeId,
        target: rootNodeId,
        relationship: 'ensembl_translation',
        label: 'Ensembl Translation',
        provenance: 'UniProt Cross-Reference (Ensembl)'
      });
    }
  }

  // Scenario C: Record is ENA nucleotide
  if (record.source === 'ENA') {
    // Check if ENA entry description refers to a gene
    const geneMatch = (record.description || '').match(/\b([A-Z][A-Z0-9]{1,8})\b/);
    if (geneMatch && geneMatch[1] !== record.accession) {
      const inferredGene = geneMatch[1];
      const geneNodeId = `gene_${inferredGene}`;
      addNode({
        id: geneNodeId,
        label: inferredGene,
        sublabel: 'ASSOCIATED GENE',
        source: 'ENA Reference',
        sourceColor: '#d97706',
        type: 'gene',
        status: 'present'
      });
      addEdge({
        source: geneNodeId,
        target: rootNodeId,
        relationship: 'locus_of',
        label: 'Locus',
        provenance: 'ENA Sequence Annotation Header'
      });
    }
  }

  return { nodes, edges, record };
}

// -------------------------------------------------------------
// 7. REAL FASTA SEQUENCE RETRIEVER & BIO-METRIC CALCULATOR
// -------------------------------------------------------------
export async function fetchRecordFasta(record) {
  if (!record) return { fasta: '', sequence: '', metrics: null };

  let fastaText = '';
  const acc = record.accession || record.originalId;

  // 1. UniProt FASTA
  if (record.source === 'UniProt') {
    try {
      const proxyUrl = `${API_BASE}/api/uniprot/fasta/${encodeURIComponent(acc)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
      if (res.ok) fastaText = await res.text();
    } catch {}

    if (!fastaText || !fastaText.includes('>')) {
      const directUrl = `${DIRECT_UNIPROT_BASE}/${encodeURIComponent(acc)}.fasta`;
      const res = await fetch(directUrl, { signal: AbortSignal.timeout(10000) });
      if (res.ok) fastaText = await res.text();
    }
  }

  // 2. ENA FASTA
  if (record.source === 'ENA') {
    try {
      const proxyUrl = `${API_BASE}/api/ena/fasta/${encodeURIComponent(acc)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
      if (res.ok) fastaText = await res.text();
    } catch {}

    if (!fastaText || !fastaText.includes('>')) {
      const directUrl = `${DIRECT_ENA_BROWSER}/fasta/${encodeURIComponent(acc)}`;
      const res = await fetch(directUrl, { signal: AbortSignal.timeout(10000) });
      if (res.ok) fastaText = await res.text();
    }
  }

  // 3. NCBI FASTA
  if (!fastaText || !fastaText.includes('>')) {
    const db = record.database === 'protein' ? 'protein' : 'nucleotide';
    try {
      const proxyUrl = `${API_BASE}/api/ncbi/fasta?db=${db}&id=${encodeURIComponent(acc)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
      if (res.ok) fastaText = await res.text();
    } catch {}

    if (!fastaText || !fastaText.includes('>')) {
      const directUrl = formatNcbiDirectUrl(`${DIRECT_NCBI_BASE}/efetch.fcgi?db=${db}&id=${encodeURIComponent(acc)}&rettype=fasta&retmode=text&${NCBI_TOOL_PARAM}`);
      const res = await clientNcbiQueue.fetch(directUrl, { signal: AbortSignal.timeout(10000) });
      if (res.ok) fastaText = await res.text();
    }
  }

  if (!fastaText || !fastaText.includes('>')) {
    throw new Error(`FASTA sequence format unavailable from ${record.source} for accession '${acc}'.`);
  }

  // Clean FASTA
  const lines = fastaText.trim().split('\n');
  let header = '';
  const seqLines = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('>')) {
      if (!header) header = trimmed.substring(1).trim();
    } else {
      seqLines.push(trimmed);
    }
  }

  const cleanSeq = seqLines.join('').toUpperCase();
  const isProtein = record.moleculeType === 'protein' || record.recordType === 'protein';

  // Compute Scientific Metrics explicitly labeled with formula and method
  let computedMetrics = null;
  if (!isProtein && cleanSeq.length > 0) {
    let gCount = 0;
    let cCount = 0;
    let aCount = 0;
    let tCount = 0;
    for (let i = 0; i < cleanSeq.length; i++) {
      const char = cleanSeq[i];
      if (char === 'G') gCount++;
      else if (char === 'C') cCount++;
      else if (char === 'A') aCount++;
      else if (char === 'T' || char === 'U') tCount++;
    }
    const totalValidBases = gCount + cCount + aCount + tCount;
    const gcContent = totalValidBases > 0 ? ((gCount + cCount) / totalValidBases) * 100 : 0;
    
    // Approximate single-stranded DNA molecular weight in kDa
    const approxMwDa = (aCount * 313.21) + (tCount * 304.2) + (cCount * 289.18) + (gCount * 329.21) - 61.96;

    computedMetrics = {
      length: cleanSeq.length,
      unit: 'bp',
      gcPercent: parseFloat(gcContent.toFixed(2)),
      gcFormula: '[Computed by BioNexus: standard formula: (G+C)/(A+T+G+C) * 100]',
      molecularWeightKDa: parseFloat((approxMwDa / 1000).toFixed(2)),
      mwFormula: '[Computed by BioNexus: standard ssDNA mononucleotide isotopic summation minus terminal water]'
    };
  } else if (isProtein && cleanSeq.length > 0) {
    // Standard isotopic average molecular weights of amino acid residues in Da
    const aaWeights = {
      A: 71.08, R: 156.20, N: 114.11, D: 115.09, C: 103.14, E: 129.12, Q: 128.13,
      G: 57.05, H: 137.15, I: 113.17, L: 113.17, K: 128.18, M: 131.21, F: 147.18,
      P: 97.12, S: 87.08, T: 101.11, W: 186.21, Y: 163.18, V: 99.13
    };

    let totalWeight = 18.015; // Terminal H + OH
    for (let i = 0; i < cleanSeq.length; i++) {
      const aa = cleanSeq[i];
      totalWeight += aaWeights[aa] || 110.0;
    }

    computedMetrics = {
      length: cleanSeq.length,
      unit: 'aa',
      molecularWeightKDa: parseFloat((totalWeight / 1000).toFixed(2)),
      mwFormula: '[Computed by BioNexus: sum of standard amino acid residue isotopic masses + 18.015 Da (terminal H2O)]'
    };
  }

  return {
    header,
    sequence: cleanSeq,
    rawFasta: fastaText,
    metrics: computedMetrics
  };
}

// -------------------------------------------------------------
// 8. AUTOMATED WCAG AA CONTRAST RATIO CHECKER (4.5:1 MINIMUM)
// -------------------------------------------------------------
function hexToRgb(hex) {
  let c = hex.replace(/^#/, '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function getRelativeLuminance(rgb) {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function calculateContrastRatio(fgHex, bgHex) {
  const fgRgb = hexToRgb(fgHex);
  const bgRgb = hexToRgb(bgHex);
  const l1 = getRelativeLuminance(fgRgb);
  const l2 = getRelativeLuminance(bgRgb);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return {
    ratio: parseFloat(ratio.toFixed(2)),
    isWcagAaCompliant: ratio >= 4.5,
    standard: 'WCAG 2.1 Level AA (>= 4.5:1)'
  };
}

// -------------------------------------------------------------
// 9. EXPORTERS (CSV RFC 4180, FASTA, BIBTEX)
// -------------------------------------------------------------
export function exportToCsv(records = []) {
  const headers = ['Source', 'Database', 'Accession', 'Organism', 'MoleculeType', 'Length', 'Unit', 'Title', 'OriginalUrl'];
  const rows = records.map(r => [
    `"${(r.source || '').replace(/"/g, '""')}"`,
    `"${(r.database || '').replace(/"/g, '""')}"`,
    `"${(r.accession || '').replace(/"/g, '""')}"`,
    `"${(r.organism || '').replace(/"/g, '""')}"`,
    `"${(r.moleculeType || '').replace(/"/g, '""')}"`,
    `"${r.length || ''}"`,
    `"${(r.lengthUnit || '').replace(/"/g, '""')}"`,
    `"${(r.title || '').replace(/"/g, '""')}"`,
    `"${(r.originalUrl || '').replace(/"/g, '""')}"`
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
}

export function exportToBibtex(records = []) {
  return records.map((r, idx) => {
    const key = `${r.source.toLowerCase()}_${(r.accession || `rec${idx}`).toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')}`;
    const year = new Date().getFullYear();
    return `@misc{${key},
  author = {${r.source}},
  title = {{${r.title || r.accession}}},
  howpublished = {\\url{${r.originalUrl || ''}}},
  note = {Retrieved from ${r.source} via BioNexus Studio Global Bio-Database Explorer},
  year = {${year}}
}`;
  }).join('\n\n');
}
