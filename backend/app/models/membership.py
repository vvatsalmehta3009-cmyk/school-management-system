from typing import TYPE_CHECKING
from datetime import datetime
from sqlalchemy import BigInteger, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.teacher import TeacherProfile, TeacherSubject, TeacherClass


class SchoolMembership(Base):
    __tablename__ = "school_memberships"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    school_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("schools.id", ondelete="RESTRICT"), nullable=False)
    school_user_code: Mapped[str | None] = mapped_column(String(30), unique=True, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    left_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="memberships")
    school: Mapped["School"] = relationship("School", back_populates="memberships")
    user_roles: Mapped[list["UserRole"]] = relationship("UserRole", back_populates="membership")
    teacher_profile: Mapped["TeacherProfile | None"] = relationship("TeacherProfile", back_populates="membership", uselist=False, cascade="all, delete-orphan")
    teacher_subjects: Mapped[list["TeacherSubject"]] = relationship("TeacherSubject", back_populates="membership", cascade="all, delete-orphan")
    teacher_classes: Mapped[list["TeacherClass"]] = relationship("TeacherClass", back_populates="membership", cascade="all, delete-orphan")


