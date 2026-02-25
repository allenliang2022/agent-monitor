"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import sessionData from "@/data/swarm-session.json";

type TimelineEvent = (typeof sessionData.timeline)[number];

const eventColors: Record<string, { dot: string; bg: string; border: string; text: string }> = {
  request: { dot: "bg-amber", bg: "bg-amber/10", border: "border-amber/20", text: "text-amber" },
  analyze: { dot: "bg-purple", bg: "bg-purple/10", border: "border-purple/20", text: "text-purple" },
  prompt: { dot: "bg-purple", bg: "bg-purple/10", border: "border-purple/20", text: "text-purple" },
  spawn: { dot: "bg-cyan", bg: "bg-cyan/10", border: "border-cyan/20", text: "text-cyan" },
  check: { dot: "bg-cyan", bg: "bg-cyan/10", border: "border-cyan/20", text: "text-cyan" },
  verify: { dot: "bg-green", bg: "bg-green/10", border: "border-green/20", text: "text-green" },
};

function getEventStyle(event: string) {
  return eventColors[event] || eventColors.check;
}

function CommandBlock({ commands }: { commands: string[] }) {
  return (
    <div className="mt-3 rounded-lg bg-black/50 border border-slate-700/50 p-3 font-mono text-xs overflow-x-auto">
      {commands.map((cmd, i) => (
        <div key={i} className="flex gap-2">
          <span className="text-green shrink-0">$</span>
          <span className="text-slate-300">{cmd}</span>
        </div>
      ))}
    </div>
  );
}

function ResultsBlock({ results }: { results: Record<string, unknown> }) {
  return (
    <div className="mt-2 rounded-lg bg-black/30 border border-slate-700/30 p-3 font-mono text-xs">
      {Object.entries(results).map(([key, value]) => (
        <div key={key} className="flex gap-2 mb-1 last:mb-0">
          <span className="text-purple shrink-0">{key}:</span>
          <span className={`${
            value === "ALIVE" ? "text-green" :
            value === "DEAD" ? "text-red" :
            value === true ? "text-green" :
            value === false ? "text-amber" :
            "text-slate-300"
          }`}>
            {Array.isArray(value) ? value.join(", ") : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Timeline() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const autoPlayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const events = sessionData.timeline;

  // Total session duration: ~552s, compressed to ~30s
  const COMPRESSION = 552 / 30;

  const stopAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
    setAutoPlaying(false);
  }, []);

  const startAutoPlay = useCallback(() => {
    setAutoPlaying(true);
    setActiveIndex(-1);
    setExpandedIndex(null);

    let currentIdx = 0;
    function playNext() {
      if (currentIdx >= events.length) {
        setAutoPlaying(false);
        return;
      }
      setActiveIndex(currentIdx);
      setExpandedIndex(currentIdx);

      const nextIdx = currentIdx + 1;
      if (nextIdx < events.length) {
        const delay = ((events[nextIdx].offsetSec - events[currentIdx].offsetSec) / COMPRESSION) * 1000;
        autoPlayRef.current = setTimeout(() => {
          currentIdx = nextIdx;
          playNext();
        }, Math.max(delay, 500));
      } else {
        autoPlayRef.current = setTimeout(() => {
          setAutoPlaying(false);
        }, 2000);
      }
    }
    playNext();
  }, [events, COMPRESSION]);

  useEffect(() => {
    return () => {
      if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
    };
  }, []);

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between mb-10"
        >
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">
              <span className="bg-gradient-to-r from-cyan to-purple bg-clip-text text-transparent">
                Session Timeline
              </span>
            </h2>
            <p className="text-sm text-slate-400 mt-1 font-mono">
              {events.length} events over {Math.round(sessionData.session.durationMs / 60000)} minutes
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={autoPlaying ? stopAutoPlay : startAutoPlay}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm border transition-colors ${
              autoPlaying
                ? "border-red/30 bg-red/10 text-red hover:bg-red/20"
                : "border-cyan/30 bg-cyan/10 text-cyan hover:bg-cyan/20"
            }`}
          >
            {autoPlaying ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                Stop
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Auto-Play
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gradient-to-b from-cyan/30 via-purple/30 to-green/30" />

          {events.map((event, i) => {
            const style = getEventStyle(event.event);
            const isExpanded = expandedIndex === i;
            const isActive = autoPlaying && activeIndex === i;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: autoPlaying ? 0 : i * 0.05, duration: 0.4 }}
                className="relative pl-12 pb-8 last:pb-0"
              >
                {/* Timeline dot */}
                <motion.div
                  className={`absolute left-2.5 top-1.5 w-5 h-5 rounded-full ${style.dot} flex items-center justify-center`}
                  animate={isActive ? { scale: [1, 1.4, 1], opacity: [1, 0.7, 1] } : {}}
                  transition={{ duration: 0.6, repeat: isActive ? Infinity : 0 }}
                >
                  <div className="w-2 h-2 rounded-full bg-white/80" />
                </motion.div>

                {/* Event card */}
                <motion.div
                  onClick={() => {
                    if (!autoPlaying) setExpandedIndex(isExpanded ? null : i);
                  }}
                  whileHover={!autoPlaying ? { x: 4 } : {}}
                  className={`rounded-xl border ${style.border} ${style.bg} p-4 cursor-pointer transition-all ${
                    isActive ? "ring-1 ring-cyan/40" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-xs text-slate-500">{event.time}</span>
                        <span className={`text-xs font-mono px-2 py-0.5 rounded ${style.bg} ${style.text} uppercase tracking-wider`}>
                          {event.event}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {event.actor}
                        </span>
                      </div>
                      <h3 className="font-semibold text-white">{event.title}</h3>
                      <p className="text-sm text-slate-400 mt-1 line-clamp-2">{event.detail}</p>
                    </div>

                    <motion.svg
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="w-5 h-5 text-slate-500 shrink-0 mt-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </motion.svg>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 mt-3 border-t border-slate-700/30">
                          {"commands" in event && event.commands && (
                            <div>
                              <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">Commands</span>
                              <CommandBlock commands={event.commands as string[]} />
                            </div>
                          )}
                          {"results" in event && event.results && (
                            <div className="mt-3">
                              <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">Results</span>
                              <ResultsBlock results={event.results as Record<string, unknown>} />
                            </div>
                          )}
                          {"assessment" in event && event.assessment && (
                            <div className="mt-3 flex items-start gap-2">
                              <span className="text-xs font-mono text-slate-500 uppercase tracking-wider shrink-0">Assessment:</span>
                              <span className="text-sm text-green">{event.assessment as string}</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
