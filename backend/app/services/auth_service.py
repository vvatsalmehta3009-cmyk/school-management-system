from datetime import timedelta
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.security import PasswordHasher, TokenService, password_hasher, token_service
from app.models.membership import SchoolMembership
from app.models.rbac import Role, RolePermission, UserRole
from app.models.school import School
from app.models.user import User
from app.schemas.auth import LoginRequest, MembershipContextResponse, TokenResponse


class AuthService:
    """
    Class-based Service encapsulating authentication, context-resolution,
    and token-generation business logic.
    """
    def __init__(
        self,
        db: Session,
        hasher: PasswordHasher = password_hasher,
        tokens: TokenService = token_service,
    ) -> None:
        self.db = db
        self.hasher = hasher
        self.tokens = tokens

    def _get_membership_roles_and_permissions(
        self, membership_id: int
    ) -> tuple[list[str], list[str]]:
        """
        Helper method to retrieve all role names and atomic permission codes
        assigned to a specific school membership.
        """
        query = (
            select(UserRole)
            .where(UserRole.school_membership_id == membership_id)
            .options(
                selectinload(UserRole.role)
                .selectinload(Role.role_permissions)
                .selectinload(RolePermission.permission)
            )
        )
        user_roles = self.db.scalars(query).all()

        role_names: set[str] = set()
        permission_codes: set[str] = set()

        for ur in user_roles:
            if ur.role:
                role_names.add(ur.role.name)
                for rp in ur.role.role_permissions:
                    if rp.permission:
                        permission_codes.add(rp.permission.code)

        return sorted(list(role_names)), sorted(list(permission_codes))

    def authenticate(self, credentials: LoginRequest) -> TokenResponse:
        """
        Authenticates a user via their unique school_user_code and password.
        Returns a signed JWT populated with active school context, roles, and permissions.
        """
        # 1. Lookup the membership record by school_user_code
        query = (
            select(SchoolMembership)
            .where(SchoolMembership.school_user_code == credentials.school_user_code)
            .options(
                selectinload(SchoolMembership.user),
                selectinload(SchoolMembership.school)
            )
        )
        membership = self.db.scalars(query).first()

        # 2. Guard: Invalid code
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid school user code or password."
            )

        # 3. Guard: Membership inactive or left
        if membership.status != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Your membership at this school is currently {membership.status}."
            )

        # 4. Guard: School inactive
        if not membership.school.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This school account is currently deactivated."
            )

        user = membership.user
        # 5. Guard: User account inactive or missing password hash
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated."
            )

        if not user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password is not set for this account. Please use password reset or invite link."
            )

        # 6. Verify password using bcrypt/argon2
        if not self.hasher.verify(credentials.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid school user code or password."
            )

        # 7. Resolve Roles & Atomic Permissions for this specific school membership
        roles, permissions = self._get_membership_roles_and_permissions(membership.id)

        # 8. Create JWT Access Token with embedded tenant context
        claims = {
            "membership_id": membership.id,
            "school_id": membership.school_id,
            "school_code": membership.school.code,
            "roles": roles,
            "permissions": permissions,
        }
        access_token = self.tokens.create_access_token(
            subject=user.id,
            claims=claims
        )

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user_id=user.id,
            full_name=user.full_name,
            school_id=membership.school_id,
            school_code=membership.school.code,
            school_name=membership.school.name,
            school_membership_id=membership.id,
            roles=roles,
            permissions=permissions
        )

    def get_user_memberships(self, user_id: int) -> list[MembershipContextResponse]:
        """
        Returns all school memberships held by a user account.
        Used by the frontend to render the 'Switch School' menu.
        """
        query = (
            select(SchoolMembership)
            .where(SchoolMembership.user_id == user_id)
            .options(
                selectinload(SchoolMembership.school),
                selectinload(SchoolMembership.user_roles).selectinload(UserRole.role)
            )
        )
        memberships = self.db.scalars(query).all()

        results: list[MembershipContextResponse] = []
        for m in memberships:
            roles = [ur.role.name for ur in m.user_roles if ur.role]
            results.append(
                MembershipContextResponse(
                    membership_id=m.id,
                    school_id=m.school_id,
                    school_name=m.school.name,
                    school_code=m.school.code,
                    status=m.status,
                    roles=roles
                )
            )
        return results

    def switch_context(self, user_id: int, target_membership_id: int) -> TokenResponse:
        """
        Switches the active tenant context for a multi-school user.
        Issues a fresh JWT scoped specifically to the target membership.
        """
        query = (
            select(SchoolMembership)
            .where(
                SchoolMembership.id == target_membership_id,
                SchoolMembership.user_id == user_id
            )
            .options(
                selectinload(SchoolMembership.user),
                selectinload(SchoolMembership.school)
            )
        )
        membership = self.db.scalars(query).first()

        if not membership:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="School membership not found or does not belong to you."
            )

        if membership.status != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Cannot switch to this school. Membership is {membership.status}."
            )

        if not membership.school.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The target school is currently inactive."
            )

        roles, permissions = self._get_membership_roles_and_permissions(membership.id)

        claims = {
            "membership_id": membership.id,
            "school_id": membership.school_id,
            "school_code": membership.school.code,
            "roles": roles,
            "permissions": permissions,
        }
        access_token = self.tokens.create_access_token(
            subject=user_id,
            claims=claims
        )

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user_id=user_id,
            full_name=membership.user.full_name,
            school_id=membership.school_id,
            school_code=membership.school.code,
            school_name=membership.school.name,
            school_membership_id=membership.id,
            roles=roles,
            permissions=permissions
        )

