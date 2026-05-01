import { Check, AlertTriangle } from "lucide-react";

const GRADES = [
  { letter: "A", label: "Wheelchair-accessible throughout" },
  { letter: "B", label: "Wheelchair-accessible to essential rooms" },
  { letter: "C", label: "Level approach, wide doorways, stair-lift-ready" },
  { letter: "D", label: "Level approach, wider doors, more space" },
  { letter: "E", label: "Step-free, level throughout" },
  { letter: "F", label: "General-needs housing" },
  { letter: "G", label: "Not yet assessed — fill gaps to grade" },
];

export default function GradeShowcase() {
  return (
    <section
      aria-labelledby="grade-heading"
      className="bg-white border-t border-[var(--border)]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* LEFT: annotated bathroom photo */}
        <figure className="relative rounded-2xl overflow-hidden border border-[var(--border)] shadow-xl bg-[var(--bg-surface)] aspect-[4/5]">
          <div
            role="img"
            aria-label="An accessible bathroom analysed by AccessCheck — turning radius verified, doorway clear width OK, a 2cm step detected"
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.35)), url('/assets/media/adaptability_bg-tv-tH5Za.jpg')",
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

        {/* RIGHT: grade explainer */}
        <div>
          <span className="inline-block text-xs font-semibold uppercase tracking-wide text-[var(--primary-dark)]">
            Accessibility Grade
          </span>
          <h2
            id="grade-heading"
            className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text-main)] leading-[1.05]"
          >
            One clear grade. Backed by photo evidence.
          </h2>
          <p className="mt-4 text-lg text-[var(--text-dim)] leading-relaxed">
            Every property gets a letter grade from A to G, drawn from
            recognised accessibility standards. Each grade is backed by the
            photographs, measurements and listing text we analysed — so OTs,
            grant officers and applicants can defend it.
          </p>

          <div className="mt-6 inline-flex items-center gap-3 rounded-full bg-[var(--primary-light)] border border-[var(--primary)]/20 px-4 py-2">
            <span className="grid place-items-center w-7 h-7 rounded-md bg-[var(--primary)] text-white text-sm font-extrabold">
              A
            </span>
            <span className="text-sm font-semibold text-[var(--primary-dark)]">
              Sample property — Grade A · highly compatible.
            </span>
          </div>

          <ul className="mt-8 space-y-3">
            {GRADES.map((g) => (
              <li key={g.letter} className="flex items-center gap-4">
                <span
                  aria-hidden="true"
                  className="grid place-items-center w-9 h-9 rounded-md text-white font-extrabold bg-[var(--primary-dark)]"
                >
                  {g.letter}
                </span>
                <span className="text-sm text-[var(--text-main)]">
                  <span className="sr-only">Grade {g.letter}: </span>
                  {g.label}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
              <AlertTriangle size={16} aria-hidden="true" />
              Listing vs photo conflict
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Listing claimed “step-free”, but the analysis detected a 2&nbsp;cm
              shower platform.
            </p>
          </div>

          <ul className="mt-5 space-y-2 text-sm text-[var(--text-main)]">
            <li className="flex items-center gap-2">
              <Check
                size={16}
                className="text-[var(--primary-dark)]"
                aria-hidden="true"
              />
              Wide doorways (85&nbsp;cm+)
            </li>
            <li className="flex items-center gap-2">
              <Check
                size={16}
                className="text-[var(--primary-dark)]"
                aria-hidden="true"
              />
              Turning radius verified (1.5&nbsp;m)
            </li>
            <li className="flex items-center gap-2">
              <Check
                size={16}
                className="text-[var(--primary-dark)]"
                aria-hidden="true"
              />
              Grab rails detected in bathroom
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
