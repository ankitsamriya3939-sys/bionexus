import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import PlainTextResponse

router = APIRouter(prefix="/ena", tags=["European Nucleotide Archive (ENA)"])

EBI_BASE = "https://www.ebi.ac.uk/ebisearch/ws/rest"
ENA_BROWSER_BASE = "https://www.ebi.ac.uk/ena/browser/api"

@router.get("/search")
async def ena_search(
    query: str = Query(...),
    size: int = Query(15)
):
    url = f"{EBI_BASE}/embl?query={query}&format=json&size={size}"
    async with httpx.AsyncClient(timeout=12.0) as client:
        try:
            r = await client.get(url)
            if r.status_code != 200:
                raise HTTPException(status_code=r.status_code, detail=f"ENA/EBI HTTP Error {r.status_code}")
            return r.json()
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to communicate with ENA/EBI Search API: {str(e)}")

@router.get("/fasta/{accession}", response_class=PlainTextResponse)
async def ena_fasta(accession: str):
    url = f"{ENA_BROWSER_BASE}/fasta/{accession}"
    async with httpx.AsyncClient(timeout=12.0) as client:
        try:
            r = await client.get(url)
            if r.status_code != 200:
                raise HTTPException(status_code=r.status_code, detail=f"ENA Browser HTTP Error {r.status_code}")
            return r.text
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to fetch FASTA from ENA Browser: {str(e)}")
