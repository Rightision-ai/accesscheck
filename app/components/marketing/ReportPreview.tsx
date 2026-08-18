"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, FileText } from "lucide-react";

const SAMPLE_REPORT_URL = process.env.NEXT_PUBLIC_SAMPLE_REPORT_URL || "";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export default function ReportPreview() {
  const reportHref = SAMPLE_REPORT_URL || "/solutions/reports";

  return (
    <section
      aria-labelledby="report-preview-heading"
      className="bg-[var(--bg-surface)] border-y border-[var(--border)]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08 } },
          }}
        >
          <motion.span
            variants={fadeUp}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase text-[var(--primary-dark)] bg-[var(--primary-light)] border border-[var(--primary)]/20"
          >
            <FileText size={14} aria-hidden="true" />
            Sample report
          </motion.span>
          <motion.h2
            id="report-preview-heading"
            variants={fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-4 text-4xl md:text-5xl font-black tracking-tight text-[var(--text-main)] leading-[1.1]"
          >
            One PDF. The whole{" "}
            <span className="text-[var(--primary-dark)]">
              accessibility picture
            </span>{" "}
            for a home.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-5 text-lg text-[var(--text-dim)] leading-relaxed"
          >
            Every assessment produces a clear accessibility category, linked
            photo evidence and a costed adaptation appendix — built for
            allocations teams, OTs, panel members and tenants to actually
            read and act on.
          </motion.p>
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-8 flex flex-col sm:flex-row gap-3"
          >
            <a
              href={reportHref}
              target={SAMPLE_REPORT_URL ? "_blank" : undefined}
              rel={SAMPLE_REPORT_URL ? "noopener noreferrer" : undefined}
              className="group inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-lg bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-dark)] focus-visible:ring-offset-2"
            >
              View sample report
              <ArrowRight
                size={18}
                className="transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </a>
            <Link
              href="/solutions/reports"
              className="inline-flex items-center justify-center min-h-12 px-6 rounded-lg border border-[var(--text-main)]/15 text-[var(--text-main)] font-semibold hover:border-[var(--primary-dark)] hover:text-[var(--primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-dark)] focus-visible:ring-offset-2"
            >
              More about reports
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
        >
          <a
            href={reportHref}
            target={SAMPLE_REPORT_URL ? "_blank" : undefined}
            rel={SAMPLE_REPORT_URL ? "noopener noreferrer" : undefined}
            aria-label="Open the sample AccessCheck accessibility report PDF"
            className="group relative block"
          >
            <div
              aria-hidden="true"
              className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[var(--primary-light)] to-transparent"
            />
            <div className="relative rounded-2xl bg-white border border-[var(--border)] shadow-2xl overflow-hidden transition-transform duration-300 group-hover:-translate-y-1">
              <div
                aria-hidden="true"
                className="absolute top-0 left-0 right-0 h-7 bg-[var(--bg-surface)] border-b border-[var(--border)] flex items-center gap-1.5 px-3"
              >
                <span className="block w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="block w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="block w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="ml-3 text-[10px] font-semibold tracking-wide text-[var(--text-dim)] uppercase">
                  AccessCheck accessibility report — sample.pdf
                </span>
              </div>
              <Image
                src="/assets/media/report-sample.png"
                alt="A sample AccessCheck PDF report showing the accessibility category summary, photo evidence and costed adaptation appendix."
                width={1200}
                height={1600}
                className="block w-full h-auto pt-7"
              />
            </div>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
