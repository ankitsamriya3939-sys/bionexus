// BioNexus Studio — Shared Scientific Object Model
// Strictly typed, immutable-friendly scientific entity model with provenance,
// stable identifiers, and explicit non-fabricated biological relationships.

export const ObjectTypes = {
  PROJECT: 'project',
  SEQUENCE: 'sequence',
  GENE: 'gene',
  PROTEIN: 'protein',
  STRUCTURE: 'structure',
  TAXON: 'taxon',
  TREE: 'tree',
  ANALYSIS_JOB: 'analysis_job',
  ANNOTATION: 'annotation',
  EVIDENCE: 'evidence'
};

export const EvidenceLevels = {
  EXPERIMENTAL: 'experimental',             // Assays, X-ray/Cryo-EM, mass spectrometry
  DATABASE_ANNOTATION: 'database_annotation', // Curated Swiss-Prot, RefSeq
  COMPUTATIONAL_PREDICTION: 'computational_prediction', // AlphaFold, BLAST, Jukes-Cantor, ML
  HYPOTHESIS: 'hypothesis',                 // Proposed mechanism, unverified model
  UNKNOWN: 'unknown'
};

export const RelationshipPredicates = {
  ENCODES: 'encodes',                     // Gene -> Protein / RNA
  TRANSLATED_FROM: 'translated_from',     // Protein -> Sequence
  HAS_STRUCTURE: 'has_structure',         // Protein -> Structure
  BELONGS_TO_TAXON: 'belongs_to_taxon',   // Sequence/Protein/Gene -> Taxon
  INCLUDED_IN_TREE: 'included_in_tree',   // Taxon -> Tree
  PRODUCED_BY: 'produced_by',             // Any -> AnalysisJob
  EVIDENCED_BY: 'evidenced_by',           // Any -> Evidence
  ANNOTATED_WITH: 'annotated_with',       // Sequence/Protein -> Annotation
  HOMOLOG_OF: 'homolog_of'                // Sequence/Protein -> Sequence/Protein
};

/**
 * Generate a deterministic or collision-resistant stable identifier
 */
