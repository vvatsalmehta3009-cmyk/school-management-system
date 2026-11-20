-- ==============================================================================
-- School Management Platform - Complete Database Schema & Seed Data
-- Target Database: PostgreSQL 14+ (Compatible with Local PostgreSQL, Neon, Supabase, AWS RDS)
-- ==============================================================================

-- 1. SCHOOLS (Multi-Tenant Root)
CREATE TABLE IF NOT EXISTS schools (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. USERS (Identity accounts across the platform)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    password_hash TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_super_admin BOOLEAN DEFAULT FALSE NOT NULL,
    must_change_password BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. SCHOOL MEMBERSHIPS (Tenant scoping linking User to School with unique user code)
CREATE TABLE IF NOT EXISTS school_memberships (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    school_user_code VARCHAR(50) UNIQUE,
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    joined_at DATE DEFAULT CURRENT_DATE NOT NULL,
    left_at DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_membership_user_school UNIQUE (user_id, school_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_school ON school_memberships(school_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON school_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_code ON school_memberships(school_user_code);

-- 4. ROLES (RBAC Roles: System & School-customizable)
CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE,
    description TEXT,
    is_system BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. PERMISSIONS (Atomic capability keys)
CREATE TABLE IF NOT EXISTS permissions (
    id BIGSERIAL PRIMARY KEY,
    module VARCHAR(50) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. ROLE_PERMISSIONS (M2M Role to Permissions)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (role_id, permission_id)
);

-- 7. USER_ROLES (M2M Membership to Roles)
CREATE TABLE IF NOT EXISTS user_roles (
    school_membership_id BIGINT NOT NULL REFERENCES school_memberships(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (school_membership_id, role_id)
);

-- 8. ACADEMIC YEARS (School sessions)
CREATE TABLE IF NOT EXISTS academic_years (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_academic_years_school ON academic_years(school_id);

-- 9. CLASSES (Permanent Grade levels, e.g. Grade 1, Grade 10)
CREATE TABLE IF NOT EXISTS classes (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    name VARCHAR(50) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);

-- 10. SUBJECTS (Master Subject / Course Catalog)
CREATE TABLE IF NOT EXISTS subjects (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_school_subject_code UNIQUE (school_id, code)
);

CREATE INDEX IF NOT EXISTS idx_subjects_school ON subjects(school_id);

-- 11. SECTIONS (Session-specific cohort classrooms, e.g. Grade 10 - Section A)
CREATE TABLE IF NOT EXISTS sections (
    id BIGSERIAL PRIMARY KEY,
    academic_year_id BIGINT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    name VARCHAR(20) NOT NULL,
    capacity INTEGER,
    class_teacher_membership_id BIGINT REFERENCES school_memberships(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_section_year_class_name UNIQUE (academic_year_id, class_id, name)
);

CREATE INDEX IF NOT EXISTS idx_sections_year ON sections(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_sections_class ON sections(class_id);

-- 12. SECTION_SUBJECT_TEACHERS (Teaching Allocation Matrix)
CREATE TABLE IF NOT EXISTS section_subject_teachers (
    id BIGSERIAL PRIMARY KEY,
    section_id BIGINT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    subject_id BIGINT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    teacher_membership_id BIGINT NOT NULL REFERENCES school_memberships(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_section_subject UNIQUE (section_id, subject_id)
);

-- 13. STUDENTS (Permanent student identity records)
CREATE TABLE IF NOT EXISTS students (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    admission_number VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL,
    blood_group VARCHAR(5),
    admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_school_admission_number UNIQUE (school_id, admission_number)
);

CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_admission ON students(school_id, admission_number);

-- 14. STUDENT_ENROLLMENTS (Annual session & section allocation for students)
CREATE TABLE IF NOT EXISTS student_enrollments (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    section_id BIGINT NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
    academic_year_id BIGINT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    roll_number INTEGER,
    enrolled_at DATE DEFAULT CURRENT_DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'enrolled' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_student_year_enrollment UNIQUE (student_id, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_section ON student_enrollments(section_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_year ON student_enrollments(academic_year_id);

-- ==============================================================================
-- SEED DATA: Standard Roles
-- ==============================================================================
INSERT INTO roles (id, name, code, description, is_system) VALUES
(1, 'Super Admin', 'super_admin', 'Full platform super administrator with global cross-tenant privileges', TRUE),
(2, 'School Admin', 'school_admin', 'Principal or tenant administrator with complete administrative control over their school', TRUE),
(3, 'Principal', 'principal', 'Academic head with oversight over classes, curriculum, staff, and student progress', TRUE),
(4, 'Teacher', 'teacher', 'Faculty member assigned to classes, attendance marking, and grade reporting', TRUE),
(5, 'Accountant', 'accountant', 'School bursar / finance officer managing fee ledgers, dues, and payment receipts', TRUE),
(6, 'Parent', 'parent', 'Guardian portal account to track student attendance, report cards, and fee receipts', TRUE),
(7, 'Student', 'student', 'Student portal account to view coursework, schedule, grades, and attendance', TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    description = EXCLUDED.description;

SELECT setval('roles_id_seq', (SELECT COALESCE(MAX(id), 1) FROM roles));

-- ==============================================================================
-- SEED DATA: Standard Permissions
-- ==============================================================================
INSERT INTO permissions (id, module, code, description) VALUES
(1, 'attendance', 'attendance.view', 'View daily attendance records'),
(2, 'attendance', 'attendance.mark', 'Record or modify daily attendance'),
(3, 'fees', 'fees.view', 'View fee dues, structures, and transaction history'),
(4, 'fees', 'fees.collect', 'Accept payments and issue fee receipts'),
(5, 'students', 'students.view', 'View student profile and basic records'),
(6, 'students', 'students.create', 'Enroll and create new student profiles'),
(8, 'Academic', 'academic.view', 'View academic years, classes, and sections'),
(9, 'Academic', 'academic.manage', 'Create, update, and manage academic structure'),
(10, 'Students', 'students.manage', 'Manage student records, updates, and promotions'),
(11, 'Staff', 'teachers.view', 'View teacher profiles and teaching assignments'),
(12, 'Staff', 'teachers.manage', 'Manage teachers and section-subject assignments'),
(13, 'Fees', 'fees.manage', 'Configure fee categories, amounts, and structures'),
(14, 'Administration', 'admin.manage', 'Full administrative control over school settings and users')
ON CONFLICT (id) DO UPDATE SET
    module = EXCLUDED.module,
    code = EXCLUDED.code,
    description = EXCLUDED.description;

SELECT setval('permissions_id_seq', (SELECT COALESCE(MAX(id), 1) FROM permissions));

-- ==============================================================================
-- SEED DATA: Role Permissions Mapping
-- ==============================================================================

-- Super Admin & School Admin get all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions ON CONFLICT DO NOTHING;

-- Principal
INSERT INTO role_permissions (role_id, permission_id) VALUES
(3, 1), (3, 2), (3, 5), (3, 6), (3, 8), (3, 9), (3, 10), (3, 11), (3, 12)
ON CONFLICT DO NOTHING;

-- Teacher
INSERT INTO role_permissions (role_id, permission_id) VALUES
(4, 1), (4, 2), (4, 5), (4, 8), (4, 11)
ON CONFLICT DO NOTHING;

-- Accountant
INSERT INTO role_permissions (role_id, permission_id) VALUES
(5, 3), (5, 4), (5, 5), (5, 13)
ON CONFLICT DO NOTHING;

-- Student & Parent
INSERT INTO role_permissions (role_id, permission_id) VALUES
(6, 1), (6, 3), (6, 5), (6, 8),
(7, 1), (7, 5), (7, 8)
ON CONFLICT DO NOTHING;
