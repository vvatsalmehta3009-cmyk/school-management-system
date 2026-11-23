import csv
from datetime import date, datetime
import io
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.security import PasswordHasher, password_hasher
from app.models.academic import AcademicYear, SchoolClass, Section
from app.models.membership import SchoolMembership
from app.models.rbac import Role, UserRole
from app.models.student import Student, StudentEnrollment
from app.models.user import User
from app.schemas.user import (
    BulkUploadResponse,
    BulkUploadResultItem,
    BulkUploadRowError,
    RoleResponse,
    UserCreateRequest,
    UserMemberResponse,
)


def generate_default_password(name_or_full_name: str) -> str:
    """
    Generates a standardized default password for new users: FirstName@123
    Example: 'Priya Sharma' -> 'Priya@123'
    """
    parts = name_or_full_name.strip().split()
    first_name = "".join(ch for ch in parts[0] if ch.isalnum()).capitalize() if parts else "User"
    return f"{first_name or 'User'}@123"


class UserService:
    """
    Class-based service handling user creation, school membership provisioning,
    role assignments, and bulk CSV uploads within a school tenant.
    """
    def __init__(self, db: Session, hasher: PasswordHasher = password_hasher) -> None:
        self.db = db
        self.hasher = hasher

    def list_roles(self) -> list[RoleResponse]:
        """Fetch all standard roles available in the platform."""
        roles = self.db.scalars(select(Role).order_by(Role.id)).all()
        return [RoleResponse.model_validate(r) for r in roles]

    def list_school_users(self, school_id: int) -> list[UserMemberResponse]:
        """Fetch all member accounts registered under the specified school."""
        query = (
            select(SchoolMembership)
            .where(SchoolMembership.school_id == school_id)
            .options(
                selectinload(SchoolMembership.user),
                selectinload(SchoolMembership.user_roles).selectinload(UserRole.role)
            )
            .order_by(SchoolMembership.id.asc())
        )
        memberships = self.db.scalars(query).all()

        results: list[UserMemberResponse] = []
        for m in memberships:
            role_names = [ur.role.name for ur in m.user_roles if ur.role]
            results.append(
                UserMemberResponse(
                    membership_id=m.id,
                    user_id=m.user.id,
                    school_id=m.school_id,
                    school_user_code=m.school_user_code or f"USER_{m.id}",
                    full_name=m.user.full_name,
                    email=m.user.email,
                    phone=m.user.phone,
                    status=m.status,
                    roles=role_names,
                    created_at=m.created_at
                )
            )
        return results

    def create_school_user(
        self,
        school_id: int,
        school_code: str,
        data: UserCreateRequest
    ) -> UserMemberResponse:
        """
        Creates a User (if not existing), links them to this school via SchoolMembership,
        auto-generates school_user_code, and assigns designated roles.
        """
        roles = self.db.scalars(select(Role).where(Role.id.in_(data.role_ids))).all()
        if len(roles) != len(data.role_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more selected Role IDs are invalid."
            )

        try:
            user = None
            if data.email:
                user = self.db.scalars(select(User).where(User.email == data.email.strip())).first()

            if not user:
                raw_password = (
                    data.password.strip()
                    if (data.password and data.password.strip())
                    else generate_default_password(data.full_name)
                )
                user = User(
                    full_name=data.full_name.strip(),
                    email=data.email.strip() if data.email else None,
                    phone=data.phone.strip() if data.phone else None,
                    password_hash=self.hasher.hash(raw_password),
                    must_change_password=True,
                    is_active=True
                )
                self.db.add(user)
                self.db.flush()
            else:
                existing_membership = self.db.scalars(
                    select(SchoolMembership).where(
                        SchoolMembership.user_id == user.id,
                        SchoolMembership.school_id == school_id
                    )
                ).first()
                if existing_membership:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"User '{user.full_name}' is already a member of this school (Code: {existing_membership.school_user_code})."
                    )

            membership = SchoolMembership(
                user_id=user.id,
                school_id=school_id,
                status="active"
            )
            self.db.add(membership)
            self.db.flush()

            clean_code = school_code.strip().upper()
            membership.school_user_code = f"{clean_code}{str(membership.id).zfill(6)}"
            self.db.flush()

            assigned_role_names: list[str] = []
            for r in roles:
                user_role = UserRole(
                    school_membership_id=membership.id,
                    role_id=r.id
                )
                self.db.add(user_role)
                assigned_role_names.append(r.name)

            self.db.commit()

            return UserMemberResponse(
                membership_id=membership.id,
                user_id=user.id,
                school_id=membership.school_id,
                school_user_code=membership.school_user_code,
                full_name=user.full_name,
                email=user.email,
                phone=user.phone,
                status=membership.status,
                roles=assigned_role_names,
                created_at=membership.created_at
            )

        except HTTPException:
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create user: {str(e)}"
            )

    def assign_role(self, school_id: int, membership_id: int, role_id: int) -> UserMemberResponse:
        """Assign an additional role to an existing school member."""
        membership = self.db.scalars(
            select(SchoolMembership).where(
                SchoolMembership.id == membership_id,
                SchoolMembership.school_id == school_id
            ).options(
                selectinload(SchoolMembership.user),
                selectinload(SchoolMembership.user_roles).selectinload(UserRole.role)
            )
        ).first()

        if not membership:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"School membership #{membership_id} not found."
            )

        role = self.db.scalars(select(Role).where(Role.id == role_id)).first()
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Role #{role_id} not found."
            )

        existing = self.db.scalars(
            select(UserRole).where(
                UserRole.school_membership_id == membership_id,
                UserRole.role_id == role_id
            )
        ).first()

        if not existing:
            user_role = UserRole(
                school_membership_id=membership_id,
                role_id=role_id
            )
            self.db.add(user_role)
            self.db.commit()

        # Return updated member
        return self.list_school_users(school_id)[0]

    def bulk_upload_staff(
        self,
        school_id: int,
        school_code: str,
        csv_content: str
    ) -> BulkUploadResponse:
        """
        Parses CSV and creates user accounts, school memberships, and role assignments for staff.
        Expected headers: full_name, email, phone, role, password
        """
        reader = csv.DictReader(io.StringIO(csv_content.strip()))
        if not reader.fieldnames:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty or invalid CSV file.")

        all_roles = self.db.scalars(select(Role)).all()
        role_lookup = {r.name.lower(): r for r in all_roles}

        created_items: list[BulkUploadResultItem] = []
        errors: list[BulkUploadRowError] = []
        row_num = 1

        for row in reader:
            row_num += 1
            cleaned_row = {k.strip().lower(): v.strip() for k, v in row.items() if k}
            full_name = cleaned_row.get("full_name") or cleaned_row.get("name")
            role_name = cleaned_row.get("role") or cleaned_row.get("role_name")
            email = cleaned_row.get("email") or None
            phone = cleaned_row.get("phone") or None
            raw_pwd = cleaned_row.get("password")
            password = raw_pwd.strip() if (raw_pwd and raw_pwd.strip()) else generate_default_password(full_name)

            if not full_name:
                errors.append(BulkUploadRowError(row_number=row_num, data=row, error="Missing required field: full_name"))
                continue

            if not role_name or role_name.lower() not in role_lookup:
                errors.append(BulkUploadRowError(
                    row_number=row_num,
                    data=row,
                    error=f"Invalid role '{role_name}'. Available: {', '.join([r.name for r in all_roles])}"
                ))
                continue

            target_role = role_lookup[role_name.lower()]

            try:
                with self.db.begin_nested():
                    user = None
                    if email:
                        user = self.db.scalars(select(User).where(User.email == email)).first()

                    if not user:
                        user = User(
                            full_name=full_name,
                            email=email,
                            phone=phone,
                            password_hash=self.hasher.hash(password),
                            must_change_password=True,
                            is_active=True
                        )
                        self.db.add(user)
                        self.db.flush()
                    else:
                        existing = self.db.scalars(
                            select(SchoolMembership).where(
                                SchoolMembership.user_id == user.id,
                                SchoolMembership.school_id == school_id
                            )
                        ).first()
                        if existing:
                            errors.append(BulkUploadRowError(
                                row_number=row_num,
                                data=row,
                                error=f"User '{full_name}' ({email}) is already a member (Code: {existing.school_user_code})"
                            ))
                            continue

                    membership = SchoolMembership(
                        user_id=user.id,
                        school_id=school_id,
                        status="active"
                    )
                    self.db.add(membership)
                    self.db.flush()

                    clean_code = school_code.strip().upper()
                    membership.school_user_code = f"{clean_code}{str(membership.id).zfill(6)}"
                    self.db.flush()

                    user_role = UserRole(
                        school_membership_id=membership.id,
                        role_id=target_role.id
                    )
                    self.db.add(user_role)

                self.db.commit()
                created_items.append(
                    BulkUploadResultItem(
                        row_number=row_num,
                        school_user_code=membership.school_user_code,
                        full_name=user.full_name,
                        roles=[target_role.name]
                    )
                )

            except Exception as e:
                self.db.rollback()
                errors.append(BulkUploadRowError(row_number=row_num, data=row, error=str(e)))

        return BulkUploadResponse(
            total_rows=len(created_items) + len(errors),
            successful_count=len(created_items),
            failed_count=len(errors),
            created_users=created_items,
            errors=errors
        )

    def bulk_upload_students(
        self,
        school_id: int,
        school_code: str,
        csv_content: str
    ) -> BulkUploadResponse:
        """
        Parses CSV and creates Student profile records (+ optional portal login User account).
        Expected headers: admission_number, first_name, last_name, date_of_birth, gender, blood_group, admission_date, email, phone, password
        """
        reader = csv.DictReader(io.StringIO(csv_content.strip()))
        if not reader.fieldnames:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty or invalid CSV file.")

        student_role = self.db.scalars(select(Role).where(Role.name == "Student")).first()

        created_items: list[BulkUploadResultItem] = []
        errors: list[BulkUploadRowError] = []
        row_num = 1

        for row in reader:
            row_num += 1
            cleaned_row = {k.strip().lower(): v.strip() for k, v in row.items() if k}
            adm_no = cleaned_row.get("admission_number") or cleaned_row.get("admission_no")
            first_name = cleaned_row.get("first_name")
            last_name = cleaned_row.get("last_name") or ""
            dob_str = cleaned_row.get("date_of_birth") or cleaned_row.get("dob")
            gender = cleaned_row.get("gender", "other").lower()
            blood_group = cleaned_row.get("blood_group")
            adm_date_str = cleaned_row.get("admission_date")
            email = cleaned_row.get("email") or cleaned_row.get("student_email") or None
            phone = cleaned_row.get("phone") or cleaned_row.get("parent_phone") or None
            raw_pwd = cleaned_row.get("password")
            password = raw_pwd.strip() if (raw_pwd and raw_pwd.strip()) else generate_default_password(first_name)
            class_name = cleaned_row.get("class_name") or cleaned_row.get("class") or cleaned_row.get("grade")
            section_name = cleaned_row.get("section_name") or cleaned_row.get("section") or cleaned_row.get("stream")

            if not adm_no or not first_name:
                errors.append(BulkUploadRowError(row_number=row_num, data=row, error="Missing required admission_number or first_name"))
                continue

            existing_student = self.db.scalars(
                select(Student).where(
                    Student.school_id == school_id,
                    Student.admission_number == adm_no
                )
            ).first()
            if existing_student:
                errors.append(BulkUploadRowError(row_number=row_num, data=row, error=f"Admission number '{adm_no}' already exists."))
                continue

            dob = None
            if dob_str:
                try:
                    dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
                except ValueError:
                    errors.append(BulkUploadRowError(row_number=row_num, data=row, error=f"Invalid date_of_birth '{dob_str}'. Expected YYYY-MM-DD."))
                    continue

            adm_date = date.today()
            if adm_date_str:
                try:
                    adm_date = datetime.strptime(adm_date_str, "%Y-%m-%d").date()
                except ValueError:
                    adm_date = date.today()

            try:
                with self.db.begin_nested():
                    full_name = f"{first_name} {last_name}".strip()
                    user = None
                    membership = None

                    if email or phone:
                        user = User(
                            full_name=full_name,
                            email=email,
                            phone=phone,
                            password_hash=self.hasher.hash(password),
                            must_change_password=True,
                            is_active=True
                        )
                        self.db.add(user)
                        self.db.flush()

                        membership = SchoolMembership(
                            user_id=user.id,
                            school_id=school_id,
                            status="active"
                        )
                        self.db.add(membership)
                        self.db.flush()

                        clean_code = school_code.strip().upper()
                        membership.school_user_code = f"{clean_code}{str(membership.id).zfill(6)}"
                        self.db.flush()

                        if student_role:
                            self.db.add(UserRole(school_membership_id=membership.id, role_id=student_role.id))

                    student = Student(
                        school_id=school_id,
                        user_id=user.id if user else None,
                        admission_number=adm_no,
                        first_name=first_name,
                        last_name=last_name,
                        date_of_birth=dob,
                        gender=gender if gender in ("male", "female", "other") else "other",
                        blood_group=blood_group,
                        admission_date=adm_date,
                        status="active"
                    )
                    self.db.add(student)
                    self.db.flush()

                    # Auto-enroll into class section if provided
                    if class_name and section_name:
                        active_year = self.db.scalars(
                            select(AcademicYear).where(
                                AcademicYear.school_id == school_id,
                                AcademicYear.is_current == True
                            )
                        ).first()
                        if not active_year:
                            active_year = self.db.scalars(
                                select(AcademicYear).where(AcademicYear.school_id == school_id)
                                .order_by(AcademicYear.start_date.desc())
                            ).first()

                        target_class = self.db.scalars(
                            select(SchoolClass).where(
                                SchoolClass.school_id == school_id,
                                func.lower(SchoolClass.name) == class_name.lower()
                            )
                        ).first()

                        if target_class and active_year:
                            target_section = self.db.scalars(
                                select(Section).where(
                                    Section.class_id == target_class.id,
                                    Section.academic_year_id == active_year.id,
                                    func.lower(Section.name) == section_name.lower()
                                )
                            ).first()

                            if target_section:
                                enrollment = StudentEnrollment(
                                    student_id=student.id,
                                    section_id=target_section.id,
                                    academic_year_id=active_year.id,
                                    status="enrolled"
                                )
                                self.db.add(enrollment)

                self.db.commit()
                created_items.append(
                    BulkUploadResultItem(
                        row_number=row_num,
                        school_user_code=membership.school_user_code if membership else adm_no,
                        full_name=full_name,
                        roles=["Student"]
                    )
                )

            except Exception as e:
                self.db.rollback()
                errors.append(BulkUploadRowError(row_number=row_num, data=row, error=str(e)))

        return BulkUploadResponse(
            total_rows=len(created_items) + len(errors),
            successful_count=len(created_items),
            failed_count=len(errors),
            created_users=created_items,
            errors=errors
        )
