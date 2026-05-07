"use client";

import { motion } from "framer-motion";

const STATS = [
  { value: "34M+", label: "Training parameters" },
  { value: "99.2%", label: "Object detection rate" },
  { value: "<200ms", label: "Inference time" },
  { value: "300k+", label: "Architectural features" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export default function ComputerVisionModel() {
  return (
    <section
      aria-labelledby="cv-model-heading"
      className="bg-white border-b border-[var(--border)]"
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
          <motion.h2
            id="cv-model-heading"
            variants={fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-4xl md:text-5xl font-black tracking-tight text-[var(--text-main)]"
          >
            Computer Vision Model
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-5 text-lg text-[var(--text-dim)] leading-relaxed max-w-lg"
          >
            We use a custom-tuned Convolutional Neural Network (CNN) trained on
            over 300,000 distinct architectural features — from doorways and
            level changes to grab rails and turning circles.
          </motion.p>

          <motion.dl
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
            }}
            className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8"
          >
            {STATS.map((s) => (
              <motion.div
                key={s.label}
                variants={fadeUp}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <dt className="text-4xl md:text-5xl font-black text-[var(--text-main)] tracking-tight">
                  {s.value}
                </dt>
                <dd className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-dim)]">
                  {s.label}
                </dd>
              </motion.div>
            ))}
          </motion.dl>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative aspect-square max-w-md mx-auto w-full"
        >
          <NeuralNetworkGraphic />
        </motion.div>
      </div>
    </section>
  );
}

function NeuralNetworkGraphic() {
  const nodes = [
    { cx: 20, cy: 20, r: 4, delay: 0 },
    { cx: 50, cy: 50, r: 5, delay: 0.4 },
    { cx: 80, cy: 35, r: 4, delay: 0.8 },
    { cx: 35, cy: 80, r: 4, delay: 1.2 },
    { cx: 75, cy: 78, r: 3.5, delay: 1.6 },
    { cx: 18, cy: 55, r: 3, delay: 2 },
  ];

  const edges = [
    [0, 1],
    [1, 2],
    [1, 3],
    [3, 4],
    [1, 4],
    [5, 1],
    [0, 5],
  ];

  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].cx}
          y1={nodes[a].cy}
          x2={nodes[b].cx}
          y2={nodes[b].cy}
          stroke="var(--primary-dark)"
          strokeOpacity="0.35"
          strokeWidth="0.4"
        />
      ))}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle
            cx={n.cx}
            cy={n.cy}
            r={n.r + 4}
            fill="url(#node-glow)"
          />
          <circle
            cx={n.cx}
            cy={n.cy}
            r={n.r}
            fill="var(--primary-dark)"
          >
            <animate
              attributeName="r"
              values={`${n.r};${n.r + 1.2};${n.r}`}
              dur="2.6s"
              begin={`${n.delay}s`}
              repeatCount="indefinite"
            />
          </circle>
        </g>
      ))}
    </svg>
  );
}
