import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  createSequenceObject,
  createProteinObject,
  createStructureObject,
  createTaxonObject,
  createEvidenceRecord,
  ObjectTypes,
  linkScientificObjects
} from '../models/scientificModel';

const WorkspaceContext = createContext(null);

export function normalizeSequenceObject(input, defaultName = 'Untitled Sequence') {
  if (!input) return null;
  
  if (typeof input === 'object' && input.sequence) {
    const rawSeq = (input.sequence || '').replace(/[\s\r\n\d]/g, '').toUpperCase();
    return createSequenceObject({
      id: input.id,
      name: input.name || input.accession || defaultName,
      accession: input.accession || input.acc || 'Custom',
      description: input.description || input.title || '',
      organism: input.organism || 'Unspecified Organism',
      moleculeType: input.moleculeType || detectMoleculeType(rawSeq),
      sequence: rawSeq,
      source: input.source || 'NCBI / Input',
      createdAt: input.createdAt,
      relationships: input.relationships || []
    });
  }

  if (typeof input === 'string') {
    const cleanSeq = input.replace(/[\s\r\n\d]/g, '').toUpperCase();
    if (!cleanSeq) return null;
    return createSequenceObject({
      name: defaultName,
      accession: 'Custom Sequence',
      description: 'User Sequence',
      organism: 'Unspecified Organism',
      moleculeType: detectMoleculeType(cleanSeq),
      sequence: cleanSeq,
      source: 'User Input'
    });
  }

  return null;
}

export function detectMoleculeType(sequence = '') {
  const seq = (sequence || '').toUpperCase();
  if (!seq) return 'DNA';
  const proteinChars = /[EFILPQZJOUX]/;
  if (proteinChars.test(seq)) return 'protein';
  if (seq.includes('U') && !seq.includes('T')) return 'RNA';
  return 'DNA';
}

