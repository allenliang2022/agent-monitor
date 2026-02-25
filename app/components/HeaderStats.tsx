"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef } from "react";
import sessionData from "@/data/swarm-session.json";

function AnimatedCounter({
  target,
  prefix = "",
  suffix = "",
  duration = 2,
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(count, target, {
      duration,
      ease: "easeOut",
    });
    const unsubscribe = rounded.on("change", (v) => {
      if (ref.current) ref.current.textContent = `${prefix}${v.toLocaleString()}${suffix}`;
    });
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [count, target, rounded, prefix, suffix, duration]);

  return <span ref={ref}>{prefix}0{suffix}</span>;
}

const stats = [
  {
    label: "Files Changed",
    value: sessionData.result.filesChanged,
    prefix: "",
    suffix: "",
    color: "text-cyan",
    bg: "bg-cyan/10",
    border: "border-cyan/20",
    glow: "glow-cyan",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  },
  {
    label: "Lines Added",
    value: sessionData.result.linesAdded,
    prefix: "+",
    suffix: "",
    color: "text-green",
    bg: "bg-green/10",
    border: "border-green/20",
    glow: "glow-green",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
      </svg>
    ),
  },
  {
    label: "Duration",
    value: Math.round(sessionData.session.durationMs / 60000),
    prefix: "~",
    suffix: "min",
    color: "text-purple",
    bg: "bg-purple/10",
    border: "border-purple/20",
    glow: "glow-purple",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    label: "Animation Calls",
    value: sessionData.result.animationCalls,
    prefix: "",
    suffix: "",
    color: "text-amber",
    bg: "bg-amber/10",
    border: "border-amber/20",
    glow: "glow-amber",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
      </svg>
    ),
  },
];

export default function HeaderStats() {
  return (
    <section className="relative px-4 sm:px-6 lg:px-8 pt-12 pb-8">
      {/* Background gradient orb */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan/20 bg-cyan/5 text-cyan text-sm font-mono mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-cyan animate-pulse-dot" />
            MISSION CONTROL
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4"
          >
            <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
              Agent Swarm
            </span>{" "}
            <span className="bg-gradient-to-r from-cyan via-purple to-cyan bg-clip-text text-transparent">
              Monitor
            </span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-400 font-mono"
          >
            <span>
              Orchestrator:{" "}
              <span className="text-purple font-semibold">{sessionData.session.orchestrator}</span>
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span>
              Agent:{" "}
              <span className="text-cyan">{sessionData.task.agent}</span>
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span>
              {sessionData.timeline[0].time} - {sessionData.timeline[sessionData.timeline.length - 1].time}
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span>
              Project:{" "}
              <span className="text-amber">{sessionData.task.project}</span>
            </span>
          </motion.div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.1, duration: 0.5, ease: "easeOut" }}
              whileHover={{ scale: 1.03, y: -2 }}
              className={`relative rounded-xl border ${stat.border} ${stat.bg} p-5 ${stat.glow} overflow-hidden`}
            >
              {/* Subtle grid pattern */}
              <div className="absolute inset-0 opacity-30 grid-bg pointer-events-none" />

              <div className="relative">
                <div className={`flex items-center gap-2 ${stat.color} mb-3`}>
                  {stat.icon}
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    {stat.label}
                  </span>
                </div>
                <div className={`text-3xl sm:text-4xl font-bold font-mono ${stat.color}`}>
                  <AnimatedCounter
                    target={stat.value}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                    duration={2 + i * 0.3}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
