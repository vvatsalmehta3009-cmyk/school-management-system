from typing import Annotated
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import AuthenticatedMembership, PermissionChecker, get_current_membership
from app.schemas.academic import (
    AcademicYearCreate,
    AcademicYearResponse,
    ClassCreate,
    ClassResponse,
    SectionCreate,
    SectionResponse,
)
from app.services.academic_service import AcademicService

router = APIRouter(prefix="/academic", tags=["Academic Structure"])


# ----------------------------------------------------------------------
# Academic Years
# ----------------------------------------------------------------------

@router.get(
    "/years",
    response_model=list[AcademicYearResponse],
    summary="List Academic Years",
    description="Fetch all academic calendar sessions for the authenticated school.",
    dependencies=[Depends(PermissionChecker("academic.view"))]
)
def list_academic_years(
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
) -> list[AcademicYearResponse]:
    service = AcademicService(db)
    return service.list_academic_years(school_id=current_membership.school_id)


@router.post(
    "/years",
    response_model=AcademicYearResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Academic Year",
    description="Create an academic calendar session for the authenticated school.",
    dependencies=[Depends(PermissionChecker("academic.manage"))]
)
def create_academic_year(
    data: AcademicYearCreate,
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
) -> AcademicYearResponse:
    service = AcademicService(db)
    return service.create_academic_year(school_id=current_membership.school_id, data=data)


# ----------------------------------------------------------------------
# Classes (Permanent Grade Levels)
# ----------------------------------------------------------------------

@router.get(
    "/classes",
    response_model=list[ClassResponse],
    summary="List Classes",
    description="Fetch all permanent grade levels for the active school, sorted chronologically by display_order.",
    dependencies=[Depends(PermissionChecker("academic.view"))]
)
def list_classes(
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
) -> list[ClassResponse]:
    service = AcademicService(db)
    return service.list_classes(school_id=current_membership.school_id)


@router.post(
    "/classes",
    response_model=ClassResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Class",
    description="Create a new permanent grade level in the authenticated school.",
    dependencies=[Depends(PermissionChecker("academic.manage"))]
)
def create_class(
    data: ClassCreate,
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
) -> ClassResponse:
    service = AcademicService(db)
    # Notice: school_id is taken directly from the verified JWT, NOT from user input!
    return service.create_class(school_id=current_membership.school_id, data=data)


# ----------------------------------------------------------------------
# Sections (Active Cohorts)
# ----------------------------------------------------------------------

@router.get(
    "/sections",
    response_model=list[SectionResponse],
    summary="List Sections",
    description="Fetch active sections for the active school with optional filters by academic year or class.",
    dependencies=[Depends(PermissionChecker("academic.view"))]
)
def list_sections(
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)],
    academic_year_id: Annotated[int | None, Query(description="Filter by academic year ID")] = None,
    class_id: Annotated[int | None, Query(description="Filter by parent class ID")] = None
) -> list[SectionResponse]:
    service = AcademicService(db)
    return service.list_sections(
        school_id=current_membership.school_id,
        academic_year_id=academic_year_id,
        class_id=class_id
    )


@router.post(
    "/sections",
    response_model=SectionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Section",
    description="Create an active cohort section for a class in a specific academic year.",
    dependencies=[Depends(PermissionChecker("academic.manage"))]
)
def create_section(
    data: SectionCreate,
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
) -> SectionResponse:
    service = AcademicService(db)
    return service.create_section(school_id=current_membership.school_id, data=data)
