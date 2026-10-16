import asyncio
import time
import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import PlainTextResponse
from app.config import settings

router = APIRouter(prefix="/ncbi", tags=["NCBI E-Utilities"])

NCBI_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

class AsyncNcbiRateLimiter:
    """
    NCBI Entrez E-Utilities rate limiter and request queue.
    - Without API Key: 3 requests/second
    - With API Key:    10 requests/second
    """
    def __init__(self):
        self._lock = asyncio.Lock()
        self._last_call = 0.0

    @property
    def api_key(self) -> str:
        return (settings.NCBI_API_KEY or "").strip()

    @property
    def rate_limit(self) -> int:
        return 10 if self.api_key else 3

    @property
    def min_interval(self) -> float:
        return 1.0 / self.rate_limit

    async def wait(self):
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self._last_call
            if elapsed < self.min_interval:
                await asyncio.sleep(self.min_interval - elapsed)
            self._last_call = time.monotonic()

    def format_url(self, raw_url: str) -> str:
        key = self.api_key
        if key and "api_key=" not in raw_url:
            sep = "&" if "?" in raw_url else "?"
            return f"{raw_url}{sep}api_key={key}"
        return raw_url

    def get_headers(self) -> dict:
        headers = {
            "User-Agent": "BioNexusStudio/2.1 (https://bionexusstudio.ai; contact@bionexusstudio.ai)"
        }
        if self.api_key:
            headers["NCBI-API-Key"] = self.api_key
        return headers

limiter = AsyncNcbiRateLimiter()

@router.get("/status")
async def ncbi_status():
    return {
        "status": "active",
        "has_api_key": bool(limiter.api_key),
        "rate_limit": limiter.rate_limit,
        "rate_limit_description": f"{limiter.rate_limit} requests/second ({'Authenticated NCBI API Key Active' if limiter.api_key else 'Unauthenticated Public Limit - Supply NCBI_API_KEY for 10 req/s'})",
        "min_interval_ms": int(limiter.min_interval * 1000)
    }

@router.get("/search")
async def ncbi_search(
    term: str = Query(...),
    db: str = Query("nucleotide"),
    retmax: int = Query(15)
):
    raw_url = f"{NCBI_BASE}/esearch.fcgi?db={db}&term={term}&retmode=json&retmax={retmax}&tool=BioNexusStudio&email=support@bionexusstudio.ai"
    url = limiter.format_url(raw_url)
    headers = limiter.get_headers()
    
    await limiter.wait()
    async with httpx.AsyncClient(timeout=12.0, headers=headers) as client:
        try:
            r = await client.get(url)
            if r.status_code == 429:
                # NCBI Rate limit backoff
                await asyncio.sleep(1.0)
                r = await client.get(url)
            if r.status_code != 200:
                raise HTTPException(status_code=r.status_code, detail="NCBI HTTP error")
            data = r.json()
            id_list = data.get("esearchresult", {}).get("idlist", [])
            count = int(data.get("esearchresult", {}).get("count", "0"))
            return {"ids": id_list, "total": count}
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to communicate with NCBI: {str(e)}")

@router.get("/summary")
async def ncbi_summary(
    id: str = Query(...),
    db: str = Query("nucleotide")
):
    raw_url = f"{NCBI_BASE}/esummary.fcgi?db={db}&id={id}&retmode=json&tool=BioNexusStudio&email=support@bionexusstudio.ai"
    url = limiter.format_url(raw_url)
    headers = limiter.get_headers()
    
    await limiter.wait()
    async with httpx.AsyncClient(timeout=12.0, headers=headers) as client:
        try:
            r = await client.get(url)
            if r.status_code == 429:
                await asyncio.sleep(1.0)
                r = await client.get(url)
            if r.status_code != 200:
                raise HTTPException(status_code=r.status_code, detail="NCBI HTTP error")
            data = r.json()
            result_obj = data.get("result", {})
            ids = [i.strip() for i in id.split(",") if i.strip()]
            summaries = []
            for item_key in ids:
                item = result_obj.get(item_key)
                if not item:
                    continue
                summaries.append({
                    "id": item_key,
                    "title": item.get("title") or item.get("caption") or item.get("source") or "No Title Available",
                    "organism": item.get("organism") or item.get("source") or "Unknown Organism",
                    "length": item.get("slen") or item.get("length") or None,
                    "acc": item.get("caption") or item_key,
                    "updateDate": item.get("updatedate") or item.get("pubdate") or "",
                    "extra": item
                })
            return summaries
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to fetch NCBI document summaries: {str(e)}")

