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
  assigned_to_email?: string | null;
  resolved_by_email?: string | null;
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

export interface CitationItem {
  article_id: number;
  title: string;
  category: string;
  similarity: number;
  snippet: string;
}

export interface TicketResponseDetail {
  response_id: number;
  ticket_id: number;
  solution_text: string;
  confidence_score: number;
  citations: CitationItem[];
  agent_trace?: Array<Record<string, unknown>>;
  validation_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
}

export interface ResponseApprovalPayload {
  validation_status: 'APPROVED' | 'REJECTED' | 'PENDING';
  edited_solution_text?: string;
  mark_ticket_resolved?: boolean;
  resolved_by_email?: string;
}

export interface ResolvedSolutionItem {
  ticket_id: number;
  ticket_code: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  resolved_at: string | null;
  resolved_by_email: string | null;
  solution_text: string;
  citations: CitationItem[];
  confidence_score: number;
}

