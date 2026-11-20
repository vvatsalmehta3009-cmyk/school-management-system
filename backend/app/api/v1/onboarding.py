from typing import Annotated
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.onboarding import SchoolOnboardingRequest, SchoolOnboardingResponse
from app.services.onboarding_service import OnboardingService

router = APIRouter(prefix="/onboarding", tags=["Platform Onboarding"])


@router.post(
    "/school",
    response_model=SchoolOnboardingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register New School & Admin (Cold Start)",
    description="Atomically creates a new school tenant, master admin account, membership code, and returns an access token."
)
def register_school(
    data: SchoolOnboardingRequest,
    db: Annotated[Session, Depends(get_db)]
) -> SchoolOnboardingResponse:
    service = OnboardingService(db)
    return service.register_school(data)