@router.get("/fasta", response_class=PlainTextResponse)
async def ncbi_fasta(
    id: str = Query(...),
    db: str = Query("nucleotide")
):
    raw_url = f"{NCBI_BASE}/efetch.fcgi?db={db}&id={id}&rettype=fasta&retmode=text&tool=BioNexusStudio&email=support@bionexusstudio.ai"
    url = limiter.format_url(raw_url)
    headers = limiter.get_headers()
    
    await limiter.wait()
    async with httpx.AsyncClient(timeout=12.0, headers=headers) as client:
        try:
            r = await client.get(url)
            if r.status_code == 429:
                await asyncio.sleep(1.0)
                r = await client.get(url)
            if r.status_code != 200:
                raise HTTPException(status_code=r.status_code, detail="NCBI HTTP error")
            return r.text
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to fetch FASTA from NCBI: {str(e)}")

@router.get("/resolve-accession")
async def ncbi_resolve_accession(accession: str = Query(...)):
    import re
    from datetime import datetime, timezone

    raw_accession = accession.strip()
    if not raw_accession:
        raise HTTPException(status_code=400, detail="Missing accession query parameter.")

    cleaned_acc = raw_accession.upper()
    if not re.match(r"^[A-Z0-9_.-]{3,35}$", cleaned_acc):
        raise HTTPException(status_code=400, detail=f"Invalid accession format: '{raw_accession}'.")

    # RefSeq prefix rules
    target_db = None
    if re.match(r"^(NC_|NM_|NR_|NZ_|NG_|NT_|NW_|XM_|XR_)", cleaned_acc):
        target_db = "nucleotide"
    elif re.match(r"^(NP_|AP_|XP_|YP_|ZP_|WP_)", cleaned_acc):
        target_db = "protein"

    headers = limiter.get_headers()

    async with httpx.AsyncClient(timeout=15.0, headers=headers) as client:
        if not target_db:
            # Check nucleotide
            test_nuc_url = limiter.format_url(
                f"{NCBI_BASE}/esearch.fcgi?db=nucleotide&term={cleaned_acc}[Accession]&retmode=json&retmax=1&tool=BioNexusStudio&email=support@bionexusstudio.ai"
            )
            await limiter.wait()
            try:
                nuc_res = await client.get(test_nuc_url)
                if nuc_res.status_code == 200:
                    nuc_data = nuc_res.json()
                    if nuc_data.get("esearchresult", {}).get("idlist"):
                        target_db = "nucleotide"
            except Exception:
                pass

            if not target_db:
                # Check protein
                test_prot_url = limiter.format_url(
                    f"{NCBI_BASE}/esearch.fcgi?db=protein&term={cleaned_acc}[Accession]&retmode=json&retmax=1&tool=BioNexusStudio&email=support@bionexusstudio.ai"
                )
                await limiter.wait()
                try:
                    prot_res = await client.get(test_prot_url)
                    if prot_res.status_code == 200:
                        prot_data = prot_res.json()
                        if prot_data.get("esearchresult", {}).get("idlist"):
                            target_db = "protein"
                except Exception:
                    pass

        if not target_db:
            target_db = "nucleotide"

        # Fetch FASTA and ESummary concurrently
        fasta_url = limiter.format_url(
            f"{NCBI_BASE}/efetch.fcgi?db={target_db}&id={cleaned_acc}&rettype=fasta&retmode=text&tool=BioNexusStudio&email=support@bionexusstudio.ai"
        )
        summary_url = limiter.format_url(
            f"{NCBI_BASE}/esummary.fcgi?db={target_db}&id={cleaned_acc}&retmode=json&tool=BioNexusStudio&email=support@bionexusstudio.ai"
        )

        await limiter.wait()
        fasta_task = client.get(fasta_url)
        await limiter.wait()
        summary_task = client.get(summary_url)

        fasta_res, summary_res = await asyncio.gather(fasta_task, summary_task, return_exceptions=True)

        fasta_text = ""
        if isinstance(fasta_res, httpx.Response) and fasta_res.status_code == 200:
            fasta_text = fasta_res.text

        # If fasta was not found in candidate db and targetDb was nucleotide, try protein
        if (not fasta_text or ">" not in fasta_text) and target_db == "nucleotide" and not re.match(r"^(NC_|NM_|NR_)", cleaned_acc):
            alt_fasta_url = limiter.format_url(
                f"{NCBI_BASE}/efetch.fcgi?db=protein&id={cleaned_acc}&rettype=fasta&retmode=text&tool=BioNexusStudio&email=support@bionexusstudio.ai"
            )
            await limiter.wait()
            try:
                alt_res = await client.get(alt_fasta_url)
                if alt_res.status_code == 200 and ">" in alt_res.text:
                    target_db = "protein"
                    fasta_text = alt_res.text
            except Exception:
                pass

        if not fasta_text or ">" not in fasta_text:
            raise HTTPException(
                status_code=404,
                detail=f"Record for accession '{raw_accession}' was not found in NCBI {target_db} database."
            )

        summary_item = None
        uid = None
        if isinstance(summary_res, httpx.Response) and summary_res.status_code == 200:
            try:
                sum_json = summary_res.json()
                uids = sum_json.get("result", {}).get("uids", [])
                if uids:
                    uid = uids[0]
                    summary_item = sum_json.get("result", {}).get(uid)
            except Exception:
                pass

        lines = fasta_text.strip().split("\n")
        fasta_header = ""
        seq_lines = []
        for line in lines:
            trimmed = line.strip()
            if trimmed.startswith(">"):
                if not fasta_header:
                    fasta_header = trimmed[1:].strip()
            else:
                seq_lines.append(trimmed)
        biological_sequence = "".join(seq_lines).upper()

        molecule_type = "protein" if target_db == "protein" else "DNA"
        if target_db == "nucleotide":
            molecule_type = "RNA" if ("U" in biological_sequence and "T" not in biological_sequence) else "DNA"

        summary_item = summary_item or {}
        slen = summary_item.get("slen")
        try:
            length_val = int(slen) if slen else len(biological_sequence)
        except (ValueError, TypeError):
            length_val = len(biological_sequence)

        return {
            "accession": summary_item.get("caption") or cleaned_acc,
            "uid": uid or cleaned_acc,
            "database": target_db,
            "moleculeType": molecule_type,
            "title": summary_item.get("title") or fasta_header or f"NCBI Record {cleaned_acc}",
            "organism": summary_item.get("organism") or summary_item.get("source") or "Unknown organism",
            "length": length_val,
            "updateDate": summary_item.get("updatedate") or summary_item.get("pubdate") or "",
            "topology": summary_item.get("topology"),
            "strand": summary_item.get("strand"),
            "fastaHeader": fasta_header,
            "sequence": biological_sequence,
            "rawFasta": fasta_text,
            "provenance": {
                "sourceDatabase": "NCBI Protein" if target_db == "protein" else "NCBI Nucleotide",
                "externalId": cleaned_acc,
                "retrievedAt": datetime.now(timezone.utc).isoformat()
            }
        }

@router.get("/elink")
async def ncbi_elink(
    id: str = Query(...),
    dbfrom: str = Query("gene"),
    db: str = Query("nuccore,protein,pubmed")
):
    raw_url = f"{NCBI_BASE}/elink.fcgi?dbfrom={dbfrom}&id={id}&db={db}&retmode=json&tool=BioNexusStudio&email=support@bionexusstudio.ai"
    url = limiter.format_url(raw_url)
    headers = limiter.get_headers()

    await limiter.wait()
    async with httpx.AsyncClient(timeout=12.0, headers=headers) as client:
        try:
            r = await client.get(url)
            if r.status_code != 200:
                raise HTTPException(status_code=r.status_code, detail=f"NCBI ELink HTTP Error {r.status_code}")
            return r.json()
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to fetch cross-references from NCBI ELink: {str(e)}")
