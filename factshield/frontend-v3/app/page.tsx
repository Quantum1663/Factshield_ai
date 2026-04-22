"use client";

import { useEffect, useState } from "react";
import { CommandCenter } from "@/components/CommandCenter";
import { Card, CardContent } from "@/components/ui/card";
import { FeedItem, getIntelligenceFeed, getTrending, getNeuralStats, getSystemStatus, NeuralStats, SystemStatus, TrendingItem } from "@/lib/api";
import { Layers, Database, Activity, Cpu, Rss, ArrowRight, ExternalLink, Zap, Terminal, Globe, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [stats, setStats] = useState<NeuralStats | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [commandQuery, setCommandQuery] = useState("");
  const [autoSubmitSignal, setAutoSubmitSignal] = useState(0);
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    setSessionId(`SAMI-${Math.random().toString(36).substring(7).toUpperCase()}`);
    const fetchData = () => {
        Promise.all([getIntelligenceFeed(), getTrending(), getNeuralStats(), getSystemStatus()])
        .then(([f, t, s, system]) => {
          setFeed(f);
          setTrending(t);
          setStats(s);
          setSystemStatus(system);
        })
        .catch(console.error);
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    { label: "Neural Index", val: stats?.memory_count ?? systemStatus?.dataset_entries ?? 0, sub: "Indexed Facts", icon: Database, color: "text-violet-400", bg: "bg-violet-500/10" },
    { label: "Vector Space", val: stats?.vector_count ?? systemStatus?.faiss_vectors ?? 0, sub: stats?.vector_engine || "FAISS L2", icon: Zap, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Live Signals", val: feed.length, sub: "Incoming Feeds", icon: Globe, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Core Sync", val: stats?.status || "Active", sub: "Pipeline Status", icon: Activity, color: "text-amber-400", bg: "bg-amber-500/10" },
  ];

  const handleAnalyzeFeedItem = (item: FeedItem) => {
    const claim = [item.title, item.description].filter(Boolean).join(". ");
    setCommandQuery(claim);
    setAutoSubmitSignal((current) => current + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-12 pb-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div>
          <div className="flex items-center gap-3 mb-3">
             <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">SAMI Intelligence v2.0</Badge>
             <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">Live Neural Uplink</span>
             </div>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white">Verification Hub</h1>
          <p className="text-white/40 font-medium mt-2 max-w-xl text-lg">Autonomous defense against misinformation. Unified command center for propaganda analysis and truth-assessment.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/5 backdrop-blur-md">
            <div className="px-4 py-2">
                <div className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Session ID</div>
                <div className="text-xs font-mono font-bold text-white/80">{sessionId || "INITIALIZING..."}</div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="px-4 py-2">
                <div className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Neural Load</div>
                <div className="text-xs font-mono font-bold text-violet-400">1.2ms / query</div>
            </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="glass group hover:border-white/20 transition-all duration-500 rounded-[2.5rem] overflow-hidden">
                <CardContent className="p-7">
                    <div className="flex items-center justify-between mb-6">
                        <div className={cn("w-14 h-14 rounded-3xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500", s.bg)}>
                            <s.icon className={cn("w-7 h-7", s.color)} />
                        </div>
                        <div className="flex flex-col items-end">
                            <div className="text-3xl font-black text-white tracking-tighter">{s.val}</div>
                            <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mt-1">{s.sub}</div>
                        </div>
                    </div>
                    <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest">{s.label}</div>
                </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
         initial={{ opacity: 0, y: 40 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.4 }}
      >
        <CommandCenter initialQuery={commandQuery} autoSubmitSignal={autoSubmitSignal} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                <Terminal className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight uppercase">Neural Signals</h2>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Latest Ingested Intelligence</p>
              </div>
            </div>
            <Link href="/feed" className="group flex items-center gap-2 text-[11px] font-black text-white/40 hover:text-violet-400 transition-colors uppercase tracking-widest">
                Network Stream <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {feed.slice(0, 5).map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + (i * 0.1) }}
              >
                <Card
                    className="cursor-pointer glass border-white/5 hover:border-white/20 transition-all duration-300 group rounded-[2rem]"
                    onClick={() => handleAnalyzeFeedItem(item)}
                >
                    <CardContent className="p-6 flex items-start gap-6">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 border border-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/10 group-hover:border-violet-500/20 transition-all duration-500">
                        {item.type === 'NEWS' ? <Globe className="w-8 h-8 text-blue-400/50 group-hover:text-blue-400 transition-colors" /> : <Activity className="w-8 h-8 text-violet-400/50 group-hover:text-violet-400 transition-colors" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-black text-white/30 font-mono uppercase tracking-widest">{item.source}</span>
                        <Badge className="bg-white/5 text-white/60 border-white/10 text-[9px] font-black px-2 py-0.5">{item.status}</Badge>
                        <span className="text-[10px] font-bold text-white/20 ml-auto">0{i+1}</span>
                        </div>
                        <h4 className="text-lg font-black text-white leading-tight mb-2 group-hover:text-violet-400 transition-colors">{item.title}</h4>
                        <p className="text-sm text-white/50 line-clamp-2 font-medium leading-relaxed">{item.description}</p>
                        
                        <div className="mt-5 flex items-center gap-4">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-violet-400 group-hover:text-glow">
                                <Zap className="w-3 h-3" />
                                Run Analysis
                            </div>
                            {item.link && item.link !== "#" && (
                                <button
                                    type="button"
                                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        window.open(item.link, "_blank", "noopener,noreferrer");
                                    }}
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    External Trace
                                </button>
                            )}
                        </div>
                    </div>
                    </CardContent>
                </Card>
              </motion.div>
            ))}
            {!feed.length && <div className="py-24 text-center glass rounded-[3rem] text-white/20 text-sm font-black uppercase tracking-widest italic border-dashed border-white/10 border-2">Awaiting Intelligence Ingestion...</div>}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <TrendingUp className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight uppercase">Hot Narratives</h2>
                <p className="text-[10px] font-bold text-red-400/40 uppercase tracking-[0.2em]">Active Propaganda Cycles</p>
              </div>
          </div>

          <div className="space-y-5">
            {trending.slice(0, 4).map((t, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + (i * 0.1) }}
                className="p-6 rounded-[2.5rem] glass border-white/5 relative overflow-hidden group hover:border-red-500/20 transition-all duration-500"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity rotate-12 scale-150">
                  <Activity className="w-16 h-16 text-red-500" />
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[9px] font-black uppercase tracking-widest">{t.tag || "Trending"}</Badge>
                  <div className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{t.impact || "High"} Impact</span>
                </div>
                <h4 className="text-md font-black text-white leading-tight mb-3 group-hover:text-red-400 transition-colors">{t.title}</h4>
                <p className="text-xs text-white/40 font-medium leading-relaxed">{t.description}</p>
                <div className="mt-5 flex justify-end">
                    <div className="w-8 h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-red-500" 
                            animate={{ x: ["-100%", "100%"] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        />
                    </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
