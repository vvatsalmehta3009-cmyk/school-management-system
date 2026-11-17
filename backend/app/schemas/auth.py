from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """Payload for user login using school_user_code and password."""
    school_user_code: str = Field(..., description="Unique school login identifier, e.g. ABC001000101")
    password: str = Field(..., min_length=1, description="Account password")


class TokenResponse(BaseModel):
    """Returned upon successful authentication or context switch."""
    access_token: str
    token_type: str = "bearer"
    expires_in_seconds: int
    user_id: int
    full_name: str
    school_id: int
    school_code: str
    school_name: str
    school_membership_id: int
    roles: list[str]
    permissions: list[str]


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

