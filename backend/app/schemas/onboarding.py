from pydantic import BaseModel, Field


class SchoolOnboardingRequest(BaseModel):
    """Payload to register a brand-new school and its primary administrator."""
    school_name: str = Field(..., min_length=2, max_length=150, example="Apex International School")
    school_code: str = Field(..., min_length=2, max_length=20, example="APEX", description="Short unique code for the school")
    school_email: str | None = Field(default=None, example="contact@apexschool.com")
    school_phone: str | None = Field(default=None, example="9876543210")
    school_address: str | None = Field(default=None, example="123 Education Lane, Knowledge Park")

    admin_name: str = Field(..., min_length=2, max_length=150, example="Vikram Malhotra")
    admin_email: str = Field(..., example="vikram@apexschool.com")
    admin_phone: str | None = Field(default=None, example="9876543211")
    admin_password: str = Field(..., min_length=8, example="Admin@1234", description="Master admin password")


class SchoolOnboardingResponse(BaseModel):
    """Response returned upon successful school and admin creation."""
    school_id: int
    school_name: str
    school_code: str
    admin_user_id: int
    admin_membership_id: int
    admin_school_user_code: str
    admin_role: str
    access_token: str
    token_type: str = "bearer"
    message: str = "School and administrator created successfully."
