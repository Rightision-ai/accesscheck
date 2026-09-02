"use client";

import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface PhotoLightboxProps {
  /** Signed URL (or data URL) of the photo to show. Falsy closes the lightbox. */
  photo: string | null;
  onClose: () => void;
  alt?: string;
  caption?: string;
}

/**
 * Full-screen photo viewer, scaled to fit the viewport.
 *
 * Portalled to <body> so it escapes the stacking/overflow context of whatever
 * opened it — the assessment wizard shell is `z-1000` and clips its children.
 */
const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  photo,
  onClose,
  alt = "Full size",
  caption,
}) => {
  // Refs that fail to sign come back as "" — render nothing rather than a broken image.
  const isOpen = !!photo;

  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  // `document` is undefined during SSR, so the portal target only exists client-side.
  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center p-5 gap-3"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-5 right-5 bg-white/10 hover:bg-white/20 border-none rounded-full w-10 h-10 flex items-center justify-center cursor-pointer text-white"
      >
        <X size={24} />
      </button>
      <img
        src={photo!}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-full object-contain rounded-xl"
      />
      {caption && (
        <p className="text-white/70 text-xs font-semibold text-center">
          {caption}
        </p>
      )}
    </div>,
    document.body,
  );
};

export default PhotoLightbox;
