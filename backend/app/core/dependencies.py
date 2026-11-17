from dataclasses import dataclass
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt

from app.core.config import settings
from app.core.security import TokenService, token_service

# OAuth2 scheme extracts token from 'Authorization: Bearer <token>' header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


@dataclass
class AuthenticatedMembership:
    """
    Represents the verified user and active school context extracted from a valid JWT.
    Injected into route handlers via FastAPI's Depends().
    """
    user_id: int
    membership_id: int
    school_id: int
    school_code: str
    roles: list[str]
    permissions: list[str]

    def has_permission(self, permission_code: str) -> bool:
        """Check if this membership possesses an atomic permission."""
        return permission_code in self.permissions

    def has_role(self, role_name: str) -> bool:
        """Check if this membership has a specific role."""
        return role_name in self.roles


class Authenticator:
    """
    Class-based Dependency to authenticate incoming HTTP requests via JWT.
    """
    def __init__(self, tokens: TokenService = token_service) -> None:
        self.tokens = tokens

    def __call__(
        self, token: Annotated[str, Depends(oauth2_scheme)]
    ) -> AuthenticatedMembership:
        """
        Validates token signature and extracts authenticated membership context.
        Raises 401 if token is expired, missing, or tampered with.
        """
        try:
            payload = self.tokens.decode_token(token)
            user_id_str = payload.get("sub")
            membership_id = payload.get("membership_id")
            school_id = payload.get("school_id")
            school_code = payload.get("school_code")
            roles = payload.get("roles", [])
            permissions = payload.get("permissions", [])

            if not user_id_str or not membership_id or not school_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token claims. Missing tenant or user context.",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            return AuthenticatedMembership(
                user_id=int(user_id_str),
                membership_id=int(membership_id),
                school_id=int(school_id),
                school_code=str(school_code),
                roles=roles,
                permissions=permissions
            )

        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.PyJWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials.",
                headers={"WWW-Authenticate": "Bearer"},
            )


# Singleton callable dependency
get_current_membership = Authenticator()


class PermissionChecker:
    """
    FastAPI Route Guard that requires a specific atomic permission.
    Example usage:
        @router.post("/sections", dependencies=[Depends(PermissionChecker("academic.manage"))])
    """
    def __init__(self, required_permission: str) -> None:
        self.required_permission = required_permission

    def __call__(
        self,
        current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)]
    ) -> AuthenticatedMembership:
        if not current_membership.has_permission(self.required_permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Required: '{self.required_permission}'."
            )
        return current_membership

