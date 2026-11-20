from dataclasses import dataclass
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
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
    must_change_password: bool = False

    def has_permission(self, permission_code: str) -> bool:
        """
        Check if this membership possesses an atomic or scoped permission.
        Scope resolution rules:
        1. Tenant Admin Override: 'School Admin' or 'Super Admin' has unrestricted school scope.
        2. Global Wildcard: '*' in permissions grants full access.
        3. Exact Match: e.g. 'academic.view' in permissions.
        4. Domain Wildcard: e.g. 'academic.*' satisfies 'academic.view' or 'academic.manage'.
        5. Implied Action: 'academic.manage' or 'admin.manage' implies 'academic.view'.
        """
        if "Super Admin" in self.roles or "School Admin" in self.roles or "*" in self.permissions:
            return True

        if permission_code in self.permissions:
            return True

        if "." in permission_code:
            domain, action = permission_code.split(".", 1)
            # Domain wildcard, e.g. 'academic.*'
            if f"{domain}.*" in self.permissions:
                return True
            # Management privilege implies read/view privilege
            if action in ("view", "read", "list") and (
                f"{domain}.manage" in self.permissions or "admin.manage" in self.permissions
            ):
                return True
            # General admin manage implies all domain manage
            if "admin.manage" in self.permissions:
                return True

        return False

    def has_any_permission(self, *permission_codes: str) -> bool:
        """Check if membership has AT LEAST ONE of the specified permissions."""
        return any(self.has_permission(p) for p in permission_codes)

    def has_all_permissions(self, *permission_codes: str) -> bool:
        """Check if membership has ALL of the specified permissions."""
        return all(self.has_permission(p) for p in permission_codes)

    def has_role(self, role_name: str) -> bool:
        """Check if this membership has a specific role."""
        return role_name in self.roles or "Super Admin" in self.roles


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
                permissions=permissions,
                must_change_password=bool(payload.get("must_change_password", False))
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
    FastAPI Route Guard enforcing atomic or scoped permissions.
    Supports single or multiple required permissions (with any/all logic).
    Example usage:
        @router.post("/years", dependencies=[Depends(PermissionChecker("academic.manage"))])
        @router.get("/years", dependencies=[Depends(PermissionChecker("academic.view"))])
    """
    def __init__(self, *required_permissions: str, require_all: bool = False) -> None:
        self.required_permissions = required_permissions
        self.require_all = require_all

    def __call__(
        self,
        current_membership: Annotated[AuthenticatedMembership, Depends(get_current_membership)]
    ) -> AuthenticatedMembership:
        if self.require_all:
            authorized = current_membership.has_all_permissions(*self.required_permissions)
        else:
            authorized = current_membership.has_any_permission(*self.required_permissions)

        if not authorized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Required scope: {', '.join(self.required_permissions)}."
            )
        return current_membership


class SectionScopeChecker:
    """
    Data Scope Guard for Section operations:
    - Super Admin, School Admin, Principal: Unrestricted tenant scope.
    - Teacher: Restricted to sections where they are assigned as class teacher or subject teacher.
    """
    def __init__(self) -> None:
        pass

    def check_section_access(
        self,
        section_id: int,
        membership: AuthenticatedMembership,
        db: Session
    ) -> bool:
        # 1. School Admin / Super Admin / Principal has tenant-wide data scope
        if any(r in membership.roles for r in ("School Admin", "Super Admin", "Principal")):
            return True

        from app.models.academic import Section, SectionSubjectTeacher

        # 2. Check if assigned as Class Teacher
        is_class_teacher = db.scalars(
            select(Section).where(
                Section.id == section_id,
                Section.school_id == membership.school_id,
                Section.class_teacher_membership_id == membership.membership_id
            )
        ).first()
        if is_class_teacher:
            return True

        # 3. Check if assigned as Subject Teacher in this section
        is_subject_teacher = db.scalars(
            select(SectionSubjectTeacher).where(
                SectionSubjectTeacher.section_id == section_id,
                SectionSubjectTeacher.teacher_membership_id == membership.membership_id
            )
        ).first()
        if is_subject_teacher:
            return True

        return False

