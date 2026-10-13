from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.core.database import Base

JsonType = JSONB().with_variant(JSON(), "sqlite")


class UserModel(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("role IN ('EMPLOYEE', 'SUPPORT_ENGINEER', 'ADMIN')", name="ck_users_role"),)
    user_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    department: Mapped[str] = mapped_column(String(50), nullable=False)
    role: Mapped[str] = mapped_column(String(30), default="EMPLOYEE", server_default="EMPLOYEE")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TicketModel(Base):
    __tablename__ = "tickets"
    __table_args__ = (
        Index("idx_tickets_status", "status"),
        Index("idx_tickets_category", "category"),
        Index("idx_tickets_priority", "priority"),
    )
    ticket_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    requester_email: Mapped[str] = mapped_column(String(150), nullable=False)
    department: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="Unassigned", server_default="Unassigned")
    sub_category: Mapped[str] = mapped_column(String(50), default="General", server_default="General")
    severity: Mapped[str] = mapped_column(String(20), default="Medium", server_default="Medium")
    priority: Mapped[str] = mapped_column(String(10), default="P3", server_default="P3")
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0, server_default="0.0")
    ai_reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="OPEN", server_default="OPEN")
    source: Mapped[str] = mapped_column(String(20), default="WEB_PORTAL", server_default="WEB_PORTAL")
    assigned_team: Mapped[str] = mapped_column(String(50), default="IT_SERVICE_DESK", server_default="IT_SERVICE_DESK")
    # Python name avoids collision with SQLAlchemy Declarative Base.metadata.
    metadata_: Mapped[dict[str, Any]] = mapped_column("metadata", JsonType, default=dict, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    responses: Mapped[list["TicketResponseModel"]] = relationship(back_populates="ticket", cascade="all, delete-orphan")
    escalations: Mapped[list["EscalationModel"]] = relationship(back_populates="ticket", cascade="all, delete-orphan")
    jira_links: Mapped[list["JiraTicketModel"]] = relationship(back_populates="ticket", cascade="all, delete-orphan")
    activity_logs: Mapped[list["ActivityLogModel"]] = relationship(back_populates="ticket", cascade="all, delete-orphan")


class TicketResponseModel(Base):
    __tablename__ = "ticket_responses"
    __table_args__ = (CheckConstraint("validation_status IN ('PENDING', 'AUTO_APPROVED', 'REJECTED')", name="ck_ticket_responses_validation_status"),)
    response_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.ticket_id", ondelete="CASCADE"), nullable=False)
    solution_text: Mapped[str] = mapped_column(Text, nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    citations: Mapped[list[dict[str, Any]]] = mapped_column(JsonType, default=list, server_default="[]")
    agent_trace: Mapped[list[dict[str, Any]]] = mapped_column(JsonType, default=list, server_default="[]")
    validation_status: Mapped[str] = mapped_column(String(30), default="PENDING", server_default="PENDING")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ticket: Mapped[TicketModel] = relationship(back_populates="responses")


class KnowledgeBaseModel(Base):
    __tablename__ = "knowledge_base"
    article_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    vector_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class EscalationModel(Base):
    __tablename__ = "escalations"
    escalation_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.ticket_id", ondelete="CASCADE"), nullable=False)
    target_team: Mapped[str] = mapped_column(String(50), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    trigger_type: Mapped[str] = mapped_column(String(30), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", server_default="PENDING")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ticket: Mapped[TicketModel] = relationship(back_populates="escalations")


class JiraTicketModel(Base):
    __tablename__ = "jira_tickets"
    jira_link_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.ticket_id", ondelete="CASCADE"), nullable=False)
    jira_key: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    jira_status: Mapped[str] = mapped_column(String(50), nullable=False)
    jira_url: Mapped[str] = mapped_column(String(255), nullable=False)
    last_synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ticket: Mapped[TicketModel] = relationship(back_populates="jira_links")


class ActivityLogModel(Base):
    __tablename__ = "activity_logs"
    log_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.ticket_id", ondelete="CASCADE"), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    actor_type: Mapped[str] = mapped_column(String(30), nullable=False)
    details: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict, server_default="{}")
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ticket: Mapped[TicketModel] = relationship(back_populates="activity_logs")
