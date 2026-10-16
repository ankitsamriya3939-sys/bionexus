// Multi-Source Biological Database Integration Wrapper for BioNexus Studio
// Bridges to research-grade bioDatabaseService

import { 
  searchNcbiDatabase, 
  searchUniProtDatabase, 
  searchEnaDatabase, 
  searchAllDatabases, 
  fetchRecordFasta 
} from '../services/bioDatabaseService';

export const DATABASE_PROVIDERS = [
  { id: 'all', name: '⚡ All Sources (Parallel Independent)', desc: 'Queries NCBI, UniProt, and ENA in parallel' },
  { id: 'uniprot', name: 'UniProt Knowledgebase', desc: 'Global comprehensive protein sequence & functional database' },
  { id: 'ebi', name: 'ENA / EMBL-EBI (Europe)', desc: 'European Nucleotide Archive & Molecular Biology Laboratory' },
  { id: 'ncbi', name: 'NCBI Entrez (USA)', desc: 'National Center for Biotechnology Information (GenBank/RefSeq/Gene)' }
];

export async function measureApiLatencies() {
  const pingProvider = async (id, name, testFn) => {
    const start = performance.now();
    try {
      const res = await testFn();
      const duration = Math.round(performance.now() - start);
      return { id, name, latencyMs: duration, status: res && res.records?.length >= 0 ? 'online' : 'degraded' };
    } catch {
      return { id, name, latencyMs: null, status: 'offline' };
    }
  };

  const results = await Promise.allSettled([
    pingProvider('uniprot', 'UniProt', () => searchUniProtDatabase('TP53', { limit: 1 })),
    pingProvider('ebi', 'EMBL-EBI', () => searchEnaDatabase('TP53', { limit: 1 })),
    pingProvider('ncbi', 'NCBI Entrez', () => searchNcbiDatabase('TP53', { limit: 1 }))
  ]);

  return results.map(r => r.status === 'fulfilled' ? r.value : { status: 'offline', latencyMs: null });
}

export async function searchUniProt(term, limit = 10) {
  const res = await searchUniProtDatabase(term, { limit });
  return { source: 'UniProt', results: res.records, latencyMs: res.latencyMs, total: res.total };
}

export async function searchEbi(term, limit = 10) {
  const res = await searchEnaDatabase(term, { limit });
  return { source: 'EMBL-EBI', results: res.records, latencyMs: res.latencyMs, total: res.total };
}

export async function searchNcbiWrapped(db = 'nucleotide', term, limit = 10) {
  const res = await searchNcbiDatabase(term, { limit, recordType: db });
  return { source: 'NCBI', results: res.records, latencyMs: res.latencyMs, total: res.total };
}

export async function raceFastBioApis(term, options = {}) {
  const res = await searchAllDatabases(term, options);
  return {
    source: 'Parallel Multi-Database Explorer',
    results: res.allRecords,
    allSources: res.sources,
    counts: res.counts
  };
}

export async function fetchFastaUniversal(item) {
  const res = await fetchRecordFasta(item);
  return res.rawFasta || '';
}
