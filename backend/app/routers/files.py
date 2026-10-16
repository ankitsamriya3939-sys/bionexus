from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse, PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.file_asset import FileAsset
from app.models.user import User
from app.schemas.file_asset import FileAssetOut
from app.storage.storage_service import storage
from app.auth.security import get_current_user

router = APIRouter(prefix="/files", tags=["Object / Flat Storage"])

@router.post("/upload", response_model=FileAssetOut, status_code=status.HTTP_201_CREATED)
async def upload_file(
    project_id: str = Form(...),
    file_type: str = Form("FASTA"),  # FASTA, PDB, ALIGNMENT, OUTPUT
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Saves file into structured object storage (S3-compatible local bucket)
    and registers metadata record in database.
    """
    content = await file.read()
    category = file_type.lower()
    
    storage_key, size, sha256 = await storage.save_bytes(
        data=content,
        filename=file.filename or "upload.dat",
        category=category
    )

    asset = FileAsset(
        project_id=project_id,
        filename=file.filename or "upload.dat",
        file_key=storage_key,
        file_size=size,
        mime_type=file.content_type or "application/octet-stream",
        file_type=file_type.upper(),
        sha256_hash=sha256
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)

    out = FileAssetOut.model_validate(asset)
    out.download_url = f"/api/files/{asset.file_key}/download"
    return out

@router.get("/{file_key:path}/download")
async def download_file(file_key: str):
    """Streams file directly from object storage."""
    try:
        path = storage.get_path(file_key)
        return FileResponse(
            path=str(path),
            filename=path.name,
            media_type="application/octet-stream"
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File object not found")

@router.get("/{file_key:path}/view")
async def view_file_content(file_key: str):
    """Returns text content for previewing FASTA, PDB, or alignment text."""
    try:
        text = await storage.read_text(file_key)
        # Limit preview to 500KB for responsiveness
        preview = text[:500000]
        return PlainTextResponse(content=preview)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File object not found")

@router.get("", response_model=list[FileAssetOut])
async def list_files(
    project_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(FileAsset).where(FileAsset.project_id == project_id).order_by(FileAsset.created_at.desc())
    result = await db.execute(query)
    assets = result.scalars().all()
    
    out_list = []
    for a in assets:
        item = FileAssetOut.model_validate(a)
        item.download_url = f"/api/files/{a.file_key}/download"
        out_list.append(item)
    return out_list

@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(FileAsset).where(FileAsset.id == file_id)
    result = await db.execute(query)
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="File not found")

    await storage.delete(asset.file_key)
    await db.delete(asset)
    await db.commit()
    return None
