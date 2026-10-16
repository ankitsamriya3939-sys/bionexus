#!/usr/bin/env python3
"""
BioNexus Studio — Primer3 Integration Engine
Provides real Primer3 C library thermodynamic calculations via primer3-py.
"""
import sys
import json
import traceback

def clean_dna(seq):
    if not seq:
        return ""
    # Filter whitespace and non-alpha
    return "".join(c for c in seq.upper() if c in "ACGTRYKMSWBDHVN")

def run_design(data):
    try:
        import primer3
    except ImportError:
        return {
            "success": False,
            "error": "primer3-py is not installed in the python environment.",
            "version": "Unavailable"
        }

    template_raw = data.get("sequence", "")
    template = clean_dna(template_raw)
    if not template or len(template) < 30:
        return {
            "success": False,
            "error": f"Template sequence is too short ({len(template)} bp). Minimum 30 bp required.",
            "pairs": []
        }

    # Sequence arguments
    seq_args = {
        "SEQUENCE_ID": data.get("id", "BioNexus_Target"),
        "SEQUENCE_TEMPLATE": template
    }

    # Target region [start_1based, length] or [start_0based, length]
    target_region = data.get("targetRegion")
    if target_region and len(target_region) == 2:
        # Primer3 expects 0-based [start, length]
        start = max(0, int(target_region[0]))
        length = int(target_region[1])
        if start < len(template) and length > 0 and (start + length) <= len(template):
            seq_args["SEQUENCE_TARGET"] = [start, length]

    # Excluded region [[start, length]]
    excluded_region = data.get("excludedRegion")
    if excluded_region and len(excluded_region) == 2:
        ex_start = max(0, int(excluded_region[0]))
        ex_len = int(excluded_region[1])
        if ex_start < len(template) and ex_len > 0 and (ex_start + ex_len) <= len(template):
            seq_args["SEQUENCE_EXCLUDED_REGION"] = [[ex_start, ex_len]]

    # Primer parameters with standard defaults
    opt_len = int(data.get("optLen", 20))
    min_len = int(data.get("minLen", 18))
    max_len = int(data.get("maxLen", 25))
    opt_tm = float(data.get("optTm", 60.0))
    min_tm = float(data.get("minTm", 57.0))
    max_tm = float(data.get("maxTm", 63.0))
    max_diff_tm = float(data.get("maxTmDiff", 3.0))
    min_gc = float(data.get("minGc", 20.0))
    max_gc = float(data.get("maxGc", 80.0))
    
    min_prod = int(data.get("minProductSize", 50))
    max_prod = int(data.get("maxProductSize", min(1000, max(150, len(template)))))
    num_return = int(data.get("numReturn", 10))

    # Salt & oligo concentrations
    mv_conc = float(data.get("mvConc", 50.0)) # mM Na+
    dv_conc = float(data.get("dvConc", 1.5))  # mM Mg2+
    dna_conc = float(data.get("dnaConc", 50.0)) # nM oligo
    dntp_conc = float(data.get("dntpConc", 0.8)) # mM dNTP

    p3_args = {
        "PRIMER_OPT_SIZE": opt_len,
        "PRIMER_MIN_SIZE": min_len,
        "PRIMER_MAX_SIZE": max_len,
        "PRIMER_OPT_TM": opt_tm,
        "PRIMER_MIN_TM": min_tm,
        "PRIMER_MAX_TM": max_tm,
        "PRIMER_PAIR_MAX_DIFF_TM": max_diff_tm,
        "PRIMER_MIN_GC": min_gc,
        "PRIMER_MAX_GC": max_gc,
        "PRIMER_PRODUCT_SIZE_RANGE": [[min_prod, max_prod]],
        "PRIMER_NUM_RETURN": num_return,
        "PRIMER_SALT_MONOVALENT": mv_conc,
        "PRIMER_SALT_DIVALENT": dv_conc,
        "PRIMER_DNA_CONC": dna_conc,
        "PRIMER_DNTP_CONC": dntp_conc,
        "PRIMER_MAX_HAIRPIN_TH": 47.0,
        "PRIMER_MAX_SELF_ANY_TH": 47.0,
        "PRIMER_PAIR_MAX_COMPL_ANY_TH": 47.0
    }

    try:
        p3_res = primer3.design_primers(seq_args, p3_args)
    except Exception as e:
        return {
            "success": False,
            "error": f"Primer3 design error: {str(e)}",
            "pairs": []
        }

    num_pairs = p3_res.get("PRIMER_PAIR_NUM_RETURNED", 0)
    pairs = []

    for i in range(num_pairs):
        fwd_seq = p3_res.get(f"PRIMER_LEFT_{i}_SEQUENCE")
        fwd_loc = p3_res.get(f"PRIMER_LEFT_{i}") # [start_0based, length]
        fwd_tm = p3_res.get(f"PRIMER_LEFT_{i}_TM")
        fwd_gc = p3_res.get(f"PRIMER_LEFT_{i}_GC_PERCENT")
        fwd_penalty = p3_res.get(f"PRIMER_LEFT_{i}_PENALTY", 0.0)

        rev_seq = p3_res.get(f"PRIMER_RIGHT_{i}_SEQUENCE")
        rev_loc = p3_res.get(f"PRIMER_RIGHT_{i}") # [end_0based_of_primer_on_template, length]
        rev_tm = p3_res.get(f"PRIMER_RIGHT_{i}_TM")
        rev_gc = p3_res.get(f"PRIMER_RIGHT_{i}_GC_PERCENT")
        rev_penalty = p3_res.get(f"PRIMER_RIGHT_{i}_PENALTY", 0.0)

        prod_size = p3_res.get(f"PRIMER_PAIR_{i}_PRODUCT_SIZE")
        pair_penalty = p3_res.get(f"PRIMER_PAIR_{i}_PENALTY", 0.0)
        compl_any_th = p3_res.get(f"PRIMER_PAIR_{i}_COMPL_ANY_TH", 0.0)
        compl_end_th = p3_res.get(f"PRIMER_PAIR_{i}_COMPL_END_TH", 0.0)

        if not fwd_seq or not rev_seq or not fwd_loc or not rev_loc:
            continue

        # Coordinate calculation (1-based for biologists)
        # fwd_loc is [start_0based, length] -> 1-based start is fwd_loc[0] + 1
        fwd_start = fwd_loc[0] + 1
        fwd_end = fwd_loc[0] + fwd_loc[1]
        
        # In Primer3, rev_loc is [3'_end_coordinate_on_template, length]
        # So rev primer on sense strand spans from (rev_loc[0] - rev_loc[1] + 1) to rev_loc[0]
        # In 1-based:
        rev_start = rev_loc[0] - rev_loc[1] + 2
        rev_end = rev_loc[0] + 1

        # Calculate exact thermodynamic properties
        fwd_hp = primer3.calc_hairpin(fwd_seq, mv_conc=mv_conc, dv_conc=dv_conc, dna_conc=dna_conc, dntp_conc=dntp_conc)
        fwd_hd = primer3.calc_homodimer(fwd_seq, mv_conc=mv_conc, dv_conc=dv_conc, dna_conc=dna_conc, dntp_conc=dntp_conc)

        rev_hp = primer3.calc_hairpin(rev_seq, mv_conc=mv_conc, dv_conc=dv_conc, dna_conc=dna_conc, dntp_conc=dntp_conc)
        rev_hd = primer3.calc_homodimer(rev_seq, mv_conc=mv_conc, dv_conc=dv_conc, dna_conc=dna_conc, dntp_conc=dntp_conc)

        cross_dimer = primer3.calc_heterodimer(fwd_seq, rev_seq, mv_conc=mv_conc, dv_conc=dv_conc, dna_conc=dna_conc, dntp_conc=dntp_conc)

        # Amplicon sequence extraction
        amp_start_idx = fwd_loc[0]
        amp_end_idx = rev_loc[0] + 1
        amplicon_seq = template[amp_start_idx:amp_end_idx] if amp_start_idx < len(template) else ""

        # GC clamp inspection (last 5 bases of 3' end)
        fwd_3p = fwd_seq[-5:]
        fwd_gc_clamp = sum(1 for b in fwd_3p if b in "GC")
        rev_3p = rev_seq[-5:]
        rev_gc_clamp = sum(1 for b in rev_3p if b in "GC")

        pair_data = {
            "rank": i + 1,
            "forward": {
                "sequence": fwd_seq,
                "length": len(fwd_seq),
                "tm": round(fwd_tm, 2),
                "gc": round(fwd_gc, 1),
                "start": fwd_start,
                "end": fwd_end,
                "penalty": round(fwd_penalty, 3),
                "gcClampCount": fwd_gc_clamp,
                "hairpin": {
                    "structureFound": bool(fwd_hp.structure_found),
                    "tm": round(fwd_hp.tm, 2) if fwd_hp.structure_found else 0.0,
                    "dg": round(fwd_hp.dg / 1000.0, 2) if fwd_hp.structure_found else 0.0, # kcal/mol
                    "dh": round(fwd_hp.dh / 1000.0, 2) if fwd_hp.structure_found else 0.0,
                    "ds": round(fwd_hp.ds, 2) if fwd_hp.structure_found else 0.0
                },
                "selfDimer": {
                    "structureFound": bool(fwd_hd.structure_found),
                    "tm": round(fwd_hd.tm, 2) if fwd_hd.structure_found else 0.0,
                    "dg": round(fwd_hd.dg / 1000.0, 2) if fwd_hd.structure_found else 0.0,
                    "dh": round(fwd_hd.dh / 1000.0, 2) if fwd_hd.structure_found else 0.0,
                    "ds": round(fwd_hd.ds, 2) if fwd_hd.structure_found else 0.0
                }
            },
            "reverse": {
                "sequence": rev_seq,
                "length": len(rev_seq),
                "tm": round(rev_tm, 2),
                "gc": round(rev_gc, 1),
                "start": rev_start,
                "end": rev_end,
                "penalty": round(rev_penalty, 3),
                "gcClampCount": rev_gc_clamp,
                "hairpin": {
                    "structureFound": bool(rev_hp.structure_found),
                    "tm": round(rev_hp.tm, 2) if rev_hp.structure_found else 0.0,
                    "dg": round(rev_hp.dg / 1000.0, 2) if rev_hp.structure_found else 0.0,
                    "dh": round(rev_hp.dh / 1000.0, 2) if rev_hp.structure_found else 0.0,
                    "ds": round(rev_hp.ds, 2) if rev_hp.structure_found else 0.0
                },
                "selfDimer": {
                    "structureFound": bool(rev_hd.structure_found),
                    "tm": round(rev_hd.tm, 2) if rev_hd.structure_found else 0.0,
                    "dg": round(rev_hd.dg / 1000.0, 2) if rev_hd.structure_found else 0.0,
                    "dh": round(rev_hd.dh / 1000.0, 2) if rev_hd.structure_found else 0.0,
                    "ds": round(rev_hd.ds, 2) if rev_hd.structure_found else 0.0
                }
            },
            "heterodimer": {
                "structureFound": bool(cross_dimer.structure_found),
                "tm": round(cross_dimer.tm, 2) if cross_dimer.structure_found else 0.0,
                "dg": round(cross_dimer.dg / 1000.0, 2) if cross_dimer.structure_found else 0.0,
                "dh": round(cross_dimer.dh / 1000.0, 2) if cross_dimer.structure_found else 0.0,
                "ds": round(cross_dimer.ds, 2) if cross_dimer.structure_found else 0.0
            },
            "amplicon": {
                "start": fwd_start,
                "end": rev_end,
                "size": prod_size,
                "sequence": amplicon_seq,
                "gcPercent": round((sum(1 for b in amplicon_seq if b in "GC") / len(amplicon_seq) * 100), 1) if amplicon_seq else 0.0
            },
            "tmDiff": round(abs(fwd_tm - rev_tm), 2),
            "recommendedTa": round(max(40.0, min(fwd_tm, rev_tm) - 5.0), 1),
            "pairPenalty": round(pair_penalty, 3),
            "complAnyTh": round(compl_any_th, 2),
            "complEndTh": round(compl_end_th, 2),
            "statusLabel": "Meets configured constraints",
            "specificityStatus": "untested"
        }
        pairs.append(pair_data)

    return {
        "success": True,
        "engine": "Primer3 C Library v2.3.1 (via primer3-py)",
        "primer3PyVersion": primer3.__version__,
        "totalPairs": len(pairs),
        "pairs": pairs,
        "parameters": p3_args,
        "templateLength": len(template)
    }

