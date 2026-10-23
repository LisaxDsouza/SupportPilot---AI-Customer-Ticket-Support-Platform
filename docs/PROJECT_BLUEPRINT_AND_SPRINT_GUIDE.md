# SupportPilot — Project Blueprint & Sprint Execution Guide
**Project:** AI-Powered Customer Support Platform with Ticket Resolution Agent  
**Lifecycle:** 2-Month Architecture Roadmap & Daily Execution Handbook  
**Date of Issue:** October 13, 2026

---

## 1. Directory Structure & Project Scaffold

The project is structured as a clean monorepo separating the FastAPI backend, React frontend, Docker services, and shared data assets. Everyone must adhere to this exact directory layout to avoid file collision and broken imports.

```text
Infosys - Customer Support/
├── docker-compose.yml                <-- Docker configuration for PostgreSQL
├── .env.example                      <-- Template for environment variables
├── .gitignore                        <-- Git ignore rules
├── PROJECT_BLUEPRINT_AND_SPRINT_GUIDE.md
│
├── backend/
│   ├── requirements.txt              <-- Python dependencies
│   ├── .env                          <-- Local backend secrets (DB URL, OpenAI/Gemini Key)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   <-- FastAPI entrypoint & CORS config
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py             <-- Environment settings (pydantic-settings)
│   │   │   └── database.py          <-- SQLAlchemy engine & session factory
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── ticket.py             <-- SQLAlchemy ORM models (Postgres tables)
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── ticket.py             <-- Pydantic request/response schemas
│   │   │   ├── ai.py                 <-- Pydantic AI classification output schema
│   │   │   └── resolution.py         <-- Pydantic RAG & multi-agent schemas (future)
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── health.py         <-- GET /api/v1/health
│   │   │       └── tickets.py        <-- POST /tickets, GET /tickets, GET /tickets/{id}
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── ai_classifier.py      <-- LLM classification & prompt logic
│   │   │   └── rag_engine.py         <-- (Week 3) ChromaDB retrieval service
│   │   └── crud/
│   │       ├── __init__.py
│   │       └── ticket_crud.py        <-- Database queries (create, list, get_by_id)
│   └── scripts/
│       ├── __init__.py
│       └── seed_db.py                <-- Populates DB with 5 sample tickets
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

## 2. Universal, Future-Proof Schemas (2-Month Ready)

To prevent breaking changes as the system expands from Week 1 (Classification) to Week 3 (RAG), Week 5 (Multi-Agent & Jira), and Week 7 (Analytics), the schema uses standardized enums and extensible metadata fields.

### 2.1 Standardized Controlled Enums
Every team member must strictly use these exact string literals:

* **Category:**
  * `Network Connectivity`
  * `VPN Access`
  * `Software & Applications`
  * `Hardware & Peripherals`
  * `Identity & Access`
  * `Security Incident`
* **Severity:**
  * `Critical` (Complete business stoppage, widespread outage)
  * `High` (Core system blocked for key user/team)
  * `Medium` (Impaired functionality, workaround available)
  * `Low` (Minor issue, questions, cosmetic)
* **Priority:**
  * `P1` (SLA: < 2 hours)
  * `P2` (SLA: < 8 hours)
  * `P3` (SLA: < 24 hours)
  * `P4` (SLA: < 72 hours)
* **Status:**
  * `OPEN` $\to$ `TRIAGED` $\to$ `INVESTIGATING` $\to$ `RESOLVED` $\to$ `ESCALATED` $\to$ `CLOSED`

---

### 2.2 PostgreSQL Database DDL
This schema supports the entire 2-month lifecycle, including future vector IDs, Jira keys, and audit logs.

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
    ticket_code VARCHAR(20) NOT NULL UNIQUE, -- e.g. "SP-1001"
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
    agent_trace JSONB DEFAULT '[]'::jsonb,    -- Step-by-step multi-agent reasoning trace
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

### 2.3 Universal Python Pydantic Schemas (`backend/app/schemas/ticket.py`)

```python
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- 1. AI Output Schema (Person 1 -> Person 2) ---
class ClassificationResult(BaseModel):
    category: str = Field(..., description="Standard category from CATEGORY_ENUM")
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

