"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import sessionData from "@/data/swarm-session.json";

const data = sessionData.animationsByComponent;
const maxCalls = Math.max(...data.map((d) => d.calls));

export default function AnimationDistribution() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-16" ref={ref}>
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-bold">
            <span className="bg-gradient-to-r from-amber-400 to-purple-500 bg-clip-text text-transparent">
              Animation Distribution
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-1 font-mono">
            {sessionData.result.animationCalls} total motion calls across {data.length} components
          </p>
        </motion.div>

        <div className="space-y-3">
          {data.map((item, i) => {
            const percentage = (item.calls / maxCalls) * 100;
            return (
              <motion.div
                key={item.component}
                initial={{ opacity: 0, x: -30 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-44 shrink-0 text-right">
                    <span className="font-mono text-sm text-slate-400 group-hover:text-cyan-400 transition-colors">
                      {item.component}
                    </span>
                  </div>

                  <div className="flex-1 relative h-8 bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700/30 group-hover:border-cyan-400/20 transition-colors">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={isInView ? { width: `${percentage}%` } : { width: 0 }}
                      transition={{ delay: 0.3 + i * 0.06, duration: 0.8, ease: "easeOut" }}
                      className="absolute inset-y-0 left-0 rounded-lg"
                      style={{
                        background: `linear-gradient(90deg, rgba(0,212,255,0.3) 0%, rgba(147,51,234,0.3) ${percentage}%)`,
                      }}
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={isInView ? { width: `${percentage}%` } : { width: 0 }}
                      transition={{ delay: 0.3 + i * 0.06, duration: 0.8, ease: "easeOut" }}
                      className="absolute inset-y-0 left-0 rounded-lg border-r-2 border-cyan-400/60"
                      style={{
                        background: `linear-gradient(90deg, rgba(0,212,255,0.1), rgba(0,212,255,0.05))`,
                      }}
                    />
                  </div>

                  <div className="w-12 shrink-0 text-right">
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={isInView ? { opacity: 1 } : {}}
                      transition={{ delay: 0.8 + i * 0.06 }}
                      className="font-mono text-sm font-bold text-cyan-400"
                    >
                      {item.calls}
                    </motion.span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Summary bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="mt-8 pt-6 border-t border-slate-700/30 flex items-center justify-between"
        >
          <span className="text-sm text-slate-500 font-mono">
            Avg: {Math.round(sessionData.result.animationCalls / data.length)} calls/component
          </span>
          <span className="text-sm text-slate-500 font-mono">
            Total: <span className="text-amber-400 font-bold">{sessionData.result.animationCalls}</span> motion calls
          </span>
        </motion.div>
      </div>
    </section>
  );
}
