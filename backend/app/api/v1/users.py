from typing import Annotated
from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import AuthenticatedMembership, PermissionChecker, get_current_membership
from app.schemas.user import (
    AssignRoleRequest,
    BulkUploadResponse,
    RoleResponse,
    TeacherProfileUpdateRequest,
    UserCreateRequest,
    UserMemberResponse,
)
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users & Staff Management"])


@router.get(
    "/roles",
    response_model=list[RoleResponse],
    summary="List System Roles",
    description="Fetch all system roles available in the platform to populate role assignment menus."
)
def list_roles(
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
) -> list[RoleResponse]:
    service = UserService(db)
    return service.list_roles()


@router.get(
    "",
    response_model=list[UserMemberResponse],
    summary="List School Members",
    description="Fetch all user accounts and roles belonging to the active school.",
    dependencies=[Depends(PermissionChecker("admin.manage", "teachers.view"))]
)
def list_users(
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
) -> list[UserMemberResponse]:
    service = UserService(db)
    return service.list_school_users(school_id=current_membership.school_id)


@router.post(
    "",
    response_model=UserMemberResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create User & Assign Role",
    description="Creates a user account, creates school membership with code (e.g. HMBS000002), and assigns roles.",
    dependencies=[Depends(PermissionChecker("admin.manage", "teachers.manage"))]
)
def create_user(
    data: UserCreateRequest,
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
) -> UserMemberResponse:
    service = UserService(db)
    return service.create_school_user(
        school_id=current_membership.school_id,
        school_code=current_membership.school_code,
        data=data
    )


@router.post(
    "/bulk-upload/staff",
    response_model=BulkUploadResponse,
    summary="Bulk Upload Staff & Teachers via CSV",
    description="Batch creates staff user accounts, school memberships, and assigns roles from a CSV file.",
    dependencies=[Depends(PermissionChecker("admin.manage", "teachers.manage"))]
)
async def bulk_upload_staff(
    file: Annotated[UploadFile, File(description="CSV file with columns: full_name, role, email, phone, password")],
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
) -> BulkUploadResponse:
    content = await file.read()
    csv_text = content.decode("utf-8-sig", errors="ignore")
    service = UserService(db)
    return service.bulk_upload_staff(
        school_id=current_membership.school_id,
        school_code=current_membership.school_code,
        csv_content=csv_text
    )


@router.post(
    "/bulk-upload/students",
    response_model=BulkUploadResponse,
    summary="Bulk Upload Students via CSV",
    description="Batch admits students and creates optional portal credentials from a CSV file.",
    dependencies=[Depends(PermissionChecker("admin.manage", "students.manage", "students.create"))]
)
async def bulk_upload_students(
    file: Annotated[UploadFile, File(description="CSV file with columns: admission_number, first_name, last_name, date_of_birth, gender, blood_group, admission_date, email, phone, password")],
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
) -> BulkUploadResponse:
    content = await file.read()
    csv_text = content.decode("utf-8-sig", errors="ignore")
    service = UserService(db)
    return service.bulk_upload_students(
        school_id=current_membership.school_id,
        school_code=current_membership.school_code,
        csv_content=csv_text
    )


@router.post(
    "/{membership_id}/roles",
    response_model=UserMemberResponse,
    summary="Assign Role to User",
    description="Adds an additional role to an existing school membership.",
    dependencies=[Depends(PermissionChecker("admin.manage"))]
)
def assign_role(
    membership_id: int,
    data: AssignRoleRequest,
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
) -> UserMemberResponse:
    service = UserService(db)
    return service.assign_role(
        school_id=current_membership.school_id,
        membership_id=membership_id,
        role_id=data.role_id
    )


@router.put(
    "/{membership_id}/teacher-profile",
    response_model=UserMemberResponse,
    summary="Update Teacher Competency Profile",
    description="Updates teaching profile, qualifications, assigned subjects, and teaching grade levels.",
    dependencies=[Depends(PermissionChecker("admin.manage", "teachers.manage"))]
)
def update_teacher_profile(
    membership_id: int,
    data: TeacherProfileUpdateRequest,
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
) -> UserMemberResponse:
    service = UserService(db)
    return service.update_teacher_competency(
        school_id=current_membership.school_id,
        membership_id=membership_id,
        data=data
    )
