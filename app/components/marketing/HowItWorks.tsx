"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Cpu } from "lucide-react";

const STEPS = [
  {
    number: "01",
    title: "Visual Intelligence",
    description:
      "Computer vision analyses room geometry and features from existing floor plans or photos.",
    image: "/assets/media/visual-inteligence.png",
    href: "/solutions/image-analysis",
  },
  {
    number: "02",
    title: "Geometric Analysis",
    description:
      "Doorway widths, turning circles and level access measured directly from drawings.",
    image: "/assets/media/geometry-analysis.png",
    href: "/solutions/floor-plan-analysis",
  },
  {
    number: "03",
    title: "Natural Language Processing",
    description:
      "Listing text is parsed and cross-checked against the photos so contradictions surface early.",
    image: "/assets/media/nlp.png",
    href: "/solutions/reports",
  },
  {
    number: "04",
    title: "Geospatial Analysis",
    description:
      "Approach gradients, kerbs and local context inform whether a home is reachable, not just usable.",
    image: "/assets/media/geospatial-analysis.png",
    href: "/solutions/floor-plan-analysis",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export default function HowItWorks() {
  return (
    <section
      aria-labelledby="how-heading"
      className="bg-[var(--bg-surface)] border-y border-[var(--border)]"
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
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase text-[var(--primary-dark)] bg-white border border-[var(--primary)]/20"
          >
            <Cpu size={14} aria-hidden="true" />
            AI engine
          </motion.span>
          <motion.h2
            id="how-heading"
            variants={fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-4 text-4xl md:text-5xl font-black tracking-tight text-[var(--text-main)] leading-[1.1]"
          >
            How the <span className="text-[var(--primary-dark)]">AI engine</span>{" "}
            works.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-5 text-lg text-[var(--text-dim)] leading-relaxed"
          >
            How AccessCheck analyses a home — from pixels and plans to a clear
            accessibility category.
          </motion.p>
        </motion.div>

        <motion.ul
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
          }}
          className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {STEPS.map((s) => (
            <motion.li
              key={s.number}
              variants={fadeUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
              whileHover={{ y: -4 }}
            >
              <Link
                href={s.href}
                className="engine-card group h-full block rounded-2xl border border-[var(--border)] bg-white overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-dark)] focus-visible:ring-offset-2"
              >
                <div className="card-image-wrapper relative aspect-[4/3] overflow-hidden bg-[var(--bg-surface)]">
                  <Image
                    src={s.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw"
                    className="card-image object-cover"
                  />
                </div>
                <div className="p-6">
                  <span className="inline-block text-xs font-extrabold tracking-[0.2em] text-[var(--primary-dark)]">
                    {s.number}
                  </span>
                  <h3 className="mt-2 text-lg font-bold text-[var(--text-main)] group-hover:text-[var(--primary-dark)] transition-colors">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--text-dim)] leading-relaxed">
                    {s.description}
                  </p>
                </div>
                <span className="card-glow" aria-hidden="true" />
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
