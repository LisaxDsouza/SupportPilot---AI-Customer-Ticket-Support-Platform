# SupportPilot — Today's Execution Order & Deliverables Guide
**Date:** October 13, 2026 (Day 1 Sprint)  
**Goal for Tonight:** End-to-end working pipeline: React UI $\to$ FastAPI $\to$ AI Classification $\to$ PostgreSQL Database.

---

## 1. Execution & Dependency Order

To prevent anyone from getting stuck waiting for another person, execute tasks in this exact order:

```mermaid
flowchart TD
    subgraph Step1["Step 1: Foundational Layers (Start Simultaneously)"]
        P4["Person 4: Docker & PostgreSQL DB\n(DB running on port 5432)"]
        P1["Person 1: AI Classifier Service\n(Prompt & JSON logic ready)"]
    end

    subgraph Step2["Step 2: API Gateway & Integration"]
        P2["Person 2: FastAPI Service\n(Hooks Person 4's DB + Person 1's AI)\nExposes localhost:8000"]
    end

    subgraph Step3["Step 3: Frontend Client Integration"]
        P3["Person 3: React UI Components\n(Calls Person 2's API from localhost:5173/3000)"]
    end

    subgraph Step4["Step 4: All-Hands Verification (Tonight at 9:00 PM)"]
        Demo["Full Team 2-Minute Smoke Test\nCommit to Git"]
    end

    P4 --> P2
    P1 --> P2
    P2 --> P3
    P3 --> Demo
```

---

## 2. Person 4 (Finish 1st): PostgreSQL Docker & Database Layer

> **Role:** You must finish first because Person 2 needs the database running to save tickets.

### Task 4.1: Create `docker-compose.yml`
* **File Location:** In the root directory: `./docker-compose.yml`
* **Content:**
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

### Task 4.2: Start PostgreSQL
Run from root:
```bash
docker compose up -d
```
Verify the container is healthy:
```bash
docker ps
```
*(You must see `supportpilot_postgres` running on `0.0.0.0:5432`)*.

---

