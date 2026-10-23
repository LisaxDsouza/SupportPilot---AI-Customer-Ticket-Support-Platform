from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.crud import response_crud, ticket_crud
from app.models.ticket import TicketModel, TicketResponseModel
from app.schemas.resolution import ResponseApprovalRequest, TicketResponseDetail
from app.services.ai_response_generator import generate_ticket_response
from app.services.rag_engine import retrieve_context

router = APIRouter(prefix="/tickets")


@router.post("/{ticket_id}/generate-resolution", response_model=TicketResponseDetail, status_code=status.HTTP_201_CREATED)
def generate_resolution_for_ticket(ticket_id: int, db: Session = Depends(get_db)):
    """Orchestrates RAG retrieval + AI Response Generator to produce a draft solution."""
    ticket = ticket_crud.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # 1. Retrieve Knowledge Citations using RAG
    citations = retrieve_context(
        query=f"{ticket.title} {ticket.description}",
        category=ticket.category,
        top_k=3,
    )

    # 2. Generate grounded response proposal
    result = generate_ticket_response(
        title=ticket.title,
        description=ticket.description,
        category=ticket.category,
        citations=citations,
    )

    # 3. Save draft in database
    created = response_crud.create_response(
        db=db,
        ticket_id=ticket.ticket_id,
        solution_text=result["solution_text"],
        confidence_score=result["confidence_score"],
        citations=citations,
        validation_status="PENDING",
    )
    return created


@router.get("/{ticket_id}/responses", response_model=List[TicketResponseDetail])
def list_ticket_responses(ticket_id: int, db: Session = Depends(get_db)):
    """List all AI proposed and approved solutions for a ticket."""
    return response_crud.get_responses_by_ticket(db, ticket_id)


@router.post("/{ticket_id}/responses/{response_id}/approve", response_model=TicketResponseDetail)
def approve_ticket_response(
    ticket_id: int,
    response_id: int,
    payload: ResponseApprovalRequest,
    db: Session = Depends(get_db),
):
    """Human-in-the-loop review: Approve or edit draft resolution."""
    resp = response_crud.get_response_by_id(db, response_id)
    if not resp or resp.ticket_id != ticket_id:
        raise HTTPException(status_code=404, detail="Response not found for this ticket")

    updated = response_crud.update_response_status(
        db=db,
        response=resp,
        validation_status=payload.validation_status,
        edited_text=payload.edited_solution_text,
        mark_ticket_resolved=payload.mark_ticket_resolved,
        resolved_by_email=payload.resolved_by_email,
    )
    return updated


@router.get("/employee/resolved-solutions")
def get_resolved_solutions_for_employee(requester_email: str, db: Session = Depends(get_db)):
    """Fetch tickets for an employee that have received resolutions from IT."""
    tickets = db.scalars(
        select(TicketModel)
        .where(TicketModel.requester_email == requester_email.lower())
        .where(TicketModel.status.in_(["RESOLVED", "CLOSED"]))
        .order_by(TicketModel.resolved_at.desc(), TicketModel.updated_at.desc())
    ).all()

    items = []
    for t in tickets:
        responses = response_crud.get_responses_by_ticket(db, t.ticket_id)
        approved_response = next((r for r in responses if r.validation_status == "APPROVED"), None) or (responses[0] if responses else None)
        items.append({
            "ticket_id": t.ticket_id,
            "ticket_code": t.ticket_code,
            "title": t.title,
            "category": t.category,
            "priority": t.priority,
            "status": t.status,
            "resolved_at": t.resolved_at.isoformat() if t.resolved_at else None,
            "resolved_by_email": t.resolved_by_email,
            "solution_text": approved_response.solution_text if approved_response else "Issue resolved by IT Engineer.",
            "citations": approved_response.citations if approved_response else [],
            "confidence_score": approved_response.confidence_score if approved_response else 1.0,
        })
    return items
