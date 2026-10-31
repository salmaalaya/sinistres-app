from datetime import datetime
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

BRAND = colors.HexColor("#3E8A4C")
BRAND_DARK = colors.HexColor("#1B4D2E")
MUTED = colors.HexColor("#556354")
HAIRLINE = colors.HexColor("#DDE3DA")

_styles = getSampleStyleSheet()
TITLE_STYLE = ParagraphStyle(
    "TitleBrand", parent=_styles["Title"], textColor=BRAND_DARK, fontName="Helvetica-Bold", fontSize=20
)
SUBTITLE_STYLE = ParagraphStyle("SubtitleBrand", parent=_styles["Normal"], textColor=MUTED, fontSize=10)
SECTION_STYLE = ParagraphStyle(
    "SectionBrand", parent=_styles["Heading2"], textColor=BRAND_DARK, fontName="Helvetica-Bold", fontSize=13
)
BODY_STYLE = ParagraphStyle("BodyBrand", parent=_styles["Normal"], fontSize=10)


def _header(title: str, subtitle: str) -> list:
    now = datetime.now().strftime("%d/%m/%Y a %H:%M")
    return [
        Paragraph("Sinistres BIAT", SUBTITLE_STYLE),
        Paragraph(title, TITLE_STYLE),
        Paragraph(f"{subtitle} - genere le {now}", SUBTITLE_STYLE),
        Spacer(1, 10 * mm),
    ]


def _kpi_table(rows: list[tuple[str, str]]) -> Table:
    data = [[label, value] for label, value in rows]
    t = Table(data, colWidths=[90 * mm, 70 * mm])
    t.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica"),
                ("FONTNAME", (1, 0), (1, -1), "Helvetica-Bold"),
                ("TEXTCOLOR", (0, 0), (0, -1), MUTED),
                ("TEXTCOLOR", (1, 0), (1, -1), BRAND_DARK),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("LINEBELOW", (0, 0), (-1, -1), 0.5, HAIRLINE),
            ]
        )
    )
    return t


def _data_table(headers: list[str], rows: list[list[str]]) -> Table:
    data = [headers] + rows
    t = Table(data, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BRAND),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "Courier"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, HAIRLINE),
                ("ALIGN", (-1, 0), (-1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return t


def build_sinistre_pdf(sinistre) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    story = _header(f"Dossier {sinistre.code_sinistre}", f"N Sinistre {sinistre.n_sinistre}")

    story.append(Paragraph("Identite du dossier", SECTION_STYLE))
    story.append(Spacer(1, 4 * mm))
    story.append(
        _kpi_table(
            [
                ("Code sinistre", str(sinistre.code_sinistre)),
                ("N Sinistre", sinistre.n_sinistre),
                ("Statut", "Ouvert" if sinistre.statut == "OUVERT" else "Cloture"),
                ("Nature", sinistre.nature_sin),
                ("Type", sinistre.type_sin),
                ("Processus", sinistre.processus),
                ("Date sinistre", sinistre.date_sinistre.strftime("%d/%m/%Y")),
                ("Date ouverture", sinistre.date_ouverture.strftime("%d/%m/%Y")),
                (
                    "Date cloture",
                    sinistre.date_cloture_sinistre.strftime("%d/%m/%Y") if sinistre.date_cloture_sinistre else "-",
                ),
                ("Date ordonnancement", sinistre.date_ordonnancement.strftime("%d/%m/%Y")),
                (
                    "Retour quittance signee",
                    sinistre.date_retour_quittance_signe.strftime("%d/%m/%Y")
                    if sinistre.date_retour_quittance_signe
                    else "-",
                ),
                ("Montant total regle", f"{sinistre.montant_total_regle:.3f} DT"),
            ]
        )
    )

    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph("Historique des reglements", SECTION_STYLE))
    story.append(Spacer(1, 4 * mm))
    if sinistre.reglements:
        rows = [
            [str(r.id), r.date_reglement.strftime("%d/%m/%Y"), f"{r.montant_reglement:.3f} DT"]
            for r in sinistre.reglements
        ]
        story.append(_data_table(["ID", "Date reglement", "Montant"], rows))
    else:
        story.append(Paragraph("Aucun reglement enregistre pour ce dossier.", BODY_STYLE))

    doc.build(story)
    return buf.getvalue()


def build_dashboard_pdf(kpis) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    story = _header("Tableau de bord", "Vue d'ensemble du portefeuille sinistres")

    story.append(
        _kpi_table(
            [
                ("Total dossiers", str(kpis.total_sinistres)),
                ("Dossiers ouverts", str(kpis.dossiers_ouverts)),
                ("Dossiers clotures", str(kpis.dossiers_clotures)),
                ("Taux de cloture", f"{kpis.pct_cloture}%"),
                ("Montant total regle", f"{kpis.montant_total_regle:.3f} DT"),
                ("Montant moyen / dossier", f"{kpis.montant_moyen_regle:.3f} DT"),
                ("Dossiers Express", str(kpis.nombre_dossiers_express)),
                ("Dossiers critiques", str(kpis.dossiers_critiques)),
                ("Anomalies detectees", str(kpis.nombre_anomalies)),
            ]
        )
    )

    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph("Repartition par Nature", SECTION_STYLE))
    story.append(Spacer(1, 4 * mm))
    story.append(_data_table(["Nature", "Nombre de dossiers"], [[r.label, str(r.value)] for r in kpis.repartition_nature]))

    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("Repartition par Processus", SECTION_STYLE))
    story.append(Spacer(1, 4 * mm))
    story.append(
        _data_table(["Processus", "Nombre de dossiers"], [[r.label, str(r.value)] for r in kpis.repartition_processus])
    )

    doc.build(story)
    return buf.getvalue()


