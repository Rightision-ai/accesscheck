import Link from "next/link";
import Image from "next/image";

import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden bg-white"
    >
      {/* subtle decorative grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(var(--primary-dark) 1px, transparent 1px), linear-gradient(90deg, var(--primary-dark) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="ac-fade-up inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase text-[var(--primary-dark)] bg-[var(--primary-light)] border border-[var(--primary)]/20">
            <Sparkles size={14} aria-hidden="true" />
            AI-powered accessibility intelligence
          </span>
          <h1
            id="hero-heading"
            className="ac-fade-up ac-fade-up-1 mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight text-[var(--text-main)]"
          >
            Assess homes and assign{" "}
            <span className="text-[var(--primary-dark)]">
              accessibility categories
            </span>{" "}
            using AI
          </h1>
          <p className="ac-fade-up ac-fade-up-2 mt-6 max-w-xl text-lg text-[var(--text-dim)] leading-relaxed">
            AccessCheck analyses photos and floor plans to produce a clear
            accessibility grade and a defensible, DFG-ready report — in minutes,
            not weeks.
          </p>
          <div className="ac-fade-up ac-fade-up-3 mt-8 flex flex-col sm:flex-row gap-3">
            <Button asChild variant="primary" size="lg">
              <Link href="/login">
                Get started
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/solutions/floor-plan-analysis">See how it works</Link>
            </Button>
          </div>
          <p className="mt-6 text-xs text-[var(--text-dim)]">
            By Foundations · Powered by
            <Image
              src="/assets/media/rightision-logo.png"
              alt="Rightision"
              width={50}
              height={50}
              className="h-8 w-auto ml-2"
            />
          </p>
        </div>

        <div className="relative ac-fade-up ac-fade-up-2">
          <div className="visual-card relative rounded-2xl overflow-hidden border border-[var(--border)] shadow-xl bg-[var(--bg-surface)] transition-transform duration-300 hover:-translate-y-1">
            {/* hero-image (drop a real photo at /public/assets/media/hero-home.jpg) */}

            <div
              role="img"
              aria-label="A modern living room being analysed by AccessCheck"
              className="aspect-[4/3] bg-cover bg-center"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.45) 100%), url('/assets/media/hero_bg-B3Bwin3-.jpg')",
                backgroundColor: "var(--bg-surface)",
              }}
            />

            {/* AI scanning overlay */}
            <div className="ac-scan-overlay" aria-hidden="true">
              <div className="ac-scan-line" />
            </div>

            {/* Top-left live badge */}
            <div className="absolute top-4 left-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur border border-white/60 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--primary)]" />
              </span>
              <span className="text-xs font-semibold text-[var(--text-main)]">
                Live accessibility analysis
              </span>
            </div>

            {/* Glass-morphic grade badge */}
            <div className="card-glass absolute bottom-4 left-4 sm:max-w-[300px] inline-flex items-center gap-3 px-4 py-3 rounded-xl bg-white/15 backdrop-blur-md border border-white/30 shadow-lg text-white">
              <div
                className="w-14 h-14 rounded-xl grid place-items-center text-white font-extrabold text-2xl bg-[var(--primary)] shadow-md shrink-0"
                aria-hidden="true"
              >
                A
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] font-semibold opacity-90">
                  Accessibility Grade
                </p>
                <p className="text-base font-bold leading-tight">
                  Grade A · Wheelchair-accessible
                </p>
              </div>
            </div>
          </div>
          <p className="sr-only">
            AccessCheck analyses photos and floor plans to assign an
            accessibility grade from A to G. The example shown receives Grade A.
          </p>
        </div>
      </div>
    </section>
  );
}
