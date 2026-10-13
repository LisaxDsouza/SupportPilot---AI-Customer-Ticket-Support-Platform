"""Idempotently create tables and load the shared sample-ticket fixture."""
import json
from pathlib import Path

from app import models  # noqa: F401
from app.core.database import Base, SessionLocal, engine
from app.models.ticket import ActivityLogModel, TicketModel

FIXTURE_PATH = Path(__file__).resolve().parents[2] / "data" / "sample_tickets.json"


def seed() -> int:
    Base.metadata.create_all(bind=engine)
    samples = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    db = SessionLocal()
    created = 0
    try:
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
        print(f"Seed complete: {created} created, {len(samples) - created} already present.")
        return created
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
