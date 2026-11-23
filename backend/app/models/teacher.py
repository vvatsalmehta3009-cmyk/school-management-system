from datetime import datetime
from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class TeacherProfile(Base):
    __tablename__ = "teacher_profiles"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    school_membership_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("school_memberships.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    qualification: Mapped[str | None] = mapped_column(String(150), nullable=True)
    designation: Mapped[str | None] = mapped_column(String(100), nullable=True)
    experience_years: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    membership: Mapped["SchoolMembership"] = relationship("SchoolMembership", back_populates="teacher_profile")


class TeacherSubject(Base):
    __tablename__ = "teacher_subjects"

    teacher_membership_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("school_memberships.id", ondelete="CASCADE"), primary_key=True
    )
    subject_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("subjects.id", ondelete="CASCADE"), primary_key=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    membership: Mapped["SchoolMembership"] = relationship("SchoolMembership", back_populates="teacher_subjects")
    subject: Mapped["Subject"] = relationship("Subject")


class TeacherClass(Base):
    __tablename__ = "teacher_classes"

    teacher_membership_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("school_memberships.id", ondelete="CASCADE"), primary_key=True
    )
    class_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("classes.id", ondelete="CASCADE"), primary_key=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    membership: Mapped["SchoolMembership"] = relationship("SchoolMembership", back_populates="teacher_classes")
    school_class: Mapped["SchoolClass"] = relationship("SchoolClass")
