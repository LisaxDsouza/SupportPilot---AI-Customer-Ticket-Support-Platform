"""Safe scaffold classifier. TODO(Person 1): replace with validated model integration."""
from app.schemas.ai import ClassificationResult


def classify_ticket_content(title: str, description: str) -> ClassificationResult:
    """Return non-speculative defaults until the AI milestone is implemented."""
    del title, description
    return ClassificationResult(category="Unassigned", sub_category="General", severity="Medium", priority="P3", confidence_score=0.0, reasoning="AI classification is not configured in this scaffold.", suggested_team="IT_SERVICE_DESK")
