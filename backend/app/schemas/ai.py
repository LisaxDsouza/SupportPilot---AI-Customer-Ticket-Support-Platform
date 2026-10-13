from pydantic import BaseModel, Field


class ClassificationResult(BaseModel):
    category: str = Field(..., description="Standard category name")
    sub_category: str = Field(..., description="Specific issue e.g. Cisco AnyConnect, Outlook")
    severity: str = Field(..., description="Critical, High, Medium, or Low")
    priority: str = Field(..., description="P1, P2, P3, or P4")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Float between 0.0 and 1.0")
    reasoning: str = Field(..., description="Explanation for classification")
    suggested_team: str = Field(..., description="Department e.g. Network Ops, SecOps")
