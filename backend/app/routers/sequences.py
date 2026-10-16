import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.sequence import Sequence
from app.schemas.sequence import SequenceCreate, SequenceOut
from app.bio.analyzer import analyzer
from app.auth.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/sequences", tags=["Sequences"])

@router.get("", response_model=list[SequenceOut])
async def list_sequences(
    project_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Sequence).where(Sequence.project_id == project_id).order_by(Sequence.created_at.desc())
    result = await db.execute(query)
    sequences = result.scalars().all()
    return [SequenceOut.model_validate(s) for s in sequences]

@router.post("", response_model=SequenceOut, status_code=status.HTTP_201_CREATED)
async def create_sequence(
    seq_in: SequenceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    analysis = analyzer.analyze_sequence(seq_in.raw_seq)
    
    seq = Sequence(
        project_id=seq_in.project_id,
        name=seq_in.name,
        accession=seq_in.accession,
        seq_type=analysis["seq_type"],
        raw_seq=analysis["sequence"],
        length=analysis["length"],
        gc_content=analysis["gc_content"],
        description=seq_in.description
    )
    db.add(seq)
    await db.commit()
    await db.refresh(seq)
    return SequenceOut.model_validate(seq)

@router.get("/fetch/{accession}")
async def fetch_remote_accession(accession: str):
    """
    Fetches raw sequence from NCBI e-utilities or UniProt by accession code.
    E.g. NM_000518, P69905, NC_045512.2
    """
    clean_acc = accession.strip().upper()
    
    # Try UniProt first if format matches UniProt accession (e.g. P69905)
    uniprot_url = f"https://rest.uniprot.org/uniprotkb/{clean_acc}.fasta"
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            r = await client.get(uniprot_url)
            if r.status_code == 200 and r.text.startswith(">"):
                lines = r.text.splitlines()
                header = lines[0][1:]
                seq_str = "".join(lines[1:])
                analysis = analyzer.analyze_sequence(seq_str)
                return {
                    "source": "UniProt",
                    "accession": clean_acc,
                    "header": header,
                    "raw_seq": analysis["sequence"],
                    "analysis": analysis
                }
        except Exception:
            pass

        # Try NCBI e-utilities efetch
        ncbi_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id={clean_acc}&rettype=fasta&retmode=text"
        try:
            r = await client.get(ncbi_url)
            if r.status_code == 200 and r.text.startswith(">"):
                lines = r.text.splitlines()
                header = lines[0][1:]
                seq_str = "".join(lines[1:])
                analysis = analyzer.analyze_sequence(seq_str)
                return {
                    "source": "NCBI",
                    "accession": clean_acc,
                    "header": header,
                    "raw_seq": analysis["sequence"],
                    "analysis": analysis
                }
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to fetch accession from NCBI/UniProt: {str(e)}")

    raise HTTPException(status_code=404, detail=f"Accession '{clean_acc}' not found on NCBI or UniProt.")

@router.get("/{sequence_id}", response_model=SequenceOut)
async def get_sequence(
    sequence_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Sequence).where(Sequence.id == sequence_id)
    result = await db.execute(query)
    seq = result.scalar_one_or_none()
    if not seq:
        raise HTTPException(status_code=404, detail="Sequence not found")
    return SequenceOut.model_validate(seq)

@router.delete("/{sequence_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sequence(
    sequence_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Sequence).where(Sequence.id == sequence_id)
    result = await db.execute(query)
    seq = result.scalar_one_or_none()
    if not seq:
        raise HTTPException(status_code=404, detail="Sequence not found")
    await db.delete(seq)
    await db.commit()
    return None
