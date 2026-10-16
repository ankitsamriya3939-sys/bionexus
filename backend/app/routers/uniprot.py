import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import PlainTextResponse

router = APIRouter(prefix="/uniprot", tags=["UniProt Knowledgebase"])

UNIPROT_BASE = "https://rest.uniprot.org/uniprotkb"

@router.get("/search")
async def uniprot_search(
    query: str = Query(...),
    size: int = Query(15)
):
    url = f"{UNIPROT_BASE}/search?query={query}&format=json&size={size}"
    async with httpx.AsyncClient(timeout=12.0) as client:
        try:
            r = await client.get(url)
            if r.status_code != 200:
                raise HTTPException(status_code=r.status_code, detail=f"UniProt HTTP Error {r.status_code}")
            return r.json()
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to communicate with UniProt API: {str(e)}")

@router.get("/entry/{accession}")
async def uniprot_entry(accession: str):
    url = f"{UNIPROT_BASE}/{accession}.json"
    async with httpx.AsyncClient(timeout=12.0) as client:
        try:
            r = await client.get(url)
            if r.status_code != 200:
                raise HTTPException(status_code=r.status_code, detail=f"UniProt HTTP Error {r.status_code}")
            return r.json()
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to fetch UniProt record: {str(e)}")

@router.get("/fasta/{accession}", response_class=PlainTextResponse)
async def uniprot_fasta(accession: str):
    url = f"{UNIPROT_BASE}/{accession}.fasta"
    async with httpx.AsyncClient(timeout=12.0) as client:
        try:
            r = await client.get(url)
            if r.status_code != 200:
                raise HTTPException(status_code=r.status_code, detail=f"UniProt HTTP Error {r.status_code}")
            return r.text
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to fetch FASTA from UniProt: {str(e)}")
