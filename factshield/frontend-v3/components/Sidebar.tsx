"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Rss, TrendingUp, Database, Cpu, Search, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { getNeuralStats, NeuralStats } from "@/lib/api";
import { motion } from "framer-motion";

const navItems = [
  { id: "overview", label: "Verification Hub", icon: Shield, href: "/" },
  { id: "feed", label: "Intelligence Feed", icon: Rss, href: "/feed" },
  { id: "trending", label: "Trending Threats", icon: TrendingUp, href: "/trending" },
  { id: "archive", label: "Neural Archive", icon: Database, href: "/archive" },
  { id: "architecture", label: "System Design", icon: Cpu, href: "/architecture" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [stats, setStats] = useState<NeuralStats | null>(null);

  useEffect(() => {
    getNeuralStats().then(setStats).catch(console.error);
    const timer = setInterval(() => {
        getNeuralStats().then(setStats).catch(console.error);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <aside className="w-[280px] flex-shrink-0 border-r border-white/5 bg-black/40 backdrop-blur-3xl h-screen sticky top-0 flex flex-col z-50">
      <div className="px-8 pt-10 pb-8">
        <Link href="/" className="flex items-center gap-4 group">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
            <div className="relative w-12 h-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center shadow-2xl">
              <Shield className="text-violet-500 w-7 h-7 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black tracking-tight text-white uppercase italic">SAMI</div>
            <div className="text-[9px] text-violet-400 font-bold uppercase tracking-[0.2em] -mt-1 opacity-70">Integrity OS</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        <div className="px-4 mb-4 text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Navigation</div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "relative group flex items-center gap-3 px-4 py-3 rounded-2xl text-[13px] font-bold transition-all duration-300",
                isActive
                  ? "text-white"
                  : "text-white/40 hover:text-white/80 hover:bg-white/5"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-indigo-600/10 border border-violet-500/20 rounded-2xl -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <item.icon className={cn("w-4 h-4 transition-colors", isActive ? "text-violet-400" : "text-white/30 group-hover:text-white/60")} />
              {item.label}
              {isActive && (
                 <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mx-4 mb-8">
        <div className="relative p-5 rounded-[2rem] bg-gradient-to-b from-white/5 to-transparent border border-white/5 overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-violet-600/10 rounded-full blur-2xl group-hover:bg-violet-600/20 transition-all duration-500"></div>
            
            <div className="flex items-center gap-2 mb-5">
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                stats?.status === "Optimal" ? "bg-emerald-400 shadow-[0_0_10px_#10b981]" : "bg-amber-400 shadow-[0_0_10px_#f59e0b]"
              )} />
              <span className="text-[10px] font-black tracking-[0.1em] text-white/50 uppercase">System Integrity</span>
            </div>

            <div className="space-y-4">
                <div>
                    <div className="text-[9px] text-white/30 font-bold uppercase tracking-widest mb-1.5 flex justify-between">
                        <span>Neural Processor</span>
                        <Activity className="w-2.5 h-2.5" />
                    </div>
                    <div className="text-[11px] font-black text-white/90 truncate">{stats?.local_classifier || "XLM-Roberta"}</div>
                </div>
                <div>
                    <div className="text-[9px] text-white/30 font-bold uppercase tracking-widest mb-1.5 flex justify-between">
                        <span>Vector Latency</span>
                        <Cpu className="w-2.5 h-2.5" />
                    </div>
                    <div className="text-[11px] font-black text-violet-400">{stats?.vector_count ?? 0} Global Vectors</div>
                </div>
            </div>

            <div className="mt-6 pt-5 border-t border-white/5">
                <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-white/20 font-bold uppercase tracking-widest">Active Reasoning Pool</span>
                    <span className="text-[10px] text-white/70 font-mono font-bold truncate tracking-tight">{stats?.reasoner || "Llama 3.3 Consort"}</span>
                </div>
            </div>
        </div>
      </div>
    </aside>
  );
}