# --- 3. Full Ticket Response Schema (Person 2 & 4 -> Person 3) ---
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

### 2.4 Universal TypeScript Interfaces (`frontend/src/types/ticket.ts`)

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

---

## 3. Today's Step-by-Step Deliverable Guide (October 13, 2026)

---

### Person 4: Database & Docker Lead
**Today's Objective:** Stand up the PostgreSQL Docker container, configure database connection pooling, and verify table creation.

#### Step 1: Create `docker-compose.yml` in Root
Create `docker-compose.yml` directly in the project root:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: supportpilot_postgres
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password123
      POSTGRES_DB: supportpilot_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

#### Step 2: Start PostgreSQL
Run this command from the root directory:
```bash
docker compose up -d
```
Verify it is running:
```bash
docker ps
```
*(You should see `supportpilot_postgres` running on port 5432).*

#### Step 3: Implement Database Connection (`backend/app/core/database.py`)
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password123@localhost:5432/supportpilot_db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

#### Step 4: Implement Ticket ORM Model (`backend/app/models/ticket.py`)
```python
from sqlalchemy import Column, Integer, String, Text, Float, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class TicketModel(Base):
    __tablename__ = "tickets"

    ticket_id = Column(Integer, primary_key=True, index=True)
    ticket_code = Column(String(20), unique=True, index=True, nullable=False)
    requester_email = Column(String(150), nullable=False)
    department = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    
    category = Column(String(50), default="Unassigned")
    sub_category = Column(String(50), default="General")
    severity = Column(String(20), default="Medium")
    priority = Column(String(10), default="P3")
    confidence_score = Column(Float, default=0.0)
    ai_reasoning = Column(Text, nullable=True)
    
    status = Column(String(30), default="OPEN")
    source = Column(String(20), default="WEB_PORTAL")
    assigned_team = Column(String(50), default="IT_SERVICE_DESK")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

#### Step 5: Write the Database Seed Script (`backend/scripts/seed_db.py`)
```python
from app.core.database import engine, Base, SessionLocal
from app.models.ticket import TicketModel

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    if db.query(TicketModel).count() == 0:
        sample_ticket = TicketModel(
            ticket_code="SP-1001",
            requester_email="alex.smith@company.com",
            department="Finance",
            title="Unable to connect to VPN from home",
            description="Cisco AnyConnect gives error 403 authorization failed.",
            category="VPN Access",
            sub_category="Connection Timeout",
            severity="High",
            priority="P1",
            confidence_score=0.94,
            ai_reasoning="User blocked from financial corporate network.",
            status="OPEN",
            assigned_team="Network Ops"
        )
        db.add(sample_ticket)
        db.commit()
        print("Database seeded with sample ticket SP-1001!")
    else:
        print("Tickets table already has data.")
    db.close()

if __name__ == "__main__":
    seed()
```
Run the seed script:
```bash
python -m scripts.seed_db
```
**Person 4's Today Done Criteria:** Database container is healthy and contains `SP-1001`.

---

### Person 2: Backend & Ingestion API Lead
**Today's Objective:** Set up FastAPI with CORS, link Person 4's database, and create the Ticket Ingestion endpoint.

#### Step 1: Create `backend/requirements.txt`
```text
fastapi>=0.100.0
uvicorn>=0.22.0
sqlalchemy>=2.0.0
psycopg2-binary>=2.9.6
pydantic>=2.0.0
pydantic-settings>=2.0.0
python-dotenv>=1.0.0
openai>=1.0.0
httpx>=0.24.0
```
Install them:
```bash
pip install -r backend/requirements.txt
```

#### Step 2: Implement FastAPI App (`backend/app/main.py`)
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.api.v1 import tickets, health

# Create tables if not existing
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SupportPilot API", version="1.0.0")

# Enable CORS for React Frontend (Vite uses 5173, CRA uses 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1", tags=["Health"])
app.include_router(tickets.router, prefix="/api/v1", tags=["Tickets"])
```

