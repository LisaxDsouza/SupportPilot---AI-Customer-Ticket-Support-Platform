-- SupportPilot Database Initialization Script
-- Conforms to SCHEMAS.md System Architecture & Universal Schemas

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    department VARCHAR(50) NOT NULL,
    role VARCHAR(30) DEFAULT 'EMPLOYEE' CHECK (role IN ('EMPLOYEE', 'SUPPORT_ENGINEER', 'ADMIN')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Master Tickets Table
CREATE TABLE IF NOT EXISTS tickets (
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
    
    -- Extensible JSON metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);

-- 3. AI Generated Solutions (RAG Milestone)
CREATE TABLE IF NOT EXISTS ticket_responses (
    response_id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    solution_text TEXT NOT NULL,
    confidence_score FLOAT NOT NULL,
    citations JSONB DEFAULT '[]'::jsonb,
    agent_trace JSONB DEFAULT '[]'::jsonb,
    validation_status VARCHAR(30) DEFAULT 'PENDING' CHECK (validation_status IN ('PENDING', 'AUTO_APPROVED', 'REJECTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Knowledge Base for Vector Search (RAG Milestone)
CREATE TABLE IF NOT EXISTS knowledge_base (
    article_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    vector_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Human Escalations (HITL Milestone)
CREATE TABLE IF NOT EXISTS escalations (
    escalation_id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    target_team VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    trigger_type VARCHAR(30) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. External Jira Linkage (Integrations Milestone)
CREATE TABLE IF NOT EXISTS jira_tickets (
    jira_link_id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    jira_key VARCHAR(50) NOT NULL UNIQUE,
    jira_status VARCHAR(50) NOT NULL,
    jira_url VARCHAR(255) NOT NULL,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Audit & Event Logs (Analytics Milestone)
CREATE TABLE IF NOT EXISTS activity_logs (
    log_id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    actor_type VARCHAR(30) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial System Users
INSERT INTO users (email, full_name, department, role)
VALUES 
    ('admin@company.com', 'System Admin', 'IT Infrastructure', 'ADMIN'),
    ('engineer@company.com', 'Senior Support Engineer', 'Network Ops', 'SUPPORT_ENGINEER'),
    ('alex.smith@company.com', 'Alex Smith', 'Finance', 'EMPLOYEE'),
    ('priya.shah@company.com', 'Priya Shah', 'Engineering', 'EMPLOYEE')
ON CONFLICT (email) DO NOTHING;

-- Seed Sample Tickets from data/sample_tickets.json
INSERT INTO tickets (ticket_code, requester_email, department, title, description, category, sub_category, severity, priority, confidence_score, ai_reasoning, status, source, assigned_team)
VALUES
    ('SP-1001', 'alex.smith@company.com', 'Finance', 'Office network keeps dropping', 'Finance workstations lose wired network connectivity every hour.', 'Network Connectivity', 'Wired Connection', 'High', 'P2', 0.90, 'Seed fixture.', 'OPEN', 'WEB_PORTAL', 'Network Ops'),
    ('SP-1002', 'priya.shah@company.com', 'Engineering', 'VPN times out from home', 'Corporate VPN connection times out before authentication completes.', 'VPN Access', 'Connection Timeout', 'High', 'P1', 0.94, 'Seed fixture.', 'TRIAGED', 'EMAIL', 'Network Ops'),
    ('SP-1003', 'maria.chen@company.com', 'HR', 'Outlook calendar will not sync', 'Outlook desktop calendar does not show meetings created on the web.', 'Software & Applications', 'Outlook', 'Medium', 'P3', 0.88, 'Seed fixture.', 'INVESTIGATING', 'API', 'Desktop Support'),
    ('SP-1004', 'jon.brown@company.com', 'Sales', 'Laptop camera is not detected', 'The integrated camera is missing in video meeting applications.', 'Hardware & Peripherals', 'Laptop Camera', 'Low', 'P4', 0.85, 'Seed fixture.', 'RESOLVED', 'SLACK_BOT', 'Desktop Support'),
    ('SP-1005', 'ravi.kumar@company.com', 'Operations', 'Need password reset', 'User is locked out after password expiry and cannot access the portal.', 'Identity & Access', 'Password Reset', 'Medium', 'P3', 0.95, 'Seed fixture.', 'ESCALATED', 'WEB_PORTAL', 'Identity Team'),
    ('SP-1006', 'sara.lee@company.com', 'Legal', 'Possible phishing message received', 'A suspicious email asked the user to disclose company credentials.', 'Security Incident', 'Phishing', 'Critical', 'P1', 0.98, 'Seed fixture.', 'CLOSED', 'EMAIL', 'SecOps'),
    ('SP-1007', 'david.wilson@company.com', 'Marketing', 'Wi-Fi is very slow', 'Wireless connectivity is intermittent across the marketing floor.', 'Network Connectivity', 'Wi-Fi Performance', 'Medium', 'P2', 0.82, 'Seed fixture.', 'OPEN', 'API', 'Network Ops'),
    ('SP-1008', 'nina.patel@company.com', 'Sales', 'VPN client update fails', 'The VPN client installer ends with an unknown installation error.', 'VPN Access', 'Client Installation', 'Low', 'P4', 0.86, 'Seed fixture.', 'TRIAGED', 'SLACK_BOT', 'Network Ops'),
    ('SP-1009', 'omar.ali@company.com', 'Engineering', 'IDE licence cannot be activated', 'The development IDE rejects the assigned company licence key.', 'Software & Applications', 'Licence Activation', 'High', 'P2', 0.89, 'Seed fixture.', 'INVESTIGATING', 'WEB_PORTAL', 'Desktop Support'),
    ('SP-1010', 'elena.garcia@company.com', 'Finance', 'Printer produces blank pages', 'The finance printer accepts jobs but produces blank paper only.', 'Hardware & Peripherals', 'Printer', 'Medium', 'P3', 0.84, 'Seed fixture.', 'RESOLVED', 'EMAIL', 'Desktop Support'),
    ('SP-1011', 'tom.wright@company.com', 'HR', 'New starter lacks application access', 'New employee cannot sign in to the benefits application.', 'Identity & Access', 'Application Access', 'Low', 'P4', 0.87, 'Seed fixture.', 'ESCALATED', 'API', 'Identity Team'),
    ('SP-1012', 'fatima.noor@company.com', 'Operations', 'Endpoint may be infected', 'Endpoint protection reports malware activity and isolates a device.', 'Security Incident', 'Malware Alert', 'Critical', 'P1', 0.99, 'Seed fixture.', 'CLOSED', 'SLACK_BOT', 'SecOps')
ON CONFLICT (ticket_code) DO NOTHING;

-- Log Activity for Seeded Tickets
INSERT INTO activity_logs (ticket_id, action, actor_type, details)
SELECT ticket_id, 'INTAKE', 'SYSTEM', '{"seed": true}'::jsonb
FROM tickets
ON CONFLICT DO NOTHING;