def run_structure(data):
    try:
        import primer3
    except ImportError:
        return {"success": False, "error": "primer3-py not installed"}
    
    seq1 = clean_dna(data.get("seq1", ""))
    seq2 = clean_dna(data.get("seq2", ""))
    mv_conc = float(data.get("mvConc", 50.0))
    dv_conc = float(data.get("dvConc", 1.5))
    dna_conc = float(data.get("dnaConc", 50.0))
    dntp_conc = float(data.get("dntpConc", 0.8))

    res = {}
    if seq1:
        hp = primer3.calc_hairpin(seq1, mv_conc=mv_conc, dv_conc=dv_conc, dna_conc=dna_conc, dntp_conc=dntp_conc)
        hd = primer3.calc_homodimer(seq1, mv_conc=mv_conc, dv_conc=dv_conc, dna_conc=dna_conc, dntp_conc=dntp_conc)
        tm = primer3.calc_tm(seq1, mv_conc=mv_conc, dv_conc=dv_conc, dna_conc=dna_conc, dntp_conc=dntp_conc)
        res["seq1"] = {
            "tm": round(tm, 2),
            "hairpin": {
                "structureFound": bool(hp.structure_found),
                "tm": round(hp.tm, 2),
                "dg": round(hp.dg / 1000.0, 2),
                "dh": round(hp.dh / 1000.0, 2),
                "ds": round(hp.ds, 2)
            },
            "homodimer": {
                "structureFound": bool(hd.structure_found),
                "tm": round(hd.tm, 2),
                "dg": round(hd.dg / 1000.0, 2),
                "dh": round(hd.dh / 1000.0, 2),
                "ds": round(hd.ds, 2)
            }
        }
    if seq1 and seq2:
        cross = primer3.calc_heterodimer(seq1, seq2, mv_conc=mv_conc, dv_conc=dv_conc, dna_conc=dna_conc, dntp_conc=dntp_conc)
        res["heterodimer"] = {
            "structureFound": bool(cross.structure_found),
            "tm": round(cross.tm, 2),
            "dg": round(cross.dg / 1000.0, 2),
            "dh": round(cross.dh / 1000.0, 2),
            "ds": round(cross.ds, 2)
        }
    return {"success": True, "structure": res}

