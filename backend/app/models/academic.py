from datetime import date, datetime
from sqlalchemy import BigInteger, Boolean, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class AcademicYear(Base):
    __tablename__ = "academic_years"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    school_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("schools.id", ondelete="RESTRICT"), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    sections: Mapped[list["Section"]] = relationship("Section", back_populates="academic_year")


class SchoolClass(Base):
    __tablename__ = "classes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    school_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("schools.id", ondelete="RESTRICT"), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    sections: Mapped[list["Section"]] = relationship("Section", back_populates="school_class")


class Section(Base):
    __tablename__ = "sections"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    academic_year_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("academic_years.id", ondelete="RESTRICT"), nullable=False)
    class_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("classes.id", ondelete="RESTRICT"), nullable=False)
    name: Mapped[str] = mapped_column(String(20), nullable=False)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    class_teacher_membership_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("school_memberships.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear", back_populates="sections")
    school_class: Mapped["SchoolClass"] = relationship("SchoolClass", back_populates="sections")
