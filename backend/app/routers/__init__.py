from app.routers.auth import router as auth_router
from app.routers.projects import router as projects_router
from app.routers.sequences import router as sequences_router
from app.routers.jobs import router as jobs_router
from app.routers.files import router as files_router
from app.routers.bio import router as bio_router
from app.routers.health import router as health_router
from app.routers.ncbi import router as ncbi_router
from app.routers.uniprot import router as uniprot_router
from app.routers.ena import router as ena_router
from app.routers.pdb import router as pdb_router
from app.routers.copilot import router as copilot_router

__all__ = [
    "auth_router",
    "projects_router",
    "sequences_router",
    "jobs_router",
    "files_router",
    "bio_router",
    "health_router",
    "ncbi_router",
    "uniprot_router",
    "ena_router",
    "pdb_router",
    "copilot_router",
]
