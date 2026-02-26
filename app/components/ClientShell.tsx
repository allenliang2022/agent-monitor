"use client";

import dynamic from "next/dynamic";

/** Dynamically loaded client-only components (not needed for SSR or initial paint). */
const KeyboardShortcuts = dynamic(
  () => import("./KeyboardShortcuts"),
  { ssr: false }
);

const CommandPalette = dynamic(
  () => import("./CommandPalette"),
  { ssr: false }
);

/**
 * Client shell that lazy-loads heavy interactive overlays.
 * Rendered once in the root layout to keep the server component boundary clean.
 */
export default function ClientShell() {
  return (
    <>
      <KeyboardShortcuts />
      <CommandPalette />
    </>
  );
}
