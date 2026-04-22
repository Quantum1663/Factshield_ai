"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Cpu, Database, LayoutDashboard, Radio, Shield, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { getNeuralStats, NeuralStats } from "@/lib/api";

const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, href: "/" },
  { id: "feed", label: "Live Feed", icon: Radio, href: "/feed" },
  { id: "trending", label: "Narratives", icon: TrendingUp, href: "/trending" },
  { id: "archive", label: "Archive", icon: Database, href: "/archive" },
  { id: "architecture", label: "System", icon: Cpu, href: "/architecture" },
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

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-cyan-300/15 bg-slate-950/85 px-4 py-3 shadow-sm backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-slate-950">FactShield</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Verification OS</div>
            </div>
          </Link>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
            <span className={cn("status-dot", online ? "bg-emerald-500" : "bg-amber-500")} />
            {online ? "Online" : "Degraded"}
          </div>
        </div>
      </header>

        <aside className="sticky top-0 hidden h-screen w-[292px] shrink-0 border-r border-cyan-300/15 bg-slate-950/60 backdrop-blur-2xl lg:flex lg:flex-col">
        <div className="px-6 py-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight text-slate-950">FactShield</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Verification OS</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          <div className="px-3 pb-2 pt-3 section-label">Workspace</div>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                )}
              >
                <item.icon className={cn("h-4 w-4", isActive ? "text-white" : "text-slate-400")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4">
          <div className="surface holo-edge rounded-xl p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="section-label">System Health</div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span className={cn("status-dot", online ? "bg-emerald-500" : "bg-amber-500")} />
                {online ? "Online" : "Watch"}
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium text-slate-500">Classifier</div>
                <div className="truncate text-sm font-semibold text-slate-900">{stats?.local_classifier || "XLM-Roberta"}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Vector Index</div>
                <div className="text-sm font-semibold text-slate-900">{stats?.vector_count ?? 0} vectors</div>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
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
