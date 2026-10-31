"""Genere des "constats de sinistre" synthetiques pour tester le pipeline OCR.

Important : ce sont des documents de TEST generes artificiellement, jamais de
vrais documents clients (le projet n'a que des donnees tabulaires etat.xlsx,
pas de constats scannes). Voir FEATURES_ADDENDUM.md section A - le champ
"Montant reclame" est propre a cette maquette de demo (n'existe pas dans le
schema sinistres/reglements) ; les autres champs (N Sinistre, Date, Nature)
correspondent au vrai schema du projet.

Usage :
    .venv/Scripts/python.exe scripts/generate_test_documents.py
"""

import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "generated_documents"
FONT_REGULAR = r"C:\Windows\Fonts\arial.ttf"
FONT_BOLD = r"C:\Windows\Fonts\arialbd.ttf"

NATURES = {"F": "Facultatif", "D": "Dommage", "R": "Responsabilite"}
DESCRIPTIONS = [
    "Degat des eaux suite a rupture de canalisation",
    "Bris de glace sur vehicule de fonction",
    "Vol avec effraction dans les locaux",
    "Incendie partiel entrepot de stockage",
    "Accident de la circulation, tiers identifie",
    "Dommages materiels suite a tempete",
    "Vandalisme sur facade du batiment",
    "Chute d'un salarie sur site professionnel",
]


def random_document(i: int) -> dict:
    annee = random.choice([21, 22])
    return {
        "fichier": f"constat_test_{i:02d}.png",
        "n_sinistre": f"SIN-{annee}-{random.randint(1000, 9999):05d}",
        "date_sinistre": f"{random.randint(1, 28):02d}/{random.randint(1, 12):02d}/20{annee}",
        "nature": random.choice(list(NATURES.keys())),
        "montant_reclame": round(random.uniform(500, 15000), 3),
        "description": random.choice(DESCRIPTIONS),
    }


def draw_document(doc: dict, path: Path) -> None:
    width, height = 900, 620
    img = Image.new("RGB", (width, height), "white")
    d = ImageDraw.Draw(img)

    title_font = ImageFont.truetype(FONT_BOLD, 30)
    label_font = ImageFont.truetype(FONT_BOLD, 16)
    value_font = ImageFont.truetype(FONT_REGULAR, 20)
    footer_font = ImageFont.truetype(FONT_REGULAR, 13)

    d.rectangle([0, 0, width, 90], fill=(11, 20, 13))
    d.text((30, 20), "CONSTAT DE SINISTRE", font=title_font, fill="white")
    d.text((30, 60), "Document de test genere - Assurances BIAT", font=footer_font, fill=(141, 198, 63))

    rows = [
        ("N DE SINISTRE", doc["n_sinistre"]),
        ("DATE DU SINISTRE", doc["date_sinistre"]),
        ("NATURE", f"{doc['nature']} - {NATURES[doc['nature']]}"),
        ("MONTANT RECLAME", f"{doc['montant_reclame']:.3f} DT"),
    ]
    y = 140
    for label, value in rows:
        d.text((40, y), label, font=label_font, fill=(90, 90, 90))
        d.text((40, y + 24), value, font=value_font, fill=(20, 20, 20))
        d.line([(40, y + 60), (width - 40, y + 60)], fill=(220, 220, 220), width=1)
        y += 90

    d.text((40, y + 10), "DESCRIPTION SOMMAIRE", font=label_font, fill=(90, 90, 90))
    d.text((40, y + 34), doc["description"], font=value_font, fill=(20, 20, 20))

    d.text(
        (40, height - 30),
        "Document synthetique - a des fins de test du pipeline OCR uniquement",
        font=footer_font,
        fill=(160, 160, 160),
    )

    img.save(path)


def main():
    OUTPUT_DIR.mkdir(exist_ok=True)
    manifest = []
    for i in range(1, 9):
        doc = random_document(i)
        draw_document(doc, OUTPUT_DIR / doc["fichier"])
        manifest.append(doc)

    with open(OUTPUT_DIR / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"{len(manifest)} documents de test generes dans {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
