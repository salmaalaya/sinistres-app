from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.core.security import get_current_user
from app.schemas.ocr import ChampsExtraits, OcrResponse
from app.services import ocr as ocr_service

router = APIRouter(prefix="/api/ocr", tags=["ocr"], dependencies=[Depends(get_current_user)])

ALLOWED_TYPES = {"image/png", "image/jpeg", "image/jpg"}
SAMPLES_DIR = Path(__file__).resolve().parent.parent.parent / "generated_documents"


@router.get("/samples")
def list_samples():
    if not SAMPLES_DIR.is_dir():
        return []
    return sorted(p.name for p in SAMPLES_DIR.glob("*.png"))


@router.get("/samples/{filename}")
def download_sample(filename: str):
    path = SAMPLES_DIR / filename
    if path.parent != SAMPLES_DIR or not path.is_file():
        raise HTTPException(status_code=404, detail="Document introuvable")
    return FileResponse(path, media_type="image/png", filename=filename)


@router.post("/scan", response_model=OcrResponse)
async def scan_document(file: UploadFile):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Format non supporte : utilisez une image JPG ou PNG.")

    contents = await file.read()
    try:
        text = ocr_service.extract_text(contents)
    except Exception:
        raise HTTPException(status_code=422, detail="Impossible d'analyser ce document.")

    result = ocr_service.parse_fields(text)
    return OcrResponse(
        nom_fichier=file.filename or "document",
        champs=ChampsExtraits(**result["champs"]),
        taux_extraction=result["tauxExtraction"],
    )