export function generateStableId(prefix = 'obj') {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${randomPart}`;
}

/**
 * 1. Project Model
 */
export function createProjectObject(data = {}) {
  return {
    id: data.id || generateStableId('proj'),
    type: ObjectTypes.PROJECT,
    name: data.name || 'Untitled Scientific Project',
    description: data.description || '',
    speciesFocus: data.speciesFocus || '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: data.metadata || {}
  };
}

/**
 * 2. Sequence Model (DNA, RNA, Protein)
 */
export function createSequenceObject(data = {}) {
  const rawSeq = (data.sequence || '').replace(/[\s\r\n\d]/g, '').toUpperCase();
  const moleculeType = data.moleculeType || detectMoleculeType(rawSeq);
  
  return {
    id: data.id || generateStableId('seq'),
    type: ObjectTypes.SEQUENCE,
    name: data.name || data.accession || 'Untitled Sequence',
    accession: data.accession || 'Custom',
    description: data.description || '',
    organism: data.organism || 'Unspecified Organism',
    taxonomyId: data.taxonomyId || null,
    moleculeType,
    sequence: rawSeq,
    length: rawSeq.length,
    gcPercent: calculateGc(rawSeq, moleculeType),
    source: data.source || 'User Input',
    provenance: {
      sourceDatabase: data.provenance?.sourceDatabase || data.source || 'Manual Input',
      externalId: data.provenance?.externalId || data.accession || null,
      importedAt: data.provenance?.importedAt || new Date().toISOString()
    },
    relationships: Array.isArray(data.relationships) ? data.relationships : [],
    annotations: Array.isArray(data.annotations) ? data.annotations : [],
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * 3. Gene Model
 */
export function createGeneObject(data = {}) {
  return {
    id: data.id || generateStableId('gene'),
    type: ObjectTypes.GENE,
    symbol: (data.symbol || data.name || 'UNKNOWN').toUpperCase(),
    fullName: data.fullName || data.description || '',
    organism: data.organism || 'Homo sapiens',
    taxonomyId: data.taxonomyId || 9606,
    chromosome: data.chromosome || null,
    locusTag: data.locusTag || null,
    strand: data.strand || '+',
    coordinates: data.coordinates || null, // { start, end }
    synonyms: Array.isArray(data.synonyms) ? data.synonyms : [],
    relationships: Array.isArray(data.relationships) ? data.relationships : [],
    provenance: {
      sourceDatabase: data.provenance?.sourceDatabase || 'NCBI Gene',
      externalId: data.provenance?.externalId || data.symbol || null
    },
    createdAt: data.createdAt || new Date().toISOString()
  };
}

/**
 * 4. Protein Model
 */
export function createProteinObject(data = {}) {
  const seq = (data.sequence || '').replace(/[\s\r\n\d]/g, '').toUpperCase();
  return {
    id: data.id || generateStableId('prot'),
    type: ObjectTypes.PROTEIN,
    name: data.name || 'Uncharacterized Protein',
    uniprotAccession: data.uniprotAccession || data.accession || null,
    geneSymbol: data.geneSymbol || null,
    organism: data.organism || 'Homo sapiens',
    sequence: seq,
    length: seq.length,
    molecularWeightKDa: calculateProteinMwKDa(seq),
    isoelectricPoint: calculateProteinPi(seq),
    domains: Array.isArray(data.domains) ? data.domains : [],
    associatedPdbIds: Array.isArray(data.associatedPdbIds) ? data.associatedPdbIds : [],
    relationships: Array.isArray(data.relationships) ? data.relationships : [],
    provenance: {
      sourceDatabase: data.provenance?.sourceDatabase || 'UniProtKB',
      externalId: data.uniprotAccession || null
    },
    createdAt: data.createdAt || new Date().toISOString()
  };
}

/**
 * 5. Protein Structure Model (PDB / AlphaFold)
 */
export function createStructureObject(data = {}) {
  const pdbId = (data.pdbId || '').toUpperCase();
  return {
    id: data.id || (pdbId ? `struct_${pdbId}` : generateStableId('struct')),
    type: ObjectTypes.STRUCTURE,
    pdbId: pdbId || null,
    alphafoldId: data.alphafoldId || null,
    title: data.title || (pdbId ? `Structure of PDB ${pdbId}` : 'Macromolecular Structure'),
    experimentalMethod: data.experimentalMethod || 'X-ray Crystallography',
    resolutionAngstrom: data.resolutionAngstrom ? parseFloat(data.resolutionAngstrom) : null,
    rValueFree: data.rValueFree || null,
    organism: data.organism || 'Unspecified Organism',
    chains: Array.isArray(data.chains) ? data.chains : ['A'],
    ligands: Array.isArray(data.ligands) ? data.ligands : [],
    depositionDate: data.depositionDate || null,
    authors: data.authors || '',
    isAlphafoldPrediction: Boolean(data.alphafoldId && !pdbId),
    plddtScore: data.plddtScore || null,
    relationships: Array.isArray(data.relationships) ? data.relationships : [],
    provenance: {
      sourceDatabase: data.alphafoldId ? 'AlphaFold DB' : 'RCSB Protein Data Bank',
      externalId: pdbId || data.alphafoldId,
      url: pdbId ? `https://www.rcsb.org/structure/${pdbId}` : null
    },
    createdAt: data.createdAt || new Date().toISOString()
  };
}

/**
 * 6. Taxon Model
 */
export function createTaxonObject(data = {}) {
  return {
    id: data.id || generateStableId('tax'),
    type: ObjectTypes.TAXON,
    scientificName: data.scientificName || data.name || 'Unknown species',
    commonName: data.commonName || '',
    ncbiTaxId: data.ncbiTaxId || null,
    rank: data.rank || 'species',
    lineage: Array.isArray(data.lineage) ? data.lineage : [],
    associatedSequenceIds: Array.isArray(data.associatedSequenceIds) ? data.associatedSequenceIds : [],
    relationships: Array.isArray(data.relationships) ? data.relationships : [],
    createdAt: data.createdAt || new Date().toISOString()
  };
}

