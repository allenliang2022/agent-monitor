"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const navItems: { href: string; label: string; icon: string; live?: boolean }[] = [
  { href: "/", label: "Overview", icon: "+" },
  { href: "/timeline", label: "Timeline", icon: ">" },
  { href: "/status", label: "Status", icon: "#" },
  { href: "/files", label: "Files", icon: "=" },
  { href: "/animations", label: "Animations", icon: "~" },
  { href: "/monitoring", label: "Monitoring", icon: "@" },
  { href: "/prompt", label: "Prompt", icon: "$" },
  { href: "/architecture", label: "Architecture", icon: "&" },
  { href: "/live", label: "Live", icon: "*", live: true },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-14 gap-1 overflow-x-auto scrollbar-hide">
          <Link href="/" className="shrink-0 mr-4">
            <span className="text-cyan-400 font-mono font-bold text-sm">ASM</span>
          </Link>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
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
                    className={`absolute inset-0 border rounded-md ${
                      item.live
                        ? "bg-green-400/15 border-green-400/30"
                        : "bg-cyan-400/15 border-cyan-400/30"
                    }`}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  {item.live && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                  )}
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
