from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.academic import AcademicYear, SchoolClass, Section
from app.models.membership import SchoolMembership
from app.schemas.academic import ClassCreate, SectionCreate


class AcademicService:
    """
    Class-based Service encapsulating business logic for academic structure:
    classes, sections, and academic year sessions.
    """
    def __init__(self, db: Session) -> None:
        self.db = db

    # ------------------------------------------------------------------
    # Classes (Permanent Grade Levels)
    # ------------------------------------------------------------------

    def list_classes(self, school_id: int) -> list[SchoolClass]:
        """Fetch all grade levels for a school, ordered by display_order."""
        query = (
            select(SchoolClass)
            .where(SchoolClass.school_id == school_id)
            .order_by(SchoolClass.display_order.asc())
        )
        return list(self.db.scalars(query).all())

    def create_class(self, school_id: int, data: ClassCreate) -> SchoolClass:
        """
        Creates a permanent grade level scoped strictly to the authenticated school.
        Enforces tenant uniqueness: cannot have two 'Grade 11' in the same school.
        """
        # Guard: Check for duplicate class name in this school
        existing = self.db.scalars(
            select(SchoolClass).where(
                SchoolClass.school_id == school_id,
                SchoolClass.name == data.name
            )
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Class '{data.name}' already exists in your school."
            )

        new_class = SchoolClass(
            school_id=school_id,
            name=data.name,
            display_order=data.display_order
        )
        self.db.add(new_class)
        self.db.commit()
        self.db.refresh(new_class)
        return new_class

    # ------------------------------------------------------------------
    # Academic Years
    # ------------------------------------------------------------------

    def list_academic_years(self, school_id: int) -> list[AcademicYear]:
        """Fetch all academic years for this school."""
        query = (
            select(AcademicYear)
            .where(AcademicYear.school_id == school_id)
            .order_by(AcademicYear.start_date.desc())
        )
        return list(self.db.scalars(query).all())

    # ------------------------------------------------------------------
    # Sections (Yearly Active Cohorts)
    # ------------------------------------------------------------------

    def list_sections(
        self,
        school_id: int,
        academic_year_id: int | None = None,
        class_id: int | None = None
    ) -> list[Section]:
        """List active sections in a school with optional year/class filters."""
        query = (
            select(Section)
            .join(SchoolClass, Section.class_id == SchoolClass.id)
            .where(SchoolClass.school_id == school_id)
        )

        if academic_year_id:
            query = query.where(Section.academic_year_id == academic_year_id)
        if class_id:
            query = query.where(Section.class_id == class_id)

        query = query.order_by(SchoolClass.display_order.asc(), Section.name.asc())
        return list(self.db.scalars(query).all())

    def create_section(self, school_id: int, data: SectionCreate) -> Section:
        """
        Creates an active section for a specific class in an academic year.
        Enforces strict multi-tenant boundary checks.
        """
        # 1. Guard: Verify parent class exists and belongs to this school
        school_class = self.db.scalars(
            select(SchoolClass).where(
                SchoolClass.id == data.class_id,
                SchoolClass.school_id == school_id
            )
        ).first()

        if not school_class:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent class not found in your school."
            )

        # 2. Guard: Verify academic year exists and belongs to this school
        academic_year = self.db.scalars(
            select(AcademicYear).where(
                AcademicYear.id == data.academic_year_id,
                AcademicYear.school_id == school_id
            )
        ).first()

        if not academic_year:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Academic year not found in your school."
            )

        # 3. Guard: If class teacher is provided, verify they belong to this school
        if data.class_teacher_membership_id:
            teacher = self.db.scalars(
                select(SchoolMembership).where(
                    SchoolMembership.id == data.class_teacher_membership_id,
                    SchoolMembership.school_id == school_id
                )
            ).first()

            if not teacher:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Assigned teacher membership not found in your school."
                )

        # 4. Guard: Duplicate section in the same class and year
        duplicate = self.db.scalars(
            select(Section).where(
                Section.academic_year_id == data.academic_year_id,
                Section.class_id == data.class_id,
                Section.name == data.name
            )
        ).first()

        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Section '{data.name}' already exists for this class in this academic year."
            )

        # 5. Insert section
        new_section = Section(
            academic_year_id=data.academic_year_id,
            class_id=data.class_id,
            name=data.name,
            capacity=data.capacity,
            class_teacher_membership_id=data.class_teacher_membership_id
        )
        self.db.add(new_section)
        self.db.commit()
        self.db.refresh(new_section)
        return new_section
