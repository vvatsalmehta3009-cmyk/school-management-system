from typing import Annotated
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import AuthenticatedMembership, PermissionChecker, get_current_membership
from app.schemas.academic import (
    AcademicYearCreate,
    AcademicYearResponse,
    AcademicYearUpdate,
    ClassCreate,
    ClassResponse,
    ClassUpdate,
    SectionCreate,
    SectionResponse,
    SectionUpdate,
    SubjectCreate,
    SubjectResponse,
    SubjectUpdate,
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


@router.put(
    "/years/{year_id}",
    response_model=AcademicYearResponse,
    summary="Update Academic Year",
    description="Update an academic calendar session for the authenticated school.",
    dependencies=[Depends(PermissionChecker("academic.manage"))]
)
def update_academic_year(
    year_id: int,
    data: AcademicYearUpdate,
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
) -> AcademicYearResponse:
    service = AcademicService(db)
    return service.update_academic_year(school_id=current_membership.school_id, year_id=year_id, data=data)


@router.delete(
    "/years/{year_id}",
    summary="Delete Academic Year",
    description="Delete an academic calendar session if it contains no active sections or enrollments.",
    dependencies=[Depends(PermissionChecker("academic.manage"))]
)
def delete_academic_year(
    year_id: int,
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
) -> dict:
    service = AcademicService(db)
    return service.delete_academic_year(school_id=current_membership.school_id, year_id=year_id)


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
    return service.create_class(school_id=current_membership.school_id, data=data)


@router.put(
    "/classes/{class_id}",
    response_model=ClassResponse,
    summary="Update Class",
    description="Update a grade level name or display order.",
    dependencies=[Depends(PermissionChecker("academic.manage"))]
)
def update_class(
    class_id: int,
    data: ClassUpdate,
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
) -> ClassResponse:
    service = AcademicService(db)
    return service.update_class(school_id=current_membership.school_id, class_id=class_id, data=data)


@router.delete(
    "/classes/{class_id}",
    summary="Delete Class",
    description="Delete a permanent grade level if no child sections exist.",
    dependencies=[Depends(PermissionChecker("academic.manage"))]
)
def delete_class(
    class_id: int,
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
) -> dict:
    service = AcademicService(db)
    return service.delete_class(school_id=current_membership.school_id, class_id=class_id)


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


@router.put(
    "/sections/{section_id}",
    response_model=SectionResponse,
    summary="Update Section",
    description="Update an active cohort section's name, capacity, or class teacher.",
    dependencies=[Depends(PermissionChecker("academic.manage"))]
)
def update_section(
    section_id: int,
    data: SectionUpdate,
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
) -> SectionResponse:
    service = AcademicService(db)
    return service.update_section(school_id=current_membership.school_id, section_id=section_id, data=data)


@router.delete(
    "/sections/{section_id}",
    summary="Delete Section",
    description="Delete an active cohort section if no students are enrolled.",
    dependencies=[Depends(PermissionChecker("academic.manage"))]
)
def delete_section(
    section_id: int,
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
) -> dict:
    service = AcademicService(db)
    return service.delete_section(school_id=current_membership.school_id, section_id=section_id)


# ----------------------------------------------------------------------
# Subjects (Master Curriculum Catalog)
# ----------------------------------------------------------------------

@router.get(
    "/subjects",
    response_model=list[SubjectResponse],
    summary="List Subjects",
    description="Fetch all master curriculum subjects for the active school.",
    dependencies=[Depends(PermissionChecker("academic.view"))]
)
def list_subjects(
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
) -> list[SubjectResponse]:
    service = AcademicService(db)
    return service.list_subjects(school_id=current_membership.school_id)


@router.post(
    "/subjects",
    response_model=SubjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Subject",
    description="Create a new master curriculum subject for the active school.",
    dependencies=[Depends(PermissionChecker("academic.manage"))]
)
def create_subject(
    data: SubjectCreate,
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
) -> SubjectResponse:
    service = AcademicService(db)
    return service.create_subject(school_id=current_membership.school_id, data=data)


@router.put(
    "/subjects/{subject_id}",
    response_model=SubjectResponse,
    summary="Update Subject",
    description="Update a master curriculum subject name or code.",
    dependencies=[Depends(PermissionChecker("academic.manage"))]
)
def update_subject(
    subject_id: int,
    data: SubjectUpdate,
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
) -> SubjectResponse:
    service = AcademicService(db)
    return service.update_subject(school_id=current_membership.school_id, subject_id=subject_id, data=data)


@router.delete(
    "/subjects/{subject_id}",
    summary="Delete Subject",
    description="Delete a master curriculum subject if no teaching allocations exist.",
    dependencies=[Depends(PermissionChecker("academic.manage"))]
)
def delete_subject(
    subject_id: int,
    current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)],
    db: Annotated[Session, Depends(get_db)]
) -> dict:
    service = AcademicService(db)
    return service.delete_subject(school_id=current_membership.school_id, subject_id=subject_id)


