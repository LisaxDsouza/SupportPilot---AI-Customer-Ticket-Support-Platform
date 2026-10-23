from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

CATEGORY_VALUES = ("Network Connectivity", "VPN Access", "Software & Applications", "Hardware & Peripherals", "Identity & Access", "Security Incident")
SEVERITY_VALUES = ("Critical", "High", "Medium", "Low")
PRIORITY_VALUES = ("P1", "P2", "P3", "P4")
STATUS_VALUES = ("OPEN", "TRIAGED", "INVESTIGATING", "RESOLVED", "ESCALATED", "CLOSED")
SOURCE_VALUES = ("WEB_PORTAL", "EMAIL", "API", "SLACK_BOT")

Source = Literal["WEB_PORTAL", "EMAIL", "API", "SLACK_BOT"]
Status = Literal["OPEN", "TRIAGED", "INVESTIGATING", "RESOLVED", "ESCALATED", "CLOSED"]


class TicketCreateRequest(BaseModel):
    title: Annotated[str, Field(min_length=5, max_length=200, examples=["VPN Connection Failing on Corporate Network"])]
    description: Annotated[str, Field(min_length=10, examples=["Unable to connect to VPN since this morning. Error: Connection timed out."])]
    requester_email: EmailStr
    department: str
    source: Source = "WEB_PORTAL"


class TicketResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ticket_id: int
    ticket_code: str
    requester_email: str
    department: str
    title: str
    description: str
    category: str
    sub_category: str
    severity: str
    priority: str
    confidence_score: float
    ai_reasoning: str | None = None
    status: str
    source: str
    assigned_team: str
    assigned_to_email: str | None = None
    resolved_by_email: str | None = None
    created_at: datetime
    updated_at: datetime


class TicketStatusUpdate(BaseModel):
    status: Status
    resolved_by_email: EmailStr | None = None


class TicketAssignRequest(BaseModel):
    assigned_to_email: EmailStr
