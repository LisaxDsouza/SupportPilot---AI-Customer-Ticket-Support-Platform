# SupportPilot — Database & Docker Setup Guide

This guide details the PostgreSQL database container setup for SupportPilot. It is designed so **any developer on the team** can spin up an identical, pre-seeded PostgreSQL 15 instance in seconds.

---

## 1. Quick Start (Using Docker Compose)

Make sure Docker Desktop is running on your machine, then run from the project root:

```bash
# 1. Start the PostgreSQL container in background
docker compose up -d

# 2. Verify container is healthy and running on port 5432
docker ps
```

The container will automatically initialize all tables defined in `SCHEMAS.md` and populate initial users and sample tickets.

---

## 2. Default Database Credentials & Connection Details

| Parameter | Default Value | Notes |
| :--- | :--- | :--- |
| **Host** | `localhost` (or your LAN IP) | Accessible to team members on the same network |
| **Port** | `5432` | Exposed on host |
| **Database** | `supportpilot_db` | Main application database |
| **Username** | `postgres` | Superuser |
| **Password** | `password123` | Configurable in `.env` |

### Connection Strings:
* **SQLAlchemy / Psycopg 3:**  
  `postgresql+psycopg://postgres:password123@localhost:5432/supportpilot_db`
* **Standard URI (pgAdmin, DBeaver, psql):**  
  `postgresql://postgres:password123@localhost:5432/supportpilot_db`

---

## 3. Pre-Loaded Schemas & Seed Data

When the database is launched for the first time, `docker/init.sql` runs automatically and creates:

1. **`users`** — User management table with roles (`ADMIN`, `SUPPORT_ENGINEER`, `EMPLOYEE`), pre-seeded with admin and sample users.
2. **`tickets`** — Master tickets table with AI triage columns, indices on `status`, `category`, and `priority`, pre-seeded with 12 real-world tickets from `data/sample_tickets.json`.
3. **`ticket_responses`** — RAG / AI solutions table with confidence score, citations, and agent traces.
4. **`knowledge_base`** — Knowledge base articles with vector ID reference.
5. **`escalations`** — Human-in-the-loop escalation tracking.
6. **`jira_tickets`** — External Jira linkage records.
7. **`activity_logs`** — Audit trail for ticket lifecycle events.

---

## 4. Building & Sharing the Docker Image with Teammates

### Option A: Build and Run Locally
Any developer can build the customized image using the included Dockerfile:

```bash
docker build -t supportpilot-postgres:latest -f docker/Dockerfile .
```

### Option B: Sharing via Container Registry (Docker Hub or GHCR)
To publish the pre-configured database image for your teammates:

```bash
# Tag for Docker Hub
docker tag supportpilot-postgres:latest <your-dockerhub-username>/supportpilot-postgres:latest

# Push to Docker Hub
docker push <your-dockerhub-username>/supportpilot-postgres:latest
```

Your teammates can then simply run:
```bash
docker run -d -p 5432:5432 --name supportpilot_postgres <your-dockerhub-username>/supportpilot-postgres:latest
```

---

## 5. Sharing Access Across the Local Network

Because the port is mapped to `0.0.0.0:5432`, other developers on the same Wi-Fi or LAN can connect directly to your database:

1. Find your local IP address:
   * **Windows:** Run `ipconfig` (look for `IPv4 Address`, e.g., `192.168.1.100`)
   * **macOS / Linux:** Run `ifconfig` or `ip a`
2. Teammates can connect using:
   ```text
   postgresql+psycopg://postgres:password123@192.168.1.100:5432/supportpilot_db
   ```
*(Ensure Windows Defender Firewall allows incoming TCP connections on port 5432 if connecting from another device).*

---

## 6. Useful Commands

```bash
# Stop the database
docker compose down

# Stop the database AND reset data (forces clean re-init)
docker compose down -v

# View PostgreSQL logs
docker compose logs -f postgres

# Open interactive psql shell inside the container
docker compose exec postgres psql -U postgres -d supportpilot_db
```
