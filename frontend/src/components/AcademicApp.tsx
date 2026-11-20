import React, { useState, useEffect } from "react";
import { api } from "../api/client";
import type { AcademicYear, ClassItem, SectionItem, UserProfile } from "../types";
import {
  Calendar,
  Layers,
  LayoutGrid,
  Plus,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface AcademicAppProps {
  user: UserProfile;
  onBack: () => void;
}

export const AcademicApp: React.FC<AcademicAppProps> = ({ user, onBack }) => {
  const [activeTab, setActiveTab] = useState<"years" | "classes" | "sections">("years");

  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Forms State
  const [newYear, setNewYear] = useState({
    name: "2026-2027",
    start_date: "2026-06-01",
    end_date: "2027-04-30",
    is_current: true,
  });

  const [newClass, setNewClass] = useState({
    name: "Grade 9",
    display_order: 9,
  });

  const [newSection, setNewSection] = useState({
    name: "A",
    capacity: 40,
    academic_year_id: 0,
    class_id: 0,
  });

  // Modals
  const [showYearModal, setShowYearModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);

  const canManage =
    user.roles.includes("School Admin") ||
    user.roles.includes("Super Admin") ||
    user.permissions.includes("academic.manage");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [yData, cData, sData] = await Promise.all([
        api.getAcademicYears(),
        api.getClasses(),
        api.getSections(),
      ]);
      setYears(yData);
      setClasses(cData);
      setSections(sData);

      if (yData.length > 0 && !newSection.academic_year_id) {
        const currentY = yData.find((y) => y.is_current) || yData[0];
        setNewSection((prev) => ({ ...prev, academic_year_id: currentY.id }));
      }
      if (cData.length > 0 && !newSection.class_id) {
        setNewSection((prev) => ({ ...prev, class_id: cData[0].id }));
      }
    } catch (err: any) {
      setError(err.message || "Failed to load academic data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAcademicYear(newYear);
      setSuccess(`Academic year "${newYear.name}" created successfully!`);
      setShowYearModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createClass(newClass);
      setSuccess(`Class "${newClass.name}" created successfully!`);
      setShowClassModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createSection(newSection);
      setSuccess(`Section "${newSection.name}" created successfully!`);
      setShowSectionModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button & Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to App Launcher
          </button>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <span>Academic Structure Manager</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              REST API Integrated
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Build and manage the temporal sessions, permanent grade levels, and active sections.
          </p>
        </div>

        {/* Global Action Button depending on tab */}
        {canManage && (
          <div>
            {activeTab === "years" && (
              <button
                onClick={() => setShowYearModal(true)}
                className="inline-flex items-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" /> New Academic Year
              </button>
            )}
            {activeTab === "classes" && (
              <button
                onClick={() => setShowClassModal(true)}
                className="inline-flex items-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Add Grade Level
              </button>
            )}
            {activeTab === "sections" && (
              <button
                onClick={() => setShowSectionModal(true)}
                className="inline-flex items-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Add Section
              </button>
            )}
          </div>
        )}
      </div>

      {/* Alerts */}
      {success && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">×</button>
        </div>
      )}
      {error && (
        <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900 font-bold">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 mt-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("years")}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "years"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>1. Academic Years ({years.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("classes")}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "classes"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>2. Grade Classes ({classes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("sections")}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "sections"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>3. Sections ({sections.length})</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="mt-6">
        {loading && <div className="text-xs text-slate-400 py-8 text-center">Loading from database...</div>}

        {/* Tab 1: Years */}
        {activeTab === "years" && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {years.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No Academic Years Found</p>
                <p className="text-xs text-slate-400 mt-1">Create the first academic session (e.g. 2026-2027) to begin.</p>
              </div>
            ) : (
              years.map((y) => (
                <div
                  key={y.id}
                  className={`p-5 rounded-2xl border bg-white relative transition-all ${
                    y.is_current ? "border-emerald-300 shadow-xs ring-2 ring-emerald-500/10" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-slate-900">{y.name}</span>
                    {y.is_current ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Current Session
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                        Archived
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Start Date:</span>
                      <span className="font-medium text-slate-700">{y.start_date}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>End Date:</span>
                      <span className="font-medium text-slate-700">{y.end_date}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Classes */}
        {activeTab === "classes" && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No Grade Classes Configured</p>
                <p className="text-xs text-slate-400 mt-1">Add grade levels (e.g. Grade 9, Grade 10) for your school.</p>
              </div>
            ) : (
              classes.map((c) => (
                <div key={c.id} className="p-5 rounded-2xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-bold text-slate-900">{c.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
                      Order: {c.display_order}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Class ID #{c.id} · Permanent Grade Level</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Sections */}
        {activeTab === "sections" && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sections.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                <LayoutGrid className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No Sections Found</p>
                <p className="text-xs text-slate-400 mt-1">Create sections (e.g. Section 10-A) to begin student enrollments.</p>
              </div>
            ) : (
              sections.map((s) => {
                const parentClass = classes.find((c) => c.id === s.class_id);
                const parentYear = years.find((y) => y.id === s.academic_year_id);
                return (
                  <div key={s.id} className="p-5 rounded-2xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base font-bold text-slate-900">
                        {parentClass ? parentClass.name : `Class #${s.class_id}`} - Section {s.name}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                        Cap: {s.capacity}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-2">
                      <span>Session: </span>
                      <span className="font-semibold text-slate-700">
                        {parentYear ? parentYear.name : `#${s.academic_year_id}`}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Modal: New Academic Year */}
      {showYearModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Create Academic Calendar Session</h3>
            <p className="text-xs text-slate-500 mb-4">POST /api/v1/academic/years</p>
            <form onSubmit={handleCreateYear} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Session Name</label>
                <input
                  type="text"
                  value={newYear.name}
                  onChange={(e) => setNewYear({ ...newYear, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newYear.start_date}
                    onChange={(e) => setNewYear({ ...newYear, start_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={newYear.end_date}
                    onChange={(e) => setNewYear({ ...newYear, end_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="is_current"
                  checked={newYear.is_current}
                  onChange={(e) => setNewYear({ ...newYear, is_current: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="is_current" className="text-xs text-slate-700 font-medium">
                  Set as current active session for school
                </label>
              </div>
              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowYearModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm cursor-pointer"
                >
                  Create Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Class */}
      {showClassModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Add Permanent Grade Level</h3>
            <p className="text-xs text-slate-500 mb-4">POST /api/v1/academic/classes</p>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Class / Grade Name</label>
                <input
                  type="text"
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  placeholder="e.g. Grade 9"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Display Order (for sorting)</label>
                <input
                  type="number"
                  value={newClass.display_order}
                  onChange={(e) => setNewClass({ ...newClass, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm cursor-pointer"
                >
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Section */}
      {showSectionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Create Section Cohort</h3>
            <p className="text-xs text-slate-500 mb-4">POST /api/v1/academic/sections</p>
            <form onSubmit={handleCreateSection} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Academic Year</label>
                <select
                  value={newSection.academic_year_id}
                  onChange={(e) => setNewSection({ ...newSection, academic_year_id: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                >
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.is_current ? "(Current)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Grade / Class</label>
                <select
                  value={newSection.class_id}
                  onChange={(e) => setNewSection({ ...newSection, class_id: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Section Name</label>
                  <input
                    type="text"
                    value={newSection.name}
                    onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                    placeholder="e.g. A"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Student Capacity</label>
                  <input
                    type="number"
                    value={newSection.capacity}
                    onChange={(e) => setNewSection({ ...newSection, capacity: parseInt(e.target.value) || 40 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSectionModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm cursor-pointer"
                >
                  Create Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
