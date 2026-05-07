"use client";

import { motion } from "framer-motion";
import { Users, Wrench, FileText, TrendingUp, Sparkles } from "lucide-react";

const CARDS = [
  {
    icon: Users,
    title: "Match applicants to suitable homes",
    desc: "Give allocations teams clearer information before offers are made.",
  },
  {
    icon: Wrench,
    title: "Understand adaptation potential",
    desc: "See whether common changes such as level access, ramps, bathroom changes or layout changes may be feasible.",
  },
  {
    icon: FileText,
    title: "Build better accessibility records",
    desc: "Create property-level data that can support accessible housing registers and stock planning.",
  },
  {
    icon: TrendingUp,
    title: "Plan future investment",
    desc: "Identify where homes could be improved through planned works, refurbishment or retrofit.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export default function LandlordCapabilities() {
  return (
    <section aria-labelledby="capabilities-heading" className="bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
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
            <Sparkles size={14} aria-hidden="true" />
            What AccessCheck does
          </motion.span>
          <motion.h2
            id="capabilities-heading"
            variants={fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-4 text-4xl md:text-5xl font-black tracking-tight text-[var(--text-main)] leading-[1.1]"
          >
            What <span className="text-[var(--primary-dark)]">AccessCheck</span>{" "}
            helps landlords do.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-5 text-lg text-[var(--text-dim)] leading-relaxed"
          >
            A shared view of accessibility — from allocations and adaptations to
            records and long-term investment.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
          }}
          className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {CARDS.map(({ icon: Icon, title, desc }) => (
            <motion.article
              key={title}
              variants={fadeUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
              whileHover={{ y: -4 }}
              className="rounded-2xl bg-[var(--bg-surface)] p-6 border border-[var(--border)] transition-shadow duration-300 hover:shadow-lg"
            >
              <span
                className="inline-grid place-items-center w-12 h-12 rounded-lg bg-[var(--primary-light)] text-[var(--primary-dark)]"
                aria-hidden="true"
              >
                <Icon size={22} />
              </span>
              <h3 className="mt-5 text-xl font-bold text-[var(--text-main)] leading-snug">
                {title}
              </h3>
              <p className="mt-3 text-sm text-[var(--text-dim)] leading-relaxed">
                {desc}
              </p>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
