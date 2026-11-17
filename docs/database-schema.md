# School Management Platform — Database Schema

This document tracks the evolving database design, entity relationships, and authorization architecture.

---

## Visual ER Diagram

```mermaid
erDiagram
    schools ||--o{ school_memberships : "has"
    schools ||--o{ academic_years : "defines"
    schools ||--o{ classes : "offers"
    schools ||--o{ subjects : "offers"
    academic_years ||--o{ sections : "contains"
    classes ||--o{ sections : "divided_into"
    school_memberships ||--o{ sections : "class_teacher_of"
    sections ||--o{ section_subject_teachers : "has"
    subjects ||--o{ section_subject_teachers : "taught_in"
    school_memberships ||--o{ section_subject_teachers : "assigned_to"
    schools ||--o{ students : "admits"
    users ||--o| students : "optional_login"
    students ||--o{ student_enrollments : "placed_in"
    sections ||--o{ student_enrollments : "contains"
    academic_years ||--o{ student_enrollments : "during"
    users ||--o{ school_memberships : "holds"
    school_memberships ||--o{ user_roles : "assigned"
    roles ||--o{ user_roles : "granted_via"
    roles ||--o{ role_permissions : "has"
    permissions ||--o{ role_permissions : "included_in"

    schools {
        bigint id PK
        varchar name
        varchar code "UK"
        varchar email
        varchar phone
        text address
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    academic_years {
        bigint id PK
        bigint school_id FK
        varchar name
        date start_date
        date end_date
        boolean is_current
        timestamptz created_at
        timestamptz updated_at
    }

    classes {
        bigint id PK
        bigint school_id FK
        varchar name
        int display_order
        timestamptz created_at
        timestamptz updated_at
    }

    sections {
        bigint id PK
        bigint academic_year_id FK
        bigint class_id FK
        varchar name
        int capacity
        bigint class_teacher_membership_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    subjects {
        bigint id PK
        bigint school_id FK
        varchar name
        varchar code "UK"
        timestamptz created_at
        timestamptz updated_at
    }

    section_subject_teachers {
        bigint id PK
        bigint section_id FK
        bigint subject_id FK
        bigint teacher_membership_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    users {
        bigint id PK
        varchar full_name
        varchar email
        varchar phone
        text password_hash
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    school_memberships {
        bigint id PK
        bigint user_id FK
        bigint school_id FK
        varchar school_user_code "UK"
        varchar status
        timestamptz joined_at
        timestamptz left_at
        timestamptz created_at
    }

    roles {
        bigint id PK
        varchar name "UK"
        text description
        timestamptz created_at
    }

    permissions {
        bigint id PK
        varchar code "UK"
        text description
        timestamptz created_at
    }

    students {
        bigint id PK
        bigint school_id FK
        bigint user_id FK
        varchar admission_number "UK"
        varchar first_name
        varchar last_name
        date date_of_birth
        varchar gender
        varchar blood_group
        date admission_date
        varchar status
        timestamptz created_at
        timestamptz updated_at
    }

    student_enrollments {
        bigint id PK
        bigint student_id FK
        bigint section_id FK
        bigint academic_year_id FK
        varchar roll_number
        date enrolled_at
        varchar status
        timestamptz created_at
        timestamptz updated_at
    }

    user_roles {
        bigint id PK
        bigint school_membership_id FK
        bigint role_id FK
        timestamptz created_at
    }

    role_permissions {
        bigint id PK
        bigint role_id FK
        bigint permission_id FK
        timestamptz created_at
    }
```

---

## Table Definitions & Responsibilities

### Core Identity & Tenancy Tables

#### 1. `schools`
* **Responsibility:** Multi-tenant container. Represents individual schools (e.g., `ABC School`, `XYZ School`).
* **Key Columns:** `id` (PK), `code` (UNIQUE, e.g. `ABC001`), `name`, `is_active`.

#### 2. `users`
* **Responsibility:** Global account identity (login credentials, person profile).
* **Key Columns:** `id` (PK), `full_name`, `email` (nullable, not globally unique), `phone`, `password_hash`.
* **Design Rule:** Deliberately contains **no** `school_id` so an account can belong to multiple schools.

#### 3. `school_memberships`
* **Responsibility:** Links a user account to a specific school tenant.
* **Key Columns:** `id` (PK), `user_id` (FK), `school_id` (FK), `school_user_code` (UNIQUE per membership, e.g. `ABC001000501`), `status` (`active`, `inactive`, `pending`).

---

### Academic Structure & Data Scope Tables

#### 4. `academic_years`
* **Responsibility:** Tracks temporal sessions/years per school (e.g., `"2026-2027"`).
* **Key Columns:** `id` (PK), `school_id` (FK), `name`, `start_date`, `end_date`, `is_current`.
* **Integrity Constraints:**
  * `uq_school_academic_year_name`: `UNIQUE(school_id, name)` — Prevents duplicate session names for the same school.
  * `chk_academic_year_dates`: `CHECK(end_date > start_date)` — Enforces chronological date order.
  * `uq_one_current_year_per_school`: **Partial Unique Index** on `(school_id) WHERE is_current = TRUE` — Enforces at most one active year per school.