/**
 * 7. Phylogenetic Tree Model
 */
export function createTreeObject(data = {}) {
  return {
    id: data.id || generateStableId('tree'),
    type: ObjectTypes.TREE,
    name: data.name || 'Phylogenetic Tree',
    method: data.method || 'nj', // 'nj' | 'upgma' | 'me' | 'ml'
    substitutionModel: data.substitutionModel || 'jukes-cantor',
    newick: data.newick || '',
    nexus: data.nexus || '',
    taxaCount: data.taxaCount || (data.taxa ? data.taxa.length : 0),
    alignmentLength: data.alignmentLength || 0,
    treeLength: data.treeLength != null ? data.treeLength : null,
    logLikelihood: data.logLikelihood != null ? data.logLikelihood : null,
    aicScore: data.aicScore != null ? data.aicScore : null,
    rootNode: data.rootNode || null,
    taxa: Array.isArray(data.taxa) ? data.taxa : [],
    relationships: Array.isArray(data.relationships) ? data.relationships : [],
    createdAt: data.createdAt || new Date().toISOString()
  };
}

/**
 * 8. Analysis Job Model
 */
export function createAnalysisJobObject(data = {}) {
  return {
    id: data.id || generateStableId('job'),
    type: ObjectTypes.ANALYSIS_JOB,
    jobType: data.jobType || 'sequence_analysis', // 'blast' | 'msa' | 'phylo' | 'primer' | 'structure'
    name: data.name || 'Bioinformatic Run',
    status: data.status || 'completed', // 'idle' | 'running' | 'completed' | 'failed'
    parameters: data.parameters || {},
    resultsSummary: data.resultsSummary || {},
    runtimeMs: data.runtimeMs || 0,
    inputObjectIds: Array.isArray(data.inputObjectIds) ? data.inputObjectIds : [],
    outputObjectIds: Array.isArray(data.outputObjectIds) ? data.outputObjectIds : [],
    errorMessage: data.errorMessage || null,
    createdAt: data.createdAt || new Date().toISOString()
  };
}

/**
 * 9. Scientific Evidence Record Model
 */
