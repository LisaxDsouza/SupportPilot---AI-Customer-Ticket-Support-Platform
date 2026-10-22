"""Idempotently create tables and load the shared sample-ticket fixture."""
import json
from pathlib import Path

from app import models  # noqa: F401
from app.core.database import Base, SessionLocal, engine
from app.models.ticket import ActivityLogModel, TicketModel, UserModel
from app.services.auth_service import hash_password

FIXTURE_PATH = Path(__file__).resolve().parents[2] / "data" / "sample_tickets.json"

DEFAULT_USERS = [
    {"email": "admin@company.com", "full_name": "System Administrator", "department": "IT Infrastructure", "role": "ADMIN"},
    {"email": "engineer@company.com", "full_name": "Senior Support Engineer", "department": "IT Operations", "role": "SUPPORT_ENGINEER"},
    {"email": "alex.smith@company.com", "full_name": "Alex Smith", "department": "Finance", "role": "EMPLOYEE"},
    {"email": "priya.shah@company.com", "full_name": "Priya Shah", "department": "Engineering", "role": "EMPLOYEE"},
]


def seed() -> int:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    created = 0
    try:
        # 1. Seed Users
        hashed = hash_password("password123")
        for u in DEFAULT_USERS:
            existing_user = db.query(UserModel).filter(UserModel.email == u["email"]).first()
            if not existing_user:
                db.add(UserModel(
                    email=u["email"],
                    password_hash=hashed,
                    full_name=u["full_name"],
                    department=u["department"],
                    role=u["role"],
                ))
            elif not existing_user.password_hash:
                existing_user.password_hash = hashed
        db.commit()

        # 2. Seed Tickets
        samples = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
        existing_codes = set(db.query(TicketModel.ticket_code).with_entities(TicketModel.ticket_code).all())
        existing_codes = {code for (code,) in existing_codes}
        for sample in samples:
            if sample["ticket_code"] in existing_codes:
                continue
            ticket = TicketModel(**sample)
            db.add(ticket)
            db.flush()
            db.add(ActivityLogModel(ticket_id=ticket.ticket_id, action="INTAKE", actor_type="SYSTEM", details={"seed": True}))
            created += 1
        db.commit()
        print(f"Seed complete: {created} tickets created, {len(samples) - created} already present.")
        return created
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
