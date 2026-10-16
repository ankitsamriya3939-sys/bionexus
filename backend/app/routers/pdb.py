import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/pdb", tags=["RCSB PDB"])

@router.get("/summary/{pdb_id}")
async def get_pdb_summary(pdb_id: str):
    clean_id = pdb_id.strip().upper()
    if len(clean_id) != 4:
        raise HTTPException(status_code=400, detail="Valid 4-character PDB ID required.")

    url = f"https://data.rcsb.org/rest/v1/core/entry/{clean_id}"
    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            r = await client.get(url)
            if r.status_code == 404:
                raise HTTPException(status_code=404, detail=f"PDB ID '{clean_id}' not found in RCSB.")
            if r.status_code != 200:
                raise HTTPException(status_code=r.status_code, detail="RCSB PDB API error")
            
            data = r.json()
            title = data.get("struct", {}).get("title") or f"PDB Structure {clean_id}"
            exptl = data.get("exptl", [])
            method = exptl[0].get("method") if exptl else "X-ray Crystallography"
            resolutions = data.get("rcsb_entry_info", {}).get("resolution_combined", [])
            resolution = resolutions[0] if resolutions else None
            refine = data.get("refine", [])
            r_free = refine[0].get("ls_R_factor_R_free") if refine else None
            dep_date = data.get("rcsb_accession_info", {}).get("deposit_date")
            dep_date_str = dep_date.split("T")[0] if dep_date else None
            authors = ", ".join([a.get("name", "") for a in data.get("audit_author", [])[:4]])
            tax_ids = data.get("rcsb_entry_info", {}).get("polymer_entity_taxonomy_ids", [])
            organism = "Biological Specimen" if tax_ids else "Synthetic / Recombinant"

            return {
                "pdbId": clean_id,
                "title": title,
                "method": method,
                "resolution": resolution,
                "rFree": r_free,
                "depositionDate": dep_date_str,
                "authors": authors,
                "organism": organism,
                "polymerCount": data.get("rcsb_entry_info", {}).get("polymer_entity_count", 1),
                "nonpolymerCount": data.get("rcsb_entry_info", {}).get("nonpolymer_entity_count", 0)
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to fetch RCSB PDB metadata: {str(e)}")
