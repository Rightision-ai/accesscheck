"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export default function FinalCTA() {
  return (
    <section aria-labelledby="final-cta-heading" className="bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08 } },
          }}
        >
          <motion.h2
            id="final-cta-heading"
            variants={fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-4xl md:text-5xl font-black tracking-tight text-[var(--text-main)] leading-[1.1]"
          >
            Ready to make housing more{" "}
            <span className="text-[var(--primary-dark)]">accessible</span>?
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-5 text-lg text-[var(--text-dim)]"
          >
            Sign in to start your first assessment.
          </motion.p>
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 min-h-12 px-7 rounded-lg bg-[var(--primary)] text-white text-base font-semibold shadow-sm hover:bg-[var(--primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-dark)] focus-visible:ring-offset-2"
            >
              Request Demo
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center min-h-12 px-7 rounded-lg border border-[var(--text-main)]/15 text-[var(--text-main)] text-base font-semibold hover:border-[var(--primary-dark)] hover:text-[var(--primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-dark)] focus-visible:ring-offset-2"
            >
              Try demo
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center min-h-12 px-7 rounded-lg border border-[var(--text-main)]/15 text-[var(--text-main)] text-base font-semibold hover:border-[var(--primary-dark)] hover:text-[var(--primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-dark)] focus-visible:ring-offset-2"
            >
              Contact us
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
