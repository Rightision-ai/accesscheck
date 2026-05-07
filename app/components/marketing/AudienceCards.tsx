"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Building2, Wrench, Check, Users } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const CARDS = [
  {
    icon: Building2,
    eyebrow: "For allocations & lettings teams",
    title: "Match applicants to homes that work.",
    bullets: [
      "Clearer information about each home before offers are made",
      "Shared view of stock accessibility across the team",
      "Fewer refused offers and avoidable moves",
      "Faster, better-informed allocation decisions",
    ],
    cta: { label: "Request a demo", href: "/contact" },
    accent: "primary",
  },
  {
    icon: Wrench,
    eyebrow: "For asset & adaptations teams",
    title: "Plan adaptations and investment with confidence.",
    bullets: [
      "See where adaptations may be realistic, limited or unlikely",
      "Build property-level accessibility records",
      "Support accessible housing registers and stock planning",
      "Identify priorities for refurbishment and retrofit",
    ],
    cta: { label: "Talk to us", href: "/contact" },
    accent: "neutral",
  },
] as const;

export default function AudienceCards() {
  return (
    <section
      aria-labelledby="audience-heading"
      className="bg-[var(--bg-surface)]"
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
            <Users size={14} aria-hidden="true" />
            Who it&rsquo;s for
          </motion.span>
          <motion.h2
            id="audience-heading"
            variants={fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-4 text-4xl md:text-5xl font-black tracking-tight text-[var(--text-main)] leading-[1.1]"
          >
            Built for social landlords.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-5 text-lg text-[var(--text-dim)] leading-relaxed"
          >
            Whether you are matching homes to applicants today or planning
            investment for tomorrow, AccessCheck fits how you work.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
          }}
          className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {CARDS.map(({ icon: Icon, ...c }) => (
            <motion.article
              key={c.title}
              variants={fadeUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
              whileHover={{ y: -4 }}
              className={`rounded-2xl bg-white p-8 border transition-shadow duration-300 hover:shadow-lg ${c.accent === "primary" ? "border-[var(--primary)]" : "border-[var(--border)]"}`}
            >
              <span
                className="inline-grid place-items-center w-12 h-12 rounded-lg bg-[var(--primary-light)] text-[var(--primary-dark)]"
                aria-hidden="true"
              >
                <Icon size={22} />
              </span>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--text-dim)]">
                {c.eyebrow}
              </p>
              <h3 className="mt-1 text-2xl font-bold text-[var(--text-main)]">
                {c.title}
              </h3>
              <ul className="mt-5 space-y-2.5">
                {c.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-2 text-[var(--text-main)]"
                  >
                    <Check
                      size={18}
                      className="mt-0.5 text-[var(--primary-dark)] shrink-0"
                      aria-hidden="true"
                    />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-col items-start gap-3">
                <Link
                  href={c.cta.href}
                  className="group inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-lg bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-dark)] focus-visible:ring-offset-2"
                >
                  {c.cta.label}
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
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary-dark)] hover:underline focus-visible:outline-none focus-visible:underline"
                >
                  Or try the interactive demo
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
