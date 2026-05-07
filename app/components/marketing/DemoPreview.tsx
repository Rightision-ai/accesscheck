"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";

const POSTER_URL =
  process.env.NEXT_PUBLIC_DEMO_VIDEO_POSTER_URL ||
  "/assets/media/hero_bg-B3Bwin3-.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export default function DemoPreview() {
  return (
    <section
      aria-labelledby="demo-preview-heading"
      className="bg-white border-y border-[var(--border)]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08 } },
          }}
          className="max-w-3xl"
        >
          <motion.span
            variants={fadeUp}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase text-[var(--primary-dark)] bg-[var(--primary-light)] border border-[var(--primary)]/20"
          >
            <Play size={14} aria-hidden="true" fill="currentColor" />
            Interactive demo
          </motion.span>
          <motion.h2
            id="demo-preview-heading"
            variants={fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-4 text-4xl md:text-5xl font-black tracking-tight text-[var(--text-main)] leading-[1.1]"
          >
            See <span className="text-[var(--primary-dark)]">AccessCheck</span>{" "}
            in action.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-5 text-lg text-[var(--text-dim)] leading-relaxed"
          >
            Walk through a real assessment in minutes — no sign-up required.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
          className="mt-12"
        >
        <Link
          href="/demo"
          aria-label="Open the interactive AccessCheck demo"
          className="group block relative rounded-2xl overflow-hidden border border-[var(--border)] shadow-xl bg-[var(--bg-surface)] transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-dark)] focus-visible:ring-offset-2"
        >
          <div className="relative aspect-video w-full">
            <img
              src={POSTER_URL}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/50"
            />
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 grid place-items-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/95 text-[var(--primary-dark)] shadow-lg ring-1 ring-black/5 transition-transform duration-300 group-hover:scale-110 group-focus-visible:scale-110"
            >
              <Play size={36} className="ml-1" fill="currentColor" />
            </span>
            <span className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 inline-flex items-center gap-2 text-white text-sm sm:text-base font-semibold">
              Try the interactive demo
              <ArrowRight
                size={18}
                className="transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </span>
          </div>
        </Link>
        </motion.div>
      </div>
    </section>
  );
}
