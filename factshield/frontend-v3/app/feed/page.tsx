"use client";

import { useEffect, useState } from "react";
import { FeedItem, getIntelligenceFeed, getTaskStatus, submitVerification, VerificationResult } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Rss, Clock, ExternalLink, Loader2, Zap, Globe, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResultModal } from "@/components/ResultModal";
import axios from "axios";
import { motion } from "framer-motion";

export default function FeedPage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [activeFeedId, setActiveFeedId] = useState<string | null>(null);

  useEffect(() => {
    getIntelligenceFeed().then(setFeed).catch(console.error);
  }, []);

  const pollStatus = (taskId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      if (attempts > 60) {
        clearInterval(interval);
        setActiveFeedId(null);
        return;
      }

      try {
        const data = await getTaskStatus(taskId);
        if (data.status === "completed") {
          clearInterval(interval);
          setResult(data.result);
          setActiveFeedId(null);
        } else if (data.status === "failed") {
          clearInterval(interval);
          setActiveFeedId(null);
          alert(data.error || "Verification failed");
        }
      } catch (error) {
        clearInterval(interval);
        setActiveFeedId(null);
        console.error("Polling error:", error);
      }
    }, 2000);
  };

  const handleAnalyze = async (item: FeedItem) => {
    setActiveFeedId(item.id || item.title);
    try {
      const claim = [item.title, item.description].filter(Boolean).join(". ");
      const { task_id } = await submitVerification(claim);
      pollStatus(task_id);
    } catch (error: unknown) {
      setActiveFeedId(null);
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.detail || "Analyze failed");
      } else {
        alert("Analyze failed");
      }
    }
  };

  const canOpenSource = (item: FeedItem) => Boolean(item.link && item.link !== "#");

  const getStatusColor = (v: string) => {
    const k = v.toLowerCase();
    if (["real", "verified", "safe"].includes(k)) return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
    if (["fake", "misleading", "suspicious", "hate"].includes(k)) return "border-rose-500/20 bg-rose-500/10 text-rose-400";
    return "border-white/10 bg-white/5 text-white/40";
  };

  return (
    <div className="space-y-10">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">Intelligence Feed</h1>
          <p className="text-white/40 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Real-time signal ingestion from verified neural streams</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Live Uplink Active</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {feed.length > 0 ? feed.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="glass border-white/5 hover:border-violet-500/30 transition-all duration-500 group overflow-hidden rounded-[2.5rem]">
                <CardHeader className="pb-4 border-b border-white/5 bg-white/5 backdrop-blur-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Globe className="w-16 h-16 text-white" />
                </div>
                <div className="flex items-center justify-between mb-4 relative">
                    <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
                        <Rss className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black text-white/30 font-mono uppercase tracking-[0.2em]">{item.source}</span>
                    </div>
                    <Badge className={cn("text-[9px] font-black px-3 py-1 rounded-full border shadow-lg", getStatusColor(item.status))}>
                    {item.status.toUpperCase()}
                    </Badge>
                </div>
                <CardTitle className="text-lg font-black text-white leading-tight line-clamp-2 group-hover:text-violet-400 transition-colors">
                    {item.title}
                </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                <p className="text-sm text-white/50 font-medium leading-relaxed mb-8 line-clamp-3">
                    {item.description}
                </p>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/20">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{item.timestamp || "Just Now"}</span>
                    </div>
                    <div className="flex gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-10 rounded-xl text-[10px] font-black uppercase tracking-widest border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 text-white/60"
                        disabled={!canOpenSource(item)}
                        onClick={() => {
                        if (item.link) {
                            window.open(item.link, "_blank", "noopener,noreferrer");
                        }
                        }}
                    >
                        <ExternalLink className="mr-2 h-3.5 w-3.5" />
                        Trace
                    </Button>
                    <Button
                        size="sm"
                        className="h-10 rounded-xl text-[10px] font-black uppercase tracking-widest bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20 transition-all"
                        disabled={activeFeedId === (item.id || item.title)}
                        onClick={() => void handleAnalyze(item)}
                    >
                        {activeFeedId === (item.id || item.title) ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Zap className="mr-2 h-3.5 w-3.5 fill-white" />}
                        Analyze
                    </Button>
                    </div>
                </div>
                </CardContent>
            </Card>
          </motion.div>
        )) : (
          <div className="col-span-full py-48 text-center glass rounded-[3rem] border-dashed border-white/5 border-2">
            <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto text-white/10 mb-6">
              <Rss className="w-10 h-10" />
            </div>
            <div className="text-white/20 font-black uppercase text-sm tracking-[0.3em] italic">Awaiting Signal Ingestion...</div>
          </div>
        )}
      </div>

      <ResultModal result={result} onClose={() => setResult(null)} />
    </div>
  );
}
