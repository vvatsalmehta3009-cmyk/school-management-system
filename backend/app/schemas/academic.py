from datetime import date, datetime
from pydantic import BaseModel, Field


class ClassCreate(BaseModel):
    """Payload to create a permanent grade level."""
    name: str = Field(..., min_length=1, max_length=50, example="Grade 11")
    display_order: int = Field(..., ge=1, le=100, example=11, description="Numeric order for UI sorting and promotion logic")


class ClassResponse(BaseModel):
    """Output representation of a school grade level."""
    id: int
    school_id: int
    name: str
    display_order: int
    created_at: datetime

    class Config:
        from_attributes = True


class SectionCreate(BaseModel):
    """Payload to create a yearly active section."""
    academic_year_id: int = Field(..., description="The academic year session this section runs in")
    class_id: int = Field(..., description="The parent grade level (e.g., Grade 11)")
    name: str = Field(..., min_length=1, max_length=20, example="A")
    capacity: int | None = Field(default=40, ge=1, le=200, description="Max student capacity")
    class_teacher_membership_id: int | None = Field(default=None, description="Assigned homeroom teacher membership ID")


class SectionResponse(BaseModel):
    """Output representation of an active section."""
    id: int
    academic_year_id: int
    class_id: int
    name: str
    capacity: int | None
    class_teacher_membership_id: int | None
    created_at: datetime

    class Config:
        from_attributes = True


class AcademicYearCreate(BaseModel):
    """Payload to create an academic year session."""
    name: str = Field(..., min_length=4, max_length=50, example="2026-2027")
    start_date: date = Field(..., example="2026-04-01")
    end_date: date = Field(..., example="2027-03-31")
    is_current: bool = Field(default=True, description="Whether this is the currently active school session")


class AcademicYearResponse(BaseModel):
    """Output representation of an academic year session."""
    id: int
    school_id: int
    name: str
    start_date: date
    end_date: date
    is_current: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AcademicYearUpdate(BaseModel):
    """Payload to update an academic year session."""
    name: str | None = Field(default=None, min_length=1, max_length=50, example="2026-2027")
    start_date: date | None = Field(default=None, example="2026-06-01")
    end_date: date | None = Field(default=None, example="2027-04-30")
    is_current: bool | None = Field(default=None, description="Whether this is the currently active school session")


class ClassUpdate(BaseModel):
    """Payload to update a class grade level."""
    name: str | None = Field(default=None, min_length=1, max_length=50, example="Grade 10")
    display_order: int | None = Field(default=None, ge=1, le=100, example=10)


class SectionUpdate(BaseModel):
    """Payload to update an active cohort section."""
    name: str | None = Field(default=None, min_length=1, max_length=20, example="A")
    capacity: int | None = Field(default=None, ge=1, le=200, example=40)
    class_teacher_membership_id: int | None = None


class SubjectCreate(BaseModel):
    """Payload to create a master subject."""
    name: str = Field(..., min_length=1, max_length=100, example="Mathematics")
    code: str = Field(..., min_length=1, max_length=20, example="MATH101")


class SubjectUpdate(BaseModel):
    """Payload to update a master subject."""
    name: str | None = Field(default=None, min_length=1, max_length=100, example="Mathematics")
    code: str | None = Field(default=None, min_length=1, max_length=20, example="MATH101")


class SubjectResponse(BaseModel):
    """Output representation of a master subject."""
    id: int
    school_id: int
    name: str
    code: str
    created_at: datetime

    class Config:
        from_attributes = True