export function createEvidenceRecord(data = {}) {
  return {
    id: data.id || generateStableId('evi'),
    type: ObjectTypes.EVIDENCE,
    title: data.title || 'Scientific Evidence Entry',
    authors: data.authors || '',
    journal: data.journal || '',
    year: data.year || new Date().getFullYear(),
    pmid: data.pmid || null,
    doi: data.doi || null,
    sourceDatabase: data.sourceDatabase || 'PubMed',
    confidenceLevel: data.confidenceLevel || EvidenceLevels.DATABASE_ANNOTATION,
    summary: data.summary || '',
    targetObjectId: data.targetObjectId || null,
    url: data.doi ? `https://doi.org/${data.doi}` : data.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${data.pmid}/` : data.url || null,
    createdAt: data.createdAt || new Date().toISOString()
  };
}

/**
 * 10. Scientific Annotation Model
 */
export function createScientificAnnotation(data = {}) {
  return {
    id: data.id || generateStableId('anno'),
    type: ObjectTypes.ANNOTATION,
    annotationType: data.annotationType || 'domain', // 'active_site' | 'domain' | 'mutation' | 'orf' | 'binding_pocket'
    label: data.label || 'Feature',
    description: data.description || '',
    startPos: data.startPos || 1,
    endPos: data.endPos || 1,
    evidenceCode: data.evidenceCode || 'ECO:0000255', // ECO code
    confidenceLevel: data.confidenceLevel || EvidenceLevels.DATABASE_ANNOTATION,
    source: data.source || 'UniProtKB',
    createdAt: data.createdAt || new Date().toISOString()
  };
}

// =========================================================================
// Scientific Helper Calculations
// =========================================================================

export function detectMoleculeType(sequence = '') {
  const seq = (sequence || '').toUpperCase();
  if (!seq) return 'DNA';
  const proteinChars = /[EFILPQZJOUX]/;
  if (proteinChars.test(seq)) return 'protein';
  if (seq.includes('U') && !seq.includes('T')) return 'RNA';
  return 'DNA';
}

export function calculateGc(sequence = '', moleculeType = 'DNA') {
  if (moleculeType === 'protein') return null;
  const seq = sequence.toUpperCase();
  if (!seq.length) return 0;
  let gcCount = 0;
  for (let i = 0; i < seq.length; i++) {
    if (seq[i] === 'G' || seq[i] === 'C') gcCount++;
  }
  return Number(((gcCount / seq.length) * 100).toFixed(2));
}

export function calculateProteinMwKDa(proteinSeq = '') {
  if (!proteinSeq) return 0;
  const weights = {
    A: 71.08, R: 156.20, N: 114.11, D: 115.09, C: 103.14,
    E: 129.12, Q: 128.13, G: 57.05,  H: 137.14, I: 113.17,
    L: 113.17, K: 128.18, M: 131.21, F: 147.18, P: 97.12,
    S: 87.08,  T: 101.11, W: 186.21, Y: 163.18, V: 99.13
  };
  let sum = 18.015; // Water molecule added at termini
  for (const aa of proteinSeq.toUpperCase()) {
    sum += weights[aa] || 110.0;
  }
  return Number((sum / 1000).toFixed(2));
}

export function calculateProteinPi(proteinSeq = '') {
  if (!proteinSeq) return 7.0;
  // Boman / Bjellqvist approximation
  let pos = 0;
  let neg = 0;
  for (const aa of proteinSeq.toUpperCase()) {
    if (aa === 'K' || aa === 'R' || aa === 'H') pos++;
    if (aa === 'D' || aa === 'E') neg++;
  }
  if (pos === neg) return 7.0;
  const estimate = 7.0 + (pos - neg) * 0.25;
  return Number(Math.max(3.0, Math.min(12.0, estimate)).toFixed(2));
}

/**
 * Establish explicit, un-fabricated bidirectional relationship
 */
export function linkScientificObjects(source, target, predicate, metadata = {}) {
  if (!source || !target || !source.id || !target.id) return { source, target };

  const forwardRel = {
    targetId: target.id,
    targetType: target.type,
    targetName: target.name || target.symbol || target.pdbId || target.id,
    predicate,
    confidence: metadata.confidence || 1.0,
    evidenceLevel: metadata.evidenceLevel || EvidenceLevels.DATABASE_ANNOTATION,
    createdAt: new Date().toISOString()
  };

  const reversePredMap = {
    [RelationshipPredicates.ENCODES]: RelationshipPredicates.TRANSLATED_FROM,
    [RelationshipPredicates.TRANSLATED_FROM]: RelationshipPredicates.ENCODES,
    [RelationshipPredicates.HAS_STRUCTURE]: 'structure_of',
    [RelationshipPredicates.BELONGS_TO_TAXON]: 'contains_member',
    [RelationshipPredicates.PRODUCED_BY]: 'generated_output'
  };

  const reverseRel = {
    targetId: source.id,
    targetType: source.type,
    targetName: source.name || source.symbol || source.pdbId || source.id,
    predicate: reversePredMap[predicate] || `related_to_${predicate}`,
    confidence: metadata.confidence || 1.0,
    evidenceLevel: metadata.evidenceLevel || EvidenceLevels.DATABASE_ANNOTATION,
    createdAt: new Date().toISOString()
  };

  const updatedSourceRels = [
    ...(source.relationships || []).filter(r => r.targetId !== target.id || r.predicate !== predicate),
    forwardRel
  ];

  const updatedTargetRels = [
    ...(target.relationships || []).filter(r => r.targetId !== source.id || r.predicate !== reverseRel.predicate),
    reverseRel
  ];

  return {
    source: { ...source, relationships: updatedSourceRels },
    target: { ...target, relationships: updatedTargetRels }
  };
}
