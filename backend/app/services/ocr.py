import os
import re
from io import BytesIO
from pathlib import Path

import pytesseract
from PIL import Image

from app.core.config import settings

pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd

_tessdata_path = Path(settings.tessdata_prefix)
if not _tessdata_path.is_absolute():
    _tessdata_path = Path(__file__).resolve().parent.parent.parent / settings.tessdata_prefix
os.environ["TESSDATA_PREFIX"] = str(_tessdata_path)

NATURE_LABELS = {"F": "Facultatif", "D": "Dommage", "R": "Responsabilite"}


def extract_text(file_bytes: bytes) -> str:
    image = Image.open(BytesIO(file_bytes))
    return pytesseract.image_to_string(image, lang="fra")


def _search(pattern: str, text: str) -> str | None:
    m = re.search(pattern, text, flags=re.IGNORECASE)
    return m.group(1).strip() if m else None


def parse_fields(text: str) -> dict:
    n_sinistre = _search(r"(SIN-\d{2}-\d{4,5})", text)
    date_sinistre = _search(r"(\d{2}/\d{2}/\d{4})", text)
    nature = _search(r"\b([FDR])\s*-\s*(?:Facultatif|Dommage|Responsabilite)", text)
    montant = _search(r"(\d+[.,]\d{3})\s*DT", text)

    description = None
    for line in text.splitlines():
        line = line.strip()
        if len(line) > 20 and not any(
            k in line.upper() for k in ["SINISTRE", "NATURE", "MONTANT", "CONSTAT", "DOCUMENT", "DATE"]
        ):
            description = line
            break

    fields = {
        "nSinistre": n_sinistre,
        "dateSinistre": date_sinistre,
        "natureSin": nature,
        "montantReclame": montant.replace(",", ".") if montant else None,
        "description": description,
    }

    nb_trouves = sum(1 for v in fields.values() if v)
    taux_extraction = round(nb_trouves / len(fields) * 100)

    return {"champs": fields, "tauxExtraction": taux_extraction}
