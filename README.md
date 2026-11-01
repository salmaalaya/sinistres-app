# Sinistres BIAT

**Une plateforme web qui transforme l'historique brut des sinistres d'assurance en pilotage opérationnel : suivi des dossiers, délais, anomalies, prédictions, prévisions et un assistant IA qui répond en langage naturel — en lecture seule.**

[![Backend CI](https://github.com/salmaalaya/sinistres-app/actions/workflows/ci.yml/badge.svg)](https://github.com/salmaalaya/sinistres-app/actions/workflows/ci.yml) ![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688) ![React](https://img.shields.io/badge/React-18-61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6) ![MariaDB](https://img.shields.io/badge/MariaDB-10.11-003545) ![scikit--learn](https://img.shields.io/badge/scikit--learn-1.5-F7931E) ![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)

> **English summary** — *Sinistres BIAT* is an insurance-claims management and analytics platform (FastAPI + React/TypeScript + MariaDB). Beyond claim CRUD, it computes processing-delay KPIs, flags outliers with **Isolation Forest**, predicts claim amount and duration by comparing **Random Forest / XGBoost / Gradient Boosting** (best MAE wins, with permutation-importance explanations), forecasts monthly volumes with **ARIMA** (back-tested MAPE), mines the real claim process with **PM4Py**, reads claim forms via **Tesseract OCR**, and answers natural-language questions through an **LLM-to-SQL assistant** (Gemini or OpenAI) locked down by a SQL validator *and* a dedicated `SELECT`-only database account. Backed by a pytest suite running against a real MySQL in GitHub Actions. Internship project (Esprit, 4th year).

> 🔒 **Données confidentielles** — Les données réelles de sinistres (`etat.xlsx`) appartiennent à la BIAT et **ne sont pas incluses dans ce dépôt**. Aucune clé, aucun mot de passe et aucune donnée client n'est versionné : l'application démarre sur une base vide et les tests créent leurs propres données.

---

## Fonctionnalités

| Module | Ce qu'il fait | Technique |
|---|---|---|
| **Sinistres** | liste filtrable, création, modification, détail avec règlements | CRUD FastAPI + SQLAlchemy, statut *calculé* (jamais stocké) |
| **Tableau de bord** | KPI, score de santé du portefeuille, insight automatique du jour | agrégations SQL ; l'insight ne retient que l'écart le plus marquant, sinon rien |
| **Délais** | durée de chaque étape (ouverture → ordonnancement → règlement → clôture), classement des gestionnaires | percentiles P10/P90, score pondéré (clôture 40 %, règlement 35 %, rapidité 25 %) |
| **Alertes** | dossiers critiques (ouverts depuis trop longtemps), récapitulatif email quotidien | APScheduler + SMTP, pas de renvoi d'un même dossier avant 7 jours |
| **Anomalies** | dossiers atypiques, avec la raison en clair | **Isolation Forest** (5 %) + z-scores pour expliquer *quelle* variable s'écarte |
| **Prédictions** | montant et durée estimés d'un nouveau dossier, dossiers similaires | **RF vs XGBoost vs GBR**, le meilleur au MAE est réentraîné ; importance par permutation ; k plus proches voisins |
| **Prévisions** | volumes et montants mensuels à venir, avec intervalle de confiance | **ARIMA(1,1,1)**, backtest sur 4 mois → MAPE affiché, avertissement si historique < 24 mois |
| **Process mining** | carte du processus réel et transitions fréquentes | **PM4Py** sur un journal d'événements reconstruit depuis les dates des dossiers |
| **Scanner** | lecture d'un constat scanné pour pré-remplir un dossier | **Tesseract OCR** (fra/eng) + Pillow |
| **Assistant IA** | questions en français → requête SQL → réponse rédigée + tableau | **Gemini** ou **OpenAI**, double verrou (voir ci-dessous) |
| **Qualité des données** | taux de complétude par champ, trace du dernier import | comptages SQL sur sinistres et règlements, journal d'import |
| **Calendrier** | carte de chaleur des ouvertures et clôtures, jour par jour, sur une année | agrégation par date, jour le plus chargé |
| **Export PDF** | rapports téléchargeables | ReportLab |
| **Authentification** | rôles ADMIN / GESTIONNAIRE, mot de passe oublié par code OTP | JWT, bcrypt, OTP 6 chiffres haché, 10 min, 5 essais, usage unique |

## Architecture

```mermaid
flowchart LR
    U([Utilisateur]) --> N["Frontend React/TS<br/>servi par nginx :3000"]
    N -- "/api (proxy)" --> A["API FastAPI :8001"]
    A --> R["Routers<br/>auth · sinistres · délais · alertes<br/>anomalies · prédictions · prévisions<br/>process mining · OCR · assistant"]
    R --> C["CRUD + services<br/>scikit-learn · XGBoost · statsmodels<br/>PM4Py · Tesseract · ReportLab"]
    C --> DB[("MariaDB<br/>sinistres_db")]
    R --> L{{"LLM<br/>Gemini / OpenAI"}}
    S["APScheduler<br/>job quotidien"] --> M([Emails SMTP])
    S --> DB
```

### Assistant IA : le LLM ne peut que lire

```mermaid
flowchart TD
    Q([Question en français]) --> G{{"LLM : génère une requête SQL<br/>schéma sans la table utilisateurs"}}
    G --> V["Validateur SQL<br/>1 instruction · SELECT uniquement<br/>mots-clés d'écriture refusés<br/>utilisateurs/password refusés · LIMIT ≤ 50"]
    V -- rejet --> X([Message de refus clair])
    V -- valide --> E[("Exécution avec le compte<br/>assistant_ro : GRANT SELECT seul")]
    E --> W{{"LLM : rédige la réponse<br/>à partir des lignes réelles"}}
    W --> O([Réponse + tableau + SQL affiché])
```

Même si le validateur était contourné, le compte MySQL `assistant_ro` n'a **aucun droit d'écriture** : la protection ne repose pas sur le prompt. Les tests `test_assistant_securite.py` vérifient les deux couches, y compris le vrai `GRANT` en base.

## Tests et intégration continue

| | |
|---|---|
| **Suite pytest** | 42 tests sur une vraie base MySQL : authentification, CRUD sinistres, intégrité de l'import, sécurité de l'assistant |
| **Sécurité de l'assistant** | `DROP`, `DELETE`, `UPDATE`, `INSERT`, `ALTER`, `TRUNCATE`, `GRANT`, `CREATE` et requêtes empilées rejetés ; `utilisateurs`/`password` refusés ; `LIMIT` ajouté ou plafonné ; `assistant_ro` réellement incapable d'écrire en base |
| **Intégrité des données** | statut dérivé de la date de clôture (jamais stocké), doublon de code sinistre refusé, montants importés en valeur absolue |
| **CI GitHub Actions** | à chaque push et pull request : service MySQL 8, création du schéma, provisionnement de `assistant_ro`, `pytest` |

## Stack

**Backend** : Python 3.11+, FastAPI 0.115, SQLAlchemy 2, Pydantic 2, python-jose (JWT), passlib/bcrypt, APScheduler · **Analyse** : pandas, scikit-learn 1.5, XGBoost 2.1, statsmodels (ARIMA), PM4Py, pytesseract · **IA** : google-genai (Gemini) ou OpenAI · **Frontend** : React 18, TypeScript 5.5, Vite 5, Tailwind CSS 3, Recharts, React Router · **Données** : MariaDB 10.11 / MySQL 8 · **Infra** : Docker Compose, nginx, GitHub Actions.

## Installation rapide

Prérequis : Docker Desktop lancé. Optionnel : une [clé Gemini](https://aistudio.google.com) pour l'assistant IA.

```bash
git clone https://github.com/salmaalaya/sinistres-app.git && cd sinistres-app
cp .env.example .env          # puis renseigner au minimum JWT_SECRET_KEY et MARIADB_ROOT_PASSWORD
docker compose up --build -d
```

| Service | Adresse |
|---|---|
| Application | http://localhost:3000 |
| API + documentation Swagger | http://localhost:8001/docs |
| MariaDB | `localhost:3307` (schéma créé depuis `database/schema.sql`) |

Un compte administrateur est créé au premier démarrage : **changer son mot de passe immédiatement**.

**Importer les données** (si vous disposez du fichier, non fourni) : le placer dans `database/`, puis

```bash
docker compose exec backend python scripts/import_data.py --file /app/database/etat_fixed.xlsx
```

<details>
<summary><b>Développement local sans Docker</b></summary>

```bash
# Backend (MySQL/MariaDB local requis)
cd backend
cp .env.example .env
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt     # Linux/macOS : .venv/bin/python
.venv/Scripts/python scripts/init_db.py
.venv/Scripts/python -m uvicorn app.main:app --port 8001

# Frontend
cd frontend
npm install
npm run dev
```

Scanner OCR : installer [Tesseract](https://github.com/UB-Mannheim/tesseract/wiki) et placer `fra`, `eng`, `osd.traineddata` ([tessdata](https://github.com/tesseract-ocr/tessdata)) dans `backend/tessdata/` (non versionné, 16 Mo).
</details>

## Variables d'environnement

Modèles : [`.env.example`](.env.example) (Docker Compose) et [`backend/.env.example`](backend/.env.example) (backend local).

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | connexion SQLAlchemy (`mysql+pymysql://user:pass@host:port/db`) |
| `MARIADB_ROOT_PASSWORD` | mot de passe root MariaDB (Docker) |
| `JWT_SECRET_KEY` | secret de signature des tokens — long et aléatoire |
| `JWT_ALGORITHM`, `JWT_EXPIRE_MINUTES` | paramètres JWT (`HS256`, `480`) |
| `CORS_ORIGINS` | origines autorisées, séparées par des virgules |
| `LLM_PROVIDER` | `gemini` (défaut) ou `openai` |
| `GEMINI_API_KEY`, `OPENAI_API_KEY` | clé du fournisseur choisi ; sans clé, l'assistant l'indique simplement |
| `ASSISTANT_DB_URL` | compte lecture seule de l'assistant ; vide = auto-provisionné au premier appel |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_ADDRESS` | emails (code OTP, alertes quotidiennes) |

## Lancer les tests

```bash
cd backend
python scripts/init_db.py                  # schéma de test
python scripts/setup_assistant_db_user.py  # compte assistant_ro (GRANT SELECT)
python -m pytest tests/ -v
```

## Structure du dépôt

| Chemin | Contenu |
|---|---|
| `docker-compose.yml` | MariaDB, backend, frontend (variables lues depuis `.env`) |
| `backend/app/core/` | configuration, connexion base, sécurité (JWT, hachage) |
| `backend/app/models/` · `schemas/` | modèles SQLAlchemy · schémas Pydantic |
| `backend/app/crud/` | calculs métier : délais, alertes, anomalies, scores, qualité, insight |
| `backend/app/routers/` | endpoints REST, un fichier par module |
| `backend/app/services/` | ML, ARIMA, process mining, OCR, LLM, emails, OTP, PDF, planificateur |
| `backend/scripts/` | initialisation de la base, import Excel, migrations, compte `assistant_ro` |
| `backend/tests/` | suite pytest (base MySQL réelle) |
| `frontend/src/pages/` | une page par module (tableau de bord, délais, prédictions, assistant…) |
| `frontend/src/components/` · `services/` | composants partagés (jauges, compteurs animés) · clients API |
| `database/schema.sql` | DDL de référence |
| `.github/workflows/ci.yml` | intégration continue |

## Sécurité et données

- Secrets uniquement dans `.env` (non versionné) ; `.env.example` ne contient aucune valeur réelle.
- Mots de passe hachés avec bcrypt ; codes OTP hachés, à usage unique, 5 essais, expirant en 10 minutes ; email et téléphone masqués à l'affichage.
- Assistant IA : validateur SQL **et** compte base `SELECT`-only ; la table `utilisateurs` n'est jamais exposée au modèle.
- Fichiers de données réelles (`*.xlsx`, `*.csv`), documents générés et journaux exclus par `.gitignore`.
- Respect de `prefers-reduced-motion` pour toutes les animations de l'interface.

## Crédits

Projet de stage de 4ᵉ année — **Esprit**, 2026, réalisé sur des données de sinistres de la **BIAT**.
