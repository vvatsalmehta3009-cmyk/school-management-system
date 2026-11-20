"""
Database Initialization & Seeding Script
Usage:
    cd backend
    python scripts/setup_db.py

This script:
1. Connects to the database specified in your backend/.env (DATABASE_URL)
2. Automatically creates all 14 tables via SQLAlchemy metadata
3. Seeds standard System Roles (Super Admin, School Admin, Teacher, Student, etc.)
4. Seeds standard System Permissions & Role-Permission mappings
"""
import sys
from pathlib import Path

# Add backend directory to path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import select, text
from app.core.database import db_manager, Base
from app.models import (
    School,
    User,
    SchoolMembership,
    Role,
    Permission,
    UserRole,
    RolePermission,
    AcademicYear,
    SchoolClass,
    Section,
    Subject,
    SectionSubjectTeacher,
    Student,
    StudentEnrollment,
)

STANDARD_ROLES = [
    (1, "Super Admin", "super_admin", "Full platform super administrator with global cross-tenant privileges", True),
    (2, "School Admin", "school_admin", "Principal or tenant administrator with complete administrative control over their school", True),
    (3, "Principal", "principal", "Academic head with oversight over classes, curriculum, staff, and student progress", True),
    (4, "Teacher", "teacher", "Faculty member assigned to classes, attendance marking, and grade reporting", True),
    (5, "Accountant", "accountant", "School bursar / finance officer managing fee ledgers, dues, and payment receipts", True),
    (6, "Parent", "parent", "Guardian portal account to track student attendance, report cards, and fee receipts", True),
    (7, "Student", "student", "Student portal account to view coursework, schedule, grades, and attendance", True),
]

STANDARD_PERMISSIONS = [
    (1, "attendance", "attendance.view", "View daily attendance records"),
    (2, "attendance", "attendance.mark", "Record or modify daily attendance"),
    (3, "fees", "fees.view", "View fee dues, structures, and transaction history"),
    (4, "fees", "fees.collect", "Accept payments and issue fee receipts"),
    (5, "students", "students.view", "View student profile and basic records"),
    (6, "students", "students.create", "Enroll and create new student profiles"),
    (8, "Academic", "academic.view", "View academic years, classes, and sections"),
    (9, "Academic", "academic.manage", "Create, update, and manage academic structure"),
    (10, "Students", "students.manage", "Manage student records, updates, and promotions"),
    (11, "Staff", "teachers.view", "View teacher profiles and teaching assignments"),
    (12, "Staff", "teachers.manage", "Manage teachers and section-subject assignments"),
    (13, "Fees", "fees.manage", "Configure fee categories, amounts, and structures"),
    (14, "Administration", "admin.manage", "Full administrative control over school settings and users"),
]

ROLE_PERMISSION_MAP = {
    # 1: Super Admin (All permissions)
    1: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14],
    # 2: School Admin (All permissions)
    2: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14],
    # 3: Principal
    3: [1, 2, 5, 6, 8, 9, 10, 11, 12],
    # 4: Teacher
    4: [1, 2, 5, 8, 11],
    # 5: Accountant
    5: [3, 4, 5, 13],
    # 6: Parent
    6: [1, 3, 5, 8],
    # 7: Student
    7: [1, 5, 8],
}


def setup_database():
    print(f"Connecting to database...")
    engine = db_manager.engine

    # 1. Create Tables
    print("Creating tables if they do not exist...")
    Base.metadata.create_all(bind=engine)
    print("✓ All 14 database tables verified/created successfully!")

    # 2. Seed Roles & Permissions
    with db_manager.session_factory() as session:
        print("Checking & seeding standard Roles...")
        for r_id, name, code, desc, is_sys in STANDARD_ROLES:
            existing = session.scalars(select(Role).where(Role.id == r_id)).first()
            if not existing:
                session.add(Role(id=r_id, name=name, code=code, description=desc, is_system=is_sys))
        session.commit()

        # Reset roles sequence
        try:
            session.execute(text("SELECT setval('roles_id_seq', (SELECT COALESCE(MAX(id), 1) FROM roles))"))
            session.commit()
        except Exception:
            pass

        print("Checking & seeding standard Permissions...")
        for p_id, mod, code, desc in STANDARD_PERMISSIONS:
            existing = session.scalars(select(Permission).where(Permission.id == p_id)).first()
            if not existing:
                session.add(Permission(id=p_id, module=mod, code=code, description=desc))
        session.commit()

        # Reset permissions sequence
        try:
            session.execute(text("SELECT setval('permissions_id_seq', (SELECT COALESCE(MAX(id), 1) FROM permissions))"))
            session.commit()
        except Exception:
            pass

        print("Checking & seeding Role-Permission mappings...")
        for role_id, perm_ids in ROLE_PERMISSION_MAP.items():
            for perm_id in perm_ids:
                existing = session.scalars(
                    select(RolePermission).where(
                        RolePermission.role_id == role_id,
                        RolePermission.permission_id == perm_id,
                    )
                ).first()
                if not existing:
                    session.add(RolePermission(role_id=role_id, permission_id=perm_id))
        session.commit()

    print("\n=======================================================")
    print("✓ DATABASE INITIALIZATION COMPLETE!")
    print("All tables and standard RBAC roles/permissions are ready.")
    print("=======================================================\n")


if __name__ == "__main__":
    setup_database()
