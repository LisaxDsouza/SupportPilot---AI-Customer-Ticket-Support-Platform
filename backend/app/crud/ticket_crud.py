from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ticket import ActivityLogModel, TicketModel
from app.schemas.ai import ClassificationResult
from app.schemas.ticket import TicketCreateRequest


def create_ticket(db: Session, payload: TicketCreateRequest, classification: ClassificationResult) -> TicketModel:
    # Let the database allocate its SERIAL/identity primary key first. Unlike
    # max(ticket_id) + 1, this remains safe under concurrent ticket creation.
    # The temporary value satisfies the non-null, unique ticket_code constraint
    # only until the database-generated ticket_id is available in this transaction.
    ticket = TicketModel(
        ticket_code=f"TMP-{uuid4().hex[:16]}", requester_email=str(payload.requester_email),
        department=payload.department, title=payload.title, description=payload.description,
        source=payload.source, category=classification.category, sub_category=classification.sub_category,
        severity=classification.severity, priority=classification.priority,
        confidence_score=classification.confidence_score, ai_reasoning=classification.reasoning,
        assigned_team=classification.suggested_team, status="TRIAGED",
    )
    db.add(ticket)
    db.flush()
    ticket.ticket_code = f"SP-{1000 + ticket.ticket_id}"
    db.flush()
    db.add(ActivityLogModel(ticket_id=ticket.ticket_id, action="INTAKE", actor_type="SYSTEM", details={"source": payload.source}))
    db.commit()
    db.refresh(ticket)
    return ticket


def list_tickets(db: Session) -> list[TicketModel]:
    return list(db.scalars(select(TicketModel).order_by(TicketModel.created_at.desc(), TicketModel.ticket_id.desc())))


def get_ticket(db: Session, ticket_id: int) -> TicketModel | None:
    return db.get(TicketModel, ticket_id)


def update_ticket_status(db: Session, ticket: TicketModel, status: str, resolved_by_email: str | None = None) -> TicketModel:
    ticket.status = status
    if status == "RESOLVED":
        ticket.resolved_at = datetime.now(timezone.utc)
        if resolved_by_email:
            ticket.resolved_by_email = resolved_by_email
    db.add(ActivityLogModel(ticket_id=ticket.ticket_id, action=status, actor_type="USER" if resolved_by_email else "SYSTEM", details={"status": status, "resolved_by": resolved_by_email}))
    db.commit()
    db.refresh(ticket)
    return ticket


def assign_ticket(db: Session, ticket: TicketModel, assigned_to_email: str) -> TicketModel:
    ticket.assigned_to_email = assigned_to_email
    db.add(ActivityLogModel(ticket_id=ticket.ticket_id, action="ASSIGNED", actor_type="ADMIN", details={"assigned_to": assigned_to_email}))
    db.commit()
    db.refresh(ticket)
    return ticket

