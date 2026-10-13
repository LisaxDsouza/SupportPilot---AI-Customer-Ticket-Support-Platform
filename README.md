# SupportPilot — AI Ticket Resolution Agent

> An AI-powered IT support platform that ingests tickets, classifies them, retrieves answers from a knowledge base (RAG), generates resolutions, and escalates to humans when needed.

![Status](https://img.shields.io/badge/status-Milestone%201%20scaffold-blue)
![Backend](https://img.shields.io/badge/backend-FastAPI-009688)
![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20TypeScript-61DAFB)
![Database](https://img.shields.io/badge/database-PostgreSQL%2015-336791)

## Table of contents

1. [Overview](#overview)
2. [Current status](#current-status)
3. [Tech stack](#tech-stack)
4. [Architecture](#architecture)
5. [Project structure](#project-structure)
6. [Quick start](#quick-start)
7. [Detailed setup](#detailed-setup)
8. [Environment variables](#environment-variables)
9. [API reference](#api-reference)
10. [Controlled vocabularies](#controlled-vocabularies)
11. [Database schema](#database-schema)
12. [Team ownership](#team-ownership)
13. [Roadmap](#roadmap)
14. [Git workflow](#git-workflow)
15. [Troubleshooting](#troubleshooting)
16. [Known limitations and open decisions](#known-limitations-and-open-decisions)

---

## Overview

Organizations receive a large volume of repetitive IT support requests (network, VPN, software, password resets, hardware). Handling them manually raises costs and slows response times.

SupportPilot automates the ticket lifecycle:

1. **Intake** tickets from a web portal (later: email and service desk).
2. **Classify** each ticket by category, severity, and priority.
3. **Retrieve** relevant troubleshooting knowledge using semantic search (RAG).
4. **Generate** step-by-step resolutions and user responses with source references.
5. **Coordinate** specialised agents (Diagnosis, Retrieval, Resolution, Escalation).
6. **Escalate** unresolved tickets to human teams, with Jira and email integration.
7. **Monitor** everything through an analytics dashboard.

## Current status

This repository currently contains the **Milestone 1 foundation**. Everything marked "placeholder" is an interface that teammates will implement on their own branches.

| Capability | State |
| --- | --- |
| Ticket submission API and storage in PostgreSQL | Working |
| Activity log entry on intake | Working |
| All 7 database tables modelled | Working |
| React UI: ticket form, classification card, ticket table | Working (mock data when the API is offline) |
| Seed script with 12 sample tickets | Working |
| AI classification | **Placeholder**, returns safe defaults |
| RAG / knowledge retrieval | Placeholder (interface only) |
| Multi-agent workflow, Jira, email automation | Not started (Milestones 3–4) |
| Analytics dashboard | Not started (Milestone 4) |

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, Axios |
| Backend | Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy |
| Database | PostgreSQL 15 (JSONB columns) |
| Local services | Docker Compose |
| Planned | OpenAI LLM, ChromaDB vector store, Jira API, email automation |

## Architecture

```text
React client (:5173)  ->  FastAPI /api/v1 (:8000)  ->  SQLAlchemy  ->  PostgreSQL (:5432)
                                  |
                                  +-> Classifier service (placeholder -> LLM in Milestone 1 AI work)
                                  +-> RAG engine         (placeholder -> ChromaDB in Milestone 2)
```

**Ticket intake flow**

1. The frontend sends `POST /api/v1/tickets`.
2. FastAPI validates the request against `TicketCreateRequest`.
3. The classifier service returns a `ClassificationResult`.
4. The ticket and an `INTAKE` activity log are stored in one transaction.
5. The full ticket is returned and shown in the UI.

## Project structure

```text
.
├── backend/
│   ├── app/
│   │   ├── api/v1/            # health and ticket HTTP routes
│   │   ├── core/              # settings and database session
│   │   ├── crud/              # ticket persistence operations
│   │   ├── models/            # SQLAlchemy models for all 7 tables
│   │   ├── schemas/           # Pydantic contracts (ticket, ai, resolution)
│   │   ├── services/          # ai_classifier.py, rag_engine.py
│   │   └── main.py            # FastAPI entrypoint and CORS
│   ├── scripts/seed_db.py     # loads data/sample_tickets.json
│   └── requirements.txt
├── data/sample_tickets.json   # 12 shared sample tickets
├── frontend/
│   ├── src/
│   │   ├── components/        # TicketForm, ClassificationCard, TicketTable
│   │   ├── services/api.ts    # typed API client
│   │   └── types/ticket.ts    # shared TypeScript interfaces
│   └── .env.example
├── .env.example               # root environment template
├── .gitignore
├── docker-compose.yml         # PostgreSQL service
├── README.md
└── SCHEMAS.md                 # source of truth for data contracts
```

`SCHEMAS.md` is the **source of truth** for enums, table definitions, and the Pydantic and TypeScript contracts.

## Quick start

Requires Docker Desktop (running), Python 3.11+, and Node.js 20+.

```powershell
# 1. Environment
Copy-Item .env.example .env          # then edit .env and set POSTGRES_PASSWORD

# 2. Database
docker compose up -d

# 3. Backend (new terminal)
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m scripts.seed_db
uvicorn app.main:app --reload --port 8000

# 4. Frontend (another terminal)
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Then open:

- App: <http://localhost:5173>
- Interactive API docs: <http://localhost:8000/docs>
- Health check: <http://localhost:8000/api/v1/health>

## Detailed setup

### macOS / Linux equivalents

```bash
cp .env.example .env
docker compose up -d

cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m scripts.seed_db
uvicorn app.main:app --reload --port 8000

cd ../frontend
cp .env.example .env
npm install
npm run dev
```

### Notes

- The backend reads the **repository-root** `.env`, even when Uvicorn is started from `backend/`.
- Run backend commands from the `backend/` folder (the `-m scripts.seed_db` form depends on it).
- Check the database is ready with `docker compose ps`; the status should be `healthy`.
- **Never commit `.env` files.** They are git-ignored. Share only `.env.example`.

## Environment variables

| Variable | Used by | Purpose |
| --- | --- | --- |
| `POSTGRES_USER` | Docker | PostgreSQL user |
| `POSTGRES_PASSWORD` | Docker, backend URL | PostgreSQL password (required) |
| `POSTGRES_DB` | Docker | Database name |
| `POSTGRES_PORT` | Docker | Host port for PostgreSQL |
| `DATABASE_URL` | Backend | SQLAlchemy connection URL |
| `BACKEND_CORS_ORIGINS` | Backend | Comma-separated allowed frontend origins |
| `OPENAI_API_KEY` | Future classifier | Reserved for the AI milestone; unused by the placeholder |
| `VITE_API_BASE_URL` | Frontend | FastAPI base URL (default `http://localhost:8000/api/v1`) |

## API reference

Base URL: `http://localhost:8000/api/v1`

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Service health |
| `POST` | `/tickets` | Create and classify a ticket |
| `GET` | `/tickets` | List tickets |
| `GET` | `/tickets/{ticket_id}` | Retrieve one ticket |
| `PATCH` | `/tickets/{ticket_id}/status` | Update a ticket's status |

**Example: create a ticket**

```json
POST /api/v1/tickets
{
  "title": "VPN Connection Failing on Corporate Network",
  "description": "Unable to connect to VPN since this morning. Error: Connection timed out.",
  "requester_email": "john.doe@company.com",
  "department": "Engineering",
  "source": "WEB_PORTAL"
}
```

Until the AI classifier is implemented, the response carries placeholder classification values (`category: "Unassigned"`, `severity: "Medium"`, `priority: "P3"`, `confidence_score: 0.0`), `status: "OPEN"`, and a code such as `SP-1001`.

**Example: update status**

```json
PATCH /api/v1/tickets/1/status
{ "status": "TRIAGED" }
```

## Controlled vocabularies

Defined in `SCHEMAS.md`. These exact strings must be used in the database, API, and UI.

| Field | Allowed values |
| --- | --- |
| Category | `Network Connectivity`, `VPN Access`, `Software & Applications`, `Hardware & Peripherals`, `Identity & Access`, `Security Incident` |
| Severity | `Critical` (business stoppage, widespread outage), `High` (core system blocked), `Medium` (impaired, workaround exists), `Low` (minor or general inquiry) |
| Priority | `P1` (< 2 h), `P2` (< 8 h), `P3` (< 24 h), `P4` (< 72 h) |
| Status | `OPEN`, `TRIAGED`, `INVESTIGATING`, `RESOLVED`, `ESCALATED`, `CLOSED` |
| Source | `WEB_PORTAL`, `EMAIL`, `API`, `SLACK_BOT` |

## Database schema

| Table | Purpose | Used from |
| --- | --- | --- |
| `users` | Requesters, support engineers, admins | M1 |
| `tickets` | Master ticket record and AI classification fields | M1 |
| `activity_logs` | Audit trail of ticket events | M1 (analytics in M4) |
| `ticket_responses` | AI-generated solutions with citations and agent traces | M2 |
| `knowledge_base` | Articles linked to vector-store documents | M2 |
| `escalations` | Human escalation records | M3–M4 |
| `jira_tickets` | Links to external Jira issues | M3 |

Full DDL is in `SCHEMAS.md`. In Python, the `metadata` column is exposed as `metadata_` because `metadata` is reserved by SQLAlchemy; the database column name is unchanged.

## Team ownership

| Role | Owner | Responsibility |
| --- | --- | --- |
| Person 1 | _name_ | AI classification contract, later RAG and agents |
| Person 2 | _name_ | FastAPI routes, validation, backend integration |
| Person 3 | _name_ | React TypeScript interface and API integration |
| Person 4 | _name_ | PostgreSQL, Docker, ORM models, seed data |

## Roadmap

- [ ] **M1 (Weeks 1–2): Ticket processing and classification.** Intake, AI classification, severity and priority scoring. Targets: classification >= 90%, severity accuracy >= 85%.
- [ ] **M2 (Weeks 3–4): Knowledge retrieval and resolution.** Knowledge base search, RAG workflows, troubleshooting responses with source references.
- [ ] **M3 (Weeks 5–6): Multi-agent workflows and integrations.** Diagnosis, Retrieval, Resolution and Escalation agents; Jira integration; email automation.
- [ ] **M4 (Weeks 7–8): Dashboard and optimization.** Analytics dashboard, escalation workflows and monitoring, testing, optimization, deployment. Targets: response time < 5 s, user satisfaction >= 85%.

## Git workflow

- Never push directly to `main`. Open a Pull Request and get **one review** before merging.
- Branch names: `feature/<name>-<module>` (for example `feature/priya-ai-classifier`).
- Commit prefixes: `feat:`, `fix:`, `chore:`, `docs:`.
- Keep commits small and focused, and keep your branch up to date:

```bash
git checkout main
git pull origin main
git checkout feature/<name>-<module>
git merge main
```

- Agree on any change to `SCHEMAS.md` with the team **before** implementing it.
- Never commit `.env`, virtual environments, `node_modules`, or build output.

**Pull request checklist**

- [ ] Code runs locally (backend starts, `npm run build` passes)
- [ ] Enum strings match `SCHEMAS.md`
- [ ] No secrets or `.env` files committed
- [ ] README or `SCHEMAS.md` updated if contracts changed

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `docker compose` cannot connect to the Docker engine | Start Docker Desktop and wait for the Linux engine to be running |
| `POSTGRES_PASSWORD` error on `docker compose up` | Set the password in the root `.env` |
| Port 5432 already in use | Change `POSTGRES_PORT` and update the port in `DATABASE_URL` |
| `ModuleNotFoundError: app` | Run commands from the `backend/` folder |
| PowerShell blocks `Activate.ps1` | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once |
| Browser shows a CORS error | Add your frontend origin to `BACKEND_CORS_ORIGINS` |
| UI shows mock data and a notice | The API is unreachable; check the backend is running on port 8000 and `VITE_API_BASE_URL` |

## Known limitations and open decisions

- The classifier, retrieval, multi-agent workflow, Jira, and email automation are **interfaces or placeholders only**.
- The placeholder category `Unassigned` is accepted by the backend (it is the DDL default) but is not in the shared six-value `Category` enum. The team must decide whether to add it to the contract.
- The status order in `SCHEMAS.md` (`RESOLVED` before `ESCALATED`) is kept as written. Transitions are **not enforced**; the team should confirm the intended flow.
- It is undecided whether a **live classification-preview endpoint** is needed so the classification card can show a result before submission.
- `SQLite` is used only for local validation; PostgreSQL is the target database.
- Ticket codes use the database-assigned primary key (`SP-1001` onward), so concurrent inserts are safe. Gaps in numbering are possible if an insert is rolled back.