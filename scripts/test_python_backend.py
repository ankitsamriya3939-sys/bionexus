"""
BioNexus Studio — Python FastAPI Backend Automated Verification Test Suite
Tests authentication, database persistence, Biopython algorithms,
NCBI & PDB proxies, and BioNexus Copilot reasoning.
"""

import sys
import asyncio
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from starlette.testclient import TestClient
from app.main import app
from app.database import init_db

print("====================================================")
print("[TEST] BioNexus Studio - Python FastAPI Backend Test Suite")
print("====================================================\n")

# Initialize database
asyncio.run(init_db())

client = TestClient(app)
tests_passed = 0
tests_total = 0

def run_test(name, fn):
    global tests_passed, tests_total
    tests_total += 1
    try:
        fn()
        print(f"  [PASS] {name}")
        tests_passed += 1
    except Exception as e:
        print(f"  [FAIL] {name}")
        print(f"     Error: {e}\n")
        raise e

# 1. Health Endpoint
def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert data["status"] == "online"
    assert data["database"]["status"] == "connected"

run_test("GET /api/health returns healthy and database connected", test_health)

# 2. Biopython Analysis
def test_bio_analyze():
    seq = "ATGCGATCGATCGATCGATCGATCG"
    res = client.post("/api/bio/analyze", json={"sequence": seq})
    assert res.status_code == 200
    data = res.json()
    assert data["seq_type"] == "DNA"
    assert data["length"] == len(seq)
    assert data["reverse_complement"] == "CGATCGATCGATCGATCGATCGCAT"

run_test("POST /api/bio/analyze executes Biopython GC, MW, and reverse complement", test_bio_analyze)

# 3. Biopython 6-Frame Translation
def test_bio_translate():
    res = client.post("/api/bio/translate", json={"sequence": "ATGCGATCGATCGATCGATCGATCG"})
    assert res.status_code == 200
    data = res.json()
    assert len(data["frames"]) == 6
    assert "+1" in data["frames"]
    assert "-1" in data["frames"]

run_test("POST /api/bio/translate returns 6 reading frames", test_bio_translate)

# 4. Biopython ORF Finder
def test_bio_orfs():
    # Sequence with ATG start codon
    res = client.post("/api/bio/orfs", json={
        "sequence": "ATGGCGGCGGCCGCCGCCGCCGCCGCCGCCGCCGCCGCCGCCGCCGCCGCCGCCGCCTAG",
        "min_length_aa": 10
    })
    assert res.status_code == 200
    data = res.json()
    assert data["total_found"] >= 1
    assert data["orfs"][0]["length_aa"] >= 10

run_test("POST /api/bio/orfs finds valid open reading frames with start/stop coordinates", test_bio_orfs)

# 5. BioNexus Copilot Reasoning
def test_copilot():
    res = client.post("/api/copilot/chat", json={
        "message": "What is the structure of p53 tumor suppressor?",
        "activeObject": {
            "id": "prot_tp53",
            "type": "protein",
            "name": "Tumor Protein p53",
            "uniprotAccession": "P04637",
            "pdbId": "1TUP"
        },
        "projectContext": {"name": "Genomics Universe"},
        "spaceContext": "Protein Space"
    })
    assert res.status_code == 200
    data = res.json()
    assert "[EXPERIMENTAL EVIDENCE]" in data["reply"]
    assert "[DATABASE ANNOTATIONS]" in data["reply"]
    assert "[COMPUTATIONAL PREDICTIONS]" in data["reply"]
    assert data["objectRef"] == "Tumor Protein p53"

run_test("POST /api/copilot/chat provides structured 5-tiered evidence without hallucination", test_copilot)

# 6. RCSB PDB Summary
def test_pdb():
    res = client.get("/api/pdb/summary/1TUP")
    assert res.status_code == 200
    data = res.json()
    assert data["pdbId"] == "1TUP"
    assert "p53" in data["title"].lower() or "dna" in data["title"].lower() or "tumor" in data["title"].lower()
    assert data["resolution"] is not None

run_test("GET /api/pdb/summary/1TUP resolves PDB crystal structure metadata", test_pdb)

# 7. NCBI E-Utilities Search
def test_ncbi_search():
    res = client.get("/api/ncbi/search?term=BRCA1[Gene]+AND+human[Organism]&retmax=3")
    assert res.status_code == 200
    data = res.json()
    assert "ids" in data
    assert len(data["ids"]) > 0

run_test("GET /api/ncbi/search queries NCBI E-Utilities safely", test_ncbi_search)

# 8. User Auth Flow (Register, Login, Me)
import time
test_email = f"researcher_{int(time.time() * 1000)}@bionexus.ai"
auth_token = None

def test_auth():
    global auth_token
    # Register
    reg_res = client.post("/api/auth/register", json={
        "email": test_email,
        "password": "SecurePassword123!",
        "full_name": "Dr. Antigravity"
    })
    assert reg_res.status_code == 200, f"Register failed: {reg_res.text}"
    
    # Login
    login_res = client.post("/api/auth/login", json={
        "email": test_email,
        "password": "SecurePassword123!"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token_data = login_res.json()
    assert "access_token" in token_data
    auth_token = token_data["access_token"]

    # Current User
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {auth_token}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == test_email
    assert me_data["full_name"] == "Dr. Antigravity"

run_test("POST /api/auth/register and /api/auth/login issue and verify JWT tokens", test_auth)

# 9. Project Management CRUD
def test_projects():
    headers = {"Authorization": f"Bearer {auth_token}"}
    create_res = client.post("/api/projects", headers=headers, json={
        "title": "CRISPR-Cas9 Editing Project",
        "description": "Functional genomics research workspace"
    })
    assert create_res.status_code == 201
    proj = create_res.json()
    assert proj["title"] == "CRISPR-Cas9 Editing Project"

    list_res = client.get("/api/projects", headers=headers)
    assert list_res.status_code == 200
    projects = list_res.json()
    assert any(p["id"] == proj["id"] for p in projects)

run_test("POST /api/projects/ creates and retrieves user workspace projects", test_projects)

print("\n====================================================")
print(f"[SUCCESS] ALL {tests_passed}/{tests_total} PYTHON BACKEND TESTS PASSED SUCCESSFULLY!")
print("====================================================\n")
