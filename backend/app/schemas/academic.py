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
