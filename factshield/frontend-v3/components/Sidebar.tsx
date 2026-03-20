"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Rss, TrendingUp, Database, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { getNeuralStats, NeuralStats } from "@/lib/api";

const navItems = [
  { id: "overview", label: "Overview", icon: Shield, href: "/" },
  { id: "feed", label: "Feed", icon: Rss, href: "/feed" },
  { id: "trending", label: "Trending", icon: TrendingUp, href: "/trending" },
  { id: "archive", label: "Archive", icon: Database, href: "/archive" },
  { id: "architecture", label: "Architecture", icon: Cpu, href: "/architecture" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [stats, setStats] = useState<NeuralStats | null>(null);

  useEffect(() => {
    getNeuralStats().then(setStats).catch(console.error);
  }, []);

  return (
    <aside className="w-[240px] flex-shrink-0 border-r border-slate-200 bg-white h-screen sticky top-0 flex flex-col">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center shadow-lg shadow-indigo-200">
            <Shield className="text-white w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-extrabold tracking-tight text-slate-900">SAMI</div>
            <div className="text-[10px] text-slate-400 font-medium -mt-0.5">Social Integrity System</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all",
              pathname === item.href
                ? "bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-100/50"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            )}
          >
            <item.icon className={cn("w-4 h-4", pathname === item.href ? "text-indigo-600" : "text-slate-400")} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mx-4 mb-4 p-4 rounded-2xl bg-slate-900 text-white shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <div className={cn(
            "w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]",
            stats?.status === "Optimal" ? "bg-emerald-400" : "bg-amber-400"
          )} />
          <span className="text-[11px] font-bold tracking-wider text-slate-300 uppercase">System Status: {stats?.status || "Unknown"}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/5 rounded-xl px-3 py-2.5 border border-white/5">
            <div className="text-[10px] text-slate-400 mb-0.5 font-medium">Neural Node</div>
            <div className="text-xs font-bold text-emerald-400">{stats?.local_classifier || "Unavailable"}</div>
          </div>
          <div className="bg-white/5 rounded-xl px-3 py-2.5 border border-white/5">
            <div className="text-[10px] text-slate-400 mb-0.5 font-medium">Latent V-DB</div>
            <div className="text-xs font-bold text-indigo-400">{stats?.vector_count ?? 0} vectors</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex justify-between items-center text-[10px] text-slate-400">
            <span>LLM Agent Pool</span>
            <span className="text-white font-mono">{stats?.reasoner || "Unavailable"}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
