"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const STEPS = [
  {
    number: "01",
    title: "Data Ingestion",
    description:
      "Processing visual data from floor plans, 3D tours and high-resolution property images.",
    badge: "Supports: JPG, PDF, Matterport",
  },
  {
    number: "02",
    title: "Feature Extraction",
    description:
      "Computer vision algorithms identify critical features: door widths, step heights and corridor clearance.",
    badge: "Precision: ±1.5cm",
  },
  {
    number: "03",
    title: "Scoring Logic",
    description:
      "Mapping extracted features against established housing standards (ADA, Part M, Lifetime Homes).",
    badge: "Output: 0–100 Score",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export default function TechnologyHowItWorks() {
  return (
    <section
      aria-labelledby="tech-how-heading"
      className="bg-[var(--bg-surface)] border-b border-[var(--border)]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <motion.h2
          id="tech-how-heading"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center text-4xl md:text-5xl font-black tracking-tight text-[var(--text-main)]"
        >
          How It Works
        </motion.h2>

        <motion.ol
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
          }}
          className="mt-12 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr_auto_1fr] gap-6 lg:gap-4 items-stretch"
        >
          {STEPS.map((step, i) => (
            <Fragment key={step.number}>
              <motion.li
                variants={fadeUp}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative rounded-2xl border border-[var(--border)] bg-white p-7 shadow-[var(--shadow-sm)] overflow-hidden"
              >
                <span
                  aria-hidden="true"
                  className="absolute top-3 right-5 text-7xl md:text-8xl font-black leading-none text-[var(--text-main)]/5 select-none"
                >
                  {step.number}
                </span>
                <h3 className="relative text-xl font-bold text-[var(--text-main)]">
                  {step.title}
                </h3>
                <p className="relative mt-3 text-sm text-[var(--text-dim)] leading-relaxed">
                  {step.description}
                </p>
                <span className="relative mt-6 inline-block px-3 py-1.5 rounded-md font-mono text-xs text-[var(--primary-dark)] bg-[var(--primary-light)] border border-[var(--primary)]/20">
                  {step.badge}
                </span>
              </motion.li>
              {i < STEPS.length - 1 && (
                <motion.span
                  variants={fadeUp}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  aria-hidden="true"
                  className="hidden lg:flex items-center justify-center text-[var(--primary-dark)]"
                >
                  <ArrowRight size={28} strokeWidth={2.5} />
                </motion.span>
              )}
            </Fragment>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
