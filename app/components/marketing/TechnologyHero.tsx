"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Cpu } from "lucide-react";

export default function TechnologyHero() {
  return (
    <section
      aria-labelledby="tech-hero-heading"
      className="relative overflow-hidden bg-white border-b border-[var(--border)]"
    >
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
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase text-[var(--primary-dark)] bg-[var(--primary-light)] border border-[var(--primary)]/20"
          >
            <Cpu size={14} aria-hidden="true" />
            ASE Engine v2.0
          </motion.span>

          <motion.h1
            id="tech-hero-heading"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.05 }}
            className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight text-[var(--text-main)]"
          >
            The Science of{" "}
            <span className="bg-gradient-to-r from-[var(--primary)] via-[var(--primary-dark)] to-[var(--primary)] bg-clip-text text-transparent">
              Accessibility
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.12 }}
            className="mt-6 max-w-xl text-lg text-[var(--text-dim)] leading-relaxed"
          >
            Our Accessibility Scoring Engine (ASE) leverages advanced computer
            vision and deep learning to transform floor plans, photos and
            property data into actionable accessibility insights.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          className="relative max-w-md mx-auto lg:max-w-none lg:ml-auto lg:mr-0 w-full"
        >
          <div className="relative rounded-2xl overflow-hidden border border-[var(--border)] shadow-xl bg-[var(--bg-surface)] aspect-[4/3]">
            <Image
              src="/assets/media/visual-inteligence.png"
              alt="Accessibility Scoring Engine analysing a property"
              fill
              priority
              sizes="(min-width: 1024px) 40vw, (min-width: 640px) 60vw, 90vw"
              className="object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(var(--primary-dark) 1px, transparent 1px), linear-gradient(90deg, var(--primary-dark) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            <div className="ac-scan-overlay" aria-hidden="true" />
            <div className="ac-scan-line" aria-hidden="true" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
