"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TechnologyCTA() {
  return (
    <section className="bg-[var(--bg-surface)]">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-main)]"
        >
          Ready to integrate cutting-edge accessibility technology?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
          className="mt-4 text-lg text-[var(--text-dim)] leading-relaxed"
        >
          Partner with Foundations and Rightision to bring evidence-backed
          accessibility scoring to your stock.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.16 }}
          className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button asChild variant="primary" size="lg">
            <Link href="/contact" className="group">
              Request partner access
              <ArrowRight
                size={18}
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/demo">Try the demo</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
