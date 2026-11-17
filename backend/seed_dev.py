import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent))

from sqlalchemy import select
from app.core.database import db_manager
from app.core.security import password_hasher
from app.models.user import User
from app.models.membership import SchoolMembership
from app.models.rbac import Role, UserRole


def seed() -> None:
    session = db_manager.session_factory()
    try:
        # 1. Update John Doe's password to 'Password123!'
        john = session.scalars(select(User).where(User.id == 1)).first()
        if john:
            john.password_hash = password_hasher.hash("Password123!")
            print("Updated John Doe's password to 'Password123!'")

        # 2. Assign Teacher role (role_id=4) to John Doe's membership (id=1, code='ABC000001')
        membership = session.scalars(select(SchoolMembership).where(SchoolMembership.id == 1)).first()
        teacher_role = session.scalars(select(Role).where(Role.name == "Teacher")).first()

        if membership and teacher_role:
            user_role = session.scalars(
                select(UserRole).where(
                    UserRole.school_membership_id == membership.id,
                    UserRole.role_id == teacher_role.id
                )
            ).first()
            if not user_role:
                session.add(UserRole(school_membership_id=membership.id, role_id=teacher_role.id))
                print(f"Assigned Teacher role to membership {membership.school_user_code}")
            else:
                print(f"Teacher role already assigned to membership {membership.school_user_code}")

        session.commit()
        print("\n=== Test User Ready for API Testing ===")
        print("  School:            ABC School (code: ABC)")
        print("  School User Code:  ABC000001")
        print("  Password:          Password123!")
        print("  User:              John Doe")
        print("  Role:              Teacher")
        print("  Permissions:       attendance.view, attendance.mark, students.view")
    except Exception as e:
        session.rollback()
        print("Error during seed:", e)
    finally:
        session.close()


if __name__ == "__main__":
    seed()
