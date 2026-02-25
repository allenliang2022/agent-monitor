"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const promptSections = [
  {
    id: "identity",
    title: "Identity & Soul",
    icon: "\uD83C\uDF1F",
    color: "purple",
    description:
      "Agent personality, name, communication style, role definition",
    files: ["SOUL.md", "IDENTITY.md", "USER.md"],
  },
  {
    id: "memory",
    title: "Memory Architecture",
    icon: "\uD83E\uDDE0",
    color: "cyan",
    description:
      "Long-term MEMORY.md + daily notes + pre-compaction flush + context monitoring",
    files: ["MEMORY.md", "memory/YYYY-MM-DD.md", "HEARTBEAT.md"],
  },
  {
    id: "agents",
    title: "Agent Orchestration",
    icon: "\uD83E\uDD16",
    color: "amber",
    description:
      "Multi-agent routing, group chat rules, sub-agent spawning, coding agent delegation",
    files: ["AGENTS.md"],
  },
  {
    id: "skills",
    title: "Skills & Tools",
    icon: "\uD83D\uDD27",
    color: "green",
    description:
      "Skill discovery, SKILL.md loading, tool routing (message/exec/browser/etc.)",
    files: ["TOOLS.md", "skills/*/SKILL.md"],
  },
  {
    id: "safety",
    title: "Safety & Security",
    icon: "\uD83D\uDD12",
    color: "red",
    description:
      "No exfiltration, trash > rm, external action approval, injection detection, security audits",
    files: ["AGENTS.md (Safety section)"],
  },
  {
    id: "proactive",
    title: "Proactive Behaviors",
    icon: "\uD83D\uDCA1",
    color: "pink",
    description:
      "Heartbeat checks, reverse prompting, self-healing, context window monitoring, memory maintenance",
    files: ["HEARTBEAT.md", "AGENTS.md (Proactive section)"],
  },
];

const performanceRules = [
  "All messages via message tool (no plain text replies for progress)",
  "Max 3 consecutive tool calls without a message to user",
  "Pre-compaction flush at 70%+ context usage",
  "Self-healing: try 5-10 methods before asking user",
  "Batch periodic checks into HEARTBEAT.md",
];

const constraints = [
  "Never exfiltrate private data",
  "Ask before external actions (emails, tweets)",
  "Never spawn agents in ~/.openclaw/workspace",
  "Respect quiet hours (23:00-08:00)",
  "Quality > quantity in group chats",
];

export default function PromptPage() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-sm font-mono text-purple-400 mb-3 flex items-center gap-2">
          <span className="text-purple-400/50">&gt;</span> Prompt Architecture
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-2">
            {promptSections.map((section) => {
              const isExpanded = expandedSection === section.id;
              const borderClass =
                section.color === "purple"
                  ? "border-purple-500/30 bg-purple-500/5"
                  : section.color === "cyan"
                  ? "border-cyan-500/30 bg-cyan-500/5"
                  : section.color === "amber"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : section.color === "green"
                  ? "border-green-500/30 bg-green-500/5"
                  : section.color === "red"
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-pink-500/30 bg-pink-500/5";
              const defaultBorder =
                "border-slate-700/50 bg-slate-900/30 hover:border-slate-600";

              return (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <button
                    onClick={() =>
                      setExpandedSection(isExpanded ? null : section.id)
                    }
                    className={`w-full text-left rounded-xl border p-4 transition-all ${
                      isExpanded ? borderClass : defaultBorder
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{section.icon}</span>
                        <span className="font-semibold text-white text-sm">
                          {section.title}
                        </span>
                      </div>
                      <motion.span
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        className="text-slate-500 text-xs"
                      >
                        \u25BC
                      </motion.span>
                    </div>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-3 mt-3 border-t border-slate-700/30">
                            <p className="text-xs text-slate-400 mb-3">
                              {section.description}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {section.files.map((f) => (
                                <span
                                  key={f}
                                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/60 text-slate-400 border border-slate-700/30"
                                >
                                  {f}
                                </span>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* Sidebar: Rules & Constraints */}
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
              <h3 className="text-sm font-bold text-amber-400 font-mono mb-3">
                Operating Rules
              </h3>
              <ul className="space-y-2">
                {performanceRules.map((rule, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-slate-400"
                  >
                    <span className="text-amber-400 mt-0.5 shrink-0">*</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4">
              <h3 className="text-sm font-bold text-red-400 font-mono mb-3">
                Constraints
              </h3>
              <ul className="space-y-2">
                {constraints.map((rule, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-slate-400"
                  >
                    <span className="text-red-400 mt-0.5 shrink-0">!</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
