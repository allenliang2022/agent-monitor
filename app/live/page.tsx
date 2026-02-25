import type { Metadata } from "next";
import LiveDashboard from "../components/LiveDashboard";

export const metadata: Metadata = {
  title: "Live Monitor | Agent Swarm Monitor",
  description: "Real-time monitoring of active OpenClaw agent sessions.",
};

export default function LivePage() {
  return <LiveDashboard />;
}
