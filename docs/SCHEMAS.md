# SupportPilot — System Architecture & Universal Schemas
**Project:** AI-Powered Customer Support Platform with Ticket Resolution Agent  
**Standard:** Enterprise ITSM / ITIL 4 Ready (2-Month Airtight Lifecycle)

---

## 1. Directory Structure & Monorepo Scaffold

Every file in the project has a designated home. Follow this directory tree strictly:

```text
Infosys - Customer Support/
├── docker-compose.yml                <-- Docker configuration for PostgreSQL
├── .env.example                      <-- Template for environment variables
├── .gitignore                        <-- Git ignore rules
├── SCHEMAS.md                        <-- Universal data models and directory structure
├── TODAY_TASKS.md                    <-- Execution tasks in dependency order for today
│
├── backend/
│   ├── requirements.txt              <-- Python dependencies
│   ├── .env                          <-- Local secrets (DATABASE_URL, OPENAI_API_KEY)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   <-- FastAPI entrypoint & CORS config
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py             <-- Environment settings
│   │   │   └── database.py          <-- SQLAlchemy engine & session factory
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── ticket.py             <-- SQLAlchemy ORM models (Postgres tables)
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── ticket.py             <-- Pydantic request/response schemas
│   │   │   ├── ai.py                 <-- Pydantic AI classification schema
│   │   │   └── resolution.py         <-- Pydantic RAG & multi-agent schemas (future)
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── health.py         <-- Health check endpoint
│   │   │       └── tickets.py        <-- Ticket intake & retrieval endpoints
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── ai_classifier.py      <-- LLM classification & prompt logic
│   │   │   └── rag_engine.py         <-- (Week 3) ChromaDB retrieval service
│   │   └── crud/
│   │       ├── __init__.py
│   │       └── ticket_crud.py        <-- Database queries (create, list, get_by_id)
│   └── scripts/
│       ├── __init__.py
│       └── seed_db.py                <-- Populates DB with initial sample tickets
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js / ts
│   ├── src/
│   │   ├── main.jsx / tsx
│   │   ├── App.jsx / tsx
│   │   ├── types/
│   │   │   └── ticket.ts             <-- Universal TypeScript interfaces
│   │   ├── services/
│   │   │   └── api.ts                <-- Axios/Fetch calls to FastAPI backend
│   │   └── components/
│   │       ├── TicketForm.jsx        <-- Form input for new tickets
│   │       ├── ClassificationCard.jsx<-- Real-time AI triage result card
│   │       └── TicketTable.jsx       <-- List of all active/resolved tickets
│
└── data/
    └── sample_tickets.json           <-- Mock ticket samples for testing & seeding
```

---

## 2. Standardized Controlled Vocabularies (Enums)

All backend endpoints, database fields, and React components must use these exact strings:

### Category
* `Network Connectivity`
* `VPN Access`
* `Software & Applications`
* `Hardware & Peripherals`
* `Identity & Access`
* `Security Incident`

### Severity
* `Critical` — Business stoppage, widespread outage
* `High` — Core system blocked for user/team
* `Medium` — Impaired functionality, workaround available
* `Low` — Minor issue, general inquiry, cosmetic

### Priority
* `P1` — SLA: < 2 hours
* `P2` — SLA: < 8 hours
* `P3` — SLA: < 24 hours
* `P4` — SLA: < 72 hours

### Status
* `OPEN` $\to$ `TRIAGED` $\to$ `INVESTIGATING` $\to$ `RESOLVED` $\to$ `ESCALATED` $\to$ `CLOSED`

### Source
* `WEB_PORTAL`, `EMAIL`, `API`, `SLACK_BOT`

---

## 3. Database Schema (PostgreSQL DDL)

Ready for PostgreSQL (and SQLite-compatible). Contains future-proof tables for the full 2-month lifecycle:

