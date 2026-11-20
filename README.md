# School Management Platform

A modern, multi-tenant school management SaaS platform built with **FastAPI** (Python 3.10+) and **React 19 + Vite + TypeScript + Tailwind CSS**, backed by **PostgreSQL**.

---

## 🌟 Key Features

* **Multi-Tenant Architecture:** Strict tenant isolation by School ID and unique School Code (e.g. `HMBS`, `ABC`).
* **Flexible Authentication & Dual Login:** 
  * Sign in using either your **School User Identifier Code** (e.g. `HMBS000001`) or registered **Email Address**.
  * Auto-generated default passwords for new users (`FirstName@123`) with mandatory first-login password reset.
* **Role-Based Access Control (RBAC):** Granular permissions matrix supporting Super Admin, School Admin, Principal, Teacher, Student, Parent, and Accountant.
* **Okta-Style App Launcher:** Clean, square-tiled launcher with real-time app search and role-based app gating.
* **User & Role Directory:**
  * Add individual staff members and assign custom roles.
  * Bulk CSV upload for both staff and students with downloadable sample templates.
* **Academic Management:** Manage academic sessions (e.g. `2026-2027`), permanent grade levels, and cohort sections.
* **Cold-Start Tenant Onboarding:** 1-click registration for new schools and initial master admins.

---

## 🛠️ Tech Stack

* **Backend:** FastAPI, SQLAlchemy 2.0 ORM, Pydantic v2, Psycopg 3, PyJWT, Passlib (Argon2 / BCrypt).
* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React Icons.
* **Database:** PostgreSQL 14+ (Compatible with local PostgreSQL, Neon Cloud, AWS RDS, Supabase).

---

## 📋 Prerequisites

Before starting, ensure you have the following installed on your machine:
1. **Python 3.10+** (Python 3.11, 3.12, or 3.13 recommended)
2. **Node.js 18+** and **npm**
3. **PostgreSQL 14+** (running locally on port `5432` or a cloud database URL like Neon)

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/vvatsalmehta3009-cmyk/school-management-system.git
cd school-management-system
```

---

### 2. Database Setup

1. Copy the example environment file in `backend`:
   ```bash
   cp backend/.env.example backend/.env
   ```
   *(On Windows PowerShell: `Copy-Item backend/.env.example backend/.env`)*

2. Open `backend/.env` and set your `DATABASE_URL`:
   ```env
   DATABASE_URL="postgresql+psycopg://postgres:your_password@localhost:5432/school_platform"
   ```

3. Initialize the database schema and standard RBAC roles/permissions:
   * **Option A (Python CLI - Recommended):**
     ```bash
     cd backend
     python scripts/setup_db.py
     cd ..
     ```
   * **Option B (Direct SQL Script):**
     Execute `backend/database/schema.sql` directly using `psql`, pgAdmin, or DBeaver:
     ```bash
     psql -h localhost -U postgres -d school_platform -f backend/database/schema.sql
     ```

---

### 3. Start the Backend (FastAPI)

Open **Terminal 1**:

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create and activate virtual environment
# Windows (PowerShell):
python -m venv venv
.\venv\Scripts\activate

# macOS / Linux:
# python3 -m venv venv
# source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start development server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

* **Backend API Base URL:** `http://127.0.0.1:8000`
* **Interactive Swagger UI Documentation:** `http://127.0.0.1:8000/api/v1/docs`
* **Alternative ReDoc Documentation:** `http://127.0.0.1:8000/api/v1/redoc`

---

### 4. Start the Frontend (React + Vite)

Open **Terminal 2**:

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

* **Frontend Application URL:** `http://127.0.0.1:5173`

---

## 🔑 Default Login Credentials

Open `http://127.0.0.1:5173` in your browser. You can log in using either the identifier code or email:

| Field | Option 1 (User Code) | Option 2 (Email) |
| :--- | :--- | :--- |
| **Identifier** | `HMBS000001` | `vatsal.truecover@gmail.com` |
| **Password** | `Admin@123` | `Admin@123` |
| **Role** | School Admin | School Admin |

> **Note:** You can also register a brand new school tenant and admin account directly from the login page by clicking **"Onboard School"**.

---

## 📁 Project Structure

```text
school-management-system/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Route controllers (auth, onboarding, academic, users)
│   │   ├── core/            # Security (JWT, hashing), DB config, dependencies
│   │   ├── models/          # SQLAlchemy 2.0 ORM models
│   │   ├── schemas/         # Pydantic v2 validation models
│   │   └── services/        # Business logic services
│   ├── database/
│   │   └── schema.sql       # Complete standalone PostgreSQL DDL & seed script
│   ├── scripts/
│   │   └── setup_db.py      # Automated database initialization script
│   ├── requirements.txt     # Python backend dependencies
│   └── .env.example         # Template for environment variables
├── frontend/
│   ├── src/
│   │   ├── api/             # API client & fetch wrappers
│   │   ├── components/      # UI components (AppGrid, LoginView, UsersApp, etc.)
│   │   ├── types/           # TypeScript interfaces & types
│   │   ├── App.tsx          # Root portal shell
│   │   └── main.tsx         # React DOM mounting
│   ├── package.json         # Frontend dependencies
│   └── vite.config.ts       # Vite build configuration
├── docs/
│   ├── School_Platform.postman_collection.json  # Postman API test suite
│   ├── database-schema.md   # Architectural database schema notes
│   └── schema.dbml          # DBML diagram source
└── README.md
```

---

## 🧪 Postman API Collection

A full Postman test suite covering tenant onboarding, token extraction, switching contexts, and academic setup is available in:
📁 `docs/School_Platform.postman_collection.json`

To use it:
1. Open Postman $\rightarrow$ Click **Import** $\rightarrow$ Select `docs/School_Platform.postman_collection.json`.
2. Ensure the collection variable `baseUrl` is set to `http://127.0.0.1:8000/api/v1` (or `http://127.0.0.1:8000`).
3. Run requests sequentially starting from `0. School Onboarding (Start Here!)`.
