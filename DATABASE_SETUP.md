# SupportPilot — Database Setup Guide

> **Quick Summary:** Follow this guide to spin up the local PostgreSQL database for SupportPilot in under 1 minute. All tables and sample tickets are automatically provisioned.

---

## 1. Database Credentials & Connection Details

Share these credentials with your team for local development and API connections:

| Parameter | Value |
| :--- | :--- |
| **Host** | `localhost` *(or your teammate's LAN IP if connecting remotely)* |
| **Port** | `5432` |
| **Database Name** | `supportpilot_db` |
| **Username** | `postgres` |
| **Password** | `password123` |

### Connection Strings:
* **FastAPI Backend (SQLAlchemy + Psycopg 3):**
  ```text
  postgresql+psycopg://postgres:password123@localhost:5432/supportpilot_db
  ```
* **Standard URI (pgAdmin, DBeaver, TablePlus, psql):**
  ```text
  postgresql://postgres:password123@localhost:5432/supportpilot_db
  ```

---

## 2. Option A: Setup with Docker (Recommended)

This is the fastest method. It automatically builds the schema, creates tables, and seeds 12 test tickets.

### Prerequisites:
1. Make sure **Docker Desktop** is installed and **running**.
2. Open terminal in the project root: `Infosys - Customer Support/`

### Steps:
```bash
# 1. Start the database in background
docker compose up -d

# 2. Verify that the container is healthy and running
docker ps
```

You should see:
```text
CONTAINER ID   IMAGE                          STATUS                    PORTS
...            supportpilot-postgres:latest   Up (healthy)              0.0.0.0:5432->5432/tcp   supportpilot_postgres
```

---

## 3. Option B: Connect to a Teammate's Database (LAN / Same Wi-Fi)

If one developer hosts the database and others want to connect to it without running Docker locally:

1. **Host developer** finds their local IPv4 address:
   * **Windows:** Run `ipconfig` in PowerShell (find `IPv4 Address`, e.g. `192.168.1.15`).
   * **Mac / Linux:** Run `ifconfig` or `ip a`.
   * Ensure Windows Defender Firewall allows incoming connections on port `5432`.

2. **Teammates** update their `.env` file:
   ```env
   DATABASE_URL=postgresql+psycopg://postgres:password123@192.168.1.15:5432/supportpilot_db
   ```

---

## 4. Option C: Manual Setup (Local PostgreSQL without Docker)

If you have native PostgreSQL installed locally and prefer not to use Docker:

```bash
# 1. Create the database
createdb -U postgres supportpilot_db

# 2. Run the initialization script
psql -U postgres -d supportpilot_db -f docker/init.sql
```

---

## 5. What Gets Created Automatically

The setup runs [`docker/init.sql`](docker/init.sql) and provisions all **7 system tables**:

1. **`users`** — Pre-seeded with 4 default accounts (`admin@company.com`, `engineer@company.com`, `alex.smith@company.com`, `priya.shah@company.com`).
2. **`tickets`** — Pre-seeded with **12 sample tickets** covering Network, VPN, Hardware, Software, Identity, and Security categories.
3. **`ticket_responses`** — Storage for AI/RAG solutions with confidence scores, citations, and agent traces.
4. **`knowledge_base`** — Troubleshooting articles for vector retrieval.
5. **`escalations`** — Records for human-in-the-loop escalation.
6. **`jira_tickets`** — Linkages to external Jira issue keys.
7. **`activity_logs`** — Audit trail for ticket lifecycle events.

---

## 6. How to Verify the Setup

### Verify via Docker CLI:
```bash
# Check ticket count (should output: 12)
docker compose exec postgres psql -U postgres -d supportpilot_db -c "SELECT count(*) FROM tickets;"
```

### Verify via Python / Backend:
From the `backend/` directory:
```bash
python -m scripts.seed_db
```
*Output:* `Seed complete: 0 created, 12 already present.`

---

## 7. Useful Database Commands

```bash
# View live database logs
docker compose logs -f postgres

# Stop the database container
docker compose down

# Reset the database completely (wipes volume & forces fresh schema reload)
docker compose down -v
docker compose up -d

# Open interactive psql terminal inside the container
docker compose exec postgres psql -U postgres -d supportpilot_db
```

---

## 8. Troubleshooting

* **Error: `port 5432 is already allocated`**:
  * You likely have a local PostgreSQL service running on your machine.
  * Stop it via Windows Services (`services.msc` -> stop `postgresql-x64-XX`), or change `POSTGRES_PORT=5433` in `.env` and `docker-compose.yml`.
* **Error: `error during connect: open //./pipe/dockerDesktopLinuxEngine`**:
  * Docker Desktop is not currently running. Launch Docker Desktop from the Start menu and wait for the whale icon in the taskbar to turn steady green.
