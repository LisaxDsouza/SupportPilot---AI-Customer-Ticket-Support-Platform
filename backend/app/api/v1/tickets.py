from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.crud import ticket_crud
from app.schemas.ticket import TicketCreateRequest, TicketResponse, TicketStatusUpdate
from app.services.ai_classifier import classify_ticket_content

router = APIRouter(prefix="/tickets")


@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(payload: TicketCreateRequest, db: Session = Depends(get_db)):
    classification = classify_ticket_content(payload.title, payload.description)
    return ticket_crud.create_ticket(db, payload, classification)


@router.get("", response_model=list[TicketResponse])
def list_tickets(db: Session = Depends(get_db)):
    return ticket_crud.list_tickets(db)


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
    return ticket_crud.update_ticket_status(db, ticket, payload.status)
