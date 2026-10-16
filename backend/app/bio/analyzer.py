import re
from typing import Any
from Bio.Seq import Seq
from Bio.SeqUtils import gc_fraction, molecular_weight

class BioAnalyzer:
    """
    Biopython-driven bioinformatics engine.
    Analyzes DNA, RNA, and protein sequences with strict biochemical correctness.
    """

    @staticmethod
    def clean_sequence(raw: str) -> str:
        """Removes whitespace, numbers, FASTA headers, and normalizes to uppercase."""
        lines = [line.strip() for line in raw.strip().splitlines() if not line.startswith(">")]
        seq_str = "".join(lines)
        return re.sub(r"[^A-Za-z*]", "", seq_str).upper()

    @staticmethod
    def detect_type(seq_str: str) -> str:
        """Heuristic detection of sequence type: DNA, RNA, or Protein."""
        chars = set(seq_str.upper())
        if not chars:
            return "DNA"
        if chars.issubset({"A", "C", "G", "T", "N"}):
            return "DNA"
        if chars.issubset({"A", "C", "G", "U", "N"}):
            return "RNA"
        return "Protein"

    @classmethod
    def analyze_sequence(cls, raw: str) -> dict[str, Any]:
        """Calculates comprehensive sequence properties."""
        clean = cls.clean_sequence(raw)
        seq_type = cls.detect_type(clean)
        length = len(clean)

        if length == 0:
            return {
                "sequence": "",
                "length": 0,
                "seq_type": "DNA",
                "gc_content": 0.0,
                "at_content": 0.0,
                "molecular_weight": 0.0,
                "composition": {}
            }

        bio_seq = Seq(clean)
        composition = {char: clean.count(char) for char in sorted(set(clean))}

        gc = 0.0
        at = 0.0
        mw = 0.0

        if seq_type in ("DNA", "RNA"):
            try:
                gc = round(gc_fraction(clean) * 100, 2)
                at = round(100.0 - gc, 2)
            except Exception:
                gc = 0.0
            
            try:
                mw = round(molecular_weight(clean, seq_type=seq_type), 2)
            except Exception:
                mw = 0.0
        else:
            try:
                mw = round(molecular_weight(clean, seq_type="protein"), 2)
            except Exception:
                mw = 0.0

        return {
            "sequence": clean,
            "length": length,
            "seq_type": seq_type,
            "gc_content": gc,
            "at_content": at,
            "molecular_weight": mw,
            "composition": composition,
            "reverse_complement": str(bio_seq.reverse_complement()) if seq_type == "DNA" else None
        }

    @classmethod
    def translate_six_frames(cls, raw: str) -> dict[str, str]:
        """Translates DNA in all 6 reading frames (+1, +2, +3, -1, -2, -3)."""
        clean = cls.clean_sequence(raw)
        if len(clean) < 3:
            return {}

        seq = Seq(clean)
        rc = seq.reverse_complement()
        frames = {}

        for frame in (0, 1, 2):
            # Forward frames +1, +2, +3
            sub_seq = seq[frame:]
            trim_len = len(sub_seq) - (len(sub_seq) % 3)
            frames[f"+{frame + 1}"] = str(sub_seq[:trim_len].translate())

            # Reverse frames -1, -2, -3
            sub_rc = rc[frame:]
            trim_rc = len(sub_rc) - (len(sub_rc) % 3)
            frames[f"-{frame + 1}"] = str(sub_rc[:trim_rc].translate())

        return frames

    @classmethod
    def find_orfs(cls, raw: str, min_length_aa: int = 30) -> list[dict[str, Any]]:
        """
        Finds Open Reading Frames across all 6 frames.
        Returns list of ORFs with frame, start, stop, length, and peptide sequence.
        """
        clean = cls.clean_sequence(raw)
        if len(clean) < 9:
            return []

        seq = Seq(clean)
        rc = seq.reverse_complement()
        orfs = []
        orf_id = 1

        for strand, s_seq, prefix in [(1, seq, "+"), (-1, rc, "-")]:
            for frame in range(3):
                frame_label = f"{prefix}{frame + 1}"
                sub_seq = s_seq[frame:]
                trim_len = len(sub_seq) - (len(sub_seq) % 3)
                peptide = str(sub_seq[:trim_len].translate())

                # Find starts ('M') and stops ('*')
                # An ORF starts at M and runs until next *
                parts = peptide.split("*")
                pos_in_peptide = 0

                for part in parts:
                    m_idx = part.find("M")
                    while m_idx != -1:
                        orf_peptide = part[m_idx:]
                        if len(orf_peptide) >= min_length_aa:
                            start_codon_offset = (pos_in_peptide + m_idx) * 3 + frame
                            end_codon_offset = start_codon_offset + len(orf_peptide) * 3 + 3
                            
                            orfs.append({
                                "id": orf_id,
                                "frame": frame_label,
                                "strand": "+" if strand == 1 else "-",
                                "start_nucleotide": start_codon_offset + 1,
                                "end_nucleotide": min(end_codon_offset, len(clean)),
                                "length_aa": len(orf_peptide),
                                "peptide": orf_peptide,
                                "weight_kda": round(len(orf_peptide) * 0.11, 2)
                            })
                            orf_id += 1
                        m_idx = part.find("M", m_idx + 1)
                    pos_in_peptide += len(part) + 1  # +1 for '*'

        orfs.sort(key=lambda x: x["length_aa"], reverse=True)
        return orfs

analyzer = BioAnalyzer()
