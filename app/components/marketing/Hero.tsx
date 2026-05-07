"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import HeroVideo from "@/app/components/marketing/HeroVideo";

const CATEGORIES = [
  {
    letter: "A",
    description: "Potentially suitable for wheelchair users throughout",
  },
  {
    letter: "B",
    description: "Potentially suitable for wheelchair users in essential rooms",
  },
  {
    letter: "C",
    description: "Level approach, wide doorways, stair-lift ready",
  },
  {
    letter: "D",
    description: "Wider doorways and more circulation space",
  },
  {
    letter: "E",
    description: "Step-free, level approach throughout",
  },
];

export default function Hero() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % CATEGORIES.length);
    }, 2800);
    return () => clearInterval(t);
  }, [paused]);

  const current = CATEGORIES[index];

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
            Stock intelligence for accessible housing
          </span>
          <h1
            id="hero-heading"
            className="ac-fade-up ac-fade-up-1 mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight text-[var(--text-main)]"
          >
            Understand{" "}
            <span className="text-[var(--primary-dark)] font-extrabold">
              accessibility
            </span>{" "}
            across your homes
          </h1>
          <p className="ac-fade-up ac-fade-up-2 mt-6 max-w-xl text-lg text-[var(--text-dim)] leading-relaxed">
            AccessCheck helps social landlords assess the accessibility of their
            homes using photos, floor plans and property data.
          </p>
          <div className="ac-fade-up ac-fade-up-3 mt-8 flex flex-col sm:flex-row gap-3">
            <Button asChild variant="primary" size="lg">
              <Link href="/contact" className="group">
                Request a demo
                <motion.span
                  aria-hidden="true"
                  animate={{ x: [0, 10, 0] }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="inline-flex group-hover:translate-x-2 transition-transform"
                >
                  <ArrowRight size={18} />
                </motion.span>
              </Link>
            </Button>
            <Button
              asChild
              className="bg-primary-light border-primary border"
              variant="outline"
              size="lg"
            >
              <Link href="/demo">Try the demo</Link>
            </Button>
          </div>
          <p className="mt-6 text-xs text-[var(--text-dim)]">
            By Foundations · Powered by{" "}
            <span className="font-semibold text-[var(--text-main)]">
              Rightision
            </span>
          </p>
        </div>

        <div className="relative ac-fade-up ac-fade-up-2">
          <div
            className="visual-card relative rounded-2xl overflow-hidden border border-[var(--border)] shadow-xl bg-[var(--bg-surface)] transition-transform duration-300 hover:-translate-y-1"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <HeroVideo />

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

            {/* Glass-morphic category badge — animated */}
            <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-[340px]">
              <div className="card-glass relative inline-flex items-center gap-3 px-4 py-3 rounded-xl bg-white/15 backdrop-blur-md border border-white/30 shadow-lg text-white overflow-hidden">
                {/* Letter tile */}
                <div className="relative w-14 h-14 shrink-0">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={current.letter}
                      initial={{ opacity: 0, y: 14, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -14, scale: 0.9 }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                      className="absolute inset-0 rounded-xl grid place-items-center text-white font-extrabold text-2xl bg-[var(--primary)] shadow-md"
                      aria-hidden="true"
                    >
                      {current.letter}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Text */}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.18em] font-semibold opacity-90">
                    Accessibility Category
                  </p>
                  <div className="relative h-[2.6rem]">
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={current.letter}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="absolute inset-0 text-xs mt-1 font-bold leading-tight"
                      >
                        {current.description}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Progress dots */}
              <div
                className="mt-2 flex items-center gap-1.5 px-1"
                role="tablist"
                aria-label="Accessibility category preview"
              >
                {CATEGORIES.map((c, i) => (
                  <button
                    key={c.letter}
                    role="tab"
                    aria-selected={i === index}
                    aria-label={`Show category ${c.letter}`}
                    onClick={() => setIndex(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === index
                        ? "w-6 bg-white shadow-sm"
                        : "w-1.5 bg-white/40 hover:bg-white/60"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
          <p className="sr-only">
            AccessCheck analyses photos and floor plans to assign an
            accessibility category from A to G. Examples cycle through
            categories A to E.
          </p>
        </div>
      </div>
    </section>
  );
}
