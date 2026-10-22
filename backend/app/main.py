from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth, health, responses, tickets
from app.core.config import get_settings
from app.core.database import Base, engine
from app import models  # noqa: F401 - registers all ORM tables

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Create scaffold tables only when the service starts, not during module import."""
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origin_list, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth.router, prefix="/api/v1", tags=["Auth"])
app.include_router(health.router, prefix="/api/v1", tags=["Health"])
app.include_router(responses.router, prefix="/api/v1", tags=["Responses"])
app.include_router(tickets.router, prefix="/api/v1", tags=["Tickets"])


