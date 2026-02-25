"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PaletteItem {
  id: string;
  label: string;
  icon: string;
  category: "page" | "task";
  href?: string;
  detail?: string;
}

// ─── Page definitions (mirrors Navbar navItems) ─────────────────────────────

const PAGE_ITEMS: PaletteItem[] = [
  { id: "p-overview", label: "Overview", icon: "+", category: "page", href: "/live" },
  { id: "p-timeline", label: "Timeline", icon: ">>", category: "page", href: "/live/timeline" },
  { id: "p-agents", label: "Agents", icon: "#", category: "page", href: "/live/agents" },
  { id: "p-tasks", label: "Tasks", icon: ">", category: "page", href: "/live/tasks" },
  { id: "p-agent", label: "Agent", icon: "_", category: "page", href: "/live/agent" },
  { id: "p-git", label: "Git", icon: "~", category: "page", href: "/live/git" },
  { id: "p-files", label: "Files", icon: "%", category: "page", href: "/live/files" },
  { id: "p-monitoring", label: "Monitoring", icon: "@", category: "page", href: "/live/monitoring" },
  { id: "p-architecture", label: "Architecture", icon: "&", category: "page", href: "/live/architecture" },
  { id: "p-prompt", label: "Prompt", icon: "$", category: "page", href: "/live/prompt" },
];

// ─── Hook to get tasks (safe outside LiveProvider) ──────────────────────────

function useTaskItems(): PaletteItem[] {
  const [items, setItems] = useState<PaletteItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchTasks() {
      try {
        const res = await fetch("/api/agent-tasks");
        const data = await res.json();
        if (cancelled) return;
        if (data.tasks && Array.isArray(data.tasks)) {
          setItems(
            data.tasks.map((t: { id: string; name: string; status: string; agent: string }) => ({
              id: `t-${t.id}`,
              label: t.name,
              icon: t.status === "running" ? "*" : t.status === "completed" || t.status === "done" ? "v" : ".",
              category: "task" as const,
              href: "/live/tasks",
              detail: `${t.status} - ${t.agent}`,
            }))
          );
        }
      } catch {
        // silently fail — tasks are optional in the palette
      }
    }

    fetchTasks();
    return () => { cancelled = true; };
  }, []);

  return items;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const taskItems = useTaskItems();

  // All items combined
  const allItems = useMemo(() => [...PAGE_ITEMS, ...taskItems], [taskItems]);

  // Filtered items
  const filtered = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase();
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.detail?.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [allItems, query]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [filtered.length, query]);

  // Open/close with Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (!prev) {
            setQuery("");
            setActiveIndex(0);
          }
          return !prev;
        });
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      // Small delay to let the animation start
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // Navigate to selected item
  const selectItem = useCallback(
    (item: PaletteItem) => {
      if (item.href) {
        router.push(item.href);
      }
      setOpen(false);
    },
    [router]
  );

  // Keyboard navigation inside palette
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % Math.max(filtered.length, 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev - 1 + filtered.length) % Math.max(filtered.length, 1));
          break;
        case "Enter":
          e.preventDefault();
          if (filtered[activeIndex]) {
            selectItem(filtered[activeIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          break;
      }
    },
    [filtered, activeIndex, selectItem]
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[150] flex items-start justify-center pt-[15vh] p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
            onKeyDown={handleKeyDown}
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
              <span className="text-cyan-400/50 text-sm font-mono">&gt;</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pages and tasks..."
                className="flex-1 bg-transparent text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none"
                aria-label="Search command palette"
              />
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-500">
                ESC
              </kbd>
            </div>

            {/* Results List */}
            <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm font-mono text-slate-600">
                  No results for &ldquo;{query}&rdquo;
                </div>
              ) : (
                <>
                  {/* Pages */}
                  {filtered.some((i) => i.category === "page") && (
                    <div className="px-3 pt-1 pb-1">
                      <span className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">
                        Pages
                      </span>
                    </div>
                  )}
                  {filtered
                    .filter((i) => i.category === "page")
                    .map((item) => {
                      const idx = filtered.indexOf(item);
                      return (
                        <button
                          key={item.id}
                          data-index={idx}
                          onClick={() => selectItem(item)}
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                            idx === activeIndex
                              ? "bg-cyan-500/10 text-slate-200"
                              : "text-slate-400 hover:bg-slate-800/50"
                          }`}
                        >
                          <span className="w-6 text-center text-cyan-400/60 text-xs font-mono shrink-0">
                            {item.icon}
                          </span>
                          <span className="text-sm font-mono">{item.label}</span>
                          {item.href && (
                            <span className="ml-auto text-[10px] font-mono text-slate-600">
                              {item.href}
                            </span>
                          )}
                        </button>
                      );
                    })}

                  {/* Tasks */}
                  {filtered.some((i) => i.category === "task") && (
                    <div className="px-3 pt-3 pb-1">
                      <span className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">
                        Tasks
                      </span>
                    </div>
                  )}
                  {filtered
                    .filter((i) => i.category === "task")
                    .map((item) => {
                      const idx = filtered.indexOf(item);
                      return (
                        <button
                          key={item.id}
                          data-index={idx}
                          onClick={() => selectItem(item)}
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                            idx === activeIndex
                              ? "bg-cyan-500/10 text-slate-200"
                              : "text-slate-400 hover:bg-slate-800/50"
                          }`}
                        >
                          <span className="w-6 text-center text-purple-400/60 text-xs font-mono shrink-0">
                            {item.icon}
                          </span>
                          <span className="text-sm font-mono truncate">{item.label}</span>
                          {item.detail && (
                            <span className="ml-auto text-[10px] font-mono text-slate-600 shrink-0">
                              {item.detail}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </>
              )}
            </div>

            {/* Footer hints */}
            <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-800 text-[10px] font-mono text-slate-600">
              <span className="flex items-center gap-1">
                <kbd className="inline-flex items-center justify-center w-4 h-4 rounded bg-slate-800 border border-slate-700 text-[9px]">
                  &uarr;
                </kbd>
                <kbd className="inline-flex items-center justify-center w-4 h-4 rounded bg-slate-800 border border-slate-700 text-[9px]">
                  &darr;
                </kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="inline-flex items-center justify-center px-1 h-4 rounded bg-slate-800 border border-slate-700 text-[9px]">
                  &crarr;
                </kbd>
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="inline-flex items-center justify-center px-1 h-4 rounded bg-slate-800 border border-slate-700 text-[9px]">
                  esc
                </kbd>
                close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
