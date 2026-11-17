# School Management Platform — API Architecture & Design

This document details the REST API conventions, authentication flows, layered architecture, and endpoint specifications for the FastAPI backend.

---

## 1. Architectural Principles

### 1.1 Layered Architecture
Each layer in the backend has a single, well-defined responsibility:

$$\text{HTTP Request} \longrightarrow \mathbf{Router} \longrightarrow \mathbf{Service} \longrightarrow \mathbf{Repository} \longrightarrow \mathbf{PostgreSQL}$$

1. **Routers (`app/api/v1/`)**: Defines HTTP verbs, paths, status codes, and input/output Pydantic schemas.
2. **Services (`app/services/`)**: Business logic, transactional boundaries, validation rules, and permission/data-scope checks.
3. **Repositories (`app/repositories/`)**: Database CRUD operations via SQLAlchemy.
4. **Schemas (`app/schemas/`)**: Pydantic models for request validation and response serialisation.
5. **Core (`app/core/`)**: Configuration (`.env`), JWT token handling, security, and FastAPI dependency injection.

### 1.2 Tenant & Active Context Handling
* The API does **not** expose `school_id` in URL paths.
* When a user logs in, the backend issues a signed JWT containing:
  * `sub`: User ID
  * `membership_id`: Active `school_membership_id`
  * `school_id`: The school tenant ID
  * `roles`: List of assigned role names in this school
  * `permissions`: List of atomic permission codes
* All subsequent API calls pass:
  ```http
  Authorization: Bearer <access_token>
  ```
* A FastAPI dependency `get_current_membership` automatically extracts and validates the tenant context for every protected route.

---

## 2. Authentication & Context Endpoints (`/api/v1/auth`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Authenticate using `school_user_code` and password. Returns JWT with active school context. | No |
| `GET` | `/api/v1/auth/me` | Fetch currently authenticated user profile, active school, role, and permissions. | Yes |
| `GET` | `/api/v1/auth/memberships` | List all school memberships held by this user account (for multi-school users). | Yes |
| `POST` | `/api/v1/auth/switch-context` | Switch active school context; issues a fresh JWT scoped to the new membership. | Yes |

---

## 3. Academic Structure Endpoints (`/api/v1/academic`)

| Method | Endpoint | Description | Permission Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/academic-years` | List academic years for the current school. | `academic.view` |
| `POST` | `/api/v1/academic-years` | Create a new academic year session (enforces partial unique index for active year). | `academic.manage` |
| `GET` | `/api/v1/classes` | List permanent grade levels ordered by `display_order`. | `academic.view` |
| `POST` | `/api/v1/classes` | Create a permanent grade level. | `academic.manage` |
| `GET` | `/api/v1/sections` | List active sections for a specific academic year/class. | `academic.view` |
| `POST` | `/api/v1/sections` | Create an active section in a class/year with capacity and homeroom teacher. | `academic.manage` |

---

## 4. Subject & Data Scope Endpoints (`/api/v1/curriculum`)

| Method | Endpoint | Description | Permission Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/subjects` | List subjects offered by the school. | `curriculum.view` |
| `POST` | `/api/v1/subjects` | Add a new subject to the school catalog. | `curriculum.manage` |
| `GET` | `/api/v1/sections/{id}/teachers` | View subject teachers assigned to a section. | `curriculum.view` |
| `POST` | `/api/v1/sections/{id}/teachers` | Assign a teacher to teach a subject in this section (**Data Scope link**). | `curriculum.manage` |

---

## 5. Student & Enrollment Endpoints (`/api/v1/students`)

| Method | Endpoint | Description | Permission Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/students` | Admit a new student (creates permanent profile with unique admission number). | `student.admit` |
| `GET` | `/api/v1/students` | Search and filter student directory. | `student.view` |
| `GET` | `/api/v1/students/{id}` | Get full student details. | `student.view` |
| `POST` | `/api/v1/students/{id}/enroll` | Enroll student into a section for an academic year with roll number. | `student.enroll` |
| `GET` | `/api/v1/sections/{id}/roster` | Fetch the complete student roster for a section. | `student.view` |

---

## 6. Standard Error Format

All error responses adhere to a consistent JSON structure:
```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You do not have permission to mark attendance for this section.",
    "details": null
  }
}
```

