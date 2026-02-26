"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

// ─── Settings Types ─────────────────────────────────────────────────────────

export interface Settings {
  // General
  dashboardTitle: string;
  theme: "dark" | "light" | "auto";
  pollingInterval: number; // seconds
  maxTimelineEvents: number;

  // Agent Configuration
  defaultAgentType: string;
  defaultBranchPrefix: string;
  autoCleanupWorktrees: boolean;

  // Notifications
  browserNotifications: boolean;
  soundOnCompletion: boolean;
  toastNotifications: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  dashboardTitle: "Agent Swarm Monitor",
  theme: "dark",
  pollingInterval: 3,
  maxTimelineEvents: 50,
  defaultAgentType: "opencode",
  defaultBranchPrefix: "feat/",
  autoCleanupWorktrees: false,
  browserNotifications: false,
  soundOnCompletion: false,
  toastNotifications: true,
};

const STORAGE_KEY = "asm-settings";

// ─── Context ────────────────────────────────────────────────────────────────

interface SettingsContextValue {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within <SettingsProvider>");
  return ctx;
}

// ─── Provider ───────────────────────────────────────────────────────────────

function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // corrupted storage — use defaults
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // storage full or unavailable
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  // Persist on change (skip initial hydration)
  useEffect(() => {
    if (hydrated) {
      saveSettings(settings);
    }
  }, [settings, hydrated]);

  const updateSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
  }, []);

  const value: SettingsContextValue = {
    settings,
    updateSetting,
    resetSettings,
  };

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}
