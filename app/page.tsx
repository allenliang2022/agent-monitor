import HeaderStats from "./components/HeaderStats";
import Timeline from "./components/Timeline";
import AgentStatusMonitor from "./components/AgentStatusMonitor";
import FileChangesTreemap from "./components/FileChangesTreemap";
import AnimationDistribution from "./components/AnimationDistribution";
import MonitoringPattern from "./components/MonitoringPattern";
import PromptDisplay from "./components/PromptDisplay";
import ArchitectureOverview from "./components/ArchitectureOverview";

export default function Home() {
  return (
    <div className="min-h-screen grid-bg">
      {/* Section 1: Header + Key Stats */}
      <HeaderStats />

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
      </div>

      {/* Section 2: Interactive Timeline */}
      <Timeline />

      <div className="max-w-7xl mx-auto px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
      </div>

      {/* Section 3: Agent Status Monitor */}
      <AgentStatusMonitor />

      <div className="max-w-7xl mx-auto px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
      </div>

      {/* Section 4: File Changes Treemap */}
      <FileChangesTreemap />

      <div className="max-w-7xl mx-auto px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
      </div>

      {/* Section 5: Animation Distribution */}
      <AnimationDistribution />

      <div className="max-w-7xl mx-auto px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
      </div>

      {/* Section 6: Monitoring Pattern */}
      <MonitoringPattern />

      <div className="max-w-7xl mx-auto px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
      </div>

      {/* Section 7: Prompt Display */}
      <PromptDisplay />

      <div className="max-w-7xl mx-auto px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
      </div>

      {/* Section 8: Architecture Overview */}
      <ArchitectureOverview />
    </div>
  );
}