```sql
-- 1. Users Table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    department VARCHAR(50) NOT NULL,
    role VARCHAR(30) DEFAULT 'EMPLOYEE' CHECK (role IN ('EMPLOYEE', 'SUPPORT_ENGINEER', 'ADMIN')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Master Tickets Table
CREATE TABLE tickets (
    ticket_id SERIAL PRIMARY KEY,
    ticket_code VARCHAR(20) NOT NULL UNIQUE,          -- Human-readable e.g. "SP-1001"
    requester_email VARCHAR(150) NOT NULL,
    department VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- AI Classification Fields
    category VARCHAR(50) DEFAULT 'Unassigned',
    sub_category VARCHAR(50) DEFAULT 'General',
    severity VARCHAR(20) DEFAULT 'Medium',
    priority VARCHAR(10) DEFAULT 'P3',
    confidence_score FLOAT DEFAULT 0.0,
    ai_reasoning TEXT,
    
    -- State & Workflow
    status VARCHAR(30) DEFAULT 'OPEN',
    source VARCHAR(20) DEFAULT 'WEB_PORTAL',
    assigned_team VARCHAR(50) DEFAULT 'IT_SERVICE_DESK',
    
    -- Extensible JSON metadata (stores multi-agent logs, tags)
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_category ON tickets(category);
CREATE INDEX idx_tickets_priority ON tickets(priority);

-- 3. AI Generated Solutions (RAG Milestone)
CREATE TABLE ticket_responses (
    response_id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    solution_text TEXT NOT NULL,
    confidence_score FLOAT NOT NULL,
    citations JSONB DEFAULT '[]'::jsonb,      -- [{"article_id": 4, "title": "VPN Guide", "similarity": 0.89}]
    agent_trace JSONB DEFAULT '[]'::jsonb,    -- Multi-agent reasoning trace
    validation_status VARCHAR(30) DEFAULT 'PENDING' CHECK (validation_status IN ('PENDING', 'AUTO_APPROVED', 'REJECTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Knowledge Base for Vector Search (RAG Milestone)
CREATE TABLE knowledge_base (
    article_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    vector_id VARCHAR(100),                  -- Document ID inside ChromaDB
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Human Escalations (HITL Milestone)
CREATE TABLE escalations (
    escalation_id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    target_team VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    trigger_type VARCHAR(30) NOT NULL,       -- 'AUTO_LOW_CONFIDENCE', 'P1_CRITICAL', 'MANUAL'
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. External Jira Linkage (Integrations Milestone)
CREATE TABLE jira_tickets (
    jira_link_id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    jira_key VARCHAR(50) NOT NULL UNIQUE,    -- e.g. "ITSM-1042"
    jira_status VARCHAR(50) NOT NULL,
    jira_url VARCHAR(255) NOT NULL,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Audit & Event Logs (Analytics Milestone)
CREATE TABLE activity_logs (
    log_id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,             -- 'INTAKE', 'CLASSIFIED', 'ESCALATED', 'RESOLVED'
    actor_type VARCHAR(30) NOT NULL,         -- 'AI_AGENT', 'USER', 'SYSTEM'
    details JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Universal Python Pydantic Schemas (`backend/app/schemas/ticket.py`)

Used by **Person 1 (AI)**, **Person 2 (FastAPI)**, and **Person 4 (DB)**:

```python
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- 1. AI Output Schema (Person 1 -> Person 2) ---
class ClassificationResult(BaseModel):
    category: str = Field(..., description="Standard category name")
    sub_category: str = Field(..., description="Specific issue e.g. Cisco AnyConnect, Outlook")
    severity: str = Field(..., description="Critical, High, Medium, or Low")
    priority: str = Field(..., description="P1, P2, P3, or P4")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Float between 0.0 and 1.0")
    reasoning: str = Field(..., description="Explanation for classification")
    suggested_team: str = Field(..., description="Department e.g. Network Ops, SecOps")

# --- 2. Ingestion Request Schema (Person 3 -> Person 2) ---
class TicketCreateRequest(BaseModel):
    title: str = Field(..., min_length=5, max_length=200, example="VPN Connection Failing on Corporate Network")
    description: str = Field(..., min_length=10, example="Unable to connect to VPN since this morning. Error: Connection timed out.")
    requester_email: EmailStr = Field(..., example="john.doe@company.com")
    department: str = Field(..., example="Engineering")
    source: Optional[str] = Field(default="WEB_PORTAL")

# --- 3. Full Ticket Response Schema (Backend -> React Frontend) ---
class TicketResponse(BaseModel):
    ticket_id: int
    ticket_code: str
    requester_email: str
    department: str
    title: str
    description: str
    
    # Classification details
    category: str
    sub_category: str
    severity: str
    priority: str
    confidence_score: float
    ai_reasoning: Optional[str] = None
    
    # Workflow
    status: str
    source: str
    assigned_team: str
    
    # Timestamps
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- 4. Ticket Status Update Schema ---
class TicketStatusUpdate(BaseModel):
    status: str = Field(..., example="RESOLVED")
```

---

## 5. Universal TypeScript Interfaces (`frontend/src/types/ticket.ts`)

Used by **Person 3 (Frontend)**:

```typescript
export type Category = 
  | "Network Connectivity" 
  | "VPN Access" 
  | "Software & Applications" 
  | "Hardware & Peripherals" 
  | "Identity & Access" 
  | "Security Incident";

export type Severity = "Critical" | "High" | "Medium" | "Low";
export type Priority = "P1" | "P2" | "P3" | "P4";
export type Status = "OPEN" | "TRIAGED" | "INVESTIGATING" | "RESOLVED" | "ESCALATED" | "CLOSED";

// Form Submission Body
export interface TicketCreatePayload {
  title: string;
  description: string;
  requester_email: string;
  department: string;
  source?: string;
}

// Full Ticket Object from Backend
export interface Ticket {
  ticket_id: number;
  ticket_code: string;
  requester_email: string;
  department: string;
  title: string;
  description: string;
  category: Category;
  sub_category: string;
  severity: Severity;
  priority: Priority;
  confidence_score: number;
  ai_reasoning?: string;
  status: Status;
  source: string;
  assigned_team: string;
  created_at: string;
  updated_at: string;
}

// Live Classification Preview Card
export interface ClassificationResult {
  category: Category;
  sub_category: string;
  severity: Severity;
  priority: Priority;
  confidence_score: number;
  reasoning: string;
  suggested_team: string;
}
```
