from datetime import timedelta
from fastapi import HTTPException, status
from sqlalchemy import func, select
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
        Authenticates a user via their unique school_user_code OR email, plus password.
        Returns a signed JWT populated with active school context, roles, and permissions.
        """
        raw_identifier = (credentials.identifier or credentials.school_user_code or "").strip()
        if not raw_identifier:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please provide an email address or school user code."
            )

        # 1. Attempt lookup by school_user_code (case-insensitive code match)
        membership = self.db.scalars(
            select(SchoolMembership)
            .where(func.upper(SchoolMembership.school_user_code) == raw_identifier.upper())
            .options(
                selectinload(SchoolMembership.user),
                selectinload(SchoolMembership.school)
            )
        ).first()

        user = None
        if membership:
            user = membership.user
        else:
            # 2. If not found by user code, lookup user by email (case-insensitive)
            user = self.db.scalars(
                select(User).where(func.lower(User.email) == raw_identifier.lower())
            ).first()

            if user:
                # Find active school memberships for this user
                memberships = self.db.scalars(
                    select(SchoolMembership)
                    .where(
                        SchoolMembership.user_id == user.id,
                        SchoolMembership.status == "active"
                    )
                    .options(
                        selectinload(SchoolMembership.user),
                        selectinload(SchoolMembership.school)
                    )
                    .order_by(SchoolMembership.id.asc())
                ).all()

                if not memberships:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="No active school membership found for this account."
                    )
                membership = memberships[0]

        # 3. Guard: Invalid user or membership
        if not membership or not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email / school user code or password."
            )

        # 4. Guard: User account inactive or missing password hash
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated."
            )

        if not user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password is not set for this account. Please use password reset or invite link."
            )

        # 5. Verify password using bcrypt/argon2
        if not self.hasher.verify(credentials.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email / school user code or password."
            )

        # 6. Guard: Membership inactive or left
        if membership.status != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Your membership at this school is currently {membership.status}."
            )

        # 7. Guard: School inactive
        if not membership.school.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This school account is currently deactivated."
            )

        # 8. Resolve Roles & Atomic Permissions for this specific school membership
        roles, permissions = self._get_membership_roles_and_permissions(membership.id)

        # 8. Create JWT Access Token with embedded tenant context
        is_super_admin = bool(getattr(user, "is_super_admin", False) or "Super Admin" in roles)
        claims = {
            "membership_id": membership.id,
            "school_id": membership.school_id,
            "school_code": membership.school.code,
            "roles": roles,
            "permissions": permissions,
            "must_change_password": bool(user.must_change_password),
            "is_super_admin": is_super_admin,
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
            permissions=permissions,
            must_change_password=bool(user.must_change_password),
            is_super_admin=is_super_admin
        )

    def change_password(self, user_id: int, new_password: str) -> None:
        """
        Updates a user's password and clears the must_change_password requirement.
        """
        user = self.db.scalars(select(User).where(User.id == user_id)).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User account not found."
            )
        user.password_hash = self.hasher.hash(new_password)
        user.must_change_password = False
        self.db.commit()

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

        is_super_admin = bool(getattr(membership.user, "is_super_admin", False) or "Super Admin" in roles)
        claims = {
            "membership_id": membership.id,
            "school_id": membership.school_id,
            "school_code": membership.school.code,
            "roles": roles,
            "permissions": permissions,
            "must_change_password": bool(membership.user.must_change_password),
            "is_super_admin": is_super_admin,
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
            permissions=permissions,
            must_change_password=bool(membership.user.must_change_password),
            is_super_admin=is_super_admin
        )

    def list_platform_schools(self, user_id: int) -> list[dict]:
        """
        Lists all schools registered on the platform. Accessible only by Code / Super Admin.
        """
        user = self.db.scalars(select(User).where(User.id == user_id)).first()
        if not user or not user.is_super_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Only Platform / Code Admin can view all schools."
            )

        schools = self.db.scalars(select(School).order_by(School.name.asc())).all()
        return [
            {
                "id": s.id,
                "name": s.name,
                "code": s.code,
                "email": s.email,
                "phone": s.phone,
                "is_active": s.is_active,
                "created_at": s.created_at,
            }
            for s in schools
        ]

    def enter_school(self, user_id: int, target_school_id: int) -> TokenResponse:
        """
        Allows the Code / Super Admin to jump into ANY school context seamlessly.
        """
        user = self.db.scalars(select(User).where(User.id == user_id)).first()
        if not user or not user.is_super_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Only Platform / Code Admin can enter schools."
            )

        school = self.db.scalars(select(School).where(School.id == target_school_id)).first()
        if not school:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"School #{target_school_id} not found."
            )
        if not school.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This school is currently deactivated."
            )

        membership = self.db.scalars(
            select(SchoolMembership).where(
                SchoolMembership.user_id == user.id,
                SchoolMembership.school_id == school.id
            )
        ).first()

        if not membership:
            membership = SchoolMembership(
                user_id=user.id,
                school_id=school.id,
                status="active"
            )
            self.db.add(membership)
            self.db.flush()
            clean_code = school.code.strip().upper()
            membership.school_user_code = f"{clean_code}{str(membership.id).zfill(6)}"

            admin_roles = self.db.scalars(
                select(Role).where(Role.name.in_(["Super Admin", "School Admin"]))
            ).all()
            for r in admin_roles:
                self.db.add(UserRole(school_membership_id=membership.id, role_id=r.id))
            self.db.commit()

        roles, permissions = self._get_membership_roles_and_permissions(membership.id)
        if "Super Admin" not in roles:
            roles.append("Super Admin")
        if "*" not in permissions:
            permissions.append("*")

        claims = {
            "membership_id": membership.id,
            "school_id": school.id,
            "school_code": school.code,
            "roles": roles,
            "permissions": permissions,
            "must_change_password": False,
            "is_super_admin": True,
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
            school_id=school.id,
            school_code=school.code,
            school_name=school.name,
            school_membership_id=membership.id,
            roles=roles,
            permissions=permissions,
            must_change_password=False,
            is_super_admin=True
        )


