"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

// ─── Shimmer Block ──────────────────────────────────────────────────────────

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-slate-800/60 ${className ?? ""}`}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-700/20 to-transparent"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

// ─── Skeleton Variants ──────────────────────────────────────────────────────

/** Skeleton for stat cards (4 cards in a row) */
function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-800/50 bg-slate-900/40 p-5 space-y-3"
        >
          <div className="flex items-center gap-2">
            <Shimmer className="w-5 h-5 rounded" />
            <Shimmer className="h-3 w-20" />
          </div>
          <Shimmer className="h-9 w-24" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton for a list of cards (e.g. agents, tasks) */
function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-800/50 bg-slate-900/40 p-5 space-y-3"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Shimmer className="h-4 w-48" />
              <Shimmer className="h-3 w-64" />
            </div>
            <Shimmer className="h-5 w-20 rounded-full" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Shimmer className="h-3 w-full" />
            <Shimmer className="h-3 w-full" />
            <Shimmer className="h-3 w-full" />
          </div>
          <Shimmer className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton for agent cards in a grid */
function AgentGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-800/50 bg-slate-900/40 p-5 space-y-3"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Shimmer className="h-4 w-32" />
                <Shimmer className="h-4 w-16 rounded" />
              </div>
              <Shimmer className="h-3 w-48" />
            </div>
            <Shimmer className="h-5 w-20 rounded-full" />
          </div>
          <div className="flex items-center gap-3">
            <Shimmer className="h-3 w-12" />
            <Shimmer className="h-4 w-32 rounded" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Shimmer className="h-3 w-full" />
            <Shimmer className="h-3 w-full" />
            <Shimmer className="h-3 w-full" />
          </div>
          <div className="flex items-center gap-1 pt-1">
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="flex items-center gap-1 flex-1">
                <Shimmer className="w-2.5 h-2.5 rounded-full" />
                {j < 5 && <Shimmer className="flex-1 h-px" />}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton for git page (tabs + content) */
function GitSkeleton() {
  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-800/40 pb-px">
        {Array.from({ length: 2 }).map((_, i) => (
          <Shimmer key={i} className="h-9 w-28 rounded-t-lg" />
        ))}
      </div>
      {/* Content area */}
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-b-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Shimmer className="h-4 w-48" />
          <Shimmer className="h-5 w-20 rounded-full" />
          <Shimmer className="h-5 w-16 rounded-full" />
        </div>
        <div className="grid md:grid-cols-5 gap-6">
          <div className="md:col-span-3 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Shimmer className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" />
                <div className="flex-1 space-y-1.5">
                  <Shimmer className="h-3 w-full" />
                  <Shimmer className="h-2 w-20" />
                </div>
              </div>
            ))}
          </div>
          <div className="md:col-span-2 space-y-4">
            <div className="bg-slate-950/40 rounded-lg p-3 space-y-2">
              <Shimmer className="h-3 w-full" />
              <Shimmer className="h-3 w-full" />
              <Shimmer className="h-3 w-full" />
            </div>
            <Shimmer className="h-24 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Skeleton for files/treemap page */
function FilesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Shimmer key={i} className="h-4 w-24" />
        ))}
      </div>
      <Shimmer className="h-64 w-full rounded-xl" />
      <div className="rounded-xl border border-slate-800/50 bg-slate-900/40 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700">
          <div className="flex gap-4">
            <Shimmer className="h-3 w-16" />
            <Shimmer className="h-3 w-12" />
            <Shimmer className="h-3 w-14" />
            <Shimmer className="h-3 w-14" />
            <Shimmer className="h-3 w-12" />
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-2.5 border-b border-slate-800/30">
            <Shimmer className="h-3 w-48 flex-1" />
            <Shimmer className="h-3 w-16" />
            <Shimmer className="h-3 w-10" />
            <Shimmer className="h-3 w-10" />
            <Shimmer className="h-3 w-8" />
            <Shimmer className="h-1.5 w-24 rounded-full self-center" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Minimum Display Duration Wrapper ───────────────────────────────────────

/**
 * Ensures loading skeleton is shown for at least `minMs` milliseconds
 * to prevent jarring flashes of skeleton content.
 */
export function useMinimumLoading(isReady: boolean, minMs = 500): boolean {
  const [canShow, setCanShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setCanShow(true), minMs);
    return () => clearTimeout(timer);
  }, [minMs]);

  return canShow && isReady;
}

// ─── Exports ────────────────────────────────────────────────────────────────

export {
  Shimmer,
  StatCardsSkeleton,
  CardListSkeleton,
  AgentGridSkeleton,
  GitSkeleton,
  FilesSkeleton,
};
