"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// ─── Shortcut Definitions ───────────────────────────────────────────────────

interface ShortcutDef {
  keys: string[];
  description: string;
  href?: string;
  action?: string;
}

const NAV_SHORTCUTS: ShortcutDef[] = [
  { keys: ["g", "o"], description: "Go to Overview", href: "/live" },
  { keys: ["g", "t"], description: "Go to Timeline", href: "/live/timeline" },
  { keys: ["g", "a"], description: "Go to Agents", href: "/live/agents" },
  { keys: ["g", "k"], description: "Go to Tasks", href: "/live/tasks" },
  { keys: ["g", "i"], description: "Go to Git", href: "/live/git" },
  { keys: ["g", "f"], description: "Go to Files", href: "/live/files" },
  { keys: ["g", "m"], description: "Go to Monitoring", href: "/live/monitoring" },
  { keys: ["g", "r"], description: "Go to Architecture", href: "/live/architecture" },
  { keys: ["g", "p"], description: "Go to Prompt", href: "/live/prompt" },
];

const ACTION_SHORTCUTS: ShortcutDef[] = [
  { keys: ["?"], description: "Show keyboard shortcuts", action: "help" },
  { keys: ["Shift", "?"], description: "Show keyboard shortcuts", action: "help" },
  { keys: ["n"], description: "Open new task modal (on Tasks page)", action: "new-task" },
  { keys: ["Escape"], description: "Close any open modal", action: "close" },
];

// ─── Help Modal ─────────────────────────────────────────────────────────────

function KeyLabel({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-300 shadow-[0_1px_0_rgba(0,0,0,0.4)]">
      {children}
    </kbd>
  );
}

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm font-mono text-slate-400">{description}</span>
      <span className="flex items-center gap-1 ml-4 shrink-0">
        {keys.map((key, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-slate-600 text-xs">then</span>}
            <KeyLabel>{key}</KeyLabel>
          </span>
        ))}
      </span>
    </div>
  );
}

function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const backdropRef = useRef<HTMLDivElement>(null);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
        >
          {/* Backdrop */}
          <motion.div
            ref={backdropRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h2 className="text-sm font-mono font-bold text-cyan-400 flex items-center gap-2">
                <span className="text-cyan-400/50">?</span> Keyboard Shortcuts
              </h2>
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-slate-300 transition-colors text-lg font-mono leading-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50 rounded"
                aria-label="Close keyboard shortcuts modal"
              >
                x
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 max-h-[70vh] overflow-y-auto space-y-5">
              {/* Navigation section */}
              <div>
                <h3 className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
                  Navigation
                </h3>
                <div className="space-y-0.5">
                  {NAV_SHORTCUTS.map((s) => (
                    <ShortcutRow key={s.description} keys={s.keys} description={s.description} />
                  ))}
                </div>
              </div>

              {/* Actions section */}
              <div>
                <h3 className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
                  Actions
                </h3>
                <div className="space-y-0.5">
                  <ShortcutRow keys={["?"]} description="Show this help" />
                  <ShortcutRow keys={["n"]} description="New task (on Tasks page)" />
                  <ShortcutRow keys={["Esc"]} description="Close any open modal" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-800 text-center">
              <span className="text-[10px] font-mono text-slate-600">
                Press <KeyLabel>Esc</KeyLabel> to close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const [helpOpen, setHelpOpen] = useState(false);
  const pendingKeyRef = useRef<string | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPending = useCallback(() => {
    pendingKeyRef.current = null;
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    function isInputFocused(): boolean {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return true;
      if ((el as HTMLElement).isContentEditable) return true;
      return false;
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Always allow Escape to close modals, even in inputs
      if (e.key === "Escape") {
        if (helpOpen) {
          setHelpOpen(false);
          e.preventDefault();
          return;
        }
        // Dispatch custom event for other modals to listen to
        window.dispatchEvent(new CustomEvent("keyboard:close-modal"));
        clearPending();
        return;
      }

      // Skip shortcuts when focused on inputs
      if (isInputFocused()) return;

      // ? key (with or without shift) — show help
      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen((prev) => !prev);
        clearPending();
        return;
      }

      // n key — open new task modal (only on tasks page)
      if (e.key === "n" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (pathname === "/live/tasks") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("keyboard:new-task"));
          clearPending();
          return;
        }
      }

      // g + letter combos for navigation
      if (e.key === "g" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        clearPending();
        pendingKeyRef.current = "g";
        pendingTimerRef.current = setTimeout(() => {
          pendingKeyRef.current = null;
        }, 1000);
        return;
      }

      // Second key of a g + letter combo
      if (pendingKeyRef.current === "g") {
        const combo = NAV_SHORTCUTS.find(
          (s) => s.keys[0] === "g" && s.keys[1] === e.key
        );
        if (combo?.href) {
          e.preventDefault();
          router.push(combo.href);
        }
        clearPending();
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearPending();
    };
  }, [router, pathname, helpOpen, clearPending]);

  return <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />;
}
