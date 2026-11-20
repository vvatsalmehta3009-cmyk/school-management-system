import type {
  UserProfile,
  LoginResponse,
  SchoolOnboardingPayload,
  SchoolOnboardingResponse,
  AcademicYear,
  ClassItem,
  SectionItem,
  MembershipContext,
  RoleItem,
  UserMember,
  CreateUserPayload,
  BulkUploadResponse,
} from "../types";

const BASE_URL = "http://127.0.0.1:8000/api/v1";

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem("access_token");
  }

  public setToken(token: string): void {
    localStorage.setItem("access_token", token);
  }

  public clearToken(): void {
    localStorage.removeItem("access_token");
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const detail =
        errorData.detail ||
        (Array.isArray(errorData) ? JSON.stringify(errorData) : response.statusText);
      throw new Error(detail);
    }

    return response.json();
  }

  // 1. Auth & Context
  public async login(
    identifier: string,
    password: string
  ): Promise<LoginResponse> {
    const res = await this.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        identifier: identifier.trim(),
        school_user_code: identifier.trim(),
        password,
      }),
    });
    this.setToken(res.access_token);
    return res;
  }

  public async getMe(): Promise<UserProfile> {
    return this.request<UserProfile>("/auth/me");
  }

  public async getMemberships(): Promise<MembershipContext[]> {
    return this.request<MembershipContext[]>("/auth/memberships");
  }

  public async switchContext(target_membership_id: number): Promise<LoginResponse> {
    const res = await this.request<LoginResponse>("/auth/switch-context", {
      method: "POST",
      body: JSON.stringify({ target_membership_id }),
    });
    this.setToken(res.access_token);
    return res;
  }

  public async changePassword(new_password: string): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ new_password }),
    });
  }

  // 2. Onboarding
  public async registerSchool(
    payload: SchoolOnboardingPayload
  ): Promise<SchoolOnboardingResponse> {
    const res = await this.request<SchoolOnboardingResponse>(
      "/onboarding/school",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    this.setToken(res.access_token);
    return res;
  }

  // 3. Academic Structure
  public async getAcademicYears(): Promise<AcademicYear[]> {
    return this.request<AcademicYear[]>("/academic/years");
  }

  public async createAcademicYear(payload: {
    name: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
  }): Promise<AcademicYear> {
    return this.request<AcademicYear>("/academic/years", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getClasses(): Promise<ClassItem[]> {
    return this.request<ClassItem[]>("/academic/classes");
  }

  public async createClass(payload: {
    name: string;
    display_order: number;
  }): Promise<ClassItem> {
    return this.request<ClassItem>("/academic/classes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async getSections(
    academic_year_id?: number,
    class_id?: number
  ): Promise<SectionItem[]> {
    const params = new URLSearchParams();
    if (academic_year_id) params.set("academic_year_id", academic_year_id.toString());
    if (class_id) params.set("class_id", class_id.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<SectionItem[]>(`/academic/sections${query}`);
  }

  public async createSection(payload: {
    academic_year_id: number;
    class_id: number;
    name: string;
    capacity: number;
    class_teacher_membership_id?: number;
  }): Promise<SectionItem> {
    return this.request<SectionItem>("/academic/sections", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // 4. Users & Staff Management
  public async getRoles(): Promise<RoleItem[]> {
    return this.request<RoleItem[]>("/users/roles");
  }

  public async getUsers(): Promise<UserMember[]> {
    return this.request<UserMember[]>("/users");
  }

  public async createUser(payload: CreateUserPayload): Promise<UserMember> {
    return this.request<UserMember>("/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async assignRole(membership_id: number, role_id: number): Promise<UserMember> {
    return this.request<UserMember>(`/users/${membership_id}/roles`, {
      method: "POST",
      body: JSON.stringify({ role_id }),
    });
  }

  public async uploadFile<T>(endpoint: string, file: File): Promise<T> {
    const token = this.getToken();
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const detail = errorData.detail || response.statusText;
      throw new Error(detail);
    }

    return response.json();
  }

  public async bulkUploadStaff(file: File): Promise<BulkUploadResponse> {
    return this.uploadFile<BulkUploadResponse>("/users/bulk-upload/staff", file);
  }

  public async bulkUploadStudents(file: File): Promise<BulkUploadResponse> {
    return this.uploadFile<BulkUploadResponse>("/users/bulk-upload/students", file);
  }
}

export const api = new ApiClient();
