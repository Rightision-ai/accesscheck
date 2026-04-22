"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

export type Annotation = {
  id: string;
  // bbox in pixel coordinates of the source image, [x, y, w, h].
  bbox: [number, number, number, number];
  // Optional SAM mask polygon in source-image pixels, e.g. [[x,y], [x,y], ...].
  polygon?: [number, number][];
  label: string;
  valueText?: string;
  criterionId?: string;
  confidence: number;
  color: string;
};

type Props = {
  src: string;
  alt?: string;
  annotations: Annotation[];
  // Natural (source) image dimensions. If not provided, we read them from the loaded <img>.
  naturalWidth?: number;
  naturalHeight?: number;
  highlightedId?: string;
  onAnnotationClick?: (a: Annotation) => void;
  onAnnotationHover?: (a: Annotation | null) => void;
  hiddenClasses?: Set<string>;
  className?: string;
};

export default function AnnotatedImage({
  src,
  alt,
  annotations,
  naturalWidth,
  naturalHeight,
  highlightedId,
  onAnnotationClick,
  onAnnotationHover,
  hiddenClasses,
  className,
}: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(
    naturalWidth && naturalHeight ? { w: naturalWidth, h: naturalHeight } : null,
  );

  useEffect(() => {
    if (naturalWidth && naturalHeight) {
      setNatural({ w: naturalWidth, h: naturalHeight });
    }
  }, [naturalWidth, naturalHeight]);

  const handleLoad = () => {
    const el = imgRef.current;
    if (el && !natural) {
      setNatural({ w: el.naturalWidth, h: el.naturalHeight });
    }
  };

  const visible = annotations.filter((a) => !hiddenClasses?.has(a.label));

  return (
    <div className={cn("relative inline-block w-full", className)}>
      <img
        ref={imgRef}
        src={src}
        alt={alt ?? ""}
        onLoad={handleLoad}
        className="block h-auto w-full rounded"
      />
      {natural && (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 ${natural.w} ${natural.h}`}
          preserveAspectRatio="none"
        >
          {visible.map((a) => {
            const [x, y, w, h] = a.bbox;
            const active = a.id === highlightedId;
            const dashed = a.confidence < 0.5;
            return (
              <g
                key={a.id}
                className="pointer-events-auto cursor-pointer"
                onClick={() => onAnnotationClick?.(a)}
                onMouseEnter={() => onAnnotationHover?.(a)}
                onMouseLeave={() => onAnnotationHover?.(null)}
              >
                {a.polygon && a.polygon.length > 2 ? (
                  <polygon
                    points={a.polygon.map((p) => p.join(",")).join(" ")}
                    fill={a.color}
                    fillOpacity={active ? 0.28 : 0.12}
                    stroke={a.color}
                    strokeWidth={active ? 4 : 2}
                    strokeDasharray={dashed ? "8 6" : undefined}
                  />
                ) : null}
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill={a.polygon ? "transparent" : a.color}
                  fillOpacity={a.polygon ? 0 : active ? 0.18 : 0.08}
                  stroke={a.color}
                  strokeWidth={active ? 4 : 2}
                  strokeDasharray={dashed ? "8 6" : undefined}
                  opacity={Math.max(0.35, Math.min(1, a.confidence + 0.25))}
                />
                <Label
                  x={x}
                  y={y}
                  color={a.color}
                  text={a.valueText ? `${a.label} · ${a.valueText}` : a.label}
                  active={active}
                />
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

function Label({
  x,
  y,
  text,
  color,
  active,
}: {
  x: number;
  y: number;
  text: string;
  color: string;
  active: boolean;
}) {
  // Rough character-width heuristic (px @ 14px font). SVG text auto-sizes with viewBox.
  const approxWidth = Math.max(60, text.length * 8 + 16);
  const height = 22;
  const padX = 8;
  const labelY = y - height - 4 < 0 ? y + 4 : y - height - 4;
  return (
    <g>
      <rect
        x={x}
        y={labelY}
        width={approxWidth}
        height={height}
        rx={4}
        fill={color}
        opacity={active ? 1 : 0.9}
      />
      <text
        x={x + padX}
        y={labelY + height - 7}
        fill="white"
        fontSize={14}
        fontWeight={600}
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        {text}
      </text>
    </g>
  );
}
