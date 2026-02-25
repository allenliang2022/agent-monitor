"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useLive } from "../LiveContext";

export default function ConfigPage() {
  const { configData, expandedConfigSection, setExpandedConfigSection } =
    useLive();

  return (
    <div className="p-4 md:p-8 space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-sm font-mono text-amber-400 mb-3 flex items-center gap-2">
          <span className="text-amber-400/50">&gt;</span> System Config
        </h2>

        {!configData ? (
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg p-6 text-center text-slate-600 text-xs font-mono animate-pulse">
            Loading configuration...
          </div>
        ) : (
          <div className="space-y-2">
            {/* Agents Config */}
            <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg overflow-hidden">
              <button
                onClick={() =>
                  setExpandedConfigSection(
                    expandedConfigSection === "agents" ? null : "agents"
                  )
                }
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-mono text-slate-300 hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400">&#9654;</span>
                  <span>Agents Config</span>
                  <span className="text-slate-600">
                    ({configData.agents.length})
                  </span>
                </div>
                <span className="text-slate-600">
                  {expandedConfigSection === "agents" ? "\u25B2" : "\u25BC"}
                </span>
              </button>
              <AnimatePresence>
                {expandedConfigSection === "agents" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 space-y-2">
                      {configData.agents.map((agent) => (
                        <div
                          key={agent.name}
                          className="flex items-center justify-between text-[11px] font-mono py-1 border-t border-slate-800/30"
                        >
                          <span
                            className={
                              agent.name === "main"
                                ? "text-cyan-400"
                                : agent.name === "girlfriend"
                                ? "text-pink-400"
                                : agent.name === "xiaolongnv"
                                ? "text-purple-400"
                                : "text-slate-300"
                            }
                          >
                            {agent.name}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500">
                              {agent.sessionCount} sessions
                            </span>
                            {agent.hasCron && (
                              <span className="text-amber-400/60 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                                cron
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Active Cron Jobs */}
            <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg overflow-hidden">
              <button
                onClick={() =>
                  setExpandedConfigSection(
                    expandedConfigSection === "cron" ? null : "cron"
                  )
                }
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-mono text-slate-300 hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-amber-400">&#9654;</span>
                  <span>Active Cron Jobs</span>
                  <span className="text-slate-600">
                    ({configData.cron.count})
                  </span>
                </div>
                <span className="text-slate-600">
                  {expandedConfigSection === "cron" ? "\u25B2" : "\u25BC"}
                </span>
              </button>
              <AnimatePresence>
                {expandedConfigSection === "cron" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 space-y-1">
                      {configData.cron.jobs.length === 0 ? (
                        <p className="text-slate-600 text-[11px] font-mono py-1">
                          No cron jobs configured.
                        </p>
                      ) : (
                        configData.cron.jobs.map((job, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-[11px] font-mono py-1 border-t border-slate-800/30"
                          >
                            <span className="text-slate-300">{job.name}</span>
                            <span className="text-amber-400/70">
                              {job.schedule}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Installed Skills */}
            <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg overflow-hidden">
              <button
                onClick={() =>
                  setExpandedConfigSection(
                    expandedConfigSection === "skills" ? null : "skills"
                  )
                }
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-mono text-slate-300 hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-green-400">&#9654;</span>
                  <span>Installed Skills</span>
                  <span className="text-slate-600">
                    ({configData.skills.count})
                  </span>
                </div>
                <span className="text-slate-600">
                  {expandedConfigSection === "skills" ? "\u25B2" : "\u25BC"}
                </span>
              </button>
              <AnimatePresence>
                {expandedConfigSection === "skills" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3">
                      {configData.skills.skills.length === 0 ? (
                        <p className="text-slate-600 text-[11px] font-mono py-1">
                          No skills installed.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {configData.skills.skills.map((skill) => (
                            <span
                              key={skill}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Channel Bindings */}
            <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg overflow-hidden">
              <button
                onClick={() =>
                  setExpandedConfigSection(
                    expandedConfigSection === "channels" ? null : "channels"
                  )
                }
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-mono text-slate-300 hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-purple-400">&#9654;</span>
                  <span>Channel Bindings</span>
                  <span className="text-slate-600">
                    ({configData.channels.length})
                  </span>
                </div>
                <span className="text-slate-600">
                  {expandedConfigSection === "channels" ? "\u25B2" : "\u25BC"}
                </span>
              </button>
              <AnimatePresence>
                {expandedConfigSection === "channels" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3">
                      {configData.channels.length === 0 ? (
                        <p className="text-slate-600 text-[11px] font-mono py-1">
                          No channels detected.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {configData.channels.map((ch) => (
                            <span
                              key={ch}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            >
                              {ch}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </motion.section>
    </div>
  );
}
