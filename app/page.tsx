import HeaderStats from "./components/HeaderStats";
import Link from "next/link";

const pages = [
  { href: "/timeline", title: "Session Timeline", desc: "9 events over 9 minutes", color: "border-amber-400/30 hover:border-amber-400/60" },
  { href: "/status", title: "Agent Status", desc: "5 monitoring checks", color: "border-cyan-400/30 hover:border-cyan-400/60" },
  { href: "/files", title: "File Changes", desc: "21 files, 2214 lines", color: "border-purple-500/30 hover:border-purple-500/60" },
  { href: "/animations", title: "Animations", desc: "229 motion calls", color: "border-emerald-400/30 hover:border-emerald-400/60" },
  { href: "/monitoring", title: "Monitoring Pattern", desc: "sleep + poll + git loop", color: "border-cyan-400/30 hover:border-cyan-400/60" },
  { href: "/prompt", title: "Prompt Architecture", desc: "3200 chars, 6 steps", color: "border-purple-500/30 hover:border-purple-500/60" },
  { href: "/architecture", title: "Architecture", desc: "System communication flow", color: "border-emerald-400/30 hover:border-emerald-400/60" },
];

export default function Home() {
  return (
    <div className="min-h-screen grid-bg">
      <HeaderStats />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-lg font-mono text-slate-400 mb-6">Explore Sections</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className={`group block rounded-xl border bg-slate-900/40 p-5 transition-all duration-200 hover:bg-slate-800/50 ${page.color}`}
            >
              <h3 className="font-mono font-bold text-slate-200 group-hover:text-white transition-colors">
                {page.title}
              </h3>
              <p className="text-sm text-slate-500 mt-1 font-mono">{page.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
