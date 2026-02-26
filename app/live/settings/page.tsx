"use client";

import { motion } from "framer-motion";
import { useSettings } from "../SettingsContext";
import { useLive } from "../LiveContext";
import { useMemo } from "react";

// ─── Section wrapper ────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  color,
  children,
  delay = 0,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="rounded-xl border border-slate-800/50 bg-slate-900/50 overflow-hidden"
    >
      <div className={`px-5 py-3 border-b border-slate-800/50 flex items-center gap-2 ${color}`}>
        {icon}
        <h2 className="text-sm font-mono font-semibold">{title}</h2>
      </div>
      <div className="p-5 space-y-5">{children}</div>
    </motion.section>
  );
}

// ─── Form field components ──────────────────────────────────────────────────

function FieldRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div className="flex-1 min-w-0">
        <label className="text-sm font-mono text-slate-200">{label}</label>
        {description && (
          <p className="text-xs font-mono text-slate-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className="sm:w-64 shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        disabled
          ? "bg-slate-800 cursor-not-allowed opacity-40"
          : checked
            ? "bg-cyan-500/60"
            : "bg-slate-700"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { settings, updateSetting, resetSettings } = useSettings();
  const { tasks, fileChanges, gitData } = useLive();

  // Historical stats
  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const totalCommits = Object.values(gitData).reduce(
      (sum, info) => sum + (info.recentCommits?.length ?? 0),
      0
    );
    const totalFilesChanged = Object.values(fileChanges).reduce(
      (sum, fc) => sum + fc.files.length,
      0
    );
    return { totalTasks, totalCommits, totalFilesChanged };
  }, [tasks, gitData, fileChanges]);

  return (
    <div className="p-4 md:p-8 pt-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-slate-200">
            Settings
          </h1>
          <p className="text-xs font-mono text-slate-500 mt-1">
            Configure dashboard preferences and agent defaults
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={resetSettings}
          className="px-3 py-1.5 rounded-lg text-xs font-mono text-slate-400 border border-slate-700 hover:border-red-400/50 hover:text-red-400 transition-colors"
        >
          Reset All
        </motion.button>
      </motion.div>

      {/* ── General Settings ─────────────────────────────────────────────── */}
      <Section
        title="General"
        delay={0.1}
        color="text-cyan-400"
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        }
      >
        <FieldRow label="Dashboard Title" description="Displayed in the header area">
          <input
            type="text"
            value={settings.dashboardTitle}
            onChange={(e) => updateSetting("dashboardTitle", e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-sm font-mono text-slate-200 focus:border-cyan-400/50 focus:outline-none transition-colors"
          />
        </FieldRow>

        <FieldRow label="Theme" description="Visual appearance of the dashboard">
          <div className="flex gap-2">
            {(["dark", "light", "auto"] as const).map((t) => (
              <button
                key={t}
                disabled={t !== "dark"}
                onClick={() => updateSetting("theme", t)}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                  settings.theme === t
                    ? "bg-cyan-400/15 text-cyan-400 border-cyan-400/30"
                    : t !== "dark"
                      ? "bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed"
                      : "bg-slate-800/80 text-slate-400 border-slate-700 hover:border-slate-600"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </FieldRow>

        <FieldRow
          label={`Polling Interval: ${settings.pollingInterval}s`}
          description="How often to check for updates (1-30 seconds)"
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-500">1s</span>
            <input
              type="range"
              min={1}
              max={30}
              value={settings.pollingInterval}
              onChange={(e) => updateSetting("pollingInterval", Number(e.target.value))}
              className="flex-1 accent-cyan-400 h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <span className="text-xs font-mono text-slate-500">30s</span>
          </div>
        </FieldRow>

        <FieldRow
          label={`Max Timeline Events: ${settings.maxTimelineEvents}`}
          description="Maximum events retained in the timeline (10-200)"
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-500">10</span>
            <input
              type="range"
              min={10}
              max={200}
              step={10}
              value={settings.maxTimelineEvents}
              onChange={(e) => updateSetting("maxTimelineEvents", Number(e.target.value))}
              className="flex-1 accent-cyan-400 h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <span className="text-xs font-mono text-slate-500">200</span>
          </div>
        </FieldRow>
      </Section>

      {/* ── Agent Configuration ───────────────────────────────────────────── */}
      <Section
        title="Agent Configuration"
        delay={0.2}
        color="text-purple-500"
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m3.75-1.5v1.5m-7.5 15V21M12 19.5V21m3.75-1.5V21m-9-16.5h10.5a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25H6.75a2.25 2.25 0 0 1-2.25-2.25v-7.5A2.25 2.25 0 0 1 6.75 4.5Z" />
          </svg>
        }
      >
        <FieldRow label="Default Agent Type" description="Agent runtime to use for new tasks">
          <select
            value={settings.defaultAgentType}
            onChange={(e) => updateSetting("defaultAgentType", e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-sm font-mono text-slate-200 focus:border-purple-500/50 focus:outline-none transition-colors"
          >
            <option value="opencode">opencode</option>
            <option value="claude-code" disabled>claude-code (coming soon)</option>
            <option value="aider" disabled>aider (coming soon)</option>
          </select>
        </FieldRow>

        <FieldRow label="Default Branch Prefix" description="Prefix for auto-created feature branches">
          <input
            type="text"
            value={settings.defaultBranchPrefix}
            onChange={(e) => updateSetting("defaultBranchPrefix", e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-sm font-mono text-slate-200 focus:border-purple-500/50 focus:outline-none transition-colors"
          />
        </FieldRow>

        <FieldRow label="Worktree Base Path" description="Read from server configuration">
          <div className="px-3 py-1.5 rounded-lg bg-slate-800/40 border border-slate-800 text-sm font-mono text-slate-500">
            /Users/liang/work/agent-monitor-worktrees
          </div>
        </FieldRow>

        <FieldRow label="Auto-cleanup Worktrees" description="Automatically remove completed worktrees">
          <div className="flex justify-end">
            <Toggle
              checked={settings.autoCleanupWorktrees}
              onChange={(v) => updateSetting("autoCleanupWorktrees", v)}
            />
          </div>
        </FieldRow>
      </Section>

      {/* ── Notifications ─────────────────────────────────────────────────── */}
      <Section
        title="Notifications"
        delay={0.3}
        color="text-amber-400"
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
        }
      >
        <FieldRow label="Browser Notifications" description="Show native browser notifications for events">
          <div className="flex justify-end">
            <Toggle
              checked={settings.browserNotifications}
              onChange={(v) => updateSetting("browserNotifications", v)}
            />
          </div>
        </FieldRow>

        <FieldRow label="Sound on Completion" description="Play a sound when a task completes">
          <div className="flex justify-end">
            <Toggle
              checked={settings.soundOnCompletion}
              onChange={(v) => updateSetting("soundOnCompletion", v)}
            />
          </div>
        </FieldRow>

        <FieldRow label="Toast Notifications" description="Show in-app toast messages for events">
          <div className="flex justify-end">
            <Toggle
              checked={settings.toastNotifications}
              onChange={(v) => updateSetting("toastNotifications", v)}
            />
          </div>
        </FieldRow>
      </Section>

      {/* ── About ─────────────────────────────────────────────────────────── */}
      <Section
        title="About"
        delay={0.4}
        color="text-emerald-400"
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
        }
      >
        <FieldRow label="Version" description="Current application version">
          <span className="text-sm font-mono text-cyan-400">v0.1.0</span>
        </FieldRow>

        <FieldRow label="GitHub Repository" description="Source code and issue tracker">
          <a
            href="https://github.com/allenliang2022/agent-monitor"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            allenliang2022/agent-monitor
            <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        </FieldRow>

        {/* Historical stats */}
        <div className="pt-3 border-t border-slate-800/50">
          <p className="text-xs font-mono text-slate-500 mb-3">Session Statistics</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-3 text-center">
              <div className="text-lg font-bold font-mono text-cyan-400">{stats.totalTasks}</div>
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Tasks</div>
            </div>
            <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-3 text-center">
              <div className="text-lg font-bold font-mono text-purple-500">{stats.totalCommits}</div>
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Commits</div>
            </div>
            <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-3 text-center">
              <div className="text-lg font-bold font-mono text-emerald-400">{stats.totalFilesChanged}</div>
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Files</div>
            </div>
          </div>
        </div>
      </Section>

      {/* Bottom spacer */}
      <div className="h-8" />
    </div>
  );
}
