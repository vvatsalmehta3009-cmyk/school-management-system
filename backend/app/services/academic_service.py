from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.academic import AcademicYear, SchoolClass, Section, Subject, SectionSubjectTeacher
from app.models.membership import SchoolMembership
from app.models.student import StudentEnrollment
from app.schemas.academic import (
    AcademicYearCreate,
    AcademicYearUpdate,
    ClassCreate,
    ClassUpdate,
    SectionCreate,
    SectionResponse,
    SectionUpdate,
    SubjectCreate,
    SubjectUpdate,
)


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

    def update_class(self, school_id: int, class_id: int, data: ClassUpdate) -> SchoolClass:
        """Update a grade level name or display order."""
        cls = self.db.scalars(
            select(SchoolClass).where(
                SchoolClass.id == class_id,
                SchoolClass.school_id == school_id
            )
        ).first()
        if not cls:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Class with ID {class_id} not found."
            )
        if data.name and data.name.strip() != cls.name:
            clean_name = data.name.strip()
            existing = self.db.scalars(
                select(SchoolClass).where(
                    SchoolClass.school_id == school_id,
                    SchoolClass.name == clean_name,
                    SchoolClass.id != class_id
                )
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Class '{clean_name}' already exists in your school."
                )
            cls.name = clean_name

        if data.display_order is not None:
            cls.display_order = data.display_order

        self.db.commit()
        self.db.refresh(cls)
        return cls

    def delete_class(self, school_id: int, class_id: int) -> dict:
        """Delete a grade level if no child sections exist."""
        cls = self.db.scalars(
            select(SchoolClass).where(
                SchoolClass.id == class_id,
                SchoolClass.school_id == school_id
            )
        ).first()
        if not cls:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Class with ID {class_id} not found."
            )
        sections_count = self.db.scalar(
            select(func.count(Section.id)).where(Section.class_id == class_id)
        ) or 0
        if sections_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete class '{cls.name}' because it contains {sections_count} section(s). Delete or reassign sections first."
            )
        self.db.delete(cls)
        self.db.commit()
        return {"message": f"Class '{cls.name}' deleted successfully."}

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

    def create_academic_year(self, school_id: int, data) -> AcademicYear:
        """Create an academic year session for this school."""
        # Check date order
        if data.end_date <= data.start_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End date must be strictly after start date."
            )

        # Check duplicate name
        existing = self.db.scalars(
            select(AcademicYear).where(
                AcademicYear.school_id == school_id,
                AcademicYear.name == data.name
            )
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Academic year '{data.name}' already exists in your school."
            )

        # If marking this year as current, unset existing current year
        if data.is_current:
            existing_current = self.db.scalars(
                select(AcademicYear).where(
                    AcademicYear.school_id == school_id,
                    AcademicYear.is_current == True
                )
            ).all()
            for y in existing_current:
                y.is_current = False

        year = AcademicYear(
            school_id=school_id,
            name=data.name,
            start_date=data.start_date,
            end_date=data.end_date,
            is_current=data.is_current
        )
        self.db.add(year)
        self.db.commit()
        self.db.refresh(year)
        return year

    def update_academic_year(self, school_id: int, year_id: int, data: AcademicYearUpdate) -> AcademicYear:
        """Update an academic year session."""
        year = self.db.scalars(
            select(AcademicYear).where(
                AcademicYear.id == year_id,
                AcademicYear.school_id == school_id
            )
        ).first()
        if not year:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Academic session with ID {year_id} not found."
            )

        if data.name and data.name.strip() != year.name:
            clean_name = data.name.strip()
            existing = self.db.scalars(
                select(AcademicYear).where(
                    AcademicYear.school_id == school_id,
                    AcademicYear.name == clean_name,
                    AcademicYear.id != year_id
                )
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Academic year '{clean_name}' already exists in your school."
                )
            year.name = clean_name

        start_date = data.start_date or year.start_date
        end_date = data.end_date or year.end_date
        if end_date <= start_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End date must be strictly after start date."
            )
        if data.start_date:
            year.start_date = data.start_date
        if data.end_date:
            year.end_date = data.end_date

        if data.is_current is not None:
            if data.is_current and not year.is_current:
                existing_current = self.db.scalars(
                    select(AcademicYear).where(
                        AcademicYear.school_id == school_id,
                        AcademicYear.is_current == True
                    )
                ).all()
                for y in existing_current:
                    y.is_current = False
            year.is_current = data.is_current

        self.db.commit()
        self.db.refresh(year)
        return year

    def delete_academic_year(self, school_id: int, year_id: int) -> dict:
        """Delete an academic year session if no sections or enrollments exist."""
        year = self.db.scalars(
            select(AcademicYear).where(
                AcademicYear.id == year_id,
                AcademicYear.school_id == school_id
            )
        ).first()
        if not year:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Academic session with ID {year_id} not found."
            )
        sections_count = self.db.scalar(
            select(func.count(Section.id)).where(Section.academic_year_id == year_id)
        ) or 0
        if sections_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete academic session '{year.name}' because it contains {sections_count} active section(s)."
            )
        enrollments_count = self.db.scalar(
            select(func.count(StudentEnrollment.id)).where(StudentEnrollment.academic_year_id == year_id)
        ) or 0
        if enrollments_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete academic session '{year.name}' because it contains {enrollments_count} student enrollment(s)."
            )
        self.db.delete(year)
        self.db.commit()
        return {"message": f"Academic year '{year.name}' deleted successfully."}

    # ------------------------------------------------------------------
    # Sections (Yearly Active Cohorts)
    # ------------------------------------------------------------------

    def _to_section_response(self, sec: Section) -> SectionResponse:
        teacher_name = None
        teacher_code = None
        if sec.class_teacher:
            teacher_name = sec.class_teacher.user.full_name if sec.class_teacher.user else None
            teacher_code = sec.class_teacher.school_user_code
        elif sec.class_teacher_membership_id:
            m = self.db.scalars(
                select(SchoolMembership)
                .where(SchoolMembership.id == sec.class_teacher_membership_id)
                .options(selectinload(SchoolMembership.user))
            ).first()
            if m:
                teacher_name = m.user.full_name if m.user else None
                teacher_code = m.school_user_code

        return SectionResponse(
            id=sec.id,
            academic_year_id=sec.academic_year_id,
            class_id=sec.class_id,
            name=sec.name,
            capacity=sec.capacity,
            class_teacher_membership_id=sec.class_teacher_membership_id,
            class_teacher_name=teacher_name,
            class_teacher_code=teacher_code,
            created_at=sec.created_at,
        )

    def list_sections(
        self,
        school_id: int,
        academic_year_id: int | None = None,
        class_id: int | None = None
    ) -> list[SectionResponse]:
        """List active sections in a school with optional year/class filters."""
        query = (
            select(Section)
            .join(SchoolClass, Section.class_id == SchoolClass.id)
            .where(SchoolClass.school_id == school_id)
            .options(
                selectinload(Section.class_teacher).selectinload(SchoolMembership.user)
            )
        )

        if academic_year_id:
            query = query.where(Section.academic_year_id == academic_year_id)
        if class_id:
            query = query.where(Section.class_id == class_id)

        query = query.order_by(SchoolClass.display_order.asc(), Section.name.asc())
        sections = list(self.db.scalars(query).all())
        return [self._to_section_response(s) for s in sections]

    def create_section(self, school_id: int, data: SectionCreate) -> SectionResponse:
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
        return self._to_section_response(new_section)

    def update_section(self, school_id: int, section_id: int, data: SectionUpdate) -> SectionResponse:
        """Update an active cohort section."""
        sec = self.db.scalars(
            select(Section).where(Section.id == section_id)
        ).first()
        if not sec:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Section with ID {section_id} not found."
            )
        # Verify tenant scope via parent class
        cls = self.db.scalars(
            select(SchoolClass).where(SchoolClass.id == sec.class_id, SchoolClass.school_id == school_id)
        ).first()
        if not cls:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Section does not belong to your school."
            )

        if data.name and data.name.strip().upper() != sec.name:
            clean_name = data.name.strip().upper()
            duplicate = self.db.scalars(
                select(Section).where(
                    Section.academic_year_id == sec.academic_year_id,
                    Section.class_id == sec.class_id,
                    Section.name == clean_name,
                    Section.id != section_id
                )
            ).first()
            if duplicate:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Section '{clean_name}' already exists for this class in this academic year."
                )
            sec.name = clean_name

        if data.capacity is not None:
            sec.capacity = data.capacity

        if data.class_teacher_membership_id is not None:
            if data.class_teacher_membership_id == 0:
                sec.class_teacher_membership_id = None
            else:
                teacher_membership = self.db.scalars(
                    select(SchoolMembership).where(
                        SchoolMembership.id == data.class_teacher_membership_id,
                        SchoolMembership.school_id == school_id,
                        SchoolMembership.status == "active"
                    )
                ).first()
                if not teacher_membership:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Selected teacher membership not found in your school."
                    )
                sec.class_teacher_membership_id = data.class_teacher_membership_id

        self.db.commit()
        self.db.refresh(sec)
        return self._to_section_response(sec)

    def delete_section(self, school_id: int, section_id: int) -> dict:
        """Delete an active cohort section if no students are enrolled."""
        sec = self.db.scalars(
            select(Section).where(Section.id == section_id)
        ).first()
        if not sec:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Section with ID {section_id} not found."
            )
        cls = self.db.scalars(
            select(SchoolClass).where(SchoolClass.id == sec.class_id, SchoolClass.school_id == school_id)
        ).first()
        if not cls:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Section does not belong to your school."
            )

        enrollments_count = self.db.scalar(
            select(func.count(StudentEnrollment.id)).where(StudentEnrollment.section_id == section_id)
        ) or 0
        if enrollments_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete section '{sec.name}' because it contains {enrollments_count} enrolled student(s)."
            )

        # Clean up allocations
        allocations = self.db.scalars(
            select(SectionSubjectTeacher).where(SectionSubjectTeacher.section_id == section_id)
        ).all()
        for a in allocations:
            self.db.delete(a)

        self.db.delete(sec)
        self.db.commit()
        return {"message": f"Section '{sec.name}' deleted successfully."}

    # ------------------------------------------------------------------
    # Subjects (Master Curriculum Catalog)
    # ------------------------------------------------------------------

    def list_subjects(self, school_id: int) -> list[Subject]:
        """Fetch all master subjects for a school."""
        query = (
            select(Subject)
            .where(Subject.school_id == school_id)
            .order_by(Subject.name.asc())
        )
        return list(self.db.scalars(query).all())

    def create_subject(self, school_id: int, data: SubjectCreate) -> Subject:
        """Create a master subject for the school."""
        clean_code = data.code.strip().upper()
        existing = self.db.scalars(
            select(Subject).where(
                Subject.school_id == school_id,
                Subject.code == clean_code
            )
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Subject with code '{clean_code}' already exists in your school."
            )

        new_subject = Subject(
            school_id=school_id,
            name=data.name.strip(),
            code=clean_code
        )
        self.db.add(new_subject)
        self.db.commit()
        self.db.refresh(new_subject)
        return new_subject

    def update_subject(self, school_id: int, subject_id: int, data: SubjectUpdate) -> Subject:
        """Update a master subject name or code."""
        sub = self.db.scalars(
            select(Subject).where(Subject.id == subject_id, Subject.school_id == school_id)
        ).first()
        if not sub:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subject with ID {subject_id} not found."
            )

        if data.code and data.code.strip().upper() != sub.code:
            clean_code = data.code.strip().upper()
            existing = self.db.scalars(
                select(Subject).where(
                    Subject.school_id == school_id,
                    Subject.code == clean_code,
                    Subject.id != subject_id
                )
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Subject code '{clean_code}' already exists in your school."
                )
            sub.code = clean_code

        if data.name and data.name.strip() != sub.name:
            sub.name = data.name.strip()

        self.db.commit()
        self.db.refresh(sub)
        return sub

    def delete_subject(self, school_id: int, subject_id: int) -> dict:
        """Delete a master subject if no teaching allocations exist."""
        sub = self.db.scalars(
            select(Subject).where(Subject.id == subject_id, Subject.school_id == school_id)
        ).first()
        if not sub:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subject with ID {subject_id} not found."
            )
        alloc_count = self.db.scalar(
            select(func.count(SectionSubjectTeacher.id)).where(SectionSubjectTeacher.subject_id == subject_id)
        ) or 0
        if alloc_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete subject '{sub.name}' because it is assigned to {alloc_count} class/teacher allocation(s)."
            )
        self.db.delete(sub)
        self.db.commit()
        return {"message": f"Subject '{sub.name}' deleted successfully."}

