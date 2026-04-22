"use client";

import { useEffect, useState } from "react";
import { CommandCenter } from "@/components/CommandCenter";
import { Card, CardContent } from "@/components/ui/card";
import { FeedItem, getIntelligenceFeed, getTrending, getNeuralStats, getSystemStatus, NeuralStats, SystemStatus, TrendingItem } from "@/lib/api";
import { Layers, Database, Activity, Cpu, Rss, ArrowRight, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function Dashboard() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [stats, setStats] = useState<NeuralStats | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [commandQuery, setCommandQuery] = useState("");
  const [autoSubmitSignal, setAutoSubmitSignal] = useState(0);

  useEffect(() => {
    Promise.all([getIntelligenceFeed(), getTrending(), getNeuralStats(), getSystemStatus()])
      .then(([f, t, s, system]) => {
        setFeed(f);
        setTrending(t);
        setStats(s);
        setSystemStatus(system);
      })
      .catch(console.error);
  }, []);

  const statCards = [
    { label: "Knowledge Base", val: stats?.memory_count ?? systemStatus?.dataset_entries ?? 0, sub: "indexed records", icon: Layers, color: "text-indigo-600 bg-indigo-50" },
    { label: "Vector Memory", val: stats?.vector_count ?? systemStatus?.faiss_vectors ?? 0, sub: stats?.vector_engine || "vector embeddings", icon: Database, color: "text-violet-600 bg-violet-50" },
    { label: "Live Signals", val: feed.length, sub: "active feed items", icon: Activity, color: "text-emerald-600 bg-emerald-50" },
    { label: "Pipeline Health", val: stats?.status || "Unknown", sub: stats?.groq_configured ? "llm configured" : "llm setup required", icon: Cpu, iconColor: "text-amber-600 bg-amber-50" },
  ];

  const handleAnalyzeFeedItem = (item: FeedItem) => {
    const claim = [item.title, item.description].filter(Boolean).join(". ");
    setCommandQuery(claim);
    setAutoSubmitSignal((current) => current + 1);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Verification Hub</h1>
        <p className="text-slate-500 font-medium mt-1">Unified AI command center for truth-assessment and propaganda intelligence.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <Card key={i} className="border-slate-200/60 shadow-sm hover:shadow-md transition-shadow group">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", s.color || s.iconColor)}>
                  <s.icon className="w-5 h-5" />
                </div>
                <Badge variant="outline" className="text-[9px] font-bold tracking-widest uppercase border-slate-200 text-slate-400">Live</Badge>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">{s.val}</div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">{s.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CommandCenter initialQuery={commandQuery} autoSubmitSignal={autoSubmitSignal} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Rss className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Recent Neural Signals</h2>
            </div>
            <Link href="/feed" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">View Full Feed <ArrowRight className="w-3 h-3" /></Link>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {feed.slice(0, 4).map((item, i) => (
              <Card
                key={i}
                className="cursor-pointer border-slate-200/60 shadow-sm transition-colors group hover:border-indigo-200"
                onClick={() => handleAnalyzeFeedItem(item)}
              >
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-50 transition-colors">
                    {item.type === 'NEWS' ? <Layers className="w-6 h-6 text-blue-500" /> : <Activity className="w-6 h-6 text-indigo-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-tighter">{item.source}</span>
                      <Badge className="bg-slate-100 text-slate-600 border-none text-[9px] font-black px-1.5 h-4">{item.status}</Badge>
                    </div>
                    <h4 className="text-[14px] font-bold text-slate-800 truncate mb-1 group-hover:text-indigo-600 transition-colors">{item.title}</h4>
                    <p className="text-[12px] text-slate-500 line-clamp-1 font-medium">{item.description}</p>
                    <div className="mt-3 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wide text-indigo-600">
                      <span>Analyze</span>
                      {item.link && item.link !== "#" ? (
                        <button
                          type="button"
                          className="flex items-center gap-1 text-slate-500 hover:text-indigo-600"
                          onClick={(event) => {
                            event.stopPropagation();
                            window.open(item.link, "_blank", "noopener,noreferrer");
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Source
                        </button>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!feed.length && <div className="py-20 text-center text-slate-400 text-sm font-medium border-2 border-dashed border-slate-200 rounded-3xl">Awaiting intelligence ingestion...</div>}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Trending Threats</h2>
          <div className="space-y-4">
            {trending.slice(0, 3).map((t, i) => (
              <div key={i} className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-red-200 transition-colors">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Activity className="w-12 h-12 text-red-600" />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-red-50 text-red-700 ring-red-600/20 text-[9px] font-black uppercase tracking-tighter">{t.tag || "Trending"}</Badge>
                  <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">{t.impact || "Unknown"} Impact</span>
                </div>
                <h4 className="text-sm font-bold text-slate-800 leading-snug mb-2">{t.title}</h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{t.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}