"use client";

import React, { useState, useMemo } from "react";
import {
  Filter,
  Grid as GridIcon,
  List,
  FileText,
  Shield,
  Clock,
} from "lucide-react";
import CaseCard from "./CaseCard";
import { Case } from "@/types/dashboard";
import { cn } from "@/lib/utils/cn";

interface DashboardProps {
  user: any;
  cases: Case[];
  onSelectCase: (id: string) => void;
  searchTerm: string;
}

const Dashboard: React.FC<DashboardProps> = ({
  user,
  cases,
  onSelectCase,
  searchTerm,
}) => {
  const [activeFilter, setActiveFilter] = useState("All Cases");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Calculate statistics
  const stats = useMemo(() => {
    const total = cases.length;
    const finalized = cases.filter((c) => c.status === "Completed").length;
    const inReview = cases.filter((c) => c.status === "Review").length;
    const inProgress = cases.filter((c) => c.status === "Pending").length;
    const drafts = cases.filter((c) => c.status === "Draft").length;

    return { total, finalized, inReview, inProgress, drafts };
  }, [cases]);

  // Filter and sort cases
  const filteredCases = useMemo(() => {
    let filtered = cases;

    // Apply status filter
    if (activeFilter === "Finalized") {
      filtered = filtered.filter((c) => c.status === "Completed");
    } else if (activeFilter === "In Review") {
      filtered = filtered.filter((c) => c.status === "Review");
    } else if (activeFilter === "In Progress") {
      filtered = filtered.filter((c) => c.status === "Pending");
    } else if (activeFilter === "Drafts") {
      filtered = filtered.filter((c) => c.status === "Draft");
    }

    // Apply search
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.applicantName?.toLowerCase().includes(lowerTerm) ||
          c.address?.toLowerCase().includes(lowerTerm) ||
          c.id?.toLowerCase().includes(lowerTerm) ||
          c.city?.toLowerCase().includes(lowerTerm),
      );
    }

    // Apply sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "oldest":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [cases, activeFilter, searchTerm, sortBy]);

  const filters = [
    "All Cases",
    "Finalized",
    "In Review",
    "In Progress",
    "Drafts",
  ];

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-50 text-emerald-600";
      case "Review":
        return "bg-amber-50 text-amber-600";
      case "Draft":
        return "bg-slate-50 text-slate-500";
      default:
        return "bg-orange-50 text-orange-600";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "Completed":
        return "Finalized";
      case "Review":
        return "In Review";
      case "Pending":
        return "In Progress";
      default:
        return status;
    }
  };

  return (
    <div className="py-8 px-12 bg-gradient-to-b from-slate-50 to-white min-h-[calc(100vh-80px)]">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
          Assessment Registry
        </h1>
        <p className="text-[15px] text-slate-500 font-medium">
          Official record of accessibility assessments and property evaluations
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-5 mb-8">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl shadow-[0_4px_20px_rgba(102,126,234,0.15)]">
          <div className="flex items-center gap-3 mb-3">
            <FileText size={24} className="text-white" />
            <span className="text-xs text-white/90 font-semibold uppercase tracking-wider">
              Total Assessments
            </span>
          </div>
          <div className="text-4xl font-extrabold text-white leading-none">
            {stats.total}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border-2 border-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.1)]">
          <div className="flex items-center gap-3 mb-3">
            <Shield size={24} className="text-emerald-500" />
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Finalized Reports
            </span>
          </div>
          <div className="text-4xl font-extrabold text-emerald-500 leading-none">
            {stats.finalized}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border-2 border-amber-600 shadow-[0_4px_12px_rgba(217,119,6,0.1)]">
          <div className="flex items-center gap-3 mb-3">
            <Clock size={24} className="text-amber-600" />
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              In Review
            </span>
          </div>
          <div className="text-4xl font-extrabold text-amber-600 leading-none">
            {stats.inReview}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border-2 border-amber-500 shadow-[0_4px_12px_rgba(245,158,11,0.1)]">
          <div className="flex items-center gap-3 mb-3">
            <Clock size={24} className="text-amber-500" />
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              In Progress
            </span>
          </div>
          <div className="text-4xl font-extrabold text-amber-500 leading-none">
            {stats.inProgress}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border-2 border-slate-400 shadow-[0_4px_12px_rgba(148,163,184,0.1)]">
          <div className="flex items-center gap-3 mb-3">
            <FileText size={24} className="text-slate-400" />
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Draft Queue
            </span>
          </div>
          <div className="text-4xl font-extrabold text-slate-400 leading-none">
            {stats.drafts}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white py-5 px-6 rounded-2xl mb-6 border border-gray-200 flex justify-between items-center flex-wrap gap-4">
        {/* Filters */}
        <div className="flex gap-2 bg-slate-50 p-1 rounded-[10px]">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "py-2 px-4 rounded-lg text-xs font-bold transition-all whitespace-nowrap border-none cursor-pointer",
                activeFilter === filter
                  ? "bg-primary text-white"
                  : "bg-transparent text-slate-500",
              )}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Sort & View Mode */}
        <div className="flex gap-3 items-center">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="py-2 pr-8 pl-3 rounded-lg border border-gray-200 text-xs text-slate-600 outline-none cursor-pointer font-semibold bg-white"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>

          <div className="flex gap-1 bg-slate-50 p-1 rounded-lg">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 rounded-md border-none cursor-pointer flex items-center justify-center",
                viewMode === "grid"
                  ? "bg-white text-primary shadow-sm"
                  : "bg-transparent text-slate-400",
              )}
            >
              <GridIcon size={18} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 rounded-md border-none cursor-pointer flex items-center justify-center",
                viewMode === "list"
                  ? "bg-white text-primary shadow-sm"
                  : "bg-transparent text-slate-400",
              )}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {filteredCases.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Filter size={48} className="mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-bold mb-2">No cases found</h3>
          <p className="text-sm font-medium">
            Try adjusting your filters or search criteria
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
          {filteredCases.map((caseData) => (
            <CaseCard
              key={caseData.id}
              caseData={caseData}
              onClick={onSelectCase}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-200">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-500 text-xs uppercase tracking-wider">
                <th className="py-4 px-6 font-bold">Case ID</th>
                <th className="py-4 px-6 font-bold">Property</th>
                <th className="py-4 px-6 font-bold">Applicant</th>
                <th className="py-4 px-6 font-bold">Date</th>
                <th className="py-4 px-6 font-bold">Status</th>
                <th className="py-4 px-6 font-bold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-slate-100 transition-colors"
                >
                  <td className="py-4 px-6 font-bold text-primary">{c.id}</td>
                  <td className="py-4 px-6">
                    <div className="font-semibold text-slate-900">
                      {c.address || "Address Pending"}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {c.city || "Location TBC"}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-slate-600 font-medium">
                    {c.applicantName || "Anonymous"}
                  </td>
                  <td className="py-4 px-6 text-slate-500">
                    {c.assessmentDate
                      ? new Date(c.assessmentDate).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-lg uppercase tracking-wider",
                        getStatusBadgeClass(c.status),
                      )}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-current" />
                      {getStatusLabel(c.status)}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <button
                      onClick={() => onSelectCase(c.id)}
                      className="py-2 px-4 rounded-lg bg-primary text-white text-xs font-bold border-none cursor-pointer transition-all"
                    >
                      Open Record
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
