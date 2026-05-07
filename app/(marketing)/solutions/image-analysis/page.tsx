import { AlertTriangle } from "lucide-react";
import SolutionPage from "@/app/components/marketing/SolutionPage";

export const metadata = {
  title: "Image analysis",
  description:
    "Detect grab rails, thresholds, wet rooms and more from existing photos with computer vision.",
};

function ImageAnalysisHero() {
  return (
    <figure className="relative rounded-2xl overflow-hidden border border-[var(--border)] shadow-xl bg-[var(--bg-surface)] aspect-[4/5]">
      <div
        role="img"
        aria-label="An accessible bathroom analysed by AccessCheck — turning radius verified, doorway clear width OK, a 2cm step detected"
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.35)), url('/assets/media/image-analysis.jpg')",
          backgroundColor: "var(--bg-surface)",
        }}
      />
      <div className="ac-scan-overlay" aria-hidden="true">
        <div className="ac-scan-line" />
      </div>

      {/* Marker: turning radius (verified, green pulse) */}
      <div className="absolute left-[30%] bottom-[25%] flex items-center gap-2">
        <span
          className="ac-pulse w-3 h-3 rounded-full bg-[var(--primary)] shrink-0"
          aria-hidden="true"
        />
        <span className="px-2.5 py-1.5 rounded-md bg-[var(--primary-dark)] text-white text-[11px] font-semibold tracking-wide uppercase shadow-md">
          1.5m turning radius — verified
        </span>
      </div>

      {/* Marker: clear width (verified, green) */}
      <div className="absolute left-[73%] top-[42%] -translate-x-1/2 flex flex-col items-center gap-1">
        <div
          aria-hidden="true"
          className="flex items-center justify-between w-60 h-[2px] bg-[var(--primary)]"
        >
          <span className="block w-2 h-2 rounded-full bg-[var(--primary)]" />
          <span className="block w-2 h-2 rounded-full bg-[var(--primary)]" />
        </div>
        <span className="px-2.5 py-1.5 rounded-md bg-[var(--primary-dark)] text-white text-[11px] font-semibold tracking-wide uppercase shadow-md">
          95cm clear width — OK
        </span>
      </div>

      {/* Marker: step detected (warning) */}
      <div className="absolute right-[10%] bottom-[15%] flex items-center gap-2">
        <span
          className="ac-blink grid place-items-center w-7 h-7 rounded-full bg-amber-400 text-amber-900 shrink-0 shadow-md"
          aria-hidden="true"
        >
          <AlertTriangle size={16} />
        </span>
        <span className="px-2.5 py-1.5 rounded-md bg-amber-500 text-amber-950 text-[11px] font-semibold tracking-wide uppercase shadow-md">
          Step detected: 2cm
        </span>
      </div>

      <figcaption className="sr-only">
        AccessCheck overlays accessibility-relevant measurements directly on
        the photo: a verified 1.5 metre turning radius, a 95 centimetre
        doorway clear width, and a 2 centimetre step that breaks the
        step-free claim.
      </figcaption>
    </figure>
  );
}

export default function ImageAnalysisPage() {
  return (
    <SolutionPage
      eyebrow="Image analysis"
      title="Photos become evidence."
      intro="AccessCheck reads the photos you already have — stock photos, listing shots, surveyor or OT site photos, tenant-supplied images — and pulls out the accessibility-relevant detail."
      hero={<ImageAnalysisHero />}
      highlights={[
        "Grab rails, level access, ramps",
        "Step heights and thresholds",
        "Wet rooms and accessible WC fixtures",
        "Trip hazards and circulation issues",
      ]}
      body={[
        {
          heading: "Detection that grounds every claim",
          text: "Each finding is anchored to the exact image and region it came from. If the report says ‘grab rails detected in bathroom’, you can click through to the photo. That traceability is what makes the assessment defensible.",
        },
        {
          heading: "Works with the photos you already have",
          text: "No special equipment, no LiDAR, no scheduled re-visits. AccessCheck makes use of existing imagery — including HEIC iPhone shots — so social landlords, occupational therapists and home improvement agencies can move faster on the homes and cases they’re already working.",
        },
        {
          heading: "Surfaces conflicts with listing or stock data",
          text: "If a listing description, stock record and the photographs disagree, AccessCheck flags it. That single feature alone tends to catch a meaningful share of hidden barriers before a tenant or applicant ever views a property.",
        },
      ]}
    />
  );
}