export function WorkspaceProvider({ children }) {
  // Global Active Sequence (Object or null)
  const [activeSequenceObj, setActiveSequenceObj] = useState(() => {
    try {
      const stored = localStorage.getItem('bionexus_active_sequence');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Active Project & Projects List
  const [activeProject, setActiveProject] = useState(() => {
    try {
      const stored = localStorage.getItem('bionexus_active_project');
      return stored ? JSON.parse(stored) : {
        id: 'proj_default',
        name: 'BioNexus Workspace Alpha',
        description: 'Multi-omic research workspace with integrated sequence, evolutionary, and structural evidence.',
        createdAt: new Date().toISOString()
      };
    } catch {
      return {
        id: 'proj_default',
        name: 'BioNexus Workspace Alpha',
        description: 'Multi-omic research workspace with integrated sequence, evolutionary, and structural evidence.',
        createdAt: new Date().toISOString()
      };
    }
  });

  const [projects, setProjects] = useState(() => {
    try {
      const stored = localStorage.getItem('bionexus_user_projects');
      return stored ? JSON.parse(stored) : [
        {
          id: 'proj_default',
          name: 'BioNexus Workspace Alpha',
          description: 'Multi-omic research workspace with integrated sequence, evolutionary, and structural evidence.',
          createdAt: new Date().toISOString()
        }
      ];
    } catch {
      return [{
        id: 'proj_default',
        name: 'BioNexus Workspace Alpha',
        description: 'Multi-omic research workspace with integrated sequence, evolutionary, and structural evidence.',
        createdAt: new Date().toISOString()
      }];
    }
  });

  // Saved Sequence Library
  const [sequenceLibrary, setSequenceLibrary] = useState(() => {
    try {
      const stored = localStorage.getItem('bionexus_sequence_library');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // -------------------------------------------------------------
  // Scientific Object Registry & Cross-Space Selection State
  // -------------------------------------------------------------
  const [scientificObjects, setScientificObjects] = useState(() => {
    try {
      const stored = localStorage.getItem('bionexus_scientific_objects');
      if (stored) return JSON.parse(stored);
    } catch {}
    // Seed initial high-quality scientific reference objects
    const seedTp53Seq = createSequenceObject({
      id: 'seq_tp53_cds',
      name: 'Human TP53 Coding Sequence (CDS)',
      accession: 'NM_000546.6',
      description: 'Cellular tumor antigen p53 transcript variant 1',
      organism: 'Homo sapiens',
      moleculeType: 'DNA',
      sequence: 'ATGGAGGAGCCGCAGTCAGATCCTAGCGTCGAGCCCCCTCTGAGTCAGGAAACATTTTCAGACCTATGGAAACTACTTCCTGAAAACAACGTTCTGTCCCCCTTGCCGTCCCAAGCAATGGATGATTTGATGCTGTCCCCGGACGATATTGAACAATGGTTCACTGAAGACCCAGGTCCAGATGAAGCTCCCAGAATGCCAGAGGCTGCTCCCCGCGTGGCCCCTGCACCAGCAGCTCCTACACCGGCGGCCCCTGCACCAGCCCCCTCCTGGCCCCTGTCATCTTCTGTCCCTTCCCAGAAAACCTACCAGGGCAGCTACGGTTTCCGTCTGGGCTTCTTGCATTCTGGGACAGCCAAGTCTGTGACTTGCACGTACTCCCCTGCCCTCAACAAGATGTTTTGCCAACTGGCCAAGACCTGCCCTGTGCAGCTGTGGGTTGATTCCACACCCCCGCCCGGCACCCGCGTCCGCGCCATGGCCATCTACAAGCAGTCACAGCACATGACGGAGGTTGTGAGGCGCTGCCCCCACCATGAGCGCTGCTCAGATAGCGATGGTCTGGCCCCTCCTCAGCATCTTATCCGAGTGGAAGGAAATTTGCGTGTGGAGTATTTGGATGACAGAAACACTTTTCGACATAGTGTGGTGGTGCCCTATGAGCCGCCTGAGGTTGGCTCTGACTGTACCACCATCCACTACAACTACATGTGTAACAGTTCCTGCATGGGCGGCATGAACCGGAGGCCCATCCTCACCATCATCACACTGGAAGACTCCAGTGGTAATCTACTGGGACGGAACAGCTTTGAGGTGCGTGTTTGTGCCTGTCCTGGGAGAGACCGGCGCACAGAGGAAGAGAATCTCCGCAAGAAAGGGGAGCCTCACCACGAGCTGCCCCCAGGGAGCACTAAGCGAGCACTGCCCAACAACACCAGCTCCTCTCCCCAGCCAAAGAAGAAACCACTGGATGGAGAATATTTCACCCTTCAGATCCGTGGGCGTGAGCGCTTCGAGATGTTCCGAGAGCTGAATGAGGCCTTGGAACTCAAGGATGCCCAGGCTGGGAAGGAGCCAGGGGGGAGCAGGGCTCACTCCAGCCACCTGAAGTCCAAAAAGGGTCAGTCTACCTCCCGCCATAAAAAACTCATGTTCAAGACAGAAGGGCCTGACTCAGACTGA',
      source: 'NCBI RefSeq'
    });

    const seedTp53Prot = createProteinObject({
      id: 'prot_tp53',
      name: 'Tumor Protein p53',
      uniprotAccession: 'P04637',
      geneSymbol: 'TP53',
      organism: 'Homo sapiens',
      sequence: 'MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPSQAMDDLMLSPDDIEQWFTEDPGPDEAPRMPEAAPPVAPAPAAPTPAAPAPAPSWPLSSSVPSQKTYQGSYGFRLGFLHSGTAKSVTCTYSPALNKMFCQLAKTCPVQLWVDSTPPPGTRVRAMAIYKQSQHMTEVVRRCPHHERCSDSDGLAPPQHLIRVEGNLRVEYLDDRNTFRHSVVVPYEPPEVGSDCTTIHYNYMCNSSCMGGMNRRPILTIITLEDSSGNLLGRNSFEVRVCACPGRDRRTEEENLRKKGEPHHELPPGSTKRALPNNTSSSPQPKKKPLDGEYFTLQIRGRERFEMFRELNEALELKDAQAGKEPGGSRAHSSHLKSKKGQSTSRHKKLMFKTEGPDSD',
      associatedPdbIds: ['1TUP', '6VXX']
    });

    const seedTp53Struct = createStructureObject({
      id: 'struct_1TUP',
      pdbId: '1TUP',
      title: 'Tumor suppressor p53 core domain complexed with DNA',
      experimentalMethod: 'X-ray Crystallography',
      resolutionAngstrom: 2.20,
      organism: 'Homo sapiens',
      chains: ['A', 'B', 'C', 'D'],
      ligands: ['ZN', 'DNA'],
      authors: 'Cho, Y., Gorina, S., Jeffrey, P.D., Pavletich, N.P.'
    });

    const seedTaxon = createTaxonObject({
      id: 'tax_9606',
      scientificName: 'Homo sapiens',
      commonName: 'Human',
      ncbiTaxId: 9606,
      rank: 'species',
      lineage: ['Eukaryota', 'Metazoa', 'Chordata', 'Mammalia', 'Primates', 'Hominidae', 'Homo']
    });

    const seedEvidence = createEvidenceRecord({
      id: 'evi_p53_structure',
      title: 'Crystal structure of a p53 tumor suppressor-DNA complex: understanding tumorigenic mutations',
      authors: 'Cho Y, Gorina S, Jeffrey PD, Pavletich NP',
      journal: 'Science',
      year: 1994,
      pmid: '8023157',
      doi: '10.1126/science.8023157',
      confidenceLevel: 'experimental',
      summary: 'The crystal structure reveals that p53 core domain binds the major and minor grooves of DNA using a loop-sheet-helix motif and two large loops constrained by a zinc atom.',
      targetObjectId: 'struct_1TUP'
    });

    // Link seed objects explicitly
    const link1 = linkScientificObjects(seedTp53Seq, seedTp53Prot, 'encodes');
    const link2 = linkScientificObjects(link1.target, seedTp53Struct, 'has_structure');
    const link3 = linkScientificObjects(seedTp53Struct, seedEvidence, 'evidenced_by');

    return [link1.source, link2.source, link2.target, seedTaxon, link3.target];
  });

  // Selected Biological Object
  const [selectedScientificObject, setSelectedScientificObject] = useState(() => {
    return null;
  });

  // Active Workspace Space: 'genome' | 'evolution' | 'protein' | 'evidence' | 'graph'
  const [activeSpace, setActiveSpace] = useState('genome');

  // Copilot Drawer State
  const [copilotOpen, setCopilotOpen] = useState(false);

  // Auto-Save Status
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved');
  const saveStatusTimerRef = useRef(null);

  // Sync active sequence with activeSequenceObj
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeSequenceObj) {
        try {
          localStorage.setItem('bionexus_active_sequence', JSON.stringify(activeSequenceObj));
        } catch {}
        setSequenceLibrary(prev => {
          const exists = prev.some(item => item.id === activeSequenceObj.id || (item.accession !== 'Custom Sequence' && item.accession === activeSequenceObj.accession));
          if (!exists) {
            return [activeSequenceObj, ...prev];
          }
          return prev;
        });
      } else {
        try {
          localStorage.removeItem('bionexus_active_sequence');
        } catch {}
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [activeSequenceObj]);

  // Sync scientific objects to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('bionexus_scientific_objects', JSON.stringify(scientificObjects));
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [scientificObjects]);

  // Sync sequence library
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('bionexus_sequence_library', JSON.stringify(sequenceLibrary));
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [sequenceLibrary]);

  // Sync projects
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('bionexus_user_projects', JSON.stringify(projects));
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [projects]);

  useEffect(() => {
    if (activeProject) {
      try {
        localStorage.setItem('bionexus_active_project', JSON.stringify(activeProject));
      } catch {}
    }
  }, [activeProject]);

  const setGlobalActiveSequence = useCallback((seqData, nameHint) => {
    const normalized = normalizeSequenceObject(seqData, nameHint || 'Active Sequence');
    setActiveSequenceObj(normalized);
    if (normalized) {
      setSelectedScientificObject(normalized);
      // Register in scientific objects list if not present
      setScientificObjects(prev => {
        const exists = prev.some(o => o.id === normalized.id);
        if (exists) return prev.map(o => o.id === normalized.id ? normalized : o);
        return [normalized, ...prev];
      });
    }
    setAutoSaveStatus('saving');
    if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
    saveStatusTimerRef.current = setTimeout(() => {
      setAutoSaveStatus('saved');
    }, 350);
    return normalized;
  }, []);

  const clearGlobalActiveSequence = useCallback(() => {
    setActiveSequenceObj(null);
    try {
      localStorage.removeItem('bionexus_active_sequence');
    } catch {}
  }, []);

  const clearAllSequences = useCallback(() => {
    setActiveSequenceObj(null);
    setSelectedScientificObject(null);
    setSequenceLibrary([]);
    try {
      localStorage.removeItem('bionexus_active_sequence');
      localStorage.removeItem('bionexus_sequence_library');
    } catch {}
    setAutoSaveStatus('saved');
  }, []);

  const saveToSequenceLibrary = useCallback((seqData) => {
    const normalized = normalizeSequenceObject(seqData);
    if (!normalized) return;
    setSequenceLibrary(prev => {
      const exists = prev.some(item => item.id === normalized.id || (item.accession !== 'Custom Sequence' && item.accession === normalized.accession));
      if (exists) {
        return prev.map(item => (item.id === normalized.id || item.accession === normalized.accession) ? normalized : item);
      }
      return [normalized, ...prev];
    });
    // Also add to scientific objects
    setScientificObjects(prev => {
      const exists = prev.some(o => o.id === normalized.id);
      if (exists) return prev;
      return [normalized, ...prev];
    });
    setAutoSaveStatus('saving');
    if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
    saveStatusTimerRef.current = setTimeout(() => {
      setAutoSaveStatus('saved');
    }, 350);
    return normalized;
  }, []);

  const removeFromSequenceLibrary = useCallback((id) => {
    setSequenceLibrary(prev => prev.filter(item => item.id !== id));
    setScientificObjects(prev => prev.filter(item => item.id !== id));
  }, []);

  // -------------------------------------------------------------
  // Scientific Object Registry Actions
  // -------------------------------------------------------------
  const registerScientificObject = useCallback((obj) => {
    if (!obj || !obj.id) return null;
    setScientificObjects(prev => {
      const exists = prev.some(o => o.id === obj.id);
      if (exists) {
        return prev.map(o => o.id === obj.id ? { ...o, ...obj, updatedAt: new Date().toISOString() } : o);
      }
      return [obj, ...prev];
    });
    return obj;
  }, []);

  const selectScientificObject = useCallback((obj) => {
    setSelectedScientificObject(obj);
    if (obj && obj.type === ObjectTypes.SEQUENCE) {
      setActiveSequenceObj(obj);
    }
  }, []);

  /**
   * Cross-Space Inspector: Navigates to a specific space while selecting the object
   */
  const inspectObjectInSpace = useCallback((obj, targetSpace) => {
    if (obj) {
      setSelectedScientificObject(obj);
      registerScientificObject(obj);
      if (obj.type === ObjectTypes.SEQUENCE) {
        setActiveSequenceObj(obj);
      }
    }
    if (targetSpace) {
      setActiveSpace(targetSpace);
    }
  }, [registerScientificObject]);

  /**
   * Find directly related objects for an object
   */
  const getRelatedObjects = useCallback((objectId) => {
    if (!objectId) return [];
    const current = scientificObjects.find(o => o.id === objectId);
    if (!current || !current.relationships) return [];

    const targetIds = new Set(current.relationships.map(r => r.targetId));
    return scientificObjects.filter(o => targetIds.has(o.id));
  }, [scientificObjects]);

  /**
   * Explicitly link two objects
   */
  const linkObjects = useCallback((sourceId, targetId, predicate, metadata = {}) => {
    setScientificObjects(prev => {
      const src = prev.find(o => o.id === sourceId);
      const tgt = prev.find(o => o.id === targetId);
      if (!src || !tgt) return prev;

      const { source: updatedSrc, target: updatedTgt } = linkScientificObjects(src, tgt, predicate, metadata);
      return prev.map(o => {
        if (o.id === sourceId) return updatedSrc;
        if (o.id === targetId) return updatedTgt;
        return o;
      });
    });
  }, []);

  const contextValue = useMemo(() => ({
    // Legacy / direct sequence bridge
    activeSequenceObj,
    setActiveSequenceObj,
    setGlobalActiveSequence,
    clearGlobalActiveSequence,
    clearAllSequences,
    sequenceLibrary,
    setSequenceLibrary,
    saveToSequenceLibrary,
    removeFromSequenceLibrary,

    // Project state
    activeProject,
    setActiveProject,
    projects,
    setProjects,

    // Scientific Object Model Registry & Cross-Space Selection
    scientificObjects,
    setScientificObjects,
    selectedScientificObject,
    setSelectedScientificObject,
    selectScientificObject,
    registerScientificObject,
    inspectObjectInSpace,
    getRelatedObjects,
    linkObjects,

    // Spaces & Copilot State
    activeSpace,
    setActiveSpace,
    copilotOpen,
    setCopilotOpen,

    // Persistence status
    autoSaveStatus,
    setAutoSaveStatus
  }), [
    activeSequenceObj,
    sequenceLibrary,
    activeProject,
    projects,
    scientificObjects,
    selectedScientificObject,
    activeSpace,
    copilotOpen,
    autoSaveStatus,
    setGlobalActiveSequence,
    clearGlobalActiveSequence,
    clearAllSequences,
    saveToSequenceLibrary,
    removeFromSequenceLibrary,
    selectScientificObject,
    registerScientificObject,
    inspectObjectInSpace,
    getRelatedObjects,
    linkObjects
  ]);

  return (
    <WorkspaceContext.Provider value={contextValue}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
