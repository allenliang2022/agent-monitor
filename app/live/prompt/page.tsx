"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PromptFile {
  name: string;
  filename: string;
  content: string;
  agent: string;
}

export default function LivePromptPage() {
  const [prompts, setPrompts] = useState<PromptFile[]>([]);
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/prompts")
      .then((r) => r.json())
      .then((data) => {
        setPrompts(data.prompts || []);
        if (data.prompts?.length > 0) {
          setExpandedPrompt(data.prompts[0].filename);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl font-mono font-bold text-purple-400 mb-1 flex items-center gap-2">
          <span className="text-purple-400/50">&gt;</span> Agent Prompts
        </h1>
        <p className="text-xs font-mono text-slate-500">
          Actual prompts sent to coding agents (opencode/codex) during this project
        </p>
      </motion.div>

      {loading ? (
        <div className="text-center text-slate-600 text-xs font-mono py-12 animate-pulse">
          Loading prompts...
        </div>
      ) : prompts.length === 0 ? (
        <div className="text-center text-slate-600 text-xs font-mono py-12">
          No prompt files found.
        </div>
      ) : (
        <div className="space-y-3">
          {prompts.map((prompt, i) => {
            const isExpanded = expandedPrompt === prompt.filename;
            const lines = prompt.content.split("\n");
            const charCount = prompt.content.length;
            const lineCount = lines.length;

            return (
              <motion.div
                key={prompt.filename}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-slate-900/40 border border-slate-800/50 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedPrompt(isExpanded ? null : prompt.filename)}
                  className="w-full text-left px-5 py-4 hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">📝</span>
                      <div>
                        <div className="font-mono font-semibold text-sm text-white">
                          {prompt.name}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            {prompt.agent}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {prompt.filename}
                          </span>
                          <span className="text-[10px] font-mono text-slate-600">
                            {charCount} chars | {lineCount} lines
                          </span>
                        </div>
                      </div>
                    </div>
                    <motion.span
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      className="text-slate-500 text-xs"
                    >
                      ▼
                    </motion.span>
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 border-t border-slate-800/30">
                        <div className="mt-4 rounded-lg bg-black/50 border border-slate-700/50 p-4 max-h-[600px] overflow-y-auto">
                          <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap">
                            {lines.map((line, li) => {
                              let className = "text-slate-300";
                              if (line.startsWith("# ")) className = "text-purple-400 font-bold text-sm";
                              else if (line.startsWith("## ")) className = "text-cyan-400 font-bold";
                              else if (line.startsWith("### ")) className = "text-amber-400 font-semibold";
                              else if (line.startsWith("- **")) className = "text-green-400";
                              else if (line.startsWith("- ")) className = "text-slate-400";
                              else if (line.startsWith("```")) className = "text-pink-400";
                              else if (line.match(/^\d+\./)) className = "text-amber-300";

                              return (
                                <div key={li} className={className}>
                                  {line || "\u00A0"}
                                </div>
                              );
                            })}
                          </pre>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
