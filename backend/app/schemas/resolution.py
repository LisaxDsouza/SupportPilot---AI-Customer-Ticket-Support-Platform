"""Interface-only contracts for the future RAG and resolution milestones."""
from pydantic import BaseModel


class ResolutionSuggestion(BaseModel):
    solution_text: str
    confidence_score: float


class RetrievalService:
    """Future interface; no RAG implementation is included in this scaffold."""

    def retrieve(self, query: str) -> list[dict]:
        raise NotImplementedError("TODO: Person 1 implements retrieval in the RAG milestone.")
