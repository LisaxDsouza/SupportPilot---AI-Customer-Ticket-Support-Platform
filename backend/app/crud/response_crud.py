from datetime import datetime, timezone
from typing import Any, List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ticket import ActivityLogModel, TicketModel, TicketResponseModel


def create_response(
    db: Session,
    ticket_id: int,
    solution_text: str,
    confidence_score: float,
    citations: List[dict[str, Any]],
    validation_status: str = "PENDING",
) -> TicketResponseModel:
    resp = TicketResponseModel(
        ticket_id=ticket_id,
        solution_text=solution_text,
        confidence_score=confidence_score,
        citations=citations,
        validation_status=validation_status,
    )
    db.add(resp)
    db.flush()
    db.add(
        ActivityLogModel(
            ticket_id=ticket_id,
            action="RESPONSE_GENERATED",
            actor_type="AI_AGENT",
            details={"response_id": resp.response_id, "confidence": confidence_score},
        )
    )
    db.commit()
    db.refresh(resp)
    return resp


def get_responses_by_ticket(db: Session, ticket_id: int) -> List[TicketResponseModel]:
    return list(
        db.scalars(
            select(TicketResponseModel)
            .where(TicketResponseModel.ticket_id == ticket_id)
            .order_by(TicketResponseModel.created_at.desc())
        )
    )


def get_response_by_id(db: Session, response_id: int) -> Optional[TicketResponseModel]:
    return db.get(TicketResponseModel, response_id)


def update_response_status(
    db: Session,
    response: TicketResponseModel,
    validation_status: str,
    edited_text: Optional[str] = None,
    mark_ticket_resolved: bool = True,
    resolved_by_email: Optional[str] = None,
) -> TicketResponseModel:
    response.validation_status = validation_status
    if edited_text:
        response.solution_text = edited_text

    ticket = db.get(TicketModel, response.ticket_id)
    if ticket and mark_ticket_resolved and validation_status == "APPROVED":
        ticket.status = "RESOLVED"
        ticket.resolved_at = datetime.now(timezone.utc)
        if resolved_by_email:
            ticket.resolved_by_email = resolved_by_email
        db.add(
            ActivityLogModel(
                ticket_id=ticket.ticket_id,
                action="RESOLVED",
                actor_type="USER",
                details={"approved_response_id": response.response_id, "resolved_by": resolved_by_email},
            )
        )

    db.commit()
    db.refresh(response)
    return response
