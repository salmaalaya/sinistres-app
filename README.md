# Sinistres BIAT

Application web de gestion et d'analyse des sinistres : suivi CRUD, tableaux de
bord financiers et délais, détection d'anomalies, prédictions ML, prévisions,
process mining, OCR de constats et assistant IA (questions en langage naturel
sur la base, en lecture seule).

## Stack

- **Backend** : Python, FastAPI, SQLAlchemy, Pydantic, JWT
- **Frontend** : React 18, TypeScript, Vite, Tailwind CSS
- **Base de données** : MySQL / MariaDB
- **Analyse** : scikit-learn, XGBoost, statsmodels, PM4Py, Tesseract (OCR)
- **IA** : Gemini ou OpenAI (configurable)
- **Infra** : Docker Compose, nginx, GitHub Actions (pytest)

## Prérequis

- Docker et Docker Compose, **ou**
- Python 3.11+, Node.js 20+, MySQL 8 / MariaDB 10.11 (développement local)
- Tesseract OCR (optionnel, pour le scanner de constats)

## Installation (Docker)

```bash
cp .env.example .env      # puis renseigner les valeurs
docker compose up --build -d
```

- Frontend : http://localhost:3000 (nginx, proxy `/api` vers le backend)
- Backend : http://localhost:8001 (docs : `/docs`)
- MariaDB : port 3307, schéma créé depuis `database/schema.sql`

Les données réelles (`etat.xlsx`) sont confidentielles et **ne sont pas versionnées**.
Pour les importer après le premier démarrage, placer le fichier dans `database/` puis :

```bash
docker compose exec backend python scripts/import_data.py --file /app/database/etat_fixed.xlsx
```

## Développement local (sans Docker)

```bash
# Backend
cd backend
cp .env.example .env
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt   # Linux/macOS : .venv/bin/python
.venv/Scripts/python scripts/init_db.py
.venv/Scripts/python -m uvicorn app.main:app --port 8001

# Frontend
cd frontend
npm install
npm run dev
```

Un compte administrateur par défaut est créé au premier démarrage : changer son
mot de passe immédiatement.

## Variables d'environnement

Voir `.env.example` (Docker Compose) et `backend/.env.example` (backend local).

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion SQLAlchemy (`mysql+pymysql://user:pass@host:port/db`) |
| `MARIADB_ROOT_PASSWORD` | Mot de passe root MariaDB (Docker) |
| `JWT_SECRET_KEY` | Secret de signature des tokens (long et aléatoire) |
| `JWT_ALGORITHM`, `JWT_EXPIRE_MINUTES` | Paramètres JWT |
| `CORS_ORIGINS` | Origines autorisées, séparées par des virgules |
| `LLM_PROVIDER` | `gemini` ou `openai` |
| `GEMINI_API_KEY`, `OPENAI_API_KEY` | Clés de l'assistant IA |
| `ASSISTANT_DB_URL` | Compte MySQL en lecture seule pour l'assistant (sinon auto-provisionné) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_ADDRESS` | Envoi d'emails (OTP, notifications) |

Ne jamais committer de fichier `.env`.

Les données OCR Tesseract (`backend/tessdata/*.traineddata`) ne sont pas
versionnées : les télécharger depuis
[tessdata](https://github.com/tesseract-ocr/tessdata) (`fra`, `eng`, `osd`).

## Tests

Les tests utilisent une vraie base MySQL (`sinistres_db` sur `localhost:3306`).

```bash
cd backend
python scripts/init_db.py
python scripts/setup_assistant_db_user.py   # utilisateur assistant_ro (GRANT SELECT)
python -m pytest tests/ -v
```

La CI GitHub Actions (`.github/workflows/ci.yml`) exécute les mêmes étapes sur
chaque push et pull request, avec un service MySQL 8.

## Structure

```
.
├── backend/              # API FastAPI
│   ├── app/
│   │   ├── core/         # config, base de données, sécurité
│   │   ├── models/       # modèles SQLAlchemy
│   │   ├── schemas/      # schémas Pydantic
│   │   ├── crud/         # accès aux données et calculs
│   │   ├── routers/      # endpoints
│   │   └── services/     # ML, OCR, LLM, emails, PDF, process mining
│   ├── scripts/          # init DB, import, migrations
│   └── tests/            # pytest
├── frontend/             # React + TypeScript (Vite)
│   └── src/              # pages, components, services, hooks, context
├── database/             # schema.sql
├── docker-compose.yml
└── .github/workflows/    # CI
```