#### Step 3: Implement Ingestion Route (`backend/app/api/v1/tickets.py`)
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import random

from app.core.database import get_db
from app.models.ticket import TicketModel
from app.schemas.ticket import TicketCreateRequest, TicketResponse
from app.services.ai_classifier import classify_ticket_content

router = APIRouter()

@router.post("/tickets", response_model=TicketResponse)
def create_ticket(payload: TicketCreateRequest, db: Session = Depends(get_db)):
    # 1. Run AI Classification (Person 1's service)
    ai_result = classify_ticket_content(payload.title, payload.description)
    
    # 2. Generate unique code (e.g. SP-4921)
    ticket_code = f"SP-{random.randint(1000, 9999)}"
    
    # 3. Store into DB
    new_ticket = TicketModel(
        ticket_code=ticket_code,
        requester_email=payload.requester_email,
        department=payload.department,
        title=payload.title,
        description=payload.description,
        source=payload.source or "WEB_PORTAL",
        
        # Injected AI results
        category=ai_result.category,
        sub_category=ai_result.sub_category,
        severity=ai_result.severity,
        priority=ai_result.priority,
        confidence_score=ai_result.confidence_score,
        ai_reasoning=ai_result.reasoning,
        assigned_team=ai_result.suggested_team,
        status="TRIAGED"
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)
    return new_ticket

@router.get("/tickets", response_model=List[TicketResponse])
def list_tickets(db: Session = Depends(get_db)):
    return db.query(TicketModel).order_by(TicketModel.created_at.desc()).all()
```

#### Step 4: Implement Health Route (`backend/app/api/v1/health.py`)
```python
from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
def health_check():
    return {"status": "ok", "service": "SupportPilot Backend", "timestamp": "2026-10-13"}
```

#### Step 5: Test and Verify
Run the server:
```bash
uvicorn app.main:app --reload --port 8000
```
Open your browser at `http://localhost:8000/docs`. You will see the interactive Swagger UI.

**Person 2's Today Done Criteria:** `POST /api/v1/tickets` and `GET /api/v1/tickets` show up in Swagger and return 200 OK.

---

### Person 1: AI & Prompt Engineer
**Today's Objective:** Build `ai_classifier.py` with structured JSON output and a resilient fallback mode.

#### Step 1: Create `backend/app/services/ai_classifier.py`
```python
import os
import json
from app.schemas.ticket import ClassificationResult

# System prompt forcing structured IT triage
SYSTEM_PROMPT = """
You are an expert IT Support Triage Agent for SupportPilot.
Analyze the user's IT issue and output a strictly valid JSON object.

Allowed categories:
- Network Connectivity
- VPN Access
- Software & Applications
- Hardware & Peripherals
- Identity & Access
- Security Incident

Allowed severities: Critical, High, Medium, Low
Allowed priorities: P1, P2, P3, P4

Format output strictly as:
{
  "category": "<category>",
  "sub_category": "<sub_category>",
  "severity": "<Critical|High|Medium|Low>",
  "priority": "<P1|P2|P3|P4>",
  "confidence_score": <float between 0.0 and 1.0>,
  "reasoning": "<1 sentence explanation>",
  "suggested_team": "<Network Ops | Desktop Support | Identity Team | SecOps>"
}
"""

def classify_ticket_content(title: str, description: str) -> ClassificationResult:
    api_key = os.getenv("OPENAI_API_KEY")
    
    # 1. Fallback / Mock Mode if no API key is provided
    if not api_key:
        lower_text = f"{title} {description}".lower()
        if "vpn" in lower_text:
            return ClassificationResult(
                category="VPN Access",
                sub_category="Connection Failure",
                severity="High",
                priority="P1",
                confidence_score=0.92,
                reasoning="Mock: Detected VPN keyword affecting remote connectivity.",
                suggested_team="Network Ops"
            )
        elif "password" in lower_text or "login" in lower_text:
            return ClassificationResult(
                category="Identity & Access",
                sub_category="Password Reset",
                severity="Medium",
                priority="P3",
                confidence_score=0.96,
                reasoning="Mock: User requested credentials/login support.",
                suggested_team="Identity Team"
            )
        else:
            return ClassificationResult(
                category="Software & Applications",
                sub_category="General Inconvenience",
                severity="Low",
                priority="P4",
                confidence_score=0.85,
                reasoning="Mock: General inquiry or software error.",
                suggested_team="Desktop Support"
            )

    # 2. Production LLM Call (OpenAI / Gemini)
    from openai import OpenAI
    client = OpenAI(api_key=api_key)
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Title: {title}\nDescription: {description}"}
        ],
        temperature=0.1
    )
    
    parsed_json = json.loads(response.choices[0].message.content)
    return ClassificationResult(**parsed_json)

# Standalone verification test
if __name__ == "__main__":
    result = classify_ticket_content("Can't connect to VPN", "Cisco AnyConnect gives timeout error.")
    print("AI Classification Result:")
    print(result.model_dump_json(indent=2))
```

