import pandas as pd
import pm4py
from sqlalchemy.orm import Session, selectinload

from app.models.sinistre import Sinistre
from app.schemas.process_mining import ProcessMiningResponse, TransitionProcessus

ETAPES = ["Sinistre", "Ouverture", "Ordonnancement", "Retour quittance", "Reglement", "Cloture"]

_cache: dict = {}


def _build_event_log(db: Session) -> pd.DataFrame:
    sinistres = db.query(Sinistre).options(selectinload(Sinistre.reglements)).all()

    events = []
    for s in sinistres:
        case_id = str(s.id)
        events.append((case_id, "Sinistre", s.date_sinistre))
        events.append((case_id, "Ouverture", s.date_ouverture))
        events.append((case_id, "Ordonnancement", s.date_ordonnancement))
        if s.date_retour_quittance_signe:
            events.append((case_id, "Retour quittance", s.date_retour_quittance_signe))
        if s.reglements:
            premier_reglement = min(r.date_reglement for r in s.reglements)
            events.append((case_id, "Reglement", premier_reglement))
        if s.date_cloture_sinistre:
            events.append((case_id, "Cloture", s.date_cloture_sinistre))

    df = pd.DataFrame(events, columns=["case:concept:name", "concept:name", "time:timestamp"])
    return pm4py.format_dataframe(
        df, case_id="case:concept:name", activity_key="concept:name", timestamp_key="time:timestamp"
    )


def get_process_mining(db: Session) -> ProcessMiningResponse:
    if "response" in _cache:
        return _cache["response"]

    sinistres_count = db.query(Sinistre).count()
    log = _build_event_log(db)

    freq_dfg, _, _ = pm4py.discover_dfg(log)
    perf_dfg, _, _ = pm4py.discover_performance_dfg(log)

    transitions = []
    plus_lente = None
    plus_lente_duree = -1.0
    for (source, cible), duree_secondes in perf_dfg.items():
        duree_jours = round(duree_secondes["mean"] / 86400, 1)
        frequence = freq_dfg.get((source, cible), 0)
        transitions.append(
            TransitionProcessus(source=source, cible=cible, frequence=frequence, duree_moyenne_jours=duree_jours, goulet=False)
        )
        if duree_jours > plus_lente_duree:
            plus_lente_duree = duree_jours
            plus_lente = f"{source} -> {cible}"

    for t in transitions:
        if f"{t.source} -> {t.cible}" == plus_lente:
            t.goulet = True

    # ordre stable = ordre metier du parcours (Sinistre -> Ouverture -> ... -> Cloture)
    def _ordre(t: TransitionProcessus) -> tuple[int, int]:
        try:
            return (ETAPES.index(t.source), ETAPES.index(t.cible))
        except ValueError:
            return (99, 99)

    transitions.sort(key=_ordre)

    response = ProcessMiningResponse(
        etapes=ETAPES,
        transitions=transitions,
        etape_la_plus_lente=plus_lente or "",
        nombre_dossiers_analyses=sinistres_count,
    )
    _cache["response"] = response
    return response
