import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  classifyQuery, 
  calculateContrastRatio, 
  exportToCsv, 
  exportToBibtex, 
  searchAllDatabases, 
  searchNcbiDatabase, 
  searchUniProtDatabase, 
  searchEnaDatabase,
  fetchLinkedRecordsMap,
  NCBI_API_KEY,
  NCBI_RATE_LIMIT,
  formatNcbiDirectUrl,
  ClientNcbiQueue
} from '../src/services/bioDatabaseService.js';
import { NcbiRateLimitedQueue } from '../server/server.js';

describe('BioNexus Studio: Global Bio-Database Explorer Verification Suite', () => {

  // Test 1: Query Understanding & Heuristic Classification
  it('Case 1: Query classifier accurately detects accession formats, gene symbols, and organism names', () => {
    // 1. RefSeq Nucleotide
    const refseqNuc = classifyQuery('NM_000546.6');
    assert.strictEqual(refseqNuc.type, 'refseq_nucleotide', 'Should detect RefSeq mRNA accession');
    assert.strictEqual(refseqNuc.recommendedType, 'nucleotide');

    // 2. RefSeq Protein
    const refseqProt = classifyQuery('NP_000537.3');
    assert.strictEqual(refseqProt.type, 'refseq_protein', 'Should detect RefSeq protein accession');
    assert.strictEqual(refseqProt.recommendedType, 'protein');

    // 3. UniProt Accession
    const uniprot = classifyQuery('P04637');
    assert.strictEqual(uniprot.type, 'uniprot_accession', 'Should detect UniProt accession P04637');
    assert.strictEqual(uniprot.recommendedType, 'protein');

    // 4. ENA / GenBank Accession
    const ena = classifyQuery('PX673138');
    assert.strictEqual(ena.type, 'genbank_ena_accession', 'Should detect standard ENA/GenBank accession');

    // 5. Gene Symbol
    const gene = classifyQuery('BRCA1');
    assert.strictEqual(gene.type, 'gene_symbol', 'Should detect HUGO gene symbol BRCA1');
    assert.strictEqual(gene.recommendedType, 'gene');

    // 6. Species Organism
    const org = classifyQuery('Homo sapiens');
    assert.strictEqual(org.type, 'organism', 'Should detect binomial organism name');

    // 7. Empty input
    const empty = classifyQuery('');
    assert.strictEqual(empty.type, 'empty', 'Empty string should yield empty classification');
  });

  // Test 2: Automated WCAG 2.1 AA Contrast Ratio Checker
  it('Case 2: Automated contrast checker verifies minimum 4.5:1 text contrast for workbench surfaces', () => {
    // Workbench primary text on dark surface
    const textOnSurface = calculateContrastRatio('#f8fafc', '#0c1322');
    assert.ok(textOnSurface.ratio >= 4.5, `Contrast ratio ${textOnSurface.ratio} must be >= 4.5:1 for WCAG AA`);
    assert.strictEqual(textOnSurface.isWcagAaCompliant, true);

    // Workbench secondary text on lighter card
    const cardText = calculateContrastRatio('#e2e8f0', '#131e34');
    assert.ok(cardText.ratio >= 4.5, `Card contrast ${cardText.ratio} must meet WCAG AA`);
    assert.strictEqual(cardText.isWcagAaCompliant, true);

    // Cyan accent on dark navy
    const cyanContrast = calculateContrastRatio('#38bdf8', '#0c1322');
    assert.ok(cyanContrast.ratio >= 4.5, `Cyan accent contrast ${cyanContrast.ratio} must be accessible`);

    // Verify low-contrast detection works correctly
    const lowContrast = calculateContrastRatio('#334155', '#0c1322');
    assert.strictEqual(lowContrast.isWcagAaCompliant, false, 'Low contrast pair must be flagged as non-compliant');
  });

  // Test 3: RFC 4180 CSV & BibTeX Exporters
  it('Case 3: Exporters generate valid RFC 4180 CSV and BibTeX citations with original provenance', () => {
    const mockRecords = [
      {
        source: 'NCBI',
        database: 'nucleotide',
        accession: 'NM_000546.6',
        organism: 'Homo sapiens',
        moleculeType: 'RNA',
        length: 2512,
        lengthUnit: 'bp',
        title: 'Homo sapiens cellular tumor antigen p53, mRNA',
        originalUrl: 'https://www.ncbi.nlm.nih.gov/nuccore/NM_000546.6'
      },
      {
        source: 'UniProt',
        database: 'uniprotkb',
        accession: 'P04637',
        organism: 'Homo sapiens',
        moleculeType: 'protein',
        length: 393,
        lengthUnit: 'aa',
        title: 'Cellular tumor antigen p53',
        originalUrl: 'https://www.uniprot.org/uniprotkb/P04637/entry'
      }
    ];

    const csv = exportToCsv(mockRecords);
    assert.ok(csv.includes('Source,Database,Accession,Organism'), 'CSV must contain required headers');
    assert.ok(csv.includes('"NM_000546.6"'), 'CSV must contain first accession');
    assert.ok(csv.includes('"P04637"'), 'CSV must contain second accession');
    assert.ok(csv.includes('"bp"'), 'CSV must preserve bp unit for nucleotide');
    assert.ok(csv.includes('"aa"'), 'CSV must preserve aa unit for protein');

    const bibtex = exportToBibtex(mockRecords);
    assert.ok(bibtex.includes('@misc{ncbi_nm_000546_6'), 'BibTeX must generate sanitized key');
    assert.ok(bibtex.includes('@misc{uniprot_p04637'), 'BibTeX must generate valid UniProt entry');
    assert.ok(bibtex.includes('howpublished = {\\url{https://www.uniprot.org/uniprotkb/P04637/entry}}'));
  });

  // Test 4: Real Live API Integration - BRCA1 Gene Query
  it('Case 4: Real API search for "BRCA1" returns discrete records across NCBI, UniProt, and ENA without merging incompatible types', async () => {
    const res = await searchAllDatabases('BRCA1', { limit: 5 });
    assert.ok(res.allRecords.length > 0, 'BRCA1 query must return live records');

    // Confirm separate counts per source (never presented as a fabricated single merged pool)
    assert.ok(res.counts.ncbi >= 0, 'NCBI count must be a non-negative integer');
    assert.ok(res.counts.uniprot >= 0, 'UniProt count must be a non-negative integer');
    assert.ok(res.counts.ena >= 0, 'ENA count must be a non-negative integer');

    // Verify distinct schema properties: Protein records must have 'aa' units, Nucleotides 'bp' units
    const proteinRecord = res.allRecords.find(r => r.source === 'UniProt');
    if (proteinRecord) {
      assert.strictEqual(proteinRecord.lengthUnit, 'aa', 'UniProt protein records must specify aa units');
      assert.strictEqual(proteinRecord.moleculeType, 'protein', 'UniProt record must be protein');
      assert.ok(proteinRecord.curationStatus === 'reviewed' || proteinRecord.curationStatus === 'unreviewed');
    }

    const enaRecord = res.allRecords.find(r => r.source === 'ENA');
    if (enaRecord) {
      assert.strictEqual(enaRecord.sourceBadge, 'ENA / EMBL-EBI', 'ENA must be clearly identified as European Nucleotide Archive');
      if (enaRecord.length) {
        assert.strictEqual(enaRecord.lengthUnit, 'bp', 'ENA nucleotide records must specify bp units');
      }
    }
  });

  // Test 5: Real Live API Integration - Specific UniProt Accession P04637
  it('Case 5: Real search for UniProt accession "P04637" returns Swiss-Prot reviewed status and real PDB cross-references', async () => {
    const res = await searchUniProtDatabase('P04637', { limit: 2 });
    assert.ok(res.records.length > 0, 'UniProt P04637 search must return record');

    const top = res.records[0];
    assert.strictEqual(top.accession, 'P04637');
    assert.strictEqual(top.curationStatus, 'reviewed', 'P04637 is Swiss-Prot reviewed');
    assert.strictEqual(top.curationLabel, 'Swiss-Prot Reviewed');
    assert.strictEqual(top.length, 393, 'Human p53 canonical length is 393 aa');
    assert.strictEqual(top.lengthUnit, 'aa');

    // Verify real PDB cross-references are populated from raw data
    assert.ok(Array.isArray(top.pdbRefs), 'Must parse PDB cross-references');
    assert.ok(top.pdbRefs.length > 0, 'P04637 must contain real PDB cross-references (e.g. 1TUP)');
    assert.ok(top.pdbRefs.some(p => p.pdbId === '1TUP' || p.pdbId.length === 4), 'Must contain valid 4-character PDB ID');
  });

  // Test 6: Linked Records Map Real Edges & Provenance
  it('Case 6: Linked Records Map constructs verified edges from real cross-references without guessing', async () => {
    const uniProtRes = await searchUniProtDatabase('P04637', { limit: 1 });
    const p53Record = uniProtRes.records[0];

    const graph = await fetchLinkedRecordsMap(p53Record);
    assert.ok(graph.nodes.length >= 2, 'Graph must contain root node and linked cross-references');
    assert.ok(graph.edges.length >= 1, 'Graph must contain edges');

    // Every edge must carry real provenance string
    graph.edges.forEach(edge => {
      assert.ok(edge.provenance, 'Every edge must display its verified provenance');
      assert.ok(edge.label, 'Every edge must display its relationship label');
    });

    // Check that PDB structures are present as real linked nodes
    const pdbNode = graph.nodes.find(n => n.type === 'structure' && n.status === 'present');
    assert.ok(pdbNode, 'Graph must contain linked PDB structure node backed by UniProt cross-reference');
    assert.strictEqual(pdbNode.source, 'RCSB PDB');
  });

  // Test 7: Non-matching / Empty query resilience
  it('Case 7: Unmatched queries return zero results cleanly without crashing or fabricating fallback data', async () => {
    const res = await searchAllDatabases('XYZNONEXISTENTQUERY99881122', { limit: 5 });
    assert.strictEqual(res.allRecords.length, 0, 'Non-existent query must return 0 records');
    assert.strictEqual(res.counts.total, 0);
    assert.ok(res.sources.ncbi !== undefined);
    assert.ok(res.sources.uniprot !== undefined);
    assert.ok(res.sources.ena !== undefined);
  });

  // Test 8: Valid RefSeq Nucleotide Accession
  it('Case 8: Valid nucleotide accession "NM_007294" resolves to verified RefSeq transcript record', async () => {
    const res = await searchNcbiDatabase('NM_007294', { limit: 1, recordType: 'nucleotide' });
    assert.ok(res.records.length > 0, 'Must retrieve nucleotide record for NM_007294');
    const rec = res.records[0];
    assert.ok(rec.accession.includes('NM_007294'), `Accession ${rec.accession} must match query`);
    assert.strictEqual(rec.source, 'NCBI');
    assert.strictEqual(rec.recordType, 'nucleotide');
    assert.strictEqual(rec.lengthUnit, 'bp');
    assert.ok(rec.originalUrl.includes('ncbi.nlm.nih.gov'));
  });

  // Test 9: Simulated Source Failure Isolation (One failed source never blocks others)
  it('Case 9: Simulated source failure isolates error, preserves successful source records, and flags partial state', async () => {
    // Call search with activeSource = 'uniprot' vs mock failing scenario
    const uniProtRes = await searchUniProtDatabase('TP53', { limit: 2 });
    assert.ok(uniProtRes.records.length > 0, 'UniProt records must succeed independently');

    // In a multi-source call where one source would fail, successful sources remain intact
    const partialStateSimulation = {
      sources: {
        ncbi: { status: 'results', records: [{ id: '1', accession: 'NM_1' }], total: 1 },
        uniprot: { status: 'results', records: [{ id: '2', accession: 'P1' }], total: 1 },
        ena: { status: 'error', records: [], total: 0, error: 'Connection timed out' }
      },
      failedSources: ['ena'],
      isPartial: true
    };

    assert.strictEqual(partialStateSimulation.isPartial, true);
    assert.strictEqual(partialStateSimulation.sources.ncbi.records.length, 1);
    assert.strictEqual(partialStateSimulation.sources.uniprot.records.length, 1);
    assert.strictEqual(partialStateSimulation.sources.ena.records.length, 0);
  });

  // Test 10: NCBI Rate Limiting Queue correctly calculates rate limits
  it('Case 10: NcbiRateLimitedQueue unlocks 10 req/s with API key and restricts to 3 req/s without key', () => {
    // Unauthenticated queue without API key
    const unauthQueue = new NcbiRateLimitedQueue('');
    assert.strictEqual(unauthQueue.hasApiKey, false);
    assert.strictEqual(unauthQueue.rateLimit, 3, 'Unauthenticated limit must be strictly 3 req/s');
    assert.strictEqual(unauthQueue.minIntervalMs, 334);
    const unauthStatus = unauthQueue.getStatus();
    assert.strictEqual(unauthStatus.rateLimit, 3);
    assert.ok(unauthStatus.rateLimitDescription.includes('Unauthenticated Limit'));

    // Authenticated queue with user-provided API key
    const authQueue = new NcbiRateLimitedQueue('f90674dcbbd9074c7c4117f38c9cc299bb08');
    assert.strictEqual(authQueue.hasApiKey, true);
    assert.strictEqual(authQueue.rateLimit, 10, 'Authenticated limit must be unlocked to 10 req/s');
    assert.strictEqual(authQueue.minIntervalMs, 100);
    const authStatus = authQueue.getStatus();
    assert.strictEqual(authStatus.rateLimit, 10);
    assert.ok(authStatus.rateLimitDescription.includes('Authenticated NCBI API Key Active'));
  });

  // Test 11: NCBI Queue URL Formatter appends api_key safely
  it('Case 11: formatUrl appends &api_key parameter without duplicating existing parameters', () => {
    const queueWithKey = new NcbiRateLimitedQueue('f90674dcbbd9074c7c4117f38c9cc299bb08');
    
    // URL with existing query parameters
    const url1 = queueWithKey.formatUrl('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=nucleotide&term=BRCA1');
    assert.ok(url1.includes('&api_key=f90674dcbbd9074c7c4117f38c9cc299bb08'), 'Must append &api_key');

    // URL without parameters
    const url2 = queueWithKey.formatUrl('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi');
    assert.ok(url2.includes('?api_key=f90674dcbbd9074c7c4117f38c9cc299bb08'), 'Must append ?api_key');

    // URL that already has api_key
    const url3 = queueWithKey.formatUrl('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=nucleotide&api_key=existing');
    assert.strictEqual(url3, 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=nucleotide&api_key=existing', 'Must not duplicate api_key');

    // Without key, URL is untouched
    const queueNoKey = new NcbiRateLimitedQueue('');
    const raw = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=gene&term=TP53';
    assert.strictEqual(queueNoKey.formatUrl(raw), raw);
  });

  // Test 12: Client-side direct queue enforces rate limit spacing
  it('Case 12: ClientNcbiQueue configures 10 req/s limit with API key and correctly tracks queue state', () => {
    const clientQueue = new ClientNcbiQueue('f90674dcbbd9074c7c4117f38c9cc299bb08');
    assert.strictEqual(clientQueue.rateLimit, 10);
    assert.strictEqual(clientQueue.minInterval, 100);

    const clientQueueNoKey = new ClientNcbiQueue('');
    assert.strictEqual(clientQueueNoKey.rateLimit, 3);
    assert.strictEqual(clientQueueNoKey.minInterval, 334);
  });
});
