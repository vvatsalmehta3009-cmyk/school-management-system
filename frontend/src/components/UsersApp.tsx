import React, { useState, useEffect } from "react";
import { api } from "../api/client";
import type {
  UserMember,
  RoleItem,
  UserProfile,
  BulkUploadResponse,
  SubjectItem,
  ClassItem,
  TeacherProfileUpdatePayload,
} from "../types";
import {
  Users,
  UserPlus,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  X,
  FileSpreadsheet,
  Download,
  Upload,
  Search,
  Shield,
  HelpCircle,
  GraduationCap,
  Briefcase,
} from "lucide-react";

interface UsersAppProps {
  user: UserProfile;
  onBack: () => void;
}

export const UsersApp: React.FC<UsersAppProps> = ({ user, onBack }) => {
  const [users, setUsers] = useState<UserMember[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("ALL");

  // Single User Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    role_ids: [] as number[],
    qualification: "",
    designation: "",
    experience_years: 0,
    gender: "",
    address: "",
    subject_ids: [] as number[],
    class_ids: [] as number[],
  });

  // Edit Teacher Competency Modal
  const [editingTeacher, setEditingTeacher] = useState<UserMember | null>(null);
  const [teacherProfileForm, setTeacherProfileForm] = useState<TeacherProfileUpdatePayload>({
    qualification: "",
    designation: "",
    experience_years: 0,
    gender: "",
    address: "",
    subject_ids: [],
    class_ids: [],
  });

  // Assign Role Modal
  const [assigningMember, setAssigningMember] = useState<UserMember | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number>(0);

  // Bulk Upload Modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [uploadType, setUploadType] = useState<"staff" | "students">("staff");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<BulkUploadResponse | null>(null);

  const canManage =
    user.roles.includes("School Admin") ||
    user.roles.includes("Super Admin") ||
    user.permissions.includes("admin.manage");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [uData, rData, sData, cData] = await Promise.all([
        api.getUsers(),
        api.getRoles(),
        api.getSubjects().catch(() => []),
        api.getClasses().catch(() => []),
      ]);
      setUsers(uData);
      setRoles(rData);
      setSubjects(sData);
      setClasses(cData.sort((a, b) => a.display_order - b.display_order));

      if (rData.length > 0 && newUser.role_ids.length === 0) {
        const teacherRole = rData.find((r) => r.name === "Teacher") || rData[0];
        setNewUser((prev) => ({ ...prev, role_ids: [teacherRole.id] }));
        setSelectedRoleId(rData[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load directory data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.role_ids.length === 0) {
      setError("Please select at least one role for this user.");
      return;
    }
    setError(null);
    try {
      const created = await api.createUser({
        full_name: newUser.full_name.trim(),
        email: newUser.email.trim() || undefined,
        phone: newUser.phone.trim() || undefined,
        password: newUser.password.trim() || undefined,
        role_ids: newUser.role_ids,
        qualification: newUser.qualification.trim() || undefined,
        designation: newUser.designation.trim() || undefined,
        experience_years: Number(newUser.experience_years) || 0,
        gender: newUser.gender || undefined,
        address: newUser.address.trim() || undefined,
        subject_ids: newUser.subject_ids,
        class_ids: newUser.class_ids,
      });

      setSuccess(`User "${created.full_name}" registered! Generated Code: ${created.school_user_code}`);
      setShowCreateModal(false);
      setNewUser({
        full_name: "",
        email: "",
        phone: "",
        password: "",
        role_ids: roles.length > 0 ? [roles[0].id] : [],
        qualification: "",
        designation: "",
        experience_years: 0,
        gender: "",
        address: "",
        subject_ids: [],
        class_ids: [],
      });
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenEditTeacher = (u: UserMember) => {
    setEditingTeacher(u);
    setTeacherProfileForm({
      qualification: u.qualification || "",
      designation: u.designation || "",
      experience_years: u.experience_years || 0,
      gender: u.gender || "",
      address: u.address || "",
      subject_ids: u.subject_ids || [],
      class_ids: u.class_ids || [],
    });
  };

  const handleSaveTeacherProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    setError(null);
    try {
      await api.updateTeacherProfile(editingTeacher.membership_id, {
        qualification: teacherProfileForm.qualification?.trim() || undefined,
        designation: teacherProfileForm.designation?.trim() || undefined,
        experience_years: Number(teacherProfileForm.experience_years) || 0,
        gender: teacherProfileForm.gender || undefined,
        address: teacherProfileForm.address?.trim() || undefined,
        subject_ids: teacherProfileForm.subject_ids || [],
        class_ids: teacherProfileForm.class_ids || [],
      });
      setSuccess(`Teacher competency profile for "${editingTeacher.full_name}" updated successfully.`);
      setEditingTeacher(null);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to update teacher profile.");
    }
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningMember || !selectedRoleId) return;
    try {
      await api.assignRole(assigningMember.membership_id, selectedRoleId);
      setSuccess(`Role assigned successfully to ${assigningMember.full_name}!`);
      setAssigningMember(null);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) {
      setError("Please select a CSV file to upload.");
      return;
    }
    setUploading(true);
    setError(null);
    setUploadResult(null);
    try {
      const result =
        uploadType === "staff"
          ? await api.bulkUploadStaff(csvFile)
          : await api.bulkUploadStudents(csvFile);

      setUploadResult(result);
      if (result.successful_count > 0) {
        setSuccess(
          `Bulk upload complete! Successfully created ${result.successful_count} accounts.`
        );
        loadData();
      }
    } catch (err: any) {
      setError(err.message || "Bulk upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Download Sample CSV Helper
  const downloadSampleCSV = (type: "staff" | "students") => {
    let csvContent = "";
    let filename = "";

    if (type === "staff") {
      filename = "staff_upload_sample.csv";
      csvContent = `full_name,email,phone,role,password
Priya Sharma,priya.sharma@hmbschool.com,9876543210,Teacher,Teacher@123
Ramesh Patel,ramesh.patel@hmbschool.com,9876543211,Accountant,Accountant@123
Sunita Rao,sunita.rao@hmbschool.com,9876543212,Teacher,Teacher@123
Kiran Shah,kiran.shah@hmbschool.com,9876543213,Principal,Principal@123`;
    } else {
      filename = "students_upload_sample.csv";
      csvContent = `admission_number,first_name,last_name,class_name,section_name,date_of_birth,gender,blood_group,admission_date,email,phone,password
ADM-2026-001,Aryan,Mehta,Grade 11,COMMERCE,2010-05-14,male,B+,2026-06-01,aryan.mehta@example.com,9106245901,Aryan@123
ADM-2026-002,Ananya,Iyer,Grade 11,SCIENCE,2010-08-22,female,O+,2026-06-01,ananya.iyer@example.com,9106245902,Ananya@123
ADM-2026-003,Rohan,Kapoor,Grade 11,ARTS,2010-11-03,male,A+,2026-06-01,rohan.kapoor@example.com,9106245903,Rohan@123`;
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.school_user_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()));

    if (selectedRoleFilter === "ALL") return matchesSearch;
    return matchesSearch && u.roles.includes(selectedRoleFilter);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to App Launcher
          </button>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <span>Users & Role Directory</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {canManage ? "Admin & Management Mode" : "Read-Only Staff Directory"}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            School user accounts, login codes (`HMBS00000x`), contact profiles, and RBAC roles.
          </p>
        </div>

        {/* Action Buttons */}
        {canManage ? (
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => {
                setShowBulkModal(true);
                setUploadResult(null);
                setCsvFile(null);
              }}
              className="inline-flex items-center px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer border border-slate-300"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" />
              <span>Bulk Upload CSV</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              <span>Add Single User</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Viewing as Staff Member</span>
          </div>
        )}
      </div>

      {/* Alerts */}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">×</button>
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900 font-bold">×</button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, code (e.g. HMBS), email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
          <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Role:</span>
          {["ALL", "School Admin", "Teacher", "Accountant", "Principal", "Student"].map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRoleFilter(r)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                selectedRoleFilter === r
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Registered School Members</h2>
          </div>
          <span className="text-xs text-slate-400">{filteredUsers.length} shown</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading directory from database...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No matching members found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-3.5">User Code (Login ID)</th>
                  <th className="px-6 py-3.5">Full Name & Profile</th>
                  <th className="px-6 py-3.5">Contact Details</th>
                  <th className="px-6 py-3.5">Roles & Competencies</th>
                  <th className="px-6 py-3.5">Status</th>
                  {canManage && <th className="px-6 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const isTeacherStaff = u.roles.includes("Teacher") || u.roles.includes("Principal");
                  const userSubjects = subjects.filter((s) => u.subject_ids?.includes(s.id));
                  const userClasses = classes.filter((c) => u.class_ids?.includes(c.id));

                  return (
                    <tr key={u.membership_id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Code */}
                      <td className="px-6 py-4 font-mono font-bold text-indigo-700">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100">
                          {u.school_user_code}
                        </span>
                      </td>

                      {/* Name & Profile */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-sm">{u.full_name}</div>
                        {(u.designation || u.qualification) && (
                          <div className="text-[11px] text-slate-600 font-medium flex items-center space-x-1 mt-0.5">
                            <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>
                              {u.designation || u.qualification}
                              {u.experience_years ? ` · ${u.experience_years} yrs exp` : ""}
                            </span>
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400">User ID #{u.user_id}</div>
                      </td>

                      {/* Contact */}
                      <td className="px-6 py-4 text-slate-600">
                        {u.email && (
                          <div className="flex items-center space-x-1.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{u.email}</span>
                          </div>
                        )}
                        {u.phone && (
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{u.phone}</span>
                          </div>
                        )}
                        {!u.email && !u.phone && <span className="text-slate-400 italic">No contact info</span>}
                      </td>

                      {/* Roles & Competencies */}
                      <td className="px-6 py-4">
                        <div className="space-y-1.5">
                          {/* Roles */}
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((rName) => (
                              <span
                                key={rName}
                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                  rName === "School Admin"
                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                    : rName === "Teacher"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : rName === "Accountant"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : rName === "Principal"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-slate-100 text-slate-700 border-slate-200"
                                }`}
                              >
                                {rName}
                              </span>
                            ))}
                          </div>

                          {/* Subjects & Classes pills if teacher */}
                          {(userSubjects.length > 0 || userClasses.length > 0) && (
                            <div className="pt-1 border-t border-slate-100 space-y-1">
                              {userSubjects.length > 0 && (
                                <div className="flex items-center space-x-1 flex-wrap gap-1">
                                  <span className="text-[10px] font-semibold text-slate-400">Teaches:</span>
                                  {userSubjects.map((s) => (
                                    <span
                                      key={s.id}
                                      className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                                    >
                                      {s.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {userClasses.length > 0 && (
                                <div className="flex items-center space-x-1 flex-wrap gap-1">
                                  <span className="text-[10px] font-semibold text-slate-400">Grades:</span>
                                  {userClasses.map((c) => (
                                    <span
                                      key={c.id}
                                      className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100"
                                    >
                                      {c.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {u.status}
                        </span>
                      </td>

                      {/* Actions (Admin Only) */}
                      {canManage && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {isTeacherStaff && (
                              <button
                                onClick={() => handleOpenEditTeacher(u)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Teacher Competencies & Profile"
                              >
                                Edit Profile
                              </button>
                            )}
                            <button
                              onClick={() => setAssigningMember(u)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            >
                              + Role
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Bulk CSV Upload */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-8">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Bulk Onboarding via CSV</h3>
                  <p className="text-xs text-slate-500">Batch create staff or students with auto-generated credentials</p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Type Selector Tabs */}
            <div className="flex space-x-2 border-b border-slate-100 pb-3 mb-4">
              <button
                onClick={() => {
                  setUploadType("staff");
                  setCsvFile(null);
                  setUploadResult(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  uploadType === "staff"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                1. Teachers & Staff Upload
              </button>
              <button
                onClick={() => {
                  setUploadType("students");
                  setCsvFile(null);
                  setUploadResult(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  uploadType === "students"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                2. Students Upload
              </button>
            </div>

            {/* Template Download & Guide */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-xs font-bold text-indigo-900">
                    {uploadType === "staff" ? "Staff CSV Format Guide" : "Students CSV Format Guide"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => downloadSampleCSV(uploadType)}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  <span>Download Sample CSV</span>
                </button>
              </div>

              {/* Column specifications */}
              <div className="text-[11px] text-slate-600 space-y-1">
                {uploadType === "staff" ? (
                  <>
                    <p>• <span className="font-mono font-bold text-indigo-900">full_name</span> (Required): Full name of the staff member (e.g. "Priya Sharma").</p>
                    <p>• <span className="font-mono font-bold text-indigo-900">role</span> (Required): Must match system role: <code className="bg-white px-1 rounded">Teacher</code>, <code className="bg-white px-1 rounded">Accountant</code>, or <code className="bg-white px-1 rounded">Principal</code>.</p>
                    <p>• <span className="font-mono font-bold text-indigo-900">email</span> (Optional): Unique email address for portal notifications.</p>
                    <p>• <span className="font-mono font-bold text-indigo-900">phone</span> (Optional): Phone/Mobile number.</p>
                    <p>• <span className="font-mono font-bold text-indigo-900">password</span> (Optional): Initial login password (defaults to "School@123" if left blank).</p>
                  </>
                ) : (
                  <>
                    <p>• <span className="font-mono font-bold text-indigo-900">admission_number</span> (Required): Unique school admission code (e.g. "ADM-2026-001").</p>
                    <p>• <span className="font-mono font-bold text-indigo-900">first_name</span> & <span className="font-mono font-bold text-indigo-900">last_name</span>: Student name.</p>
                    <p>• <span className="font-mono font-bold text-indigo-900">date_of_birth</span> (Optional): Format: <code className="bg-white px-1 rounded">YYYY-MM-DD</code> (e.g. "2010-05-14").</p>
                    <p>• <span className="font-mono font-bold text-indigo-900">gender</span> (Optional): <code className="bg-white px-1 rounded">male</code>, <code className="bg-white px-1 rounded">female</code>, or <code className="bg-white px-1 rounded">other</code>.</p>
                    <p>• <span className="font-mono font-bold text-indigo-900">blood_group</span> (Optional): e.g. "O+", "B+".</p>
                    <p>• <span className="font-mono font-bold text-indigo-900">email</span> & <span className="font-mono font-bold text-indigo-900">phone</span> (Optional): Student/Parent contact for login account.</p>
                  </>
                )}
              </div>
            </div>

            {/* Upload Form */}
            <form onSubmit={handleBulkUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Select CSV File to Upload:
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-indigo-400 transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    accept=".csv"
                    id="csv-file-input"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setCsvFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <label htmlFor="csv-file-input" className="cursor-pointer block">
                    <Upload className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-800">
                      {csvFile ? csvFile.name : "Click to browse or drop your .csv file here"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">UTF-8 encoded .csv files up to 10MB</p>
                  </label>
                </div>
              </div>

              {/* Upload Result Summary */}
              {uploadResult && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>Processing Results:</span>
                    <div className="space-x-2">
                      <span className="text-emerald-700">{uploadResult.successful_count} succeeded</span>
                      {uploadResult.failed_count > 0 && (
                        <span className="text-rose-700">{uploadResult.failed_count} failed</span>
                      )}
                    </div>
                  </div>

                  {uploadResult.created_users.length > 0 && (
                    <div className="max-h-32 overflow-y-auto text-[11px] space-y-1 font-mono pt-1 border-t border-slate-200">
                      {uploadResult.created_users.map((item) => (
                        <div key={item.school_user_code} className="text-emerald-700">
                          ✓ Row {item.row_number}: {item.full_name} → Code: {item.school_user_code} ({item.roles.join(", ")})
                        </div>
                      ))}
                    </div>
                  )}

                  {uploadResult.errors.length > 0 && (
                    <div className="max-h-24 overflow-y-auto text-[11px] space-y-1 font-mono text-rose-600 pt-1 border-t border-slate-200">
                      {uploadResult.errors.map((err, idx) => (
                        <div key={idx}>
                          ✗ Row {err.row_number}: {err.error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={uploading || !csvFile}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploading ? "Processing CSV..." : "Upload & Create Users"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Single User Creation */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Add Individual User / Staff</h3>
                  <p className="text-xs text-slate-500">Auto-generates sequential identifier code & assigns role</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Patel"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="ramesh@hmbschool.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone (Optional)</label>
                  <input
                    type="text"
                    placeholder="9876543210"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Initial Password</label>
                  <span className="text-[11px] text-slate-400">Optional · Defaults to FirstName@123</span>
                </div>
                <input
                  type="text"
                  placeholder="Auto-defaults to FirstName@123 if blank"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  User will be prompted to set a new personal password on their initial login.
                </span>
              </div>

              {/* Roles selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Select Role(s) to Assign:
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                  {roles.map((r) => {
                    const isChecked = newUser.role_ids.includes(r.id);
                    return (
                      <div
                        key={r.id}
                        onClick={() => {
                          setNewUser((prev) => {
                            const exists = prev.role_ids.includes(r.id);
                            return exists
                              ? { ...prev, role_ids: prev.role_ids.filter((id) => id !== r.id) }
                              : { ...prev, role_ids: [...prev.role_ids, r.id] };
                          });
                        }}
                        className={`flex items-center space-x-2 p-2.5 rounded-xl border cursor-pointer text-xs transition-colors ${
                          isChecked
                            ? "bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-indigo-600 pointer-events-none"
                        />
                        <span>{r.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Teaching Competency & Staff Details (When Teacher or Principal role is chosen) */}
              {newUser.role_ids.some((id) => {
                const r = roles.find((x) => x.id === id);
                return r && (r.name === "Teacher" || r.name === "Principal");
              }) && (
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3.5">
                  <div className="flex items-center space-x-2 text-indigo-950 font-bold text-xs">
                    <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Teaching Competencies & Staff Profile</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Academic Qualification
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. M.Sc. Physics, B.Ed"
                        value={newUser.qualification}
                        onChange={(e) => setNewUser({ ...newUser, qualification: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Designation / Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Senior Secondary Teacher"
                        value={newUser.designation}
                        onChange={(e) => setNewUser({ ...newUser, designation: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Experience (Years)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={newUser.experience_years}
                        onChange={(e) =>
                          setNewUser({ ...newUser, experience_years: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Gender
                      </label>
                      <select
                        value={newUser.gender}
                        onChange={(e) => setNewUser({ ...newUser, gender: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      >
                        <option value="">Select Gender (Optional)</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Residential Address
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Flat 302, Campus Staff Quarters"
                      value={newUser.address}
                      onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    />
                  </div>

                  {/* Qualified Subjects Multi-Select Pills */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Qualified Subjects to Teach
                      </label>
                      <span className="text-[10px] text-slate-400">Click to toggle</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-white rounded-xl border border-slate-200">
                      {subjects.length === 0 ? (
                        <span className="text-xs text-slate-400 italic p-1">No subjects created yet</span>
                      ) : (
                        subjects.map((s) => {
                          const isSel = newUser.subject_ids.includes(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setNewUser((prev) => ({
                                  ...prev,
                                  subject_ids: isSel
                                    ? prev.subject_ids.filter((id) => id !== s.id)
                                    : [...prev.subject_ids, s.id],
                                }));
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                isSel
                                  ? "bg-indigo-600 text-white shadow-xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {s.name} ({s.code})
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Eligible Grade Levels Multi-Select Pills */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Eligible Grades / Classes
                      </label>
                      <span className="text-[10px] text-slate-400">Click to toggle</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-white rounded-xl border border-slate-200">
                      {classes.length === 0 ? (
                        <span className="text-xs text-slate-400 italic p-1">No classes created yet</span>
                      ) : (
                        classes.map((c) => {
                          const isSel = newUser.class_ids.includes(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setNewUser((prev) => ({
                                  ...prev,
                                  class_ids: isSel
                                    ? prev.class_ids.filter((id) => id !== c.id)
                                    : [...prev.class_ids, c.id],
                                }));
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                isSel
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {c.name}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md cursor-pointer"
                >
                  Create User & Assign Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Role to existing member */}
      {assigningMember && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Assign Additional Role</h3>
            <p className="text-xs text-slate-500 mb-4">
              Add a role to <span className="font-semibold text-slate-800">{assigningMember.full_name}</span> ({assigningMember.school_user_code})
            </p>

            <form onSubmit={handleAssignRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Role to Add</label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {assigningMember.roles.includes(r.name) ? "(Already assigned)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAssigningMember(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm cursor-pointer"
                >
                  Assign Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Teacher Profile & Competency */}
      {editingTeacher && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Edit Teacher Competencies</h3>
                  <p className="text-xs text-slate-500">
                    {editingTeacher.full_name} ·{" "}
                    <span className="font-mono text-indigo-600 font-semibold">
                      {editingTeacher.school_user_code}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingTeacher(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacherProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Academic Qualification
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. M.Sc. Physics, B.Ed"
                    value={teacherProfileForm.qualification || ""}
                    onChange={(e) =>
                      setTeacherProfileForm({
                        ...teacherProfileForm,
                        qualification: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Secondary Lecturer"
                    value={teacherProfileForm.designation || ""}
                    onChange={(e) =>
                      setTeacherProfileForm({
                        ...teacherProfileForm,
                        designation: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Teaching Experience (Years)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={teacherProfileForm.experience_years ?? 0}
                    onChange={(e) =>
                      setTeacherProfileForm({
                        ...teacherProfileForm,
                        experience_years: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Gender
                  </label>
                  <select
                    value={teacherProfileForm.gender || ""}
                    onChange={(e) =>
                      setTeacherProfileForm({ ...teacherProfileForm, gender: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="">Select Gender (Optional)</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Residential Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Flat 302, Campus Staff Quarters"
                  value={teacherProfileForm.address || ""}
                  onChange={(e) =>
                    setTeacherProfileForm({ ...teacherProfileForm, address: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Qualified Subjects Multi-Select Pills */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-semibold text-slate-700">
                    Qualified Subjects to Teach
                  </label>
                  <span className="text-[10px] text-slate-400">Click to select/deselect</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {subjects.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No subjects available</span>
                  ) : (
                    subjects.map((s) => {
                      const isSel = (teacherProfileForm.subject_ids || []).includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setTeacherProfileForm((prev) => {
                              const current = prev.subject_ids || [];
                              return {
                                ...prev,
                                subject_ids: isSel
                                  ? current.filter((id) => id !== s.id)
                                  : [...current, s.id],
                              };
                            });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isSel
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
                          }`}
                        >
                          {s.name} ({s.code})
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Eligible Grade Levels Multi-Select Pills */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-semibold text-slate-700">
                    Eligible Grades / Classes
                  </label>
                  <span className="text-[10px] text-slate-400">Click to select/deselect</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {classes.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No classes available</span>
                  ) : (
                    classes.map((c) => {
                      const isSel = (teacherProfileForm.class_ids || []).includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setTeacherProfileForm((prev) => {
                              const current = prev.class_ids || [];
                              return {
                                ...prev,
                                class_ids: isSel
                                  ? current.filter((id) => id !== c.id)
                                  : [...current, c.id],
                              };
                            });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isSel
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
                          }`}
                        >
                          {c.name}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md cursor-pointer"
                >
                  Save Competencies
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
