"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { uploadBase64ToStorage, uploadFileToStorage } from "@/lib/surveys/upload";
import { compressBase64Image } from "@/lib/utils/ImageAnalysisUtils";
import { cn } from "@/lib/utils/cn";

export const BRANDING_BUCKET = "branding";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const MAX_BYTES = 5 * 1024 * 1024; // matches the bucket's file_size_limit

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

/**
 * Picks an image, shrinks it, uploads it to the public `branding` bucket and
 * hands back the public URL. Used for member avatars and organisation logos.
 *
 * `pathPrefix` must match the storage policies: `avatars/<user id>` or
 * `organisations/<organisation id>`.
 */
export default function ImageUploadField({
  label,
  value,
  onChange,
  pathPrefix,
  shape = "square",
  hint,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  pathPrefix: string;
  shape?: "circle" | "square";
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) return toast.error("Choose a JPEG, PNG, WebP or SVG image.");
    if (file.size > MAX_BYTES) return toast.error("Images must be 5 MB or smaller.");
    setUploading(true);
    try {
      let url: string;
      if (file.type === "image/svg+xml") {
        // Vectors cannot be canvas-compressed without rasterising them.
        url = await uploadFileToStorage(file, `${pathPrefix}/${Date.now()}.svg`, BRANDING_BUCKET);
      } else {
        const compressed = await compressBase64Image(await readAsDataUrl(file), 512, 0.85);
        url = await uploadBase64ToStorage(compressed, `${pathPrefix}/${Date.now()}.jpg`, BRANDING_BUCKET);
      }
      onChange(url);
      toast.success("Image uploaded. Save to apply it.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const rounding = shape === "circle" ? "rounded-full" : "rounded-xl";
  return (
    <div>
      <p className="text-xs font-bold text-slate-600">{label}</p>
      <div className="mt-2 flex items-center gap-4">
        <div
          className={cn(
            "flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-slate-50",
            rounding,
          )}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-supplied storage URL, no loader config
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon size={22} className="text-slate-300" aria-hidden="true" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            className="sr-only"
            onChange={(event) => void pick(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? "Uploading…" : value ? "Replace" : "Upload"}
          </button>
          {value && !uploading && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-slate-500 hover:text-red-600"
            >
              <X size={16} /> Remove
            </button>
          )}
          {hint && <p className="w-full text-xs text-slate-500">{hint}</p>}
        </div>
      </div>
    </div>
  );
}