def reverse_complement(seq):
    comp = str.maketrans("ACGTRYKMBDHVNacgtrykmbdhvn", "TGCAYRMKVHDBNtgcayrmkvhdbn")
    return seq.translate(comp)[::-1]

def run_specificity(data):
    """
    In-silico PCR Specificity Check against template sequence.
    Detects on-target product and any off-target hybridization or secondary amplicons.
    """
    template = clean_dna(data.get("template", ""))
    fwd = clean_dna(data.get("forward", ""))
    rev = clean_dna(data.get("reverse", ""))

    if not template or not fwd or not rev:
        return {
            "status": "failed",
            "error": "Missing template or primer sequence for specificity analysis."
        }

    # Find all binding sites on forward and reverse strands
    # Requiring 3' end match (last 6 bases) and allowing up to 3 total mismatches
    def find_binding_sites(primer, strand="forward"):
        sites = []
        p_len = len(primer)
        for i in range(len(template) - p_len + 1):
            window = template[i:i + p_len]
            mismatches = sum(1 for a, b in zip(primer, window) if a != b)
            # 3' end check: last 5 bp should have at most 1 mismatch for extension
            p_3prime = primer[-5:]
            w_3prime = window[-5:]
            three_prime_mismatches = sum(1 for a, b in zip(p_3prime, w_3prime) if a != b)

            if mismatches <= 3 and three_prime_mismatches <= 1:
                sites.append({
                    "start": i + 1,
                    "end": i + p_len,
                    "strand": strand,
                    "mismatches": mismatches,
                    "threePrimeMismatches": three_prime_mismatches
                })
        return sites

    fwd_sites = find_binding_sites(fwd, strand="plus")
    rev_rc = reverse_complement(rev)
    rev_sites = find_binding_sites(rev_rc, strand="minus")

    # Predict potential amplicon products
    products = []
    for f in fwd_sites:
        for r in rev_sites:
            if r["end"] > f["start"]:
                amp_size = r["end"] - f["start"] + 1
                if 40 <= amp_size <= 4000:
                    is_primary = (f["mismatches"] == 0 and r["mismatches"] == 0)
                    products.append({
                        "fwdStart": f["start"],
                        "fwdEnd": f["end"],
                        "fwdMismatches": f["mismatches"],
                        "revStart": r["start"],
                        "revEnd": r["end"],
                        "revMismatches": r["mismatches"],
                        "productSize": amp_size,
                        "isPrimaryTarget": is_primary
                    })

    target_products = [p for p in products if p["isPrimaryTarget"]]
    off_target_products = [p for p in products if not p["isPrimaryTarget"]]

    is_specific = len(target_products) >= 1 and len(off_target_products) == 0

    return {
        "status": "completed",
        "isSpecific": is_specific,
        "targetProducts": target_products,
        "offTargetProducts": off_target_products,
        "fwdBindingSiteCount": len(fwd_sites),
        "revBindingSiteCount": len(rev_sites),
        "summary": f"Identified {len(target_products)} intended target product(s) and {len(off_target_products)} off-target product(s) in template.",
        "checkedAgainst": "Template in-silico PCR binding model with 3' stability constraint"
    }

if __name__ == "__main__":
    try:
        raw_input = sys.stdin.read()
        payload = json.loads(raw_input) if raw_input.strip() else {}
        action = payload.get("action", "design")
        
        if action == "design":
            res = run_design(payload)
        elif action == "structure":
            res = run_structure(payload)
        elif action == "specificity":
            res = run_specificity(payload)
        else:
            res = {"success": False, "error": f"Unknown action '{action}'"}

        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }))