#### Step 2: Test the Module
Run standalone:
```bash
python -m app.services.ai_classifier
```
**Person 1's Today Done Criteria:** Returns a validated `ClassificationResult` object both with an API key and in offline fallback mode.

---

### Person 3: Frontend React Engineer
**Today's Objective:** Set up the TypeScript interfaces, API service helper, and the Ticket Submission Form component.

#### Step 1: Create `frontend/src/types/ticket.ts`
Copy the TypeScript definitions from Section 2.4 into this file.

#### Step 2: Create API Client Helper (`frontend/src/services/api.ts`)
```typescript
import axios from 'axios';
import { Ticket, TicketCreatePayload } from '../types/ticket';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export const fetchTickets = async (): Promise<Ticket[]> => {
  const response = await axios.get<Ticket[]>(`${API_BASE_URL}/tickets`);
  return response.data;
};

export const createTicket = async (payload: TicketCreatePayload): Promise<Ticket> => {
  const response = await axios.post<Ticket>(`${API_BASE_URL}/tickets`, payload);
  return response.data;
};
```

#### Step 3: Implement Submission Form Component (`frontend/src/components/TicketForm.jsx`)
```jsx
import React, { useState } from 'react';
import { createTicket } from '../services/api';

export default function TicketForm({ onTicketCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newTicket = await createTicket({
        title,
        description,
        requester_email: email,
        department,
      });
      onTicketCreated(newTicket);
      setTitle('');
      setDescription('');
    } catch (err) {
      alert("Error submitting ticket: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '500px' }}>
      <h3>Submit New Support Ticket</h3>
      <input 
        type="text" 
        placeholder="Ticket Title (e.g. VPN timeout)" 
        value={title} 
        onChange={(e) => setTitle(e.target.value)} 
        required 
      />
      <textarea 
        placeholder="Describe the issue..." 
        value={description} 
        onChange={(e) => setDescription(e.target.value)} 
        rows={4} 
        required 
      />
      <input 
        type="email" 
        placeholder="Your work email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
        required 
      />
      <select value={department} onChange={(e) => setDepartment(e.target.value)}>
        <option value="Engineering">Engineering</option>
        <option value="Finance">Finance</option>
        <option value="HR">HR</option>
        <option value="Sales">Sales</option>
      </select>
      <button type="submit" disabled={loading}>
        {loading ? "Analyzing with AI..." : "Submit Ticket"}
      </button>
    </form>
  );
}
```

#### Step 4: Verify in React
Mount `TicketForm` inside `App.jsx`, start your dev server (`npm run dev`), and verify form rendering.

**Person 3's Today Done Criteria:** The form renders, captures user input, and is wired to call `createTicket()`.

---

## 4. End-of-Day 1 Integration Check (Tonight at 9:00 PM)

Run this 2-minute smoke test together:
1. Person 4 confirms Docker PostgreSQL is running on `localhost:5432`.
2. Person 2 starts FastAPI (`uvicorn app.main:app --reload`).
3. Person 3 fills out the React form and clicks **Submit Ticket**.
4. The ticket appears in PostgreSQL and the returned JSON contains AI-generated `category`, `severity`, and `priority`.
5. Everyone commits their code to Git on branch `feature/day-1-foundation`.
