from typing import Annotated
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import AuthenticatedMembership, get_current_membership
from app.schemas.auth import (
    LoginRequest,
    MembershipContextResponse,
    SwitchContextRequest,
    TokenResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication & Context"])


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="User Login",
    description="Authenticate with school_user_code and password to receive a JWT access token stamped with the active school context."
)
def login(
    credentials: LoginRequest,
    db: Annotated[Session, Depends(get_db)]
) -> TokenResponse:
    auth_service = AuthService(db)
    return auth_service.authenticate(credentials)


@router.get(
    "/me",
    summary="Get Current User Profile & Active Context",
    description="Returns the currently authenticated user's ID, active school, roles, and permissions."
)
def get_me(
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)]
) -> AuthenticatedMembership:
    return current_membership


@router.get(
    "/memberships",
    response_model=list[MembershipContextResponse],
    summary="List All School Memberships",
    description="Returns all school accounts/roles held by this user, used to populate the 'Switch School' menu."
)
def get_my_memberships(
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
) -> list[MembershipContextResponse]:
    auth_service = AuthService(db)
    return auth_service.get_user_memberships(current_membership.user_id)


@router.post(
    "/switch-context",
    response_model=TokenResponse,
    summary="Switch Active School Context",
    description="Generates a new JWT scoped to a different school membership held by the same user."
)
def switch_context(
    request: SwitchContextRequest,
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
) -> TokenResponse:
    auth_service = AuthService(db)
    return auth_service.switch_context(
        user_id=current_membership.user_id,
        target_membership_id=request.target_membership_id
    )

