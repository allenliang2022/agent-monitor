"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SettingsProvider } from "./SettingsContext";
import { LiveProvider } from "./LiveContext";
import ErrorBoundary from "../components/ErrorBoundary";

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SettingsProvider>
      <LiveProvider>
        <ErrorBoundary label="Live Dashboard">
          <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] to-[#111128] text-slate-200 pt-14">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </ErrorBoundary>
      </LiveProvider>
    </SettingsProvider>
  );
}
