from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.crud import ticket_crud
from app.schemas.ticket import TicketAssignRequest, TicketCreateRequest, TicketResponse, TicketStatusUpdate
from app.services.ai_classifier import classify_ticket_content

router = APIRouter(prefix="/tickets")


@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(payload: TicketCreateRequest, db: Session = Depends(get_db)):
    classification = classify_ticket_content(payload.title, payload.description)
    return ticket_crud.create_ticket(db, payload, classification)


@router.get("", response_model=list[TicketResponse])
def list_tickets(
    requester_email: str | None = None,
    assigned_to_email: str | None = None,
    status_filter: str | None = None,
    db: Session = Depends(get_db),
):
    tickets = ticket_crud.list_tickets(db)
    if requester_email:
        tickets = [t for t in tickets if t.requester_email.lower() == requester_email.lower()]
    if assigned_to_email:
        tickets = [t for t in tickets if t.assigned_to_email and t.assigned_to_email.lower() == assigned_to_email.lower()]
    if status_filter:
        tickets = [t for t in tickets if t.status.upper() == status_filter.upper()]
    return tickets


@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = ticket_crud.get_ticket(db, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.patch("/{ticket_id}/status", response_model=TicketResponse)
def update_ticket_status(ticket_id: int, payload: TicketStatusUpdate, db: Session = Depends(get_db)):
    ticket = ticket_crud.get_ticket(db, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket_crud.update_ticket_status(db, ticket, payload.status, payload.resolved_by_email)


@router.patch("/{ticket_id}/assign", response_model=TicketResponse)
def assign_ticket(ticket_id: int, payload: TicketAssignRequest, db: Session = Depends(get_db)):
    ticket = ticket_crud.get_ticket(db, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket_crud.assign_ticket(db, ticket, str(payload.assigned_to_email))

