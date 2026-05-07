"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  AlertTriangle,
  FileText,
  Map,
  Home,
  Image as ImageIcon,
  Sparkles,
  ShieldCheck,
  Download,
  ChevronRight,
  X,
} from "lucide-react";

const steps = [
  {
    id: 1,
    title: "Property details",
    desc: "Start with basic property information, photos, plans or survey data.",
  },
  {
    id: 2,
    title: "Access features",
    desc: "AccessCheck reviews key features such as entrances, thresholds, circulation space, bathrooms, bedrooms and routes through the home.",
  },
  {
    id: 3,
    title: "Accessibility category",
    desc: "The home is given a clear category, with notes on who it may suit and where the main barriers are.",
  },
  {
    id: 4,
    title: "Adaptation feasibility",
    desc: "The report highlights where adaptations may be realistic, limited or unlikely to provide a good long-term solution.",
  },
  {
    id: 5,
    title: "Property-level report",
    desc: "Create a clear record that can support allocations, asset planning, accessible housing registers and future investment decisions.",
  },
];

export default function AccessCheckMotionExplainer() {
  const [activeStep, setActiveStep] = useState(1);
  const [isHovered, setIsHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);
    const handler = () => setReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (reducedMotion || isHovered) return;

    // Step 5 stays on screen longer (12 seconds) before looping back
    const delay = activeStep === 5 ? 12000 : 6000;

    const timer = setTimeout(() => {
      setActiveStep((prev) => (prev % 5) + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [activeStep, reducedMotion, isHovered]);

  return (
    <section aria-labelledby="how-it-works-heading" className="bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-12 font-sans">
        {/* Standard section header */}
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
            variants={{
              hidden: { opacity: 0, y: 24 },
              show: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase text-[var(--primary-dark)] bg-[var(--primary-light)] border border-[var(--primary)]/20"
          >
            <Sparkles size={14} aria-hidden="true" />
            The platform
          </motion.span>
          <motion.h2
            id="how-it-works-heading"
            variants={{
              hidden: { opacity: 0, y: 24 },
              show: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-main)] leading-[1.1]"
          >
            How <span className="text-[var(--primary-dark)]">AccessCheck</span>{" "}
            works.
          </motion.h2>
          <motion.p
            variants={{
              hidden: { opacity: 0, y: 24 },
              show: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-5 text-lg text-[var(--text-dim)] leading-relaxed"
          >
            From property data to accessibility category — a five-step workflow
            that turns photos, plans and stock data into a clear property-level
            picture.
          </motion.p>
        </motion.div>

        {/* Interactive timeline + visuals */}
        <div className="mt-12 flex flex-col lg:flex-row gap-8 lg:gap-16 items-center lg:items-stretch">
          {/* Left Side: Sticky Navigation / Content */}
          <div className="w-full lg:w-5/12 flex flex-col justify-center py-4">
            <div className="flex flex-col gap-2 relative">
              {/* Timeline Line */}
              <div className="absolute left-[19px] top-6 bottom-6 w-[2px] bg-gray-200" />

              {steps.map((step) => {
                const isActive = activeStep === step.id;
                const isPast = activeStep > step.id;

                return (
                  <button
                    key={step.id}
                    onClick={() => setActiveStep(step.id)}
                    className="flex items-start gap-5 text-left z-10 relative group py-3"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all duration-500 border-2 bg-white flex-shrink-0 ${
                        isActive
                          ? "border-[#0FB75B] text-[#0FB75B] shadow-[0_0_20px_rgba(15,183,91,0.3)] scale-110"
                          : isPast
                            ? "border-[#0FB75B] bg-[#0FB75B] text-primary"
                            : "border-gray-200 text-gray-400 group-hover:border-gray-300"
                      }`}
                    >
                      {isPast ? <CheckCircle size={20} /> : step.id}
                    </div>

                    <div
                      className={`pt-1.5 transition-all duration-500 ${isActive ? "opacity-100 translate-x-2" : "opacity-50 group-hover:opacity-80"}`}
                    >
                      <h3
                        className={`font-bold text-lg md:text-xl transition-colors ${isActive ? "text-[#1A1A1A]" : "text-[#37393A]"}`}
                      >
                        {step.title}
                      </h3>
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <p className="text-sm text-gray-500 mt-2.5 leading-relaxed pr-4 font-medium">
                              {step.desc}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Side: Interactive Visuals Container */}
          <div
            className="w-full lg:w-7/12  md:aspect-[4/3] lg:aspect-auto lg:h-[700px] relative rounded-[2.5rem] bg-white shadow-[0_30px_60px_-20px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden flex items-center justify-center p-4 sm:p-8"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Subtle background abstract shapes */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#0FB75B]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#0FB75B]/5 rounded-full blur-3xl pointer-events-none" />

            <AnimatePresence mode="wait">
              {activeStep === 1 && (
                <VisualStep1 key="1" reduced={reducedMotion} />
              )}
              {activeStep === 2 && (
                <VisualStep2 key="2" reduced={reducedMotion} />
              )}
              {activeStep === 3 && (
                <VisualStep3 key="3" reduced={reducedMotion} />
              )}
              {activeStep === 4 && (
                <VisualStep4 key="4" reduced={reducedMotion} />
              )}
              {activeStep === 5 && (
                <VisualStep5 key="5" reduced={reducedMotion} />
              )}
            </AnimatePresence>
          </div>
        </div>
        <DecisionSupportCaveat />
      </div>
    </section>
  );
}

/* ============================================================================
 * Step 1: Intelligent Data Capture
 * ============================================================================ */
const VisualStep1 = ({ reduced }: { reduced: boolean }) => (
  <motion.div
    initial={reduced ? { opacity: 1 } : { opacity: 0, y: 30, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={reduced ? { opacity: 0 } : { opacity: 0, y: -30, scale: 0.95 }}
    transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
    className="w-full max-w-sm bg-white rounded-[24px] shadow-2xl border border-gray-100 overflow-hidden"
  >
    <div className="bg-gradient-to-br from-[#1A1A1A] to-[#37393A] text-white p-6 pb-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full pointer-events-none" />
      <h3 className="font-black text-2xl mb-1 tracking-tight">
        Property Details
      </h3>
      <p className="text-white/60 text-xs font-bold uppercase tracking-widest">
        Property Capture
      </p>
    </div>
    <div className="p-6 bg-white -mt-4 rounded-t-[24px] flex flex-col gap-4 relative z-10">
      <FormField
        delay={0.2}
        label="Property Reference"
        value="12 Oak Lane"
        reduced={reduced}
      />
      <FormField
        delay={0.6}
        label="Property Type"
        value="2-bed mid-terrace"
        reduced={reduced}
      />
      <FormField
        delay={1.0}
        label="Survey Status"
        value="Photos & plans uploaded"
        reduced={reduced}
        isActive
      />

      <motion.button
        initial={reduced ? { opacity: 1 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
        className="w-full bg-[#0FB75B] text-white font-bold py-3.5 rounded-xl mt-4 flex items-center justify-center gap-2 hover:bg-[#008900] transition-colors shadow-lg shadow-[#0FB75B]/30"
      >
        Continue <ChevronRight size={18} />
      </motion.button>
    </div>
  </motion.div>
);

const FormField = ({ delay, label, value, isActive, reduced }: any) => (
  <motion.div
    initial={reduced ? { opacity: 1 } : { opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, type: "spring" }}
    className={`p-3.5 rounded-xl border-2 transition-all ${isActive ? "border-[#0FB75B] bg-[#0FB75B]/5 shadow-sm" : "border-gray-100 bg-gray-50/50"}`}
  >
    <div className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1.5">
      {label}
    </div>
    <div className="text-sm font-bold text-[#1A1A1A]">{value}</div>
  </motion.div>
);

/* ============================================================================
 * Step 2: Smart Evidence Collection
 * ============================================================================ */
const VisualStep2 = ({ reduced }: { reduced: boolean }) => (
  <motion.div
    initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
    transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
    className="w-full max-w-lg flex flex-col gap-6"
  >
    <div className="flex items-center justify-between px-2">
      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
        Access Features
      </h4>
      <div className="flex gap-2">
        <div className="w-2 h-2 rounded-full bg-[#0FB75B] animate-pulse" />
        <div className="text-[10px] font-bold text-[#0FB75B] uppercase">
          Reviewing
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UploadCard
        icon={<Map size={24} />}
        title="Floor plan"
        delay={0.2}
        reduced={reduced}
        tags={["Scale: 1:50", "Routes mapped"]}
      />
      <UploadCard
        icon={<Home size={24} />}
        title="Entrances"
        delay={0.6}
        reduced={reduced}
        tags={["Approach: Level", "Width: 900mm"]}
      />
      <div className="sm:col-span-2">
        <UploadCard
          icon={<ImageIcon size={24} />}
          title="Bathrooms & circulation space"
          delay={1.0}
          reduced={reduced}
          isLarge
          tags={["Bathroom reviewed", "Clearance noted", "Thresholds checked"]}
        />
      </div>
    </div>

    <div className="relative pt-4">
      <div className="bg-gray-100 h-1.5 rounded-full overflow-hidden">
        <motion.div
          initial={reduced ? { width: "100%" } : { width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ delay: 1.5, duration: 2, ease: "easeInOut" }}
          className="h-full bg-gradient-to-r from-[#0FB75B] to-[#008900] rounded-full shadow-[0_0_10px_rgba(15,183,91,0.5)]"
        />
      </div>
      <motion.div
        initial={reduced ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.5 }}
        className="flex items-center justify-center gap-2 mt-4"
      >
        <CheckCircle size={14} className="text-[#0FB75B]" />
        <span className="text-[10px] font-black text-[#008900] uppercase tracking-widest">
          Features identified & catalogued
        </span>
      </motion.div>
    </div>
  </motion.div>
);

const UploadCard = ({ icon, title, isLarge, delay, reduced, tags }: any) => (
  <motion.div
    initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, type: "spring", bounce: 0.4 }}
    className={`bg-white border-2 border-gray-50 rounded-[20px] p-4 flex flex-col gap-3 relative overflow-hidden group shadow-lg shadow-gray-100/50 hover:border-[#0FB75B]/30 transition-all ${isLarge ? "min-h-[140px]" : "min-h-[140px]"}`}
  >
    <div className="flex items-center justify-between">
      <div className="p-2.5 rounded-xl bg-gray-50 text-gray-400 group-hover:text-[#0FB75B] group-hover:bg-[#0FB75B]/5 transition-all">
        {icon}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay: delay + 0.5 }}
        className="text-[8px] font-black text-[#0FB75B] uppercase tracking-tighter"
      >
        Reviewing...
      </motion.div>
    </div>

    <div>
      <div className="text-sm font-black text-[#1A1A1A] mb-2">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {tags?.map((tag: string, i: number) => (
          <motion.span
            key={tag}
            initial={
              reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }
            }
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + 1.2 + i * 0.2 }}
            className="text-[8px] font-bold bg-[#F2F2F2] text-gray-500 px-2 py-0.5 rounded-md border border-gray-100"
          >
            {tag}
          </motion.span>
        ))}
      </div>
    </div>

    <motion.div
      initial={reduced ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: delay + 0.8 }}
      className="absolute inset-0 bg-[#0FB75B]/10 border-2 border-[#0FB75B] rounded-[20px] flex items-center justify-center backdrop-blur-[2px] z-20 pointer-events-none"
    >
      <div className="flex flex-col items-center gap-2">
        <div className="bg-[#0FB75B] text-white p-2 rounded-full shadow-xl shadow-[#0FB75B]/40">
          <CheckCircle size={20} />
        </div>
        <span className="text-[8px] font-black text-[#0FB75B] uppercase tracking-widest bg-white px-2 py-0.5 rounded shadow-sm">
          Verified
        </span>
      </div>
    </motion.div>

    {/* Scanning Line Animation */}
    {!reduced && (
      <motion.div
        animate={{ top: ["-10%", "110%", "-10%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        className="absolute left-0 right-0 h-[1px] bg-[#0FB75B]/30 z-10"
      />
    )}
  </motion.div>
);

/* ============================================================================
 * Step 3: Vision AI Engine
 * ============================================================================ */
const VisualStep3 = ({ reduced }: { reduced: boolean }) => {
  return (
    <motion.div
      initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
      className="w-full h-full min-h-[350px] max-h-[500px] bg-white rounded-[2rem] border-2 border-gray-100 shadow-2xl overflow-hidden flex flex-col font-sans relative"
    >
      {/* Header bar */}
      <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Sparkles size={18} className="text-[#0FB75B]" />
          <span className="text-sm font-black text-[#1A1A1A] uppercase tracking-widest">
            Accessibility Category
          </span>
        </div>
        <div className="flex gap-2 items-center">
          <div className="text-[10px] font-black text-[#0FB75B] tracking-widest mr-2 uppercase">
            Reviewing
          </div>
          <motion.div
            animate={reduced ? {} : { opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-2.5 h-2.5 rounded-full bg-[#0FB75B] shadow-[0_0_8px_rgba(15,183,91,0.6)]"
          />
        </div>
      </div>

      <div className="flex-1 p-5 lg:p-6 flex flex-col sm:flex-row gap-5 lg:gap-6 h-full relative bg-white overflow-hidden">
        {/* Left Side: Spatial Mapping Dashboard */}
        <div className="flex-1 bg-white rounded-2xl border-2 border-gray-100 relative overflow-hidden flex items-center justify-center shadow-inner">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-80"
            style={{
              backgroundImage: "url('assets/media/bathroom-analysis.jpg')",
              filter: "grayscale(100%) contrast(180%) brightness(120%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-30 mix-blend-multiply"
            style={{
              backgroundImage: "radial-gradient(#000 1px, transparent 1px)",
              backgroundSize: "12px 12px",
            }}
          />

          {/* Animated Target Nodes highlighting the detected obstacles */}
          <motion.div
            initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, type: "spring" }}
            className="absolute top-[50%] left-[8%] w-10 h-10 border-[3px] border-[#0FB75B] rounded-full border-dashed animate-[spin_6s_linear_infinite] mix-blend-multiply"
          />
          <motion.div
            initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.0, type: "spring" }}
            className="absolute top-[58%] left-[73%] w-12 h-12 border-[3px] border-[#0FB75B] rounded-full border-dashed animate-[spin_4s_linear_infinite] mix-blend-multiply"
          />
          <motion.div
            initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.2, type: "spring" }}
            className="absolute top-[45%] right-[2%] w-14 h-14 border-[3px] border-[#0FB75B] rounded-full border-dashed animate-[spin_5s_linear_infinite_reverse] mix-blend-multiply"
          />
          <motion.div
            initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.5, type: "spring" }}
            className="absolute bottom-[10%] left-[10%] w-8 h-8 border-[3px] border-yellow-500 rounded-full border-dashed animate-[spin_3s_linear_infinite_reverse] mix-blend-multiply"
          />

          {!reduced && (
            <motion.div
              initial={{ top: "-30%" }}
              animate={{ top: "130%" }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-24 bg-gradient-to-b from-transparent to-[#0FB75B]/30 border-b-4 border-[#0FB75B] mix-blend-multiply"
            />
          )}
        </div>

        {/* Right Side: Streaming Complex Analysis Data */}
        <div className="w-full sm:w-[45%] flex flex-col gap-4">
          <div className="text-xs font-black text-[#1A1A1A] border-b-2 border-gray-100 pb-2 uppercase tracking-widest">
            Category indicators
          </div>

          <div className="space-y-4">
            <DataRow
              delay={0.2}
              label="Turning circle"
              value="Sufficient"
              reduced={reduced}
            />
            <DataRow
              delay={0.8}
              label="Grab rails"
              value="3 noted"
              reduced={reduced}
            />
            <DataRow
              delay={1.4}
              label="Step-free approach"
              value="Yes"
              reduced={reduced}
            />
            <DataRow
              delay={2.0}
              label="Bathroom clearance"
              value="Reviewing"
              reduced={reduced}
              status="pending"
            />
          </div>

          <motion.div
            initial={
              reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }
            }
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 2.8, type: "spring" }}
            className="mt-auto bg-yellow-50 border-2 border-yellow-100 shadow-sm rounded-xl p-4 relative overflow-hidden"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-yellow-400" />
            <div className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <AlertTriangle size={14} /> Note for category
            </div>
            <div className="text-xs font-bold text-[#1A1A1A] leading-tight">
              Shower threshold may limit suitability for some users.
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

const DataRow = ({ delay, label, value, status = "done", reduced }: any) => (
  <motion.div
    initial={reduced ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.3 }}
    className="flex flex-col gap-1"
  >
    <div className="flex items-center gap-2">
      {status === "done" ? (
        <CheckCircle size={14} className="text-[#0FB75B]" />
      ) : (
        <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-200 border-t-[#0FB75B] animate-spin" />
      )}
      <span className="text-xs font-bold text-gray-500">{label}</span>
    </div>
    <span className="text-sm font-black text-[#0FB75B] pl-6">{value}</span>
  </motion.div>
);

/* ============================================================================
 * Step 4: Standards and Grading
 * ============================================================================ */
const VisualStep4 = ({ reduced }: { reduced: boolean }) => {
  const grades = ["A", "B", "C", "D", "E", "F", "G"];
  return (
    <motion.div
      initial={reduced ? { opacity: 1 } : { opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -30 }}
      transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
      className="w-full max-w-md flex flex-col gap-6"
    >
      {/* Standards Engine */}
      <div className="bg-white rounded-[24px] shadow-2xl border border-gray-100 p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#0FB75B]/5 rounded-bl-[100px] -z-10" />
        <h3 className="text-sm font-black text-[#1A1A1A] mb-6 flex items-center gap-2 uppercase tracking-widest">
          <ShieldCheck size={20} className="text-[#0FB75B]" />
          Adaptation Feasibility
        </h3>
        <div className="space-y-4">
          <CheckItem
            text="Level access — feasible"
            delay={0.2}
            reduced={reduced}
          />
          <CheckItem
            text="Bathroom changes — limited"
            delay={0.6}
            reduced={reduced}
          />
          <CheckItem
            text="Layout changes — unlikely"
            delay={1.0}
            reduced={reduced}
          />
        </div>
      </div>

      {/* Category Result */}
      <div className="bg-white rounded-[24px] shadow-2xl border border-gray-100 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
            Adaptation outlook
          </h3>
          <motion.div
            initial={
              reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }
            }
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 2.0, type: "spring", bounce: 0.5 }}
            className="text-sm font-black text-[#008900] bg-[#0FB75B]/10 px-5 py-2 rounded-xl border-2 border-[#0FB75B]/30 shadow-inner"
          >
            CATEGORY C · ADAPTATIONS LIMITED
          </motion.div>
        </div>

        {/* Scale */}
        <div className="flex items-center gap-1.5 h-12 relative bg-gray-50 p-1.5 rounded-2xl border-2 border-gray-100">
          {grades.map((g) => (
            <div
              key={g}
              className={`flex-1 h-full flex items-center justify-center text-xs font-black rounded-xl text-white shadow-sm transition-all duration-300 ${
                g === "A"
                  ? "bg-[#008900]"
                  : g === "B"
                    ? "bg-[#0FB75B]"
                    : g === "C"
                      ? "bg-[#0FB75B]/80"
                      : g === "D"
                        ? "bg-yellow-400 text-yellow-900"
                        : g === "E"
                          ? "bg-amber-500"
                          : g === "F"
                            ? "bg-orange-500"
                            : "bg-red-500"
              }`}
            >
              {g}
            </div>
          ))}
          {/* Moving Indicator */}
          <motion.div
            initial={reduced ? { left: `${(2.5 / 7) * 100}%` } : { left: "4%" }}
            animate={{ left: `${(2.5 / 7) * 100}%` }}
            transition={{
              delay: 1.4,
              duration: 1.2,
              type: "spring",
              bounce: 0.3,
            }}
            className="absolute top-[-14px] bottom-[-14px] w-8 bg-white opacity-70 rounded-xl shadow-lg  z-10 flex items-center justify-center"
            style={{ transform: "translateX(-50%)" }}
          >
            <div className="w-1.5 h-6 bg-[#1A1A1A] opacity-80 rounded-full " />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

const CheckItem = ({
  text,
  delay,
  reduced,
}: {
  text: string;
  delay: number;
  reduced: boolean;
}) => (
  <div className="flex items-center gap-4 text-sm text-[#1A1A1A] font-bold bg-gray-50 p-3.5 rounded-xl border border-gray-100">
    <motion.div
      initial={reduced ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay, type: "spring", bounce: 0.5 }}
      className="text-[#0FB75B] bg-[#0FB75B]/10 rounded-full p-1.5"
    >
      <CheckCircle size={18} />
    </motion.div>
    <motion.span
      initial={reduced ? { opacity: 1 } : { opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay + 0.1 }}
    >
      {text}
    </motion.span>
  </div>
);

/* ============================================================================
 * Step 5: Report Generation
 * ============================================================================ */
const VisualStep5 = ({ reduced }: { reduced: boolean }) => (
  <div className="w-full h-full flex items-center justify-center py-2">
    <motion.div
      initial={
        reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 40, rotateX: 10 }
      }
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -40 }}
      transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
      className="w-full max-w-[380px] bg-white rounded-[2rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden flex flex-col font-sans"
      style={{ perspective: 1000 }}
    >
      {/* Header */}
      <div className="bg-[#1A1A1A] px-5 py-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1 flex-shrink-0">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="font-black text-white text-sm tracking-wide leading-tight">
              Accessibility Report
            </div>
            <div className="text-gray-400 text-[8px] font-bold uppercase tracking-widest mt-0.5">
              Property-level assessment
            </div>
          </div>
        </div>
        <div className="bg-[#0FB75B]/20 border border-[#0FB75B]/50 text-[#0FB75B] px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest">
          CATEGORY C
        </div>
      </div>

      {/* Content (No Scroll) */}
      <div className="p-4 flex flex-col gap-4 bg-[#F9FAFB] flex-1">
        {/* Suitable / Not Suitable Minimal */}
        <div className="flex flex-col gap-2">
          <motion.div
            initial={reduced ? { opacity: 1 } : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#0FB75B]/5 border border-[#0FB75B]/20 rounded-xl p-2.5"
          >
            <div className="flex items-center gap-1.5 text-[#008900] mb-1.5 text-[9px] font-black uppercase tracking-widest">
              <CheckCircle size={12} /> Suitable For
            </div>
            <ul className="text-[10px] text-[#1A1A1A] space-y-1 pl-3.5 list-disc font-medium">
              <li>Ambulant disabled tenants & older people</li>
              <li>
                Potentially suitable for wheelchair users on the ground floor,
                subject to individual needs
              </li>
            </ul>
          </motion.div>

          <motion.div
            initial={reduced ? { opacity: 1 } : { opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-red-500/5 border border-red-500/20 rounded-xl p-2.5"
          >
            <div className="flex items-center gap-1.5 text-red-600 mb-1.5 text-[9px] font-black uppercase tracking-widest">
              <X size={12} /> May not suit
            </div>
            <ul className="text-[10px] text-[#1A1A1A] space-y-1 pl-3.5 list-disc font-medium">
              <li>Full-time power-chair users requiring wider clearances</li>
            </ul>
          </motion.div>
        </div>

        {/* Limitations */}
        <motion.div
          initial={reduced ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <h4 className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2.5">
            Where the main barriers are
          </h4>
          <div className="flex flex-col gap-2">
            <LimitationRow
              title="Approach gradient"
              desc="Door threshold 1.5-10cm"
              cap="May limit to E"
              color="bg-amber-500"
            />
            <LimitationRow
              title="Bathroom"
              desc="Needs 150×150cm turning space"
              cap="May limit to C"
              color="bg-[#0FB75B]"
            />
            <LimitationRow
              title="First-floor access"
              desc="Stair access only; lift not feasible"
              cap="May limit to B"
              color="bg-[#0FB75B]"
            />
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="bg-white p-3.5 border-t border-gray-100 flex justify-end shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
        <motion.button
          initial={reduced ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="flex items-center gap-2 text-xs font-bold text-white bg-[#1A1A1A] px-5 py-2.5 rounded-xl hover:bg-[#0FB75B] transition-colors shadow-md w-full justify-center"
        >
          <Download size={16} /> Download accessibility report
        </motion.button>
      </div>
    </motion.div>
  </div>
);

/* ============================================================================
 * Decision-support caveat — sits beneath the steps section
 * ============================================================================ */
export const DecisionSupportCaveat = () => (
  <p className="mx-auto max-w-3xl px-6 pb-12 text-center text-xs text-[var(--text-dim)] leading-relaxed mt-8">
    AccessCheck provides decision-support information. It does not replace a
    professional access assessment, occupational therapy advice or a
    landlord&apos;s own decision-making process.
  </p>
);

const LimitationRow = ({ title, desc, cap, color }: any) => (
  <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm flex flex-col gap-1.5">
    <div className="flex justify-between items-start gap-2">
      <div className="font-bold text-[11px] text-[#1A1A1A] leading-tight">
        {title}
      </div>
      <div
        className={`${color} text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider shrink-0`}
      >
        {cap}
      </div>
    </div>
    <div className="text-[10px] text-gray-500 font-medium flex items-start gap-1.5 leading-tight pr-4">
      <span className="text-gray-300 shrink-0">•</span> {desc}
    </div>
  </div>
);
