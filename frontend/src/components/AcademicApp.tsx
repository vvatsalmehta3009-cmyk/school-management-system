import React, { useState, useEffect } from "react";
import { api } from "../api/client";
import type { AcademicYear, ClassItem, SectionItem, SubjectItem, UserProfile } from "../types";
import {
  Calendar,
  Layers,
  GraduationCap,
  BookOpen,
  Plus,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Check,
  School,
  X,
  Pencil,
  Trash2,
  AlertTriangle,
} from "lucide-react";

export type AcademicSidebarTab = "sections-tree" | "classes-master" | "subjects" | "years";

interface AcademicAppProps {
  user: UserProfile;
  onBack: () => void;
  initialTab?: AcademicSidebarTab;
}

interface DeleteTarget {
  type: "class" | "section" | "subject" | "year";
  id: number;
  title: string;
  subtitle?: string;
}

export const AcademicApp: React.FC<AcademicAppProps> = ({ user, onBack, initialTab = "sections-tree" }) => {
  const [activeTab, setActiveTab] = useState<AcademicSidebarTab>(initialTab);

  // Core Data
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Creation Modals
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);

  // Edit Modals
  const [editingSection, setEditingSection] = useState<SectionItem | null>(null);
  const [editSectionForm, setEditSectionForm] = useState({ name: "", capacity: 40 });

  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [editClassForm, setEditClassForm] = useState({ name: "", display_order: 1 });

  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
  const [editSubjectForm, setEditSubjectForm] = useState({ name: "", code: "" });

  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [editYearForm, setEditYearForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
    is_current: false,
  });

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // Create Form states
  const [targetClassForSection, setTargetClassForSection] = useState<ClassItem | null>(null);
  const [newSection, setNewSection] = useState({
    name: "A",
    capacity: 40,
  });

  const [newClass, setNewClass] = useState({
    name: "Grade 10",
    display_order: 10,
  });

  const [newSubject, setNewSubject] = useState({
    name: "Mathematics",
    code: "MATH101",
  });

  const [newYear, setNewYear] = useState({
    name: "2026-2027",
    start_date: "2026-06-01",
    end_date: "2027-04-30",
    is_current: true,
  });

  const canManage =
    user.roles.includes("School Admin") ||
    user.roles.includes("Super Admin") ||
    user.is_super_admin ||
    user.permissions.includes("academic.manage");

  // Load all academic data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [yData, cData, sData, subData] = await Promise.all([
        api.getAcademicYears(),
        api.getClasses(),
        api.getSections(),
        api.getSubjects(),
      ]);

      setYears(yData);
      setClasses(cData.sort((a, b) => a.display_order - b.display_order));
      setSections(sData);
      setSubjects(subData);

      // Default selected year to is_current or first year
      if (yData.length > 0 && !selectedYearId) {
        const currentYear = yData.find((y) => y.is_current) || yData[0];
        setSelectedYearId(currentYear.id);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load academic records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Creation Handlers
  const handleOpenAddSection = (cls: ClassItem) => {
    setTargetClassForSection(cls);
    setNewSection({ name: "A", capacity: 40 });
    setShowSectionModal(true);
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClassForSection || !selectedYearId) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.createSection({
        academic_year_id: selectedYearId,
        class_id: targetClassForSection.id,
        name: newSection.name.trim().toUpperCase(),
        capacity: newSection.capacity,
      });
      setSuccess(`Section "${targetClassForSection.name} - ${newSection.name.trim().toUpperCase()}" created successfully.`);
      setShowSectionModal(false);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to create section.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await api.createClass({
        name: newClass.name.trim(),
        display_order: Number(newClass.display_order),
      });
      setSuccess(`Class "${newClass.name.trim()}" created successfully.`);
      setShowClassModal(false);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to create class.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await api.createSubject({
        name: newSubject.name.trim(),
        code: newSubject.code.trim().toUpperCase(),
      });
      setSuccess(`Subject "${newSubject.name.trim()}" created successfully.`);
      setShowSubjectModal(false);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to create subject.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await api.createAcademicYear({
        name: newYear.name.trim(),
        start_date: newYear.start_date,
        end_date: newYear.end_date,
        is_current: newYear.is_current,
      });
      setSuccess(`Academic session "${newYear.name.trim()}" created successfully.`);
      setShowYearModal(false);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to create academic year.");
    } finally {
      setActionLoading(false);
    }
  };

  // Edit Handlers
  const handleOpenEditSection = (sec: SectionItem) => {
    setEditingSection(sec);
    setEditSectionForm({
      name: sec.name,
      capacity: sec.capacity || 40,
    });
  };

  const handleUpdateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.updateSection(editingSection.id, {
        name: editSectionForm.name.trim().toUpperCase(),
        capacity: Number(editSectionForm.capacity),
      });
      setSuccess(`Section "${editSectionForm.name.trim().toUpperCase()}" updated successfully.`);
      setEditingSection(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to update section.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEditClass = (cls: ClassItem) => {
    setEditingClass(cls);
    setEditClassForm({
      name: cls.name,
      display_order: cls.display_order,
    });
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.updateClass(editingClass.id, {
        name: editClassForm.name.trim(),
        display_order: Number(editClassForm.display_order),
      });
      setSuccess(`Class "${editClassForm.name.trim()}" updated successfully.`);
      setEditingClass(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to update class.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEditSubject = (sub: SubjectItem) => {
    setEditingSubject(sub);
    setEditSubjectForm({
      name: sub.name,
      code: sub.code,
    });
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.updateSubject(editingSubject.id, {
        name: editSubjectForm.name.trim(),
        code: editSubjectForm.code.trim().toUpperCase(),
      });
      setSuccess(`Subject "${editSubjectForm.name.trim()}" updated successfully.`);
      setEditingSubject(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to update subject.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEditYear = (y: AcademicYear) => {
    setEditingYear(y);
    setEditYearForm({
      name: y.name,
      start_date: y.start_date,
      end_date: y.end_date,
      is_current: y.is_current,
    });
  };

  const handleUpdateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingYear) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.updateAcademicYear(editingYear.id, {
        name: editYearForm.name.trim(),
        start_date: editYearForm.start_date,
        end_date: editYearForm.end_date,
        is_current: editYearForm.is_current,
      });
      setSuccess(`Academic session "${editYearForm.name.trim()}" updated successfully.`);
      setEditingYear(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to update academic year.");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Confirmation Handler
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    setError(null);
    try {
      if (deleteTarget.type === "section") {
        await api.deleteSection(deleteTarget.id);
        setSuccess(`Section "${deleteTarget.title}" deleted successfully.`);
      } else if (deleteTarget.type === "class") {
        await api.deleteClass(deleteTarget.id);
        setSuccess(`Class "${deleteTarget.title}" deleted successfully.`);
      } else if (deleteTarget.type === "subject") {
        await api.deleteSubject(deleteTarget.id);
        setSuccess(`Subject "${deleteTarget.title}" deleted successfully.`);
      } else if (deleteTarget.type === "year") {
        await api.deleteAcademicYear(deleteTarget.id);
        setSuccess(`Academic session "${deleteTarget.title}" deleted successfully.`);
      }
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || `Failed to delete ${deleteTarget.type}.`);
      setDeleteTarget(null);
    } finally {
      setActionLoading(false);
    }
  };

  // Active session helper
  const activeYearObj = years.find((y) => y.id === selectedYearId) || years[0];
  const activeSections = sections.filter((s) => s.academic_year_id === selectedYearId);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-slate-50">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-16 z-30">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="flex items-center space-x-1 text-slate-500 hover:text-slate-800 text-xs font-semibold py-1 px-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Apps</span>
          </button>
          <span className="text-slate-300">/</span>
          <div className="flex items-center space-x-2">
            <School className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-slate-900 text-sm">Academic Management</span>
          </div>
        </div>

        {/* Status Messages */}
        <div className="flex items-center space-x-3">
          {(loading || actionLoading) && (
            <div className="flex items-center space-x-1.5 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg animate-pulse">
              <span>Syncing...</span>
            </div>
          )}
          {error && (
            <div className="flex items-center space-x-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center space-x-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Workspace: Sidebar + Content Area */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left Sidebar */}
        <aside className="w-full md:w-64 lg:w-72 bg-white border-r border-slate-200 p-4 shrink-0 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Session Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Academic Session
              </label>
              {years.length === 0 ? (
                <div className="text-xs text-slate-400 p-2 bg-slate-50 rounded-lg border border-slate-200">
                  No academic sessions found.
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedYearId}
                    onChange={(e) => setSelectedYearId(Number(e.target.value))}
                    className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                  >
                    {years.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name} {y.is_current ? "(Current)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Navigation Menu */}
            <nav className="space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
                Session Structure
              </div>

              <button
                onClick={() => setActiveTab("sections-tree")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "sections-tree"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Classes & Sections</span>
                </div>
                <span className="font-mono text-[11px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {activeSections.length}
                </span>
              </button>
            </nav>

            <nav className="space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
                Permanent Masters
              </div>

              <button
                onClick={() => setActiveTab("classes-master")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "classes-master"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <GraduationCap className="w-4 h-4 text-slate-600" />
                  <span>Grade Classes Master</span>
                </div>
                <span className="font-mono text-[11px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {classes.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("subjects")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "subjects"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <BookOpen className="w-4 h-4 text-slate-600" />
                  <span>Subject Catalog</span>
                </div>
                <span className="font-mono text-[11px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {subjects.length}
                </span>
              </button>
            </nav>

            <nav className="space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
                Configuration
              </div>

              <button
                onClick={() => setActiveTab("years")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "years"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Calendar className="w-4 h-4 text-slate-600" />
                  <span>Academic Sessions</span>
                </div>
                <span className="font-mono text-[11px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {years.length}
                </span>
              </button>
            </nav>
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            Tenant: <span className="font-semibold text-slate-600">{user.school_code}</span>
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="flex-1 p-6 max-w-6xl">
          {/* VIEW 1: Classes & Sections Tree */}
          {activeTab === "sections-tree" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Classes & Active Sections
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Managing classroom cohorts for session:{" "}
                    <span className="font-semibold text-slate-700">
                      {activeYearObj?.name || "No Session Selected"}
                    </span>
                  </p>
                </div>

                {classes.length === 0 && canManage && (
                  <button
                    onClick={() => setShowClassModal(true)}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Grade Class First</span>
                  </button>
                )}
              </div>

              {classes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                  <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-slate-800">No Grade Classes Defined</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                    Grade levels (e.g. Grade 1, Grade 10) must be created in Grade Classes Master before creating sections.
                  </p>
                  {canManage && (
                    <button
                      onClick={() => setShowClassModal(true)}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add First Grade Level</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {classes.map((cls) => {
                    const classSections = activeSections.filter((s) => s.class_id === cls.id);

                    return (
                      <div
                        key={cls.id}
                        className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
                      >
                        {/* Class Header Row */}
                        <div className="bg-slate-50/70 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-mono text-xs font-bold">
                              {cls.display_order}
                            </span>
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">{cls.name}</h3>
                              <span className="text-[11px] text-slate-400">
                                {classSections.length} {classSections.length === 1 ? "Section" : "Sections"} in {activeYearObj?.name}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {canManage && (
                              <>
                                <button
                                  onClick={() => handleOpenAddSection(cls)}
                                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                                >
                                  <Plus className="w-3 h-3 text-indigo-600" />
                                  <span>Add Section</span>
                                </button>
                                <button
                                  onClick={() => handleOpenEditClass(cls)}
                                  title="Edit Grade Class"
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: "class",
                                      id: cls.id,
                                      title: cls.name,
                                      subtitle: "All associated sections must be deleted or reassigned first.",
                                    })
                                  }
                                  title="Delete Grade Class"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Sections Cards Grid */}
                        <div className="p-4">
                          {classSections.length === 0 ? (
                            <div className="py-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/40">
                              <p className="text-xs text-slate-400">
                                No sections created for {cls.name} in session {activeYearObj?.name}.
                              </p>
                              {canManage && (
                                <button
                                  onClick={() => handleOpenAddSection(cls)}
                                  className="mt-2 text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                                >
                                  + Create Section {cls.name} - A
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {classSections.map((sec) => (
                                <div
                                  key={sec.id}
                                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-colors shadow-2xs flex flex-col justify-between"
                                >
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-base font-bold text-slate-900">
                                          Section {sec.name}
                                        </span>
                                      </div>
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        Active
                                      </span>
                                    </div>

                                    <div className="space-y-1 text-xs text-slate-500 my-1">
                                      <div className="flex items-center justify-between">
                                        <span className="text-slate-400">Capacity:</span>
                                        <span className="font-medium text-slate-700">{sec.capacity || 40} seats</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-slate-400">Class Teacher:</span>
                                        <span className="font-medium text-slate-700">
                                          {sec.class_teacher_membership_id ? `Teacher #${sec.class_teacher_membership_id}` : "Not assigned"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                    <span className="font-mono text-slate-400">ID #{sec.id}</span>
                                    {canManage && (
                                      <div className="flex items-center space-x-1">
                                        <button
                                          onClick={() => handleOpenEditSection(sec)}
                                          title="Edit Section"
                                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() =>
                                            setDeleteTarget({
                                              type: "section",
                                              id: sec.id,
                                              title: `${cls.name} - Section ${sec.name}`,
                                              subtitle: `Session: ${activeYearObj?.name}`,
                                            })
                                          }
                                          title="Delete Section"
                                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: Grade Classes Master (Permanent Grade Levels) */}
          {activeTab === "classes-master" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Grade Classes Master</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Universal grade levels defined permanently for the school institution.
                  </p>
                </div>

                {canManage && (
                  <button
                    onClick={() => setShowClassModal(true)}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Grade Class</span>
                  </button>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-5 py-3.5 w-24">Display Order</th>
                      <th className="px-5 py-3.5">Class Name</th>
                      <th className="px-5 py-3.5">Sections Count</th>
                      <th className="px-5 py-3.5 text-center w-28">Class ID</th>
                      {canManage && <th className="px-5 py-3.5 text-right w-24">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {classes.map((c) => {
                      const count = sections.filter((s) => s.class_id === c.id).length;
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3.5">
                            <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-800 flex items-center justify-center font-mono font-bold text-[11px]">
                              {c.display_order}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-bold text-slate-900">{c.name}</td>
                          <td className="px-5 py-3.5 font-medium text-slate-500">{count} total across all sessions</td>
                          <td className="px-5 py-3.5 text-center font-mono text-slate-400">#{c.id}</td>
                          {canManage && (
                            <td className="px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end space-x-1">
                                <button
                                  onClick={() => handleOpenEditClass(c)}
                                  title="Edit Grade Class"
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: "class",
                                      id: c.id,
                                      title: c.name,
                                      subtitle: "All associated sections must be deleted or reassigned first.",
                                    })
                                  }
                                  title="Delete Grade Class"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
            </div>
          )}

          {/* VIEW 3: Subject Catalog */}
          {activeTab === "subjects" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Subject Catalog</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Master list of curriculum subjects and course codes taught across classes.
                  </p>
                </div>

                {canManage && (
                  <button
                    onClick={() => setShowSubjectModal(true)}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Master Subject</span>
                  </button>
                )}
              </div>

              {subjects.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-slate-800">No Subjects in Catalog</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                    Add core and elective subjects (e.g. Mathematics, English, Science) to your curriculum master.
                  </p>
                  {canManage && (
                    <button
                      onClick={() => setShowSubjectModal(true)}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add First Subject</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-5 py-3.5 w-32">Subject Code</th>
                        <th className="px-5 py-3.5">Subject Name</th>
                        <th className="px-5 py-3.5 text-center w-28">Subject ID</th>
                        {canManage && <th className="px-5 py-3.5 text-right w-24">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {subjects.map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3.5">
                            <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-[11px]">
                              {sub.code}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-bold text-slate-900">{sub.name}</td>
                          <td className="px-5 py-3.5 text-center font-mono text-slate-400">#{sub.id}</td>
                          {canManage && (
                            <td className="px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end space-x-1">
                                <button
                                  onClick={() => handleOpenEditSubject(sub)}
                                  title="Edit Subject"
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: "subject",
                                      id: sub.id,
                                      title: `${sub.name} (${sub.code})`,
                                    })
                                  }
                                  title="Delete Subject"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* VIEW 4: Academic Sessions */}
          {activeTab === "years" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Academic Sessions (Calendar Years)</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Define and manage institutional annual calendar periods.
                  </p>
                </div>

                {canManage && (
                  <button
                    onClick={() => setShowYearModal(true)}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Academic Session</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {years.map((y) => (
                  <div
                    key={y.id}
                    className={`p-5 rounded-2xl border bg-white shadow-xs flex flex-col justify-between ${
                      y.is_current ? "border-indigo-400 ring-2 ring-indigo-500/10" : "border-slate-200"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-base font-bold text-slate-900">{y.name}</span>
                        {y.is_current ? (
                          <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <Check className="w-3 h-3 mr-1" /> Active Session
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            Archived
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 text-xs text-slate-500 my-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Start Date:</span>
                          <span className="font-medium text-slate-700">{y.start_date}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">End Date:</span>
                          <span className="font-medium text-slate-700">{y.end_date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <button
                        onClick={() => {
                          setSelectedYearId(y.id);
                          setActiveTab("sections-tree");
                        }}
                        className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                      >
                        View Sections →
                      </button>

                      {canManage && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleOpenEditYear(y)}
                            title="Edit Academic Session"
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteTarget({
                                type: "year",
                                id: y.id,
                                title: y.name,
                                subtitle: "Session must contain no active sections or student enrollments.",
                              })
                            }
                            title="Delete Academic Session"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL: Add Section */}
      {showSectionModal && targetClassForSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Add Section to {targetClassForSection.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Session: <span className="font-semibold text-slate-700">{activeYearObj?.name}</span>
                </p>
              </div>
              <button
                onClick={() => setShowSectionModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSection} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Section Name / Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A, B, Rose, Yellow"
                  value={newSection.name}
                  onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Seating Capacity
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  required
                  value={newSection.capacity}
                  onChange={(e) => setNewSection({ ...newSection, capacity: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSectionModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Creating..." : "Create Section"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Section */}
      {editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Edit Section</h3>
              <button
                onClick={() => setEditingSection(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateSection} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Section Name / Code
                </label>
                <input
                  type="text"
                  required
                  value={editSectionForm.name}
                  onChange={(e) => setEditSectionForm({ ...editSectionForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Seating Capacity
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  required
                  value={editSectionForm.capacity}
                  onChange={(e) =>
                    setEditSectionForm({ ...editSectionForm, capacity: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Grade Class */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Add Permanent Grade Class</h3>
              <button onClick={() => setShowClassModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Class / Grade Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grade 11, Nursery, KG"
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Display Sorting Order</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={newClass.display_order}
                  onChange={(e) => setNewClass({ ...newClass, display_order: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Numeric order used for chronological sorting (e.g. 1 for Grade 1, 10 for Grade 10).
                </span>
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Creating..." : "Create Grade Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Grade Class */}
      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Edit Grade Class</h3>
              <button onClick={() => setEditingClass(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateClass} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Class / Grade Name</label>
                <input
                  type="text"
                  required
                  value={editClassForm.name}
                  onChange={(e) => setEditClassForm({ ...editClassForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Display Sorting Order</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={editClassForm.display_order}
                  onChange={(e) =>
                    setEditClassForm({ ...editClassForm, display_order: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Subject */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Add Master Subject</h3>
              <button onClick={() => setShowSubjectModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics, English Language, Physics"
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MATH101, ENG01, SCI-PHY"
                  value={newSubject.code}
                  onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-mono font-bold"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Creating..." : "Add Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Subject */}
      {editingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Edit Subject</h3>
              <button onClick={() => setEditingSubject(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubject} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  value={editSubjectForm.name}
                  onChange={(e) => setEditSubjectForm({ ...editSubjectForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject Code</label>
                <input
                  type="text"
                  required
                  value={editSubjectForm.code}
                  onChange={(e) => setEditSubjectForm({ ...editSubjectForm, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-mono font-bold"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSubject(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Academic Year */}
      {showYearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Add Academic Session</h3>
              <button onClick={() => setShowYearModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateYear} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Session Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026-2027, 2027 Spring"
                  value={newYear.name}
                  onChange={(e) => setNewYear({ ...newYear, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newYear.start_date}
                    onChange={(e) => setNewYear({ ...newYear, start_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={newYear.end_date}
                    onChange={(e) => setNewYear({ ...newYear, end_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <label className="flex items-center space-x-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newYear.is_current}
                  onChange={(e) => setNewYear({ ...newYear, is_current: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="font-semibold text-slate-700">Set as Current Active Session</span>
              </label>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowYearModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Creating..." : "Create Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Academic Year */}
      {editingYear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Edit Academic Session</h3>
              <button onClick={() => setEditingYear(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateYear} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Session Label</label>
                <input
                  type="text"
                  required
                  value={editYearForm.name}
                  onChange={(e) => setEditYearForm({ ...editYearForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={editYearForm.start_date}
                    onChange={(e) => setEditYearForm({ ...editYearForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={editYearForm.end_date}
                    onChange={(e) => setEditYearForm({ ...editYearForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <label className="flex items-center space-x-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editYearForm.is_current}
                  onChange={(e) => setEditYearForm({ ...editYearForm, is_current: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="font-semibold text-slate-700">Set as Current Active Session</span>
              </label>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingYear(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              Delete{" "}
              {deleteTarget.type === "class"
                ? "Grade Class"
                : deleteTarget.type === "section"
                ? "Section"
                : deleteTarget.type === "subject"
                ? "Subject"
                : "Academic Session"}
              ?
            </h3>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <span className="font-bold text-slate-900">"{deleteTarget.title}"</span>?
            </p>

            {deleteTarget.subtitle && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/80 p-2 rounded-lg mt-2.5">
                {deleteTarget.subtitle}
              </p>
            )}

            <div className="pt-4 mt-4 flex items-center justify-end space-x-2 border-t border-slate-100">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
