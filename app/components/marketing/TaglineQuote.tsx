"use client";

import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export default function TaglineQuote() {
  return (
    <section
      aria-labelledby="quote-heading"
      className="bg-[var(--primary-light)]"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.1 } },
          }}
        >
          <motion.h2
            id="quote-heading"
            variants={fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-4xl md:text-5xl font-black tracking-tight text-[var(--text-main)] leading-[1.1]"
          >
            Built for the people who need it most.
          </motion.h2>
          <motion.blockquote
            variants={fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-6 text-xl sm:text-2xl text-[var(--text-main)] leading-relaxed"
          >
            “We don&rsquo;t just describe a home. We tell you{" "}
            <span className="text-[var(--primary-dark)] font-semibold underline decoration-[var(--primary)] decoration-2 underline-offset-4">
              whether it works for the person who&rsquo;ll live in it.
            </span>
            ”
            <footer className="mt-4 text-sm font-semibold text-[var(--text-dim)] not-italic">
              <cite>— The AccessCheck team, by Foundations</cite>
            </footer>
          </motion.blockquote>
        </motion.div>
      </div>
    </section>
  );
}
