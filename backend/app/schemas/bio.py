from typing import Any
from pydantic import BaseModel

class BioAnalysisRequest(BaseModel):
    sequence: str
    accession: str | None = None
    name: str | None = None

class BioAnalysisResponse(BaseModel):
    sequence: str
    length: int
    seq_type: str
    gc_content: float
    at_content: float
    molecular_weight: float
    composition: dict[str, int]
    reverse_complement: str | None = None

class SixFrameTranslationRequest(BaseModel):
    sequence: str

class SixFrameTranslationResponse(BaseModel):
    frames: dict[str, str]

class ORFRequest(BaseModel):
    sequence: str
    min_length_aa: int = 30

class ORFItem(BaseModel):
    id: int
    frame: str
    strand: str
    start_nucleotide: int
    end_nucleotide: int
    length_aa: int
    peptide: str
    weight_kda: float

class ORFResponse(BaseModel):
    total_found: int
    orfs: list[ORFItem]
