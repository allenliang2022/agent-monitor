"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const navItems: { href: string; label: string; icon: string }[] = [
  { href: "/live", label: "Overview", icon: "+" },
  { href: "/live/timeline", label: "Timeline", icon: ">>" },
  { href: "/live/agents", label: "Agents", icon: "#" },
  { href: "/live/tasks", label: "Tasks", icon: ">" },
  { href: "/live/agent", label: "Agent", icon: "_" },
  { href: "/live/git", label: "Git", icon: "~" },
  { href: "/live/files", label: "Files", icon: "%" },
  { href: "/live/monitoring", label: "Monitoring", icon: "@" },
  { href: "/live/architecture", label: "Architecture", icon: "&" },
  { href: "/live/prompt", label: "Prompt", icon: "$" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-12 gap-1">
          {/* Logo */}
          <Link href="/live" className="shrink-0 mr-4 flex items-center gap-2">
            <span className="text-cyan-400 font-mono font-bold text-sm">ASM</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
          </Link>

          {/* Desktop nav - horizontal scroll */}
          <div className="hidden md:flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/live"
                  ? pathname === "/live"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative shrink-0 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                    isActive
                      ? "text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="navbar-active"
                      className="absolute inset-0 rounded-md nav-active-gradient"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden ml-auto p-2 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="md:hidden overflow-hidden border-t border-slate-800/50 bg-slate-950/95 backdrop-blur-md"
          >
            <div className="px-4 py-2 space-y-1">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/live"
                    ? pathname === "/live"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block px-3 py-2 rounded-md text-sm font-mono transition-colors ${
                      isActive
                        ? "text-white bg-cyan-400/15 border border-cyan-400/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    }`}
                  >
                    <span className="text-cyan-400/60 mr-2">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
