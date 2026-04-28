"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Building2,
  Cpu,
  Database,
  FileText,
  LayoutDashboard,
  Radio,
  Settings,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { getNeuralStats, NeuralStats } from "@/lib/api";

const navGroups = [
  {
    label: "Operate",
    items: [
      { id: "overview", label: "Command Center", icon: LayoutDashboard, href: "/" },
      { id: "feed", label: "Signal Feed", icon: Radio, href: "/feed" },
      { id: "trending", label: "Narratives", icon: TrendingUp, href: "/trending" },
      { id: "archive", label: "Evidence Vault", icon: Database, href: "/archive" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { id: "reports", label: "Reports", icon: FileText, href: "/reports" },
      { id: "team", label: "Team", icon: Users, href: "/team" },
      { id: "architecture", label: "System", icon: Cpu, href: "/architecture" },
      { id: "settings", label: "Settings", icon: Settings, href: "/settings" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [stats, setStats] = useState<NeuralStats | null>(null);

  useEffect(() => {
    getNeuralStats().then(setStats).catch(console.error);
    const timer = setInterval(() => {
      getNeuralStats().then(setStats).catch(console.error);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const online = stats?.status === "Optimal" || stats?.status === "Active";
  const usage = Math.min(100, Math.round(((stats?.vector_count ?? 0) / 1000) * 100));

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-cyan-300/15 bg-slate-950/85 px-4 py-3 shadow-sm backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-slate-950">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-slate-950">FactShield</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Enterprise</div>
            </div>
          </Link>
          <div className="flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1.5 text-xs font-medium text-slate-600">
            <span className={cn("status-dot", online ? "bg-emerald-500" : "bg-amber-500")} />
            {online ? "Online" : "Degraded"}
          </div>
        </div>
      </header>

      <aside className="sticky top-0 hidden h-screen w-[304px] shrink-0 border-r border-cyan-300/15 bg-slate-950/70 backdrop-blur-2xl lg:flex lg:flex-col">
        <div className="px-5 py-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.26)]">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight text-slate-950">FactShield</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Enterprise Suite</div>
            </div>
          </Link>

          <div className="mt-5 rounded-xl border border-cyan-300/15 bg-cyan-300/5 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-300/15 text-amber-100">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-950">Integrity Desk</div>
                <div className="text-xs text-slate-500">Pro workspace</div>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-hide">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-5">
              <div className="px-3 pb-2 section-label">{group.label}</div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.2)]"
                          : "text-slate-600 hover:bg-cyan-300/10 hover:text-slate-950"
                      )}
                    >
                      <item.icon className={cn("h-4 w-4", isActive ? "text-slate-950" : "text-slate-400")} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-3 p-4">
          <div className="surface holo-edge rounded-xl p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="section-label">Platform Health</div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span className={cn("status-dot", online ? "bg-emerald-500" : "bg-amber-500")} />
                {online ? "Healthy" : "Watch"}
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium text-slate-500">Retrieval</div>
                <div className="text-sm font-semibold capitalize text-slate-900">{stats?.retrieval_status || "checking"}</div>
              </div>
              <div>
                <div className="mb-2 flex justify-between text-xs text-slate-500">
                  <span>Index capacity</span>
                  <span>{usage}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-cyan-300/10">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${usage}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-cyan-300/5 px-3 py-2 text-xs font-medium text-slate-600">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                {stats?.vector_count ?? 0} vectors / {stats?.metadata_count ?? stats?.memory_count ?? 0} records
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-cyan-300/5 px-3 py-2 text-xs font-medium text-slate-600">
                <Activity className="h-3.5 w-3.5 text-primary" />
                {stats?.reasoner || "Reasoner pending"}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
