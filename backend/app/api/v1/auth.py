from typing import Annotated
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.dependencies import AuthenticatedMembership, get_current_membership
from app.models.membership import SchoolMembership
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ChangePasswordResponse,
    LoginRequest,
    MembershipContextResponse,
    SwitchContextRequest,
    TokenResponse,
    UserMeResponse,
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
    response_model=UserMeResponse,
    summary="Get Current User Profile & Active Context",
    description="Returns the currently authenticated user's ID, active school, roles, permissions, full name, and user code."
)
def get_me(
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
) -> UserMeResponse:
    # Always resolve accurate full_name, school_user_code, and school_name directly from DB
    user = db.scalar(select(User).where(User.id == current_membership.user_id))
    full_name = user.full_name if user and user.full_name else (current_membership.full_name or "School User")

    membership = db.scalar(
        select(SchoolMembership)
        .where(SchoolMembership.id == current_membership.membership_id)
        .options(selectinload(SchoolMembership.school))
    )
    school_user_code = membership.school_user_code if membership and membership.school_user_code else current_membership.school_user_code
    school_name = membership.school.name if membership and membership.school else current_membership.school_code

    return UserMeResponse(
        user_id=current_membership.user_id,
        membership_id=current_membership.membership_id,
        school_id=current_membership.school_id,
        school_code=current_membership.school_code,
        school_name=school_name,
        full_name=full_name,
        school_user_code=school_user_code,
        roles=current_membership.roles,
        permissions=current_membership.permissions,
        must_change_password=bool(user.must_change_password) if user else False,
        is_super_admin=current_membership.is_super_admin,
    )


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


@router.post(
    "/change-password",
    response_model=ChangePasswordResponse,
    summary="Update Account Password",
    description="Updates password and clears the must_change_password flag upon first login or user request."
)
def change_password(
    data: ChangePasswordRequest,
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
) -> ChangePasswordResponse:
    auth_service = AuthService(db)
    auth_service.change_password(
        user_id=current_membership.user_id,
        new_password=data.new_password
    )
    return ChangePasswordResponse()


@router.get(
    "/platform/schools",
    summary="List All Schools (Code Admin Only)",
    description="Returns all schools registered in the platform for global Code / Super Admin navigation."
)
def list_platform_schools(
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
):
    auth_service = AuthService(db)
    return auth_service.list_platform_schools(user_id=current_membership.user_id)


@router.post(
    "/platform/enter-school/{school_id}",
    response_model=TokenResponse,
    summary="Enter School Context (Code Admin Only)",
    description="Allows Code Admin to switch into ANY school tenant context instantly."
)
def enter_school(
    school_id: int,
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
) -> TokenResponse:
    auth_service = AuthService(db)
    return auth_service.enter_school(
        user_id=current_membership.user_id,
        target_school_id=school_id
    )



