from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """Payload for user login using either school_user_code OR email, and password."""
    identifier: str | None = Field(default=None, description="Email address or School User Code (e.g. HMBS000001 or admin@school.com)")
    school_user_code: str | None = Field(default=None, description="Backward-compatible alias for identifier")
    password: str = Field(..., min_length=1, description="Account password")


class TokenResponse(BaseModel):
    """Returned upon successful authentication or context switch."""
    access_token: str
    token_type: str = "bearer"
    expires_in_seconds: int
    user_id: int
    full_name: str
    school_user_code: str | None = None
    school_id: int
    school_code: str
    school_name: str
    school_membership_id: int
    roles: list[str]
    permissions: list[str]
    must_change_password: bool = False
    is_super_admin: bool = False


class ChangePasswordRequest(BaseModel):
    """Payload to update user password."""
    new_password: str = Field(..., min_length=6, description="New account password")


class ChangePasswordResponse(BaseModel):
    """Returned after successfully changing password."""
    status: str = "success"
    message: str = "Password changed successfully."


class MembershipContextResponse(BaseModel):
    """Summary of a school membership held by the user."""
    membership_id: int
    school_id: int
    school_name: str
    school_code: str
    status: str
    roles: list[str]


class SwitchContextRequest(BaseModel):
    """Payload to switch active school context."""
    target_membership_id: int = Field(..., description="The school_membership_id to switch context into")

