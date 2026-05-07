"use client";

import { motion } from "framer-motion";
import {
  Receipt,
  Wrench,
  Zap,
  Building2,
  Accessibility,
  Check,
  AlertTriangle,
  Ban,
  UserX,
  Truck,
  EyeOff,
  ArrowRight,
  CircleX,
} from "lucide-react";

const TRACKED_RECORD = [
  { icon: Receipt, label: "Rent", value: "£742 / month" },
  { icon: Wrench, label: "Repairs", value: "3 open jobs" },
  { icon: Zap, label: "Energy performance", value: "EPC · C" },
  { icon: Building2, label: "Stock condition", value: "Decent · 2024" },
];

const CONSEQUENCES = [
  {
    icon: UserX,
    title: "Poor matches",
    desc: "Homes go to people they don't really suit, and the right homes don't reach the people who need them.",
  },
  {
    icon: Ban,
    title: "Refused offers",
    desc: "Accessibility issues surface only after a viewing, sending allocations back to the start.",
  },
  {
    icon: Truck,
    title: "Avoidable moves",
    desc: "Tenants outgrow homes that could have been adapted earlier — or never suited their needs.",
  },
  {
    icon: EyeOff,
    title: "Missed opportunities",
    desc: "Accessible homes go un-flagged in registers, hidden from the teams that need to find them.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export default function ProblemStatement() {
  return (
    <section
      aria-labelledby="problem-heading"
      className="relative overflow-hidden bg-white"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(var(--primary-dark) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-24">
        {/* Heading */}
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
            <AlertTriangle size={14} aria-hidden="true" />
            The accessibility problem
          </motion.span>
          <motion.h2
            id="problem-heading"
            variants={fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-4 text-4xl md:text-5xl font-black tracking-tight text-[var(--text-main)] leading-[1.1]"
          >
            <span className="text-[var(--primary-dark)]">AccessCheck</span>{" "}
            helps landlords stop discovering{" "}
            <span className="text-red-700">accessibility issues</span> too late.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-5 text-lg text-[var(--text-dim)] leading-relaxed"
          >
            Most social landlords hold detailed data on rent, repairs, energy
            performance and stock condition. Far fewer hold clear data on
            whether a home is accessible, adaptable or suitable for people with
            different mobility needs.
          </motion.p>
        </motion.div>

        {/* The gap — visualised as a stock record with a missing field */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className=" p-5 sm:p-7 md:p-10 overflow-hidden"
        >
          {/* Mock stock record */}
          <div className="relative rounded-2xl shadow-xl border border-gray-200 bg-[var(--bg-surface)] overflow-hidden">
            {/* Record header */}
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-white border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="inline-grid place-items-center w-7 h-7 rounded-lg bg-[var(--bg-surface)] text-[var(--text-dim)] shrink-0">
                  <Building2 size={15} />
                </span>
                <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-dim)] truncate">
                  Stock record · 12 Oak Lane
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] hidden sm:inline">
                Sample
              </span>
            </div>

            <ul>
              {/* Tracked summary — single compact row */}
              <motion.li
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-[var(--border)]"
              >
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0">
                  <Check size={11} />4 tracked
                </span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-[13px] text-[var(--text-dim)] min-w-0">
                  {TRACKED_RECORD.map(({ icon: Icon, label }, i) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5"
                    >
                      <Icon
                        size={12}
                        className="text-[var(--text-dim)]"
                        aria-hidden="true"
                      />
                      <span className="font-medium">{label}</span>
                      {i < TRACKED_RECORD.length - 1 && (
                        <span
                          aria-hidden="true"
                          className="text-[var(--border)] hidden sm:inline"
                        >
                          ·
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </motion.li>

              {/* The missing row */}
              <motion.li
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.25 }}
                className="relative px-5 py-5 bg-red-50/60"
              >
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"
                />
                <div className="flex items-center gap-3 sm:gap-4">
                  <motion.span
                    aria-hidden="true"
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{
                      duration: 2.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="inline-grid place-items-center w-9 h-9 rounded-lg bg-red-100 text-red-700 shrink-0 ring-2 ring-red-200"
                  >
                    <Accessibility size={17} />
                  </motion.span>
                  <p className="text-sm sm:text-base font-bold text-red-900 flex-1 min-w-0 truncate">
                    Accessibility
                  </p>
                  <p
                    className="hidden sm:block text-sm font-mono italic text-red-400 tracking-widest"
                    aria-label="No data"
                  >
                    — — — — —
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-600 text-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shrink-0 shadow-sm shadow-red-600/30">
                    <CircleX size={11} />
                    Missing
                  </span>
                </div>
                <p className="mt-3 sm:ml-12 text-xs sm:text-sm text-red-800/80 leading-relaxed">
                  No structured record of whether the home is accessible,
                  adaptable or suitable for people with different mobility
                  needs.
                </p>
              </motion.li>
            </ul>
          </div>

          {/* Headline beneath the record */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.55 }}
            className="relative mt-7"
          >
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-red-700">
              <AlertTriangle size={14} aria-hidden="true" />
              The accessibility blind spot
            </p>
            <h3 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[var(--text-main)] leading-[1.1]">
              Accessibility is{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-red-700">
                  patchy, inconsistent
                </span>
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-1 h-2 bg-red-200/70 -z-0"
                />
              </span>{" "}
              — or missing from stock records entirely.
            </h3>
            <p className="mt-4 text-base md:text-lg text-[var(--text-dim)] leading-relaxed max-w-2xl">
              The gap shows up at the worst possible moment — at allocation, on
              viewing, or after the move-in — when it has already cost time,
              trust and a home.
            </p>
          </motion.div>
        </motion.div>

        {/* Resolution statement */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className=" relative overflow-hidden rounded-2xl border border-gray-200 bg-[var(--primary-light)] text-black p-8 md:p-10"
        >
          <div
            aria-hidden="true"
            className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-[var(--primary)]/20 blur-3xl"
          />
          <div className="relative grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 md:gap-10 items-center">
            <div className="bg-primary rounded-2xl p-1">
              <motion.span
                className="inline-grid place-items-center w-14 h-14 rounded-2xl text-white shrink-0"
                aria-hidden="true"
                animate={{ x: [0, 4, 0] }}
                transition={{
                  duration: 1.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <ArrowRight size={26} />
              </motion.span>
            </div>
            <p className="text-lg md:text-xl leading-relaxed">
              AccessCheck helps bring accessibility into everyday housing
              decisions. It gives{" "}
              <span className="font-semibold text-[var(--primary)]">
                allocations, asset and adaptations teams
              </span>{" "}
              a shared view of what a home offers now — and what may be possible
              in the future.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
