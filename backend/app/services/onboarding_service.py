from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import PasswordHasher, TokenService, password_hasher, token_service
from app.models.membership import SchoolMembership
from app.models.rbac import Role, UserRole
from app.models.school import School
from app.models.user import User
from app.schemas.onboarding import SchoolOnboardingRequest, SchoolOnboardingResponse


class OnboardingService:
    """
    Class-based Service handling the 'Cold Start' registration:
    atomically creates the School tenant, Admin User, School Membership,
    generates the school_user_code, and assigns the School Admin role.
    """
    def __init__(
        self,
        db: Session,
        hasher: PasswordHasher = password_hasher,
        tokens: TokenService = token_service
    ) -> None:
        self.db = db
        self.hasher = hasher
        self.tokens = tokens

    def register_school(self, data: SchoolOnboardingRequest) -> SchoolOnboardingResponse:
        clean_code = data.school_code.strip().upper()

        # 1. Guard: School code uniqueness
        existing_school = self.db.scalars(
            select(School).where(School.code == clean_code)
        ).first()
        if existing_school:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"School with code '{clean_code}' already exists."
            )

        try:
            # 2. Insert School
            school = School(
                name=data.school_name.strip(),
                code=clean_code,
                email=str(data.school_email) if data.school_email else None,
                phone=data.school_phone,
                address=data.school_address,
                is_active=True
            )
            self.db.add(school)
            self.db.flush()  # Generates school.id

            # 3. Create or reuse User account for the admin
            admin_user = self.db.scalars(
                select(User).where(User.email == str(data.admin_email))
            ).first()

            if not admin_user:
                admin_user = User(
                    full_name=data.admin_name.strip(),
                    email=str(data.admin_email),
                    phone=data.admin_phone,
                    password_hash=self.hasher.hash(data.admin_password),
                    is_active=True
                )
                self.db.add(admin_user)
                self.db.flush()  # Generates admin_user.id
            else:
                # Update password if existing account
                admin_user.password_hash = self.hasher.hash(data.admin_password)
                admin_user.is_active = True

            # 4. Create School Membership (Admin linked to this school)
            membership = SchoolMembership(
                user_id=admin_user.id,
                school_id=school.id,
                status="active"
            )
            self.db.add(membership)
            self.db.flush()  # Generates membership.id

            # 5. Generate school-specific login code: e.g. APEX000001
            membership.school_user_code = f"{clean_code}{str(membership.id).zfill(6)}"
            self.db.flush()

            # 6. Assign 'School Admin' Role
            admin_role = self.db.scalars(
                select(Role).where(Role.name == "School Admin")
            ).first()

            if not admin_role:
                # If role table is empty, create standard School Admin role
                admin_role = Role(name="School Admin", code="SCHOOL_ADMIN", description="School Administrator", is_system=True)
                self.db.add(admin_role)
                self.db.flush()

            user_role = UserRole(
                school_membership_id=membership.id,
                role_id=admin_role.id
            )
            self.db.add(user_role)

            # 7. Commit atomic transaction
            self.db.commit()

            # 8. Mint initial JWT token so the admin is immediately authenticated!
            claims = {
                "membership_id": membership.id,
                "school_id": school.id,
                "school_code": school.code,
                "roles": ["School Admin"],
                "permissions": ["*"],  # Full school admin access
            }
            access_token = self.tokens.create_access_token(
                subject=admin_user.id,
                claims=claims
            )

            return SchoolOnboardingResponse(
                school_id=school.id,
                school_name=school.name,
                school_code=school.code,
                admin_user_id=admin_user.id,
                admin_membership_id=membership.id,
                admin_school_user_code=membership.school_user_code,
                admin_role="School Admin",
                access_token=access_token
            )

        except Exception as e:
            self.db.rollback()
            raise e
