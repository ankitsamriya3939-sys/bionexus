import asyncio
from datetime import datetime
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db, AsyncSessionLocal
from app.models.job import Job
from app.models.user import User
from app.schemas.job import JobCreate, JobOut
from app.bio.analyzer import analyzer
from app.auth.security import get_current_user

router = APIRouter(prefix="/jobs", tags=["Async Jobs"])

async def execute_bio_task(job_id: str, tool_name: str, params: dict):
    """
    Background worker function that updates job progress and saves results.
    """
    async with AsyncSessionLocal() as session:
        try:
            # Mark RUNNING
            query = select(Job).where(Job.id == job_id)
            res = await session.execute(query)
            job = res.scalar_one_or_none()
            if not job:
                return

            job.status = "RUNNING"
            job.progress = 25
            await session.commit()

            raw_seq = params.get("sequence", "")
            results = {}

            if tool_name == "orf_finder":
                min_len = int(params.get("min_length_aa", 30))
                orfs = analyzer.find_orfs(raw_seq, min_length_aa=min_len)
                results = {"total_found": len(orfs), "orfs": orfs}

            elif tool_name == "translation":
                frames = analyzer.translate_six_frames(raw_seq)
                results = {"frames": frames}

            elif tool_name == "blast":
                # Simulated NCBI BLAST / Local Alignment run with realistic hit tables
                clean = analyzer.clean_sequence(raw_seq)
                await asyncio.sleep(1.5)  # simulate alignment pipeline
                results = {
                    "query_length": len(clean),
                    "database": params.get("database", "nr"),
                    "hits": [
                        {
                            "accession": "NP_000509.1",
                            "title": "Hemoglobin subunit beta [Homo sapiens]",
                            "identity": 99.3,
                            "evalue": 1.2e-95,
                            "bit_score": 312.4,
                            "alignment_length": len(clean)
                        },
                        {
                            "accession": "XP_001150499.1",
                            "title": "PREDICTED: hemoglobin subunit beta [Pan troglodytes]",
                            "identity": 98.6,
                            "evalue": 4.5e-93,
                            "bit_score": 305.1,
                            "alignment_length": len(clean)
                        },
                        {
                            "accession": "NP_001094508.1",
                            "title": "hemoglobin subunit beta-1 [Macaca mulatta]",
                            "identity": 96.5,
                            "evalue": 8.0e-89,
                            "bit_score": 294.0,
                            "alignment_length": len(clean)
                        }
                    ]
                }

            else:
                analysis = analyzer.analyze_sequence(raw_seq)
                results = {"analysis": analysis}

            job.status = "COMPLETED"
            job.progress = 100
            job.result_data = results
            job.completed_at = datetime.utcnow()
            await session.commit()

        except Exception as e:
            await session.rollback()
            query = select(Job).where(Job.id == job_id)
            res = await session.execute(query)
            job = res.scalar_one_or_none()
            if job:
                job.status = "FAILED"
                job.error_message = str(e)
                job.completed_at = datetime.utcnow()
                await session.commit()

@router.post("", response_model=JobOut, status_code=status.HTTP_202_ACCEPTED)
async def dispatch_job(
    job_in: JobCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    job = Job(
        project_id=job_in.project_id,
        tool_name=job_in.tool_name,
        status="PENDING",
        progress=0,
        input_params=job_in.input_params
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Launch non-blocking background task
    background_tasks.add_task(
        execute_bio_task,
        job.id,
        job.tool_name,
        job.input_params
    )

    return JobOut.model_validate(job)

@router.get("/{job_id}", response_model=JobOut)
async def get_job_status(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Job).where(Job.id == job_id)
    result = await db.execute(query)
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobOut.model_validate(job)

@router.get("", response_model=list[JobOut])
async def list_jobs(
    project_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Job).where(Job.project_id == project_id).order_by(Job.created_at.desc())
    result = await db.execute(query)
    jobs = result.scalars().all()
    return [JobOut.model_validate(j) for j in jobs]
