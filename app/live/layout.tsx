"use client";

import { LiveProvider } from "./LiveContext";

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <LiveProvider>
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] to-[#111128] text-slate-200 pt-14">
        {children}
      </div>
    </LiveProvider>
  );
}