### Task 4.3: Implement Database Connection
* **File Location:** `backend/app/core/database.py`
* **Content:**
```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:password123@localhost:5432/supportpilot_db"
)

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

---

### Task 4.4: Implement Ticket ORM Model
* **File Location:** `backend/app/models/ticket.py`
* **Content:**
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

---

### Task 4.5: Populate Sample Ticket Seed Script
* **File Location:** `backend/scripts/seed_db.py`
* **Content:**
```python
from app.core.database import engine, Base, SessionLocal
from app.models.ticket import TicketModel

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    if db.query(TicketModel).count() == 0:
        sample = TicketModel(
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
        db.add(sample)
        db.commit()
        print("Database seeded with ticket SP-1001!")
    else:
        print("Database already seeded.")
    db.close()

if __name__ == "__main__":
    seed()
```
Run the seed script:
```bash
python -m scripts.seed_db
```

> **Person 4 Definition of Done:**  
> Run `python -m scripts.seed_db`. It prints `"Database seeded with ticket SP-1001!"`.  
> Notify **Person 2** that the DB is ready!

---

## 3. Person 1 (Finish in Parallel with Person 4): AI Classifier Service

> **Role:** You write the AI brain. You can build and test this on your machine without needing the database or frontend.

### Task 1.1: Implement AI Classifier with Offline Fallback
* **File Location:** `backend/app/services/ai_classifier.py`
* **Content:**
```python
import os
import json
from app.schemas.ticket import ClassificationResult

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
    
    # Fallback mode (so team is NEVER blocked if API key is missing or quota runs out)
    if not api_key:
        lower_text = f"{title} {description}".lower()
        if "vpn" in lower_text:
            return ClassificationResult(
                category="VPN Access",
                sub_category="Connection Timeout",
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
                sub_category="General Software Issue",
                severity="Low",
                priority="P4",
                confidence_score=0.88,
                reasoning="Mock: General software inquiry.",
                suggested_team="Desktop Support"
            )

    # Production OpenAI call
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
    test_result = classify_ticket_content(
        title="Can't connect to VPN", 
        description="Cisco AnyConnect gives timeout error when working remotely."
    )
    print("Standalone AI Test Passed:")
    print(test_result.model_dump_json(indent=2))
```

### Task 1.2: Test Standalone Execution
Run:
```bash
python -m app.services.ai_classifier
```

> **Person 1 Definition of Done:**  
> The terminal prints the JSON result with Category, Severity, and Priority.  
> Notify **Person 2** that `classify_ticket_content` is ready to import!

---

## 4. Person 2 (Finish 2nd): FastAPI Backend & Ingestion API

> **Role:** You connect Person 4's DB and Person 1's AI function into working HTTP routes.

### Task 2.1: Create `backend/requirements.txt`
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
Install dependencies:
```bash
pip install -r backend/requirements.txt
```

---

### Task 2.2: Setup Pydantic Schemas
* **File Location:** `backend/app/schemas/ticket.py`
*(Copy from `SCHEMAS.md` Section 4: `ClassificationResult`, `TicketCreateRequest`, `TicketResponse`)*.

---

### Task 2.3: Implement FastAPI App with CORS
* **File Location:** `backend/app/main.py`
* **Content:**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.api.v1 import tickets, health

# Auto-create tables in Postgres on startup
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

---

### Task 2.4: Implement Ticket API Routes
* **File Location:** `backend/app/api/v1/tickets.py`
* **Content:**
```python
from fastapi import APIRouter, Depends
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
    # 1. Trigger Person 1's AI Classification
    ai_result = classify_ticket_content(payload.title, payload.description)
    
    # 2. Generate Ticket Code
    ticket_code = f"SP-{random.randint(1000, 9999)}"
    
    # 3. Save into Person 4's DB
    new_ticket = TicketModel(
        ticket_code=ticket_code,
        requester_email=payload.requester_email,
        department=payload.department,
        title=payload.title,
        description=payload.description,
        source=payload.source or "WEB_PORTAL",
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

* **File Location:** `backend/app/api/v1/health.py`
```python
from fastapi import APIRouter
router = APIRouter()

@router.get("/health")
def health():
    return {"status": "ok", "service": "SupportPilot API"}
```

### Task 2.5: Start and Verify Server
Run:
```bash
uvicorn app.main:app --reload --port 8000
```
Open in browser: `http://localhost:8000/docs`

> **Person 2 Definition of Done:**  
> Go to `http://localhost:8000/docs`, test `POST /api/v1/tickets` using the Swagger interface, and verify it returns HTTP 200 with AI fields.  
> Notify **Person 3** that the backend is live!

---

## 5. Person 3 (Finish 3rd): React Frontend & Integration

> **Role:** You connect the user interface to Person 2's backend.

### Task 3.1: Create TypeScript Types
* **File Location:** `frontend/src/types/ticket.ts`
*(Copy from `SCHEMAS.md` Section 5)*.

---

### Task 3.2: Create API Service
* **File Location:** `frontend/src/services/api.ts`
* **Content:**
```typescript
import axios from 'axios';
import { Ticket, TicketCreatePayload } from '../types/ticket';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export const fetchTickets = async (): Promise<Ticket[]> => {
  const res = await axios.get<Ticket[]>(`${API_BASE_URL}/tickets`);
  return res.data;
};

export const createTicket = async (payload: TicketCreatePayload): Promise<Ticket> => {
  const res = await axios.post<Ticket>(`${API_BASE_URL}/tickets`, payload);
  return res.data;
};
```

---

### Task 3.3: Build Ticket Submission Form
* **File Location:** `frontend/src/components/TicketForm.jsx`
* **Content:**
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
      alert("Submission failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '480px' }}>
      <h3>Submit New IT Ticket</h3>
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
        placeholder="Your Email" 
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
        {loading ? "AI is Analyzing..." : "Submit Ticket"}
      </button>
    </form>
  );
}
```

---

### Task 3.4: Build AI Result Card
* **File Location:** `frontend/src/components/ClassificationCard.jsx`
* **Content:**
```jsx
import React from 'react';

export default function ClassificationCard({ ticket }) {
  if (!ticket) return null;

  return (
    <div style={{ border: '1px solid #3b82f6', borderRadius: '8px', padding: '16px', marginTop: '16px', background: '#eff6ff' }}>
      <h4 style={{ margin: '0 0 8px 0', color: '#1e40af' }}>AI Classification Results ({ticket.ticket_code})</h4>
      <p><strong>Category:</strong> {ticket.category} ({ticket.sub_category})</p>
      <p><strong>Severity:</strong> <span style={{ color: ticket.severity === 'Critical' || ticket.severity === 'High' ? 'red' : 'green' }}>{ticket.severity}</span></p>
      <p><strong>Priority:</strong> {ticket.priority}</p>
      <p><strong>Confidence:</strong> {(ticket.confidence_score * 100).toFixed(0)}%</p>
      <p><strong>Assigned Team:</strong> {ticket.assigned_team}</p>
      {ticket.ai_reasoning && <p><em>Reasoning: {ticket.ai_reasoning}</em></p>}
    </div>
  );
}
```

---

### Task 3.5: Mount in `App.jsx`
Update `frontend/src/App.jsx`:
```jsx
import React, { useState } from 'react';
import TicketForm from './components/TicketForm';
import ClassificationCard from './components/ClassificationCard';

export default function App() {
  const [latestTicket, setLatestTicket] = useState(null);

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <h1>SupportPilot — IT Support Portal</h1>
      <TicketForm onTicketCreated={(ticket) => setLatestTicket(ticket)} />
      <ClassificationCard ticket={latestTicket} />
    </div>
  );
}
```

> **Person 3 Definition of Done:**  
> Run `npm run dev`, open the page, fill out the form, click submit, and watch the AI Classification card render with the result.

---

## 6. Tonight's All-Hands Smoke Test (9:00 PM)

Before signing off today, the 4 of you do this live check together:
1. Person 4 confirms PostgreSQL Docker is running (`docker ps`).
2. Person 2 starts FastAPI (`uvicorn app.main:app --reload`).
3. Person 3 opens React in the browser (`http://localhost:5173`).
4. Type:
   - **Title:** `Cannot access corporate email`
   - **Description:** `Outlook keeps prompting for password repeatedly.`
5. Click **Submit Ticket**.
6. **Pass Criteria:**
   - Loading indicator triggers.
   - Result card displays `Identity & Access` or `Software & Applications` with confidence score.
   - Record is stored inside PostgreSQL.
7. Commit all code to Git:
   ```bash
   git add .
   git commit -m "feat: complete Day 1 foundation - end-to-end ticket triage pipeline"
   ```