def build_delais_pdf(stats, histogramme) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    story = _header("Delais & Performance", "Statistiques des delais du parcours sinistre")

    for label, s in [
        ("Sinistre -> Ouverture", stats.sinistre_ouverture),
        ("Ouverture -> Ordonnancement", stats.ouverture_ordonnancement),
        ("Ordonnancement -> Reglement", stats.ordonnancement_reglement),
        ("Ouverture -> Cloture", stats.ouverture_cloture),
    ]:
        story.append(Paragraph(label, SECTION_STYLE))
        story.append(Spacer(1, 3 * mm))
        story.append(
            _kpi_table(
                [
                    ("Moyenne", f"{s.moyenne} j" if s.moyenne is not None else "-"),
                    ("Mediane", f"{s.mediane} j" if s.mediane is not None else "-"),
                    ("Minimum", f"{s.minimum} j" if s.minimum is not None else "-"),
                    ("Maximum", f"{s.maximum} j" if s.maximum is not None else "-"),
                ]
            )
        )
        story.append(Spacer(1, 6 * mm))

    story.append(Paragraph("Distribution du delai de cloture", SECTION_STYLE))
    story.append(Spacer(1, 4 * mm))
    story.append(_data_table(["Tranche", "Nombre de dossiers"], [[t.tranche, str(t.nombre_dossiers)] for t in histogramme]))

    doc.build(story)
    return buf.getvalue()


def build_financier_pdf(data) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    story = _header("Financier", "Evolution et repartition des montants regles")

    story.append(Paragraph("Evolution mensuelle", SECTION_STYLE))
    story.append(Spacer(1, 4 * mm))
    story.append(
        _data_table(
            ["Mois", "Montant total", "Nb reglements"],
            [[e.mois, f"{e.montant_total:.3f} DT", str(e.nombre_reglements)] for e in data.evolution_mensuelle],
        )
    )

    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("Top reglements", SECTION_STYLE))
    story.append(Spacer(1, 4 * mm))
    story.append(
        _data_table(
            ["Code", "N Sinistre", "Date", "Montant"],
            [
                [str(r.code_sinistre), r.n_sinistre, r.date_reglement.strftime("%d/%m/%Y"), f"{r.montant:.3f} DT"]
                for r in data.top_reglements
            ],
        )
    )

    doc.build(story)
    return buf.getvalue()
