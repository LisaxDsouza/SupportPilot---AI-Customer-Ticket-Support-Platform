from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, Field


class CitationItem(BaseModel):
    article_id: int
    title: str
    category: str
    similarity: float
    snippet: str


class ResponseGenerationRequest(BaseModel):
    custom_instructions: Optional[str] = None


class ResponseApprovalRequest(BaseModel):
    validation_status: str = Field("APPROVED", description="APPROVED, REJECTED, or PENDING")
    edited_solution_text: Optional[str] = None
    mark_ticket_resolved: bool = True
    resolved_by_email: Optional[str] = None


class TicketResponseDetail(BaseModel):
    response_id: int
    ticket_id: int
    solution_text: str
    confidence_score: float
    citations: List[dict[str, Any]] = Field(default_factory=list)
    agent_trace: List[dict[str, Any]] = Field(default_factory=list)
    validation_status: str
    created_at: datetime

    model_config = {"from_attributes": True}
