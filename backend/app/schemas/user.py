from datetime import datetime
from pydantic import BaseModel, Field


class RoleResponse(BaseModel):
    """Available system role."""
    id: int
    name: str
    code: str | None = None
    description: str | None = None

    class Config:
        from_attributes = True


class UserCreateRequest(BaseModel):
    """Payload to create a new user account and assign them to the active school."""
    full_name: str = Field(..., min_length=2, max_length=150, example="Priya Sharma")
    email: str | None = Field(default=None, example="priya.sharma@hmbschool.com")
    phone: str | None = Field(default=None, example="9876543210")
    password: str | None = Field(default=None, min_length=6, example="Priya@123", description="Defaults to Firstname@123 if left blank")
    role_ids: list[int] = Field(..., min_length=1, description="List of Role IDs to assign (e.g. [4] for Teacher)")


class UserMemberResponse(BaseModel):
    """User membership in the active school."""
    membership_id: int
    user_id: int
    school_id: int
    school_user_code: str
    full_name: str
    email: str | None = None
    phone: str | None = None
    status: str
    roles: list[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AssignRoleRequest(BaseModel):
    """Payload to assign an additional role to an existing membership."""
    role_id: int = Field(..., description="Role ID to assign")


class BulkUploadRowError(BaseModel):
    row_number: int
    data: dict[str, str]
    error: str


class BulkUploadResultItem(BaseModel):
    row_number: int
    school_user_code: str
    full_name: str
    roles: list[str]


class BulkUploadResponse(BaseModel):
    """Summary of batch CSV processing."""
    total_rows: int
    successful_count: int
    failed_count: int
    created_users: list[BulkUploadResultItem]
    errors: list[BulkUploadRowError]
