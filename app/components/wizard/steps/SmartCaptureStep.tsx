import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Trash2, CheckCircle, RefreshCw, Sparkles } from "lucide-react";
import { WizardStepProps } from "../types";
import { cn } from "@/lib/utils/cn";

const CAPTURE_CATEGORIES = [
  {
    id: "entrance",
    title: "Main Entrance",
    desc: "Door and structural steps.",
    required: true,
  },
  {
    id: "hallway",
    title: "Hallway",
    desc: "Long shot showing width.",
    required: true,
  },
  {
    id: "stairs",
    title: "Internal Stairs",
    desc: "From bottom looking up.",
    condition: (d: any) => d.internalStairs === "Yes",
  },
  {
    id: "kitchen",
    title: "Kitchen",
    desc: "Floor space and turning circle.",
    required: true,
  },
  {
    id: "bathroom",
    title: "Bathroom",
    desc: "Toilet space and shower type.",
    required: true,
  },
  {
    id: "garden",
    title: "Garden Access",
    desc: "Door threshold to garden.",
    condition: (d: any) =>
      d.gardenAccess === "Yes" || d.propertyAccessGarden === "Yes",
  },
];

const SmartCaptureStep: React.FC<WizardStepProps> = ({
  formData,
  handleUpdateField,
  handlePhotoUpload,
  isProcessing,
  processingCategory,
  validationErrors,
  onClearValidationError,
  isAnalyzing,
  categoryResults,
  onPhotosChanged,
  streetViewSeededUrl,
}) => {
  const categoryPhotos = formData.categoryPhotos || {};

  const removePhoto = (catId: string, photoIndex: number) => {
    const currentCatPhotos = [...(categoryPhotos[catId] || [])];
    currentCatPhotos.splice(photoIndex, 1);

    const updatedCategoryPhotos = {
      ...categoryPhotos,
      [catId]: currentCatPhotos,
    };
    handleUpdateField("categoryPhotos", updatedCategoryPhotos);

    const allCategorizedPhotos = Object.values(updatedCategoryPhotos).flat();
    handleUpdateField("photos", allCategorizedPhotos);

    onClearValidationError?.(catId);
    onPhotosChanged?.(updatedCategoryPhotos);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.99 }}
      className="p-5 relative"
    >
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            key="analyzing-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-primary/10 backdrop-blur-[2px] rounded-2xl z-20 flex flex-col items-center justify-center gap-4 pointer-events-all"
          >
            <div className="bg-white rounded-[20px] py-7 px-9 shadow-[0_8px_32px_rgba(99,102,241,0.18)] border border-primary/15 flex flex-col items-center gap-3.5 min-w-[220px]">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-[3px] border-primary-light" />
                <div
                  className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary animate-spin"
                  style={{ animationDuration: "0.8s" }}
                />
                <div className="absolute inset-2.5 rounded-full bg-primary-light flex items-center justify-center">
                  <Camera size={14} className="text-primary" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-extrabold text-[15px] text-primary mb-1">
                  Analysing Photos
                </p>
                <p className="text-xs text-slate-400 font-medium">
                  AI is verifying your evidence&hellip;
                </p>
              </div>
              <div className="flex gap-1.5 items-center">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-[7px] h-[7px] rounded-full bg-primary animate-pulse"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mb-5">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="py-0.5 px-2 bg-primary text-white rounded text-[8px] font-black uppercase tracking-wider">
                Guided Evidence
              </div>
            </div>
            <h3 className="text-xl font-extrabold mb-0.5 text-primary">
              Smart Capture
            </h3>
            <p className="text-text-dim text-xs">
              Upload photos per category for millimetre-perfect AI verification.
            </p>
          </div>
          {isProcessing && (
            <div className="flex items-center gap-1.5 py-1.5 px-3 bg-primary-light rounded-[10px] text-primary font-bold text-xs">
              <RefreshCw className="animate-spin" size={14} />
              Uploading...
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4 mb-6">
        {CAPTURE_CATEGORIES.map((cat) => {
          const currentPhotos = categoryPhotos[cat.id] || [];
          const isFull = currentPhotos.length >= 3;
          const hasError = validationErrors?.[cat.id];
          const analysisResult = categoryResults?.[cat.id];

          const isUploadBlocked = isProcessing || isAnalyzing;

          const cardBorderClass =
            analysisResult === "valid"
              ? "border-2 border-green-500"
              : analysisResult === "invalid" || hasError
                ? "border-2 border-amber-400"
                : "border border-border";

          const cardShadowClass =
            analysisResult === "valid"
              ? "shadow-[0_2px_10px_rgba(34,197,94,0.08)]"
              : analysisResult === "invalid"
                ? "shadow-[0_2px_10px_rgba(250,204,21,0.1)]"
                : "shadow-[0_2px_10px_rgba(0,0,0,0.02)]";

          return (
            <div
              key={cat.id}
              className={cn(
                "bg-white rounded-[20px] p-4 flex flex-col gap-3 transition-colors",
                cardBorderClass,
                cardShadowClass,
              )}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800 mb-0.5 flex items-center gap-1">
                    {cat.title}
                    {cat.required && (
                      <span className="text-red-500 text-xs" title="Required">
                        *
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-500">{cat.desc}</p>
                  {cat.id === "entrance" &&
                    streetViewSeededUrl &&
                    currentPhotos[0] === streetViewSeededUrl && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary-light py-0.5 px-1.5 rounded">
                        <Sparkles size={10} />
                        Detected with our AI — replace if inaccurate
                      </div>
                    )}
                  {hasError && (
                    <div className="mt-1 text-[10px] text-amber-600 font-bold">
                      ⚠️ Unrelated photo
                    </div>
                  )}
                </div>
                {analysisResult === "valid" ? (
                  <div className="flex items-center gap-1 text-green-600 bg-green-100 py-0.5 px-1.5 rounded-md">
                    <CheckCircle size={11} />
                    <span className="text-[9px] font-black uppercase">
                      Verified
                    </span>
                  </div>
                ) : analysisResult === "invalid" ? (
                  <span className="text-[8px] font-black text-amber-800 uppercase bg-amber-100 py-0.5 px-1.5 rounded">
                    ⚠ Review
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    {cat.required && currentPhotos.length === 0 && (
                      <span className="text-[8px] font-black text-red-500 uppercase bg-red-50 py-0.5 px-1.5 rounded">
                        Required
                      </span>
                    )}
                    <div
                      className={cn(
                        "flex items-center gap-1",
                        currentPhotos.length > 0
                          ? "text-green-600"
                          : "text-slate-400",
                      )}
                    >
                      {currentPhotos.length > 0 && <CheckCircle size={12} />}
                      <span className="text-[10px] font-extrabold">
                        {currentPhotos.length}/3
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {currentPhotos.map((photo: string, idx: number) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-lg overflow-hidden border border-slate-200"
                  >
                    <img
                      src={photo}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removePhoto(cat.id, idx)}
                      disabled={isAnalyzing}
                      className="absolute top-0.5 right-0.5 bg-black/50 border-none rounded-full w-[18px] h-[18px] flex items-center justify-center text-white z-10 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
                {!isFull && (
                  <label
                    className={cn(
                      "relative aspect-square bg-slate-50 rounded-lg border border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer transition-all",
                      currentPhotos.length === 0 && "col-span-3 h-20",
                      isUploadBlocked && "opacity-70 cursor-not-allowed",
                      !isUploadBlocked &&
                        "hover:border-primary hover:bg-primary-light",
                    )}
                  >
                    {isUploadBlocked && (
                      <div className="absolute inset-0 bg-slate-400/40 rounded-lg z-10 cursor-not-allowed pointer-events-auto" />
                    )}
                    <input
                      type="file"
                      accept="image/*,image/heic,.heic"
                      hidden
                      onChange={(e) =>
                        handlePhotoUpload && handlePhotoUpload(e, cat.id)
                      }
                      multiple
                      disabled={isUploadBlocked}
                    />
                    <Camera
                      size={currentPhotos.length === 0 ? 20 : 16}
                      className="text-slate-400"
                    />
                    {currentPhotos.length === 0 && (
                      <span className="text-[11px] font-bold text-slate-500 mt-1">
                        Add Photos
                      </span>
                    )}
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default SmartCaptureStep;