#### 5. `classes`
* **Responsibility:** Permanent grade/standard levels offered by a school (e.g., `Grade 9`, `Grade 10`).
* **Key Columns:** `id` (PK), `school_id` (FK), `name`, `display_order`, `created_at`, `updated_at`.
* **Integrity Constraints:**
  * `uq_school_class_name`: `UNIQUE(school_id, name)` — Prevents duplicate class names within a school.
  * `idx_classes_school_order`: Index on `(school_id, display_order)` for proper UI sorting and promotion logic.

#### 6. `sections`
* **Responsibility:** Active cohorts in an academic year (e.g., `Grade 10 - Section A` in `2026-2027`).
* **Key Columns:** `id` (PK), `academic_year_id` (FK), `class_id` (FK), `name` (e.g. `'A'`), `capacity`, `class_teacher_membership_id` (FK -> `school_memberships.id`).
* **Integrity Constraints:**
  * `uq_academic_year_class_section`: `UNIQUE(academic_year_id, class_id, name)` — Prevents duplicate sections in the same class/year.
  * `fk_section_class_teacher`: References `school_memberships(id)` with `ON DELETE SET NULL` to preserve section history if teacher assignment changes.

#### 7. `subjects`
* **Responsibility:** Subject catalog offered by a school (e.g., `Mathematics`, `Physics`, `English`).
* **Key Columns:** `id` (PK), `school_id` (FK), `name`, `code` (e.g. `MATH`), `created_at`, `updated_at`.
* **Integrity Constraints:**
  * `uq_school_subject_code`: `UNIQUE(school_id, code)` — Prevents duplicate subject codes within a school.

#### 8. `section_subject_teachers`
* **Responsibility:** **The Data Scope Junction.** Assigns a specific teacher to teach a subject to a section.
* **Key Columns:** `id` (PK), `section_id` (FK), `subject_id` (FK), `teacher_membership_id` (FK -> `school_memberships.id`).
* **Integrity Constraints:**
  * `uq_section_subject`: `UNIQUE(section_id, subject_id)` — Assigns one designated teacher per subject for that section.
  * `idx_sst_teacher`: Critical index on `(teacher_membership_id)` used to authorize API calls for marking attendance and entering grades.

---

### Student Domain Tables

#### 9. `students`
* **Responsibility:** Permanent student profile created once at admission. Stays unchanged year after year.
* **Key Columns:** `id` (PK), `school_id` (FK), `user_id` (FK, nullable — not every student needs a portal login), `admission_number` (UNIQUE per school), `first_name`, `last_name`, `date_of_birth`, `gender`, `blood_group`, `admission_date`, `status`.
* **Integrity Constraints:**
  * `uq_school_admission_number`: `UNIQUE(school_id, admission_number)` — Prevents duplicate admission numbers within a school.
  * `chk_student_status`: `CHECK(status IN ('active', 'alumni', 'transferred', 'suspended'))`.
  * `chk_student_gender`: `CHECK(gender IN ('male', 'female', 'other'))`.
  * `fk_student_user`: `ON DELETE SET NULL` — If a portal account is removed, the student record survives.

#### 10. `student_enrollments`
* **Responsibility:** Places a student into a specific section for a specific academic year with a roll number. Changes every year when students are promoted.
* **Key Columns:** `id` (PK), `student_id` (FK), `section_id` (FK), `academic_year_id` (FK — controlled denormalization), `roll_number`, `enrolled_at`, `status`.
* **Integrity Constraints:**
  * `uq_student_academic_year`: `UNIQUE(student_id, academic_year_id)` — **One student, one section, one year.** Prevents a student from being enrolled in two sections in the same academic year.
  * `uq_section_roll_number`: `UNIQUE(section_id, roll_number)` — Roll numbers are unique within a section.
  * `chk_enrollment_status`: `CHECK(status IN ('enrolled', 'promoted', 'detained', 'transferred'))`.
* **Design Note:** `academic_year_id` is deliberately stored here even though `section_id` already carries it. This **controlled denormalization** allows the database to enforce the one-student-per-year rule directly, without needing application logic.

---

### Role-Based Access Control (RBAC) Tables

#### 11. `roles`
* **Responsibility:** Standard roles within school context (e.g., `Teacher`, `Principal`, `Accountant`, `Parent`, `Student`).
* **Key Columns:** `id` (PK), `name` (UNIQUE), `description`, `created_at`.

#### 12. `permissions`
* **Responsibility:** Fine-grained atomic actions.
* **Examples:** `attendance.view`, `attendance.mark`, `fees.collect`, `student.register`.
* **Key Columns:** `id` (PK), `code` (UNIQUE), `description`, `created_at`.

#### 13. `user_roles`
* **Responsibility:** Assigns roles to an account **within a specific school**.
* **Key Columns:** `id` (PK), `school_membership_id` (FK -> `school_memberships.id`), `role_id` (FK -> `roles.id`), `created_at`.
* **Crucial Architectural Rule:** References `school_membership_id`, **not** `user_id`. Guarantees school isolation.

#### 14. `role_permissions`
* **Responsibility:** Junction mapping roles to their allowed permissions.
* **Key Columns:** `id` (PK), `role_id` (FK), `permission_id` (FK), `created_at`.
