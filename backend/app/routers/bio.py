from fastapi import APIRouter
from app.bio.analyzer import analyzer
from app.schemas.bio import (
    BioAnalysisRequest,
    BioAnalysisResponse,
    SixFrameTranslationRequest,
    SixFrameTranslationResponse,
    ORFRequest,
    ORFResponse,
    ORFItem
)

router = APIRouter(prefix="/bio", tags=["Bioinformatics Tools"])

@router.post("/analyze", response_model=BioAnalysisResponse)
async def analyze_sequence(payload: BioAnalysisRequest):
    """
    Computes GC/AT content, molecular weight, nucleotide composition,
    and reverse complement using Biopython.
    """
    data = analyzer.analyze_sequence(payload.sequence)
    return BioAnalysisResponse(
        sequence=data["sequence"],
        length=data["length"],
        seq_type=data["seq_type"],
        gc_content=data["gc_content"],
        at_content=data["at_content"],
        molecular_weight=data["molecular_weight"],
        composition=data["composition"],
        reverse_complement=data["reverse_complement"]
    )

@router.post("/translate", response_model=SixFrameTranslationResponse)
async def translate_sequence(payload: SixFrameTranslationRequest):
    """
    Translates a nucleotide sequence across all 6 reading frames (+1, +2, +3, -1, -2, -3).
    """
    frames = analyzer.translate_six_frames(payload.sequence)
    return SixFrameTranslationResponse(frames=frames)

@router.post("/orfs", response_model=ORFResponse)
async def find_open_reading_frames(payload: ORFRequest):
    """
    Finds Open Reading Frames (ORFs) across 6 reading frames with amino acid lengths,
    molecular weights, and start/end coordinates.
    """
    raw_orfs = analyzer.find_orfs(payload.sequence, min_length_aa=payload.min_length_aa)
    items = [ORFItem(**item) for item in raw_orfs]
    return ORFResponse(total_found=len(items), orfs=items)
