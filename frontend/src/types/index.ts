export interface UserProfile {
  user_id: number;
  membership_id: number;
  school_id: number;
  school_code: string;
  full_name?: string;
  school_user_code?: string;
  roles: string[];
  permissions: string[];
  must_change_password?: boolean;
  is_super_admin?: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in_seconds: number;
  user_id: number;
  full_name: string;
  school_user_code?: string;
  school_id: number;
  school_code: string;
  school_name: string;
  school_membership_id: number;
  roles: string[];
  permissions: string[];
  must_change_password?: boolean;
  is_super_admin?: boolean;
}

export interface PlatformSchool {
  id: number;
  name: string;
  code: string;
  email?: string | null;
  phone?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SchoolOnboardingPayload {
  school_name: string;
  school_code: string;
  school_email?: string;
  school_phone?: string;
  school_address?: string;
  admin_name: string;
  admin_email: string;
  admin_phone?: string;
  admin_password: string;
}

export interface SchoolOnboardingResponse {
  school_id: number;
  school_name: string;
  school_code: string;
  admin_user_id: number;
  admin_membership_id: number;
  admin_school_user_code: string;
  admin_role: string;
  access_token: string;
  token_type: string;
  message: string;
}

export interface AcademicYear {
  id: number;
  school_id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

export interface ClassItem {
  id: number;
  school_id: number;
  name: string;
  display_order: number;
  created_at: string;
}

export interface SubjectItem {
  id: number;
  school_id: number;
  name: string;
  code: string;
  created_at: string;
}

export interface SectionItem {
  id: number;
  academic_year_id: number;
  class_id: number;
  name: string;
  capacity: number;
  class_teacher_membership_id?: number | null;
  created_at: string;
}

export interface MembershipContext {
  membership_id: number;
  school_id: number;
  school_name: string;
  school_code: string;
  status: string;
  roles: string[];
}

export interface RoleItem {
  id: number;
  name: string;
  code?: string | null;
  description?: string | null;
}

export interface UserMember {
  membership_id: number;
  user_id: number;
  school_id: number;
  school_user_code: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  roles: string[];
  created_at: string;
}

export interface CreateUserPayload {
  full_name: string;
  email?: string;
  phone?: string;
  password?: string;
  role_ids: number[];
}

export interface BulkUploadResponse {
  total_rows: number;
  successful_count: number;
  failed_count: number;
  created_users: {
    row_number: number;
    school_user_code: string;
    full_name: string;
    roles: string[];
  }[];
  errors: {
    row_number: number;
    data: Record<string, string>;
    error: string;
  }[];
}


