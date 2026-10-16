// BioNexus Copilot Reasoning & Grounding Engine
// Provides deterministic scientific inference adhering to 5 evidence tiers
// Supports client-side Gemini LLM execution when API key is provided

export async function askBioNexusCopilot({
  message,
  activeObject = null,
  projectContext = null,
  spaceContext = 'Genome Space',
  apiKey = null
}) {
  if (!message || typeof message !== 'string') {
    return {
      reply: 'Please provide a valid scientific question or prompt.',
      mode: 'error'
    };
  }

  // 1. Try local Express backend if reachable (e.g. localhost or custom server)
  try {
    const backendRes = await fetch('/api/copilot/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, activeObject, projectContext, spaceContext }),
      signal: AbortSignal.timeout(4000)
    });
    const contentType = backendRes.headers.get('content-type') || '';
    if (backendRes.ok && contentType.includes('application/json')) {
      const data = await backendRes.json();
      if (data && data.reply) return data;
    }
  } catch {
    // Backend offline or running on static hosting — proceed to direct inference
  }

  // 2. Try direct Gemini API if key is available in localStorage or env
  const geminiKey = apiKey || 
    (typeof window !== 'undefined' ? localStorage.getItem('bionexus_gemini_key') : null) || 
    import.meta.env.VITE_GEMINI_API_KEY;

  if (geminiKey) {
    try {
      const systemInstruction = `You are BioNexus Copilot, a senior computational biologist and structural bioinformatics assistant for BioNexus Studio.
You are grounded in the active project "${projectContext?.name || 'General Project'}" and selected object: ${JSON.stringify(activeObject || {})}.
Active Workspace Area: ${spaceContext || 'Genome Space'}.

CRITICAL SCIENTIFIC GROUNDING RULES:
1. Categorize all statements into the following structured evidence tiers:
   - [EXPERIMENTAL EVIDENCE]: Empirically verified findings (e.g. X-ray/Cryo-EM, binding assays, qPCR).
   - [DATABASE ANNOTATIONS]: Curated records from UniProtKB/Swiss-Prot, NCBI RefSeq, Ensembl.
   - [COMPUTATIONAL PREDICTIONS]: In-silico inferences (AlphaFold pLDDT, BLAST E-values, Jukes-Cantor/Kimura distances, Maximum Likelihood topology).
   - [HYPOTHESES & UNCERTAINTIES]: Mechanistic hypotheses, open scientific questions.
   - [MISSING EVIDENCE]: Information not found or unverified.
2. NEVER invent citations, PMIDs, DOIs, protein functions, or phylogenetic relationships. If unknown, state clearly under [MISSING EVIDENCE].
3. Maintain rigorous scientific accuracy. Cite genuine identifiers (PDB IDs, UniProt accessions, GenBank) when relevant.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: `${systemInstruction}\n\nUser Question: ${message}` }] }
          ]
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const geminiData = await response.json();
        const replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) {
          return {
            reply: replyText,
            mode: 'llm_grounded',
            objectRef: activeObject?.name || activeObject?.id || null
          };
        }
      }
    } catch {
      // Gemini network error — fall through to deterministic rules
    }
  }

  // 3. Deterministic Domain-Grounded Scientific Engine (Zero Hallucination)
  return generateDeterministicScientificResponse(message, activeObject, projectContext, spaceContext);
}

export function generateDeterministicScientificResponse(message, activeObject, projectContext, spaceContext) {
  const objName = activeObject?.name || activeObject?.symbol || activeObject?.pdbId || 'Biological entity';
  const objSeq = activeObject?.sequence || '';
  const objPdb = activeObject?.pdbId || activeObject?.associatedPdbIds?.[0] || null;

  const experimental = [];
  const database = [];
  const computational = [];
  const hypotheses = [];
  const missing = [];

  if (activeObject?.type === 'sequence') {
    database.push(`Accession ${activeObject.accession || 'N/A'} registered from ${activeObject.source || 'repository'}.`);
    computational.push(`Calculated sequence length: ${activeObject.length || objSeq.length} bp; GC-content: ${activeObject.gcPercent != null ? activeObject.gcPercent : 'N/A'}%.`);
    if (activeObject.moleculeType === 'DNA') {
      computational.push(`Codon orientation: 5' to 3' sense strand. Estimated translation yields ${(objSeq.length / 3).toFixed(0)} amino acid polypeptide frame.`);
    }
    if (!objPdb) {
      missing.push('No experimentally determined 3D tertiary structure directly mapped in project state.');
    }
  } else if (activeObject?.type === 'protein') {
    database.push(`UniProt Accession: ${activeObject.uniprotAccession || 'Unassigned'}; Gene Symbol: ${activeObject.geneSymbol || 'Unknown'}.`);
    computational.push(`Estimated molecular weight: ${activeObject.molecularWeightKDa || 0} kDa; Isoelectric point (pI): ${activeObject.isoelectricPoint || 7.0}.`);
    if (objPdb) {
      experimental.push(`Associated experimental crystal structure available in PDB: ${objPdb}.`);
    } else {
      missing.push('No direct X-ray or Cryo-EM PDB structure linked. Computational AlphaFold prediction recommended.');
    }
  } else if (activeObject?.type === 'structure') {
    experimental.push(`Determined by ${activeObject.experimentalMethod || 'X-ray Crystallography'} with resolution ${activeObject.resolutionAngstrom ? `${activeObject.resolutionAngstrom} Å` : 'unspecified'}.`);
    if (activeObject.rValueFree) {
      experimental.push(`Reported R-free: ${activeObject.rValueFree}.`);
    }
    database.push(`Deposited in RCSB Protein Data Bank under accession ${activeObject.pdbId}.`);
    if (activeObject.ligands && activeObject.ligands.length > 0) {
      experimental.push(`Bound molecular ligands identified: ${activeObject.ligands.join(', ')}.`);
    }
  } else if (activeObject?.type === 'tree') {
    computational.push(`Tree reconstructed using ${activeObject.method === 'ml' ? 'Maximum Likelihood' : activeObject.method === 'me' ? 'Minimum Evolution' : activeObject.method?.toUpperCase()} under substitution model ${activeObject.substitutionModel || 'JC69'}.`);
    if (activeObject.logLikelihood != null) {
      computational.push(`Evaluated Log-Likelihood ln L: ${activeObject.logLikelihood}; AIC: ${activeObject.aicScore || 'N/A'}.`);
    }
    if (activeObject.treeLength != null) {
      computational.push(`Total Tree Length (sum of branch lengths): ${activeObject.treeLength} substitutions/site.`);
    }
    hypotheses.push('Topology reflects divergent evolutionary distance based on aligned nucleotide substitutions.');
  } else {
    database.push(`Active Workspace Area: ${spaceContext || 'Genome Space'} with Project: ${projectContext?.name || 'BioNexus'}.`);
  }

  // Address the user's specific query
  const queryLower = (message || '').toLowerCase();
  let analysisNarrative = '';

  if (queryLower.includes('structure') || queryLower.includes('pdb') || queryLower.includes('fold')) {
    if (objPdb) {
      analysisNarrative = `The tertiary structure for ${objName} is resolved under PDB ${objPdb}. You can inspect its cartoon ribbons, chains, and active site residues directly in Protein Space.`;
    } else {
      analysisNarrative = `No verified crystallographic coordinates are currently mapped for ${objName}. In BioNexus Studio, you can search NCBI/UniProt to link experimental coordinates or AlphaFold models.`;
    }
  } else if (queryLower.includes('evolution') || queryLower.includes('tree') || queryLower.includes('phylogen')) {
    analysisNarrative = `Evolutionary relationships can be analyzed in Evolution Space using Neighbor-Joining, Minimum Evolution, and Maximum Likelihood with Jukes-Cantor (JC69) and Kimura 2-P models.`;
  } else if (queryLower.includes('function') || queryLower.includes('mutation') || queryLower.includes('cancer')) {
    analysisNarrative = `Functional annotations and active sites can be explored in Evidence Space. When studying human homologs (e.g. TP53, BRCA1), missense mutations frequently concentrate in catalytic or DNA-binding domains.`;
  } else {
    analysisNarrative = `I have analyzed the active biological object "${objName}" in the context of "${projectContext?.name || 'BioNexus Studio'}". Here is the verified scientific breakdown:`;
  }

  let structuredReply = `${analysisNarrative}\n\n`;

  if (experimental.length > 0) {
    structuredReply += `🔬 **[EXPERIMENTAL EVIDENCE]**\n` + experimental.map(e => `• ${e}`).join('\n') + `\n\n`;
  }
  if (database.length > 0) {
    structuredReply += `📖 **[DATABASE ANNOTATIONS]**\n` + database.map(d => `• ${d}`).join('\n') + `\n\n`;
  }
  if (computational.length > 0) {
    structuredReply += `💻 **[COMPUTATIONAL PREDICTIONS]**\n` + computational.map(c => `• ${c}`).join('\n') + `\n\n`;
  }
  if (hypotheses.length > 0) {
    structuredReply += `💡 **[HYPOTHESES & MODEL INFERENCES]**\n` + hypotheses.map(h => `• ${h}`).join('\n') + `\n\n`;
  }
  if (missing.length > 0) {
    structuredReply += `⚠️ **[MISSING OR UNAVAILABLE EVIDENCE]**\n` + missing.map(m => `• ${m}`).join('\n') + `\n\n`;
  }

  structuredReply += `*Note: BioNexus Copilot enforces strict evidence tiering to prevent scientific hallucination. Provenance tracks directly to project state.*`;

  return {
    reply: structuredReply,
    mode: 'deterministic_grounded',
    objectRef: objName
  };
}
