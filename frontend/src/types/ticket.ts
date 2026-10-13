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
