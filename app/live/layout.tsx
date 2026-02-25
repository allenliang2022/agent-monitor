"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LiveProvider } from "./LiveContext";

const subNavItems = [
  { href: "/live", label: "Overview", icon: "+" },
  { href: "/live/timeline", label: "Timeline", icon: ">>" },
  { href: "/live/agents", label: "Agents", icon: "#" },
  { href: "/live/tasks", label: "Tasks", icon: ">" },
  { href: "/live/agent", label: "Agent", icon: "_" },
  { href: "/live/git", label: "Git", icon: "~" },
  { href: "/live/prompt", label: "Prompt", icon: "$" },
];

function LiveSubNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-12 z-40 border-b border-slate-800/50 bg-slate-900/60 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center gap-1 h-10 overflow-x-auto scrollbar-none">
          {subNavItems.map((item) => {
            const isActive =
              item.href === "/live"
                ? pathname === "/live"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors whitespace-nowrap ${
                  isActive
                    ? "text-cyan-400"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <span className="text-[10px]">{item.icon}</span>
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="live-subnav-active"
                    className="absolute inset-x-1 -bottom-[5px] h-[2px] bg-cyan-400 rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <LiveProvider>
      <LiveSubNav />
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] to-[#111128] text-slate-200">
        {children}
      </div>
    </LiveProvider>
  );
}
