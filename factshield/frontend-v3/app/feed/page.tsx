"use client";

import { useEffect, useState } from "react";
import { FeedItem, getIntelligenceFeed, getTaskStatus, submitVerification, VerificationResult } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Rss, Clock, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResultModal } from "@/components/ResultModal";
import axios from "axios";

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
    if (["real", "verified", "safe"].includes(k)) return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    if (["fake", "misleading", "suspicious", "hate"].includes(k)) return "bg-red-50 text-red-700 ring-red-600/20";
    return "bg-slate-100 text-slate-600 ring-slate-600/10";
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Intelligence Feed</h1>
        <p className="text-slate-500 font-medium mt-1">Real-time signal ingestion from verified news and social streams.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {feed.length > 0 ? feed.map((item, i) => (
          <Card key={i} className="border-slate-200/60 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all group overflow-hidden bg-white">
            <CardHeader className="pb-3 border-b border-slate-50 bg-slate-50/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                    <Rss className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-widest">{item.source}</span>
                </div>
                <Badge className={cn("text-[9px] font-black px-2 py-0.5 rounded-full border-none", getStatusColor(item.status))}>
                  {item.status.toUpperCase()}
                </Badge>
              </div>
              <CardTitle className="text-[15px] font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6 line-clamp-3">
                {item.description}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span className="text-[10px] font-bold uppercase">{item.timestamp || "Just Now"}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg text-[10px] font-bold uppercase border-slate-200"
                    disabled={!canOpenSource(item)}
                    onClick={() => {
                      if (item.link) {
                        window.open(item.link, "_blank", "noopener,noreferrer");
                      }
                    }}
                  >
                    <ExternalLink className="mr-1 h-3 w-3" />
                    Source
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 rounded-lg text-[10px] font-bold uppercase bg-indigo-600 hover:bg-indigo-700"
                    disabled={activeFeedId === (item.id || item.title)}
                    onClick={() => void handleAnalyze(item)}
                  >
                    {activeFeedId === (item.id || item.title) ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                    Analyze
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )) : (
          <div className="col-span-2 py-32 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <Rss className="w-8 h-8" />
            </div>
            <div className="text-slate-400 font-bold uppercase text-xs tracking-widest">Awaiting Signal Ingestion...</div>
          </div>
        )}
      </div>

      <ResultModal result={result} onClose={() => setResult(null)} />
    </div>
  );
}
