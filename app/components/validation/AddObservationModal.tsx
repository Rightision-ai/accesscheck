import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileText,
  AlertCircle,
  Shield,
  Wrench,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const OBSERVATION_CATEGORIES = [
  {
    id: "accessibility",
    label: "Accessibility Issue",
    icon: AlertCircle,
    color: "#dc2626",
  },
  { id: "safety", label: "Safety Hazard", icon: Shield, color: "#ea580c" },
  {
    id: "equipment",
    label: "Equipment Required",
    icon: Wrench,
    color: "#2563eb",
  },
  {
    id: "general",
    label: "General Comment",
    icon: MessageSquare,
    color: "#059669",
  },
];

interface AddObservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (obs: any) => void;
  user: any;
  caseId: string;
}

const AddObservationModal: React.FC<AddObservationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  user,
  caseId,
}) => {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [content, setContent] = useState("");
  const [includeInReport, setIncludeInReport] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!selectedCategory || !content.trim()) return;

    setIsSaving(true);

    const observation = {
      id: `obs-${Date.now()}`,
      caseId,
      category: OBSERVATION_CATEGORIES.find((c) => c.id === selectedCategory)
        ?.label,
      content: content.trim(),
      authorName: user?.name || "Unknown",
      authorRole: user?.role || "OT",
      createdAt: new Date().toISOString(),
      includeInReport,
    };

    await onSave(observation);

    setSelectedCategory("");
    setContent("");
    setIncludeInReport(true);
    setIsSaving(false);
    onClose();
  };

  if (!isOpen) return null;

  const isDisabled = !selectedCategory || !content.trim();

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-[600px] bg-white rounded-[20px] relative shadow-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="py-6 px-8 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-primary">
                Add Professional Observation
              </h2>
              <p className="text-xs text-text-dim mt-0.5">
                Clinical note for case {caseId}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-dim cursor-pointer">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Category Selection */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-text-main mb-3">
              Category <span className="text-red-600">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {OBSERVATION_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <motion.div
                    key={cat.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "p-4 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all",
                      isSelected ? "border-[var(--border)]" : "border-border",
                    )}
                    style={{
                      borderColor: isSelected ? cat.color : undefined,
                      background: isSelected ? `${cat.color}10` : "#fff",
                    }}
                  >
                    <div
                      className={cn(
                        "w-9 h-9 rounded-[10px] flex items-center justify-center",
                        isSelected ? "text-white" : "",
                      )}
                      style={{
                        background: isSelected
                          ? cat.color
                          : "var(--bg-surface)",
                        color: isSelected ? "#fff" : cat.color,
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <span
                      className="text-xs font-bold"
                      style={{
                        color: isSelected ? cat.color : "var(--text-main)",
                      }}
                    >
                      {cat.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Text Area */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-text-main mb-2">
              Observation Details <span className="text-red-600">*</span>
            </label>
            <div className="block text-xs text-text-dim mb-1 italic break-words">
              Professional commentary for the final report or internal
              reference.
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter detailed observations regarding the property's suitability, potential risks, or specific client needs..."
              className="w-full min-h-[160px] p-3.5 rounded-xl border border-border text-sm resize-y outline-none leading-relaxed font-sans"
            />
            <div className="mt-2 text-[11px] text-text-dim text-right">
              {content.length} characters
            </div>
          </div>

          {/* Report Inclusion Toggle */}
          <div className="p-5 bg-slate-50 rounded-2xl flex items-center justify-between border border-border">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "p-2 rounded-[10px]",
                  includeInReport
                    ? "bg-emerald-50 text-emerald-500"
                    : "bg-slate-50 text-text-dim",
                )}
              >
                <FileText size={20} />
              </div>
              <div>
                <div className="text-sm font-extrabold text-text-main">
                  Include in Final Report
                </div>
                <div className="text-[11px] text-text-dim mt-0.5">
                  Visible to client in the clinical document
                </div>
              </div>
            </div>
            <label className="relative inline-block w-[52px] h-7">
              <input
                type="checkbox"
                checked={includeInReport}
                onChange={(e) => setIncludeInReport(e.target.checked)}
                className="opacity-0 w-0 h-0"
              />
              <span
                className={cn(
                  "absolute cursor-pointer inset-0 rounded-full transition-all duration-300",
                  includeInReport ? "bg-emerald-500" : "bg-slate-300",
                )}
              >
                <span
                  className="absolute h-[22px] w-[22px] bottom-[3px] bg-white rounded-full transition-all duration-300 shadow-sm"
                  style={{ left: includeInReport ? "27px" : "3px" }}
                />
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="py-5 px-8 border-t border-border flex justify-between items-center">
          <div className="text-xs text-text-dim">
            <strong>Author:</strong> {user?.name || "Unknown"} (
            {user?.role || "OT"})
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="py-2.5 px-5 rounded-[10px] text-sm font-bold text-text-dim bg-transparent border-none cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isDisabled || isSaving}
              className={cn(
                "py-2.5 px-6 rounded-[10px] text-sm font-bold text-white border-none transition-all",
                isDisabled
                  ? "bg-slate-300 cursor-not-allowed"
                  : "bg-primary cursor-pointer shadow-[0_4px_12px_var(--primary-glow)]",
              )}
            >
              {isSaving ? "Saving..." : "Save Note"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AddObservationModal;
