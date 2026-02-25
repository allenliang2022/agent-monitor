"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import sessionData from "@/data/swarm-session.json";

const promptSections = [
  {
    title: "Step 1: Install Dependencies",
    content: 'npm install framer-motion\nVerify it appears in package.json dependencies.',
    highlight: "step",
  },
  {
    title: "Step 2: Create Animation Utility Library",
    content: 'Create app/lib/animations.ts with shared variants:\n- fadeInUp, fadeInDown, staggerContainer\n- scaleOnHover, slideInLeft, slideInRight\n- pageTransition variants\nAll respecting useReducedMotion.',
    highlight: "step",
  },
  {
    title: "Step 3: Animate All 13 Components",
    content: 'Hero.tsx - parallax scroll, text reveal, CTA pulse\nNavbar.tsx - backdrop blur on scroll, logo animation\nDestinationCard.tsx - hover lift, image zoom, overlay fade\nDestinationGrid.tsx - stagger children on viewport enter\nExperienceCard.tsx - slide in from alternating sides\nExperienceList.tsx - scroll-triggered stagger\nTestimonialCard.tsx - 3D card tilt on hover\nTestimonials.tsx - auto-carousel with gesture drag\nTierCard.tsx - glassmorphism hover, price counter\nTiers.tsx - viewport stagger reveal\nFooter.tsx - wave animation, link hover effects\nMobileCTA.tsx - sticky bottom bar slide up\nConciergeForm.tsx - field focus animations, submit ripple',
    highlight: "component",
  },
  {
    title: "Step 4: Page-Level Animations",
    content: 'app/page.tsx - AnimatePresence wrapper, section viewport triggers\nSections should animate in sequence on first load.\nUse layoutId for shared element transitions.',
    highlight: "step",
  },
  {
    title: "Step 5: Destinations Page",
    content: 'app/destinations/[slug]/page.tsx\n- Hero image parallax\n- Content sections stagger in\n- Gallery grid with hover effects\n- Booking CTA with attention animation',
    highlight: "step",
  },
  {
    title: "Step 6: CSS Keyframes & globals.css",
    content: 'Add complementary CSS animations:\n- Gradient shift for backgrounds\n- Shimmer effect for loading states\n- Subtle float animation for decorative elements\n- Smooth scroll behavior',
    highlight: "step",
  },
];

const performanceRules = [
  "Use will-change sparingly, only on actively animating elements",
  "Prefer transform/opacity animations (GPU-composited)",
  "useReducedMotion hook for accessibility",
  "Lazy load heavy animation components below the fold",
  "Set layout={false} when layoutId not needed",
];

const constraints = [
  "DO NOT change color palette, theme logic, or Tailwind classes",
  "DO NOT remove any existing functionality",
  "ONLY add motion wrappers and animation props",
  "Preserve all TypeScript types and interfaces",
  "Run 'npm run build' before committing to verify no errors",
];

const designInsights = [
  {
    title: "Protection-First",
    description: "Theme switching constraint placed at the very top ensures the agent preserves existing work.",
  },
  {
    title: "Shared Utility Lib",
    description: "Centralized animation variants in animations.ts avoids code duplication across 13 components.",
  },
  {
    title: "Per-Component Specifics",
    description: "Each component gets tailored animation specs rather than generic fade-in, resulting in polished UX.",
  },
  {
    title: "useReducedMotion",
    description: "Accessibility built into the prompt ensures the animations respect system preferences.",
  },
  {
    title: "Build Verification",
    description: "Final step requires build pass, preventing the agent from committing broken code.",
  },
];

export default function PromptDisplay() {
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const prompt = sessionData.prompt;

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-bold">
            <span className="bg-gradient-to-r from-purple-500 to-amber-400 bg-clip-text text-transparent">
              Prompt Architecture
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-1 font-mono">
            {prompt.length} chars | {prompt.steps} steps | {prompt.componentsTargeted} components targeted | {prompt.performanceRules} perf rules
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main prompt accordion */}
          <div className="lg:col-span-2 space-y-2">
            {promptSections.map((section, i) => {
              const isExpanded = expandedSection === i;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                >
                  <button
                    onClick={() => setExpandedSection(isExpanded ? null : i)}
                    className={`w-full text-left rounded-xl border p-4 transition-all ${
                      isExpanded
                        ? "border-purple-500/30 bg-purple-500/5"
                        : "border-slate-700/50 bg-slate-900/30 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded">
                          {i + 1}/{promptSections.length}
                        </span>
                        <span className="font-semibold text-white text-sm">{section.title}</span>
                      </div>
                      <motion.svg
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        className="w-4 h-4 text-slate-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </motion.svg>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-3 border-t border-slate-700/30">
                            <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-300">
                              {section.content.split("\n").map((line, li) => {
                                const isComponent = line.match(/^(\w+\.tsx)/);
                                const isDash = line.startsWith("- ");
                                return (
                                  <div key={li} className={`${
                                    isComponent ? "text-cyan-400" :
                                    isDash ? "text-amber-400" :
                                    "text-slate-300"
                                  }`}>
                                    {line}
                                  </div>
                                );
                              })}
                            </pre>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </motion.div>
              );
            })}

            {/* Rules sections */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6"
            >
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
                <h3 className="text-sm font-bold text-amber-400 font-mono mb-3">Performance Rules</h3>
                <ul className="space-y-2">
                  {performanceRules.map((rule, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                      <span className="text-amber-400 mt-0.5">*</span>
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4">
                <h3 className="text-sm font-bold text-red-400 font-mono mb-3">Constraints</h3>
                <ul className="space-y-2">
                  {constraints.map((rule, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                      <span className="text-red-400 mt-0.5">!</span>
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>

          {/* Design insights sidebar */}
          <div className="space-y-3">
            <h3 className="text-sm font-mono text-slate-500 uppercase tracking-wider mb-4">
              Design Insights
            </h3>
            {designInsights.map((insight, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.4 }}
                whileHover={{ x: -4 }}
                className="rounded-xl border border-slate-700/50 bg-slate-900/30 p-4 hover:border-purple-500/30 transition-colors"
              >
                <h4 className="text-sm font-bold text-purple-500 mb-1">{insight.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{insight.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
