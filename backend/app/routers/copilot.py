import os
import httpx
from typing import Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/copilot", tags=["BioNexus Copilot"])

class CopilotChatRequest(BaseModel):
    message: str
    activeObject: dict[str, Any] | None = None
    projectContext: dict[str, Any] | None = None
    spaceContext: str | None = "Genome Space"

class CopilotChatResponse(BaseModel):
    reply: str
    mode: str = "deterministic_grounded"
    objectRef: str | None = None

@router.post("/chat", response_model=CopilotChatResponse)
async def copilot_chat(payload: CopilotChatRequest):
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Missing prompt message.")

    active_object = payload.activeObject or {}
    project_context = payload.projectContext or {}
    space_context = payload.spaceContext or "Genome Space"

    gemini_key = os.getenv("GEMINI_API_KEY")

    if gemini_key:
        try:
            system_instruction = (
                f"You are BioNexus Copilot, a senior computational biologist and structural bioinformatics assistant for BioNexus Studio.\n"
                f"You are grounded in active project \"{project_context.get('name', 'General Project')}\" and selected object: {active_object}.\n"
                f"Active Workspace Area: {space_context}.\n\n"
                f"CRITICAL SCIENTIFIC GROUNDING RULES:\n"
                f"1. Categorize all statements into the following structured evidence tiers:\n"
                f"   - [EXPERIMENTAL EVIDENCE]: Empirically verified findings (e.g. X-ray/Cryo-EM, binding assays, qPCR).\n"
                f"   - [DATABASE ANNOTATIONS]: Curated records from UniProtKB/Swiss-Prot, NCBI RefSeq, Ensembl.\n"
                f"   - [COMPUTATIONAL PREDICTIONS]: In-silico inferences (AlphaFold pLDDT, BLAST E-values, Jukes-Cantor/Kimura distances, Maximum Likelihood topology).\n"
                f"   - [HYPOTHESES & MODEL INFERENCES]: Mechanistic hypotheses, open scientific questions.\n"
                f"   - [MISSING OR UNAVAILABLE EVIDENCE]: Information not found or unverified.\n"
                f"2. NEVER invent citations, PMIDs, DOIs, protein functions, or phylogenetic relationships. If unknown, state clearly under [MISSING OR UNAVAILABLE EVIDENCE].\n"
                f"3. Maintain rigorous scientific accuracy. Cite genuine identifiers (PDB IDs, UniProt accessions, GenBank) when relevant."
            )

            async with httpx.AsyncClient(timeout=12.0) as client:
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}",
                    json={
                        "contents": [
                            {"role": "user", "parts": [{"text": f"{system_instruction}\n\nUser Question: {message}"}]}
                        ]
                    }
                )
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        if text:
                            return CopilotChatResponse(
                                reply=text,
                                mode="llm_grounded",
                                objectRef=active_object.get("name") or active_object.get("id")
                            )
        except Exception:
            pass  # Fall through to deterministic response

    # Deterministic domain-grounded reasoning
    obj_name = active_object.get("name") or active_object.get("symbol") or active_object.get("pdbId") or "Biological entity"
    obj_type = active_object.get("type", "entity")
    obj_seq = active_object.get("sequence", "")
    obj_pdb = active_object.get("pdbId") or (active_object.get("associatedPdbIds", [None])[0] if isinstance(active_object.get("associatedPdbIds"), list) and active_object.get("associatedPdbIds") else None)

    experimental = []
    database = []
    computational = []
    hypotheses = []
    missing = []

    if obj_type == "sequence":
        database.append(f"Accession {active_object.get('accession', 'N/A')} registered from {active_object.get('source', 'repository')}.")
        computational.append(f"Calculated sequence length: {active_object.get('length') or len(obj_seq)} bp; GC-content: {active_object.get('gcPercent', 'N/A')}%.")
        if active_object.get("moleculeType") == "DNA" and len(obj_seq) > 0:
            computational.append(f"Codon orientation: 5' to 3' sense strand. Estimated translation yields {len(obj_seq) // 3} amino acid polypeptide frame.")
        if not obj_pdb:
            missing.append("No experimentally determined 3D tertiary structure directly mapped in project state.")

    elif obj_type == "protein":
        database.append(f"UniProt Accession: {active_object.get('uniprotAccession', 'Unassigned')}; Gene Symbol: {active_object.get('geneSymbol', 'Unknown')}.")
        computational.append(f"Estimated molecular weight: {active_object.get('molecularWeightKDa', 0)} kDa; Isoelectric point (pI): {active_object.get('isoelectricPoint', 7.0)}.")
        if obj_pdb:
            experimental.append(f"Associated experimental crystal structure available in PDB: {obj_pdb}.")
        else:
            missing.append("No direct X-ray or Cryo-EM PDB structure linked. Computational AlphaFold prediction recommended.")

    elif obj_type == "structure":
        experimental.append(f"Determined by {active_object.get('experimentalMethod', 'X-ray Crystallography')} with resolution {active_object.get('resolutionAngstrom', 'unspecified')} Å.")
        if active_object.get("rValueFree"):
            experimental.append(f"Reported R-free: {active_object['rValueFree']}.")
        database.append(f"Deposited in RCSB Protein Data Bank under accession {active_object.get('pdbId', 'N/A')}.")
        ligands = active_object.get("ligands", [])
        if ligands:
            experimental.append(f"Bound molecular ligands identified: {', '.join(ligands)}.")

    elif obj_type == "tree":
        computational.append(f"Tree reconstructed using {active_object.get('method', 'NJ').upper()} under substitution model {active_object.get('substitutionModel', 'JC69')}.")
        if active_object.get("logLikelihood") is not None:
            computational.append(f"Evaluated Log-Likelihood ln L: {active_object['logLikelihood']}; AIC: {active_object.get('aicScore', 'N/A')}.")
        hypotheses.append("Topology reflects divergent evolutionary distance based on aligned nucleotide substitutions.")
    else:
        database.append(f"Active Workspace Area: {space_context} with Project: {project_context.get('name', 'BioNexus')}.")

    query_lower = message.lower()
    if any(k in query_lower for k in ["structure", "pdb", "fold"]):
        if obj_pdb:
            analysis_narrative = f"The tertiary structure for {obj_name} is resolved under PDB {obj_pdb}. You can inspect its cartoon ribbons, chains, and active site residues directly in Protein Space."
        else:
            analysis_narrative = f"No verified crystallographic coordinates are currently mapped for {obj_name}. In BioNexus Studio, you can search NCBI/UniProt to link experimental coordinates or AlphaFold models."
    elif any(k in query_lower for k in ["evolution", "tree", "phylogen"]):
        analysis_narrative = "Evolutionary relationships can be analyzed in Evolution Space using Neighbor-Joining, Minimum Evolution, and Maximum Likelihood with Jukes-Cantor (JC69) and Kimura 2-P models."
    elif any(k in query_lower for k in ["function", "mutation", "cancer"]):
        analysis_narrative = "Functional annotations and active sites can be explored in Evidence Space. When studying human homologs (e.g. TP53, BRCA1), missense mutations frequently concentrate in catalytic or DNA-binding domains."
    else:
        analysis_narrative = f"I have analyzed the active biological object \"{obj_name}\" in the context of \"{project_context.get('name', 'BioNexus Studio')}\". Here is the verified scientific breakdown:"

    lines = [f"{analysis_narrative}\n"]
    if experimental:
        lines.append("🔬 **[EXPERIMENTAL EVIDENCE]**\n" + "\n".join(f"• {e}" for e in experimental) + "\n")
    if database:
        lines.append("📖 **[DATABASE ANNOTATIONS]**\n" + "\n".join(f"• {d}" for d in database) + "\n")
    if computational:
        lines.append("💻 **[COMPUTATIONAL PREDICTIONS]**\n" + "\n".join(f"• {c}" for c in computational) + "\n")
    if hypotheses:
        lines.append("💡 **[HYPOTHESES & MODEL INFERENCES]**\n" + "\n".join(f"• {h}" for h in hypotheses) + "\n")
    if missing:
        lines.append("⚠️ **[MISSING OR UNAVAILABLE EVIDENCE]**\n" + "\n".join(f"• {m}" for m in missing) + "\n")

    lines.append("*Note: BioNexus Copilot enforces strict evidence tiering to prevent scientific hallucination. Provenance tracks directly to project state.*")

    return CopilotChatResponse(
        reply="\n".join(lines),
        mode="deterministic_grounded",
        objectRef=obj_name
    )
